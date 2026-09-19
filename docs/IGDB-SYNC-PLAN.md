# Plan de sincronizacion del catalogo de juegos

## Decision

Mantener una sola base de datos en Convex y conservar IGDB como fuente principal del catalogo.

No se creara una segunda base de datos ni se migrara todo el backend en esta etapa. El trabajo se centrara en reemplazar el seeding masivo por una sincronizacion incremental, reanudable y observable.

Si las mediciones posteriores demuestran que Convex sigue siendo insuficiente, se evaluara una migracion completa a PostgreSQL/Supabase. No se mantendran permanentemente los datos sociales y el catalogo en bases separadas.

## Objetivos

- Actualizar el catalogo automaticamente sin superar las cuotas de Convex o IGDB.
- Evitar volver a descargar y escribir juegos que no cambiaron.
- Permitir que una ejecucion interrumpida continue desde el ultimo lote confirmado.
- Mantener disponibles las busquedas, fichas, backlog, favoritos, resenas y articulos durante el cambio.
- Obtener metricas reales antes de decidir una migracion de backend.

## No objetivos

- Replicar todo el catalogo historico de IGDB.
- Actualizar miles de juegos en una sola funcion.
- Incorporar precios, ofertas o jugadores concurrentes; esos datos requeririan otras fuentes.
- Sustituir Clerk, Convex o los identificadores actuales durante esta fase.

## Situacion actual

- El backend contiene 23 tablas y el cliente web/movil tiene decenas de consumidores de Convex.
- `apps/backend/convex/igdb.ts` permite importar hasta 5.000 juegos por categoria.
- Cada juego se guarda mediante una llamada separada a `internal.games.upsertFromIgdb`.
- El seeding de produccion esta bloqueado explicitamente para proteger la cuota mensual.
- La tabla `games` ya tiene `lastUpdated`, pero no conserva `updated_at` ni `checksum` de IGDB.
- No existe una definicion de cron en el backend.
- Hay campos enriquecidos/deprecados que se siguen solicitando y escribiendo aunque no son necesarios para las vistas principales.

## Arquitectura objetivo

```text
                         +----------------------+
                         | Web y aplicacion     |
                         +----------+-----------+
                                    |
                                    v
+---------+   lotes pequenos   +----+-----------------+
| IGDB    +------------------->| Convex              |
+----+----+                    | games + datos sociales|
     |                         +----+-----------------+
     | webhooks                     ^
     +------------------------------+
                                    |
                         cron de reconciliacion
```

El cron y los webhooks son mecanismos de activacion; Convex continua siendo la unica fuente de lectura para los clientes.

## Modelo de datos propuesto

Agregar a `games`:

- `igdbUpdatedAt?: number`: valor `updated_at` recibido de IGDB.
- `igdbChecksum?: string`: checksum de IGDB para evitar escrituras sin cambios.
- `syncStatus?: "fresh" | "stale" | "error"`.
- `lastSyncError?: string`: mensaje reducido y sin secretos.

Agregar una tabla `syncJobs`:

- `jobType`: `recent_releases`, `popular`, `reconcile` o `backfill`.
- `status`: `idle`, `running`, `completed` o `failed`.
- `cursor`: offset, fecha o identificador desde el que debe continuar.
- `startedAt`, `finishedAt` y `heartbeatAt`.
- `recordsFetched`, `recordsChanged`, `recordsSkipped` y `recordsFailed`.
- `lastError` e `attempt`.

La tabla debe tener indices por `jobType` y por `status`.

## Fase 0: establecer la linea base

Antes de modificar el sincronizador:

1. Registrar el numero actual de juegos y el tamano aproximado de una muestra representativa.
2. Ejecutar en desarrollo una importacion de 100 juegos.
3. Medir solicitudes a IGDB, lecturas/escrituras de Convex, transferencia y duracion.
4. Identificar cuales campos de `games` consumen realmente web y movil.
5. Definir presupuestos operativos:
   - menos de 4 solicitudes por segundo a IGDB;
   - lotes iniciales de 100 juegos;
   - menos de 90 segundos por ejecucion;
   - cero escrituras cuando el checksum no cambia.

Entregable: una tabla en este documento o en el PR con las mediciones iniciales y finales.

## Fase 1: reducir el volumen de datos

1. Crear una seleccion comun de campos basicos de IGDB:
   - `id`, `name`, `slug`, `cover.image_id`;
   - `first_release_date`, `game_type`, `parent_game`;
   - `summary`, generos, plataformas y companias principales;
   - puntuaciones que se muestren realmente;
   - `updated_at` y `checksum`.
2. Dejar de solicitar en sincronizaciones generales artworks, screenshots, videos, websites, idiomas, multiplayer modes y similares.
3. Obtener contenido enriquecido solo al abrir una ficha y solamente si esta ausente o vencido.
4. Reemplazar el uso nuevo de `category` por `game_type`, conservando compatibilidad temporal con documentos existentes.
5. No copiar las imagenes: guardar `image_id` o URL y servirlas desde el CDN de IGDB.

## Fase 2: escritura por lotes e idempotencia

1. Crear `games.upsertBatchFromIgdb` como mutacion interna.
2. Recibir un maximo configurable de 100 juegos por llamada.
3. Consultar registros existentes mediante `by_igdb_id`.
4. Comparar `igdbChecksum` o, como respaldo, `igdbUpdatedAt`.
5. Omitir documentos sin cambios.
6. Insertar o actualizar los restantes dentro de la misma mutacion.
7. Devolver solo contadores e IDs fallidos; no retornar documentos completos.
8. Mantener temporalmente `upsertFromIgdb` para los flujos actuales y eliminarlo cuando todos usen lotes.

La operacion debe ser idempotente: reprocesar el mismo lote no puede crear duplicados ni producir escrituras innecesarias.

## Fase 3: sincronizacion incremental

Crear acciones pequenas y reanudables:

### Lanzamientos recientes

- Frecuencia propuesta: una vez al dia.
- Ventana: juegos creados o actualizados recientemente y lanzamientos de los ultimos 18 meses.
- Tamano: 100 a 300 registros por ejecucion.

### Popularidad

- Frecuencia propuesta: cada 12 horas.
- Alcance: solo juegos visibles en Discover, buscados recientemente o presentes en bibliotecas.
- No recalcular popularidad para todo el catalogo.

### Reconciliacion

- Frecuencia propuesta: semanal.
- Seleccionar juegos cuyo `lastUpdated` exceda 30 dias.
- Actualizar un numero acotado por ejecucion y guardar cursor.

### Backfill

- Ejecucion manual.
- Procesar una pagina por vez.
- Continuar mediante `syncJobs.cursor` hasta completar el objetivo.
- Nunca formar parte del cron normal.

Cada accion debe adquirir un bloqueo logico en `syncJobs`, actualizar un heartbeat y liberar el bloqueo al terminar. Un bloqueo vencido puede ser recuperado por la siguiente ejecucion.

## Fase 4: activacion periodica

Implementar primero el cron nativo de Convex si sus limites actuales permiten ejecutar cada lote pequeno. El cron solo debe iniciar una pagina de trabajo, no realizar un seed completo.

Si el cron de Convex resulta ser la limitacion medida, mover exclusivamente el disparador a uno de estos servicios:

1. GitHub Actions para una frecuencia diaria o semanal.
2. Cloudflare Worker Cron para mayor frecuencia.

El disparador externo llamara a un endpoint HTTP protegido de Convex. No almacenara una copia del catalogo.

Requisitos del endpoint:

- secreto dedicado y rotatorio;
- comparacion segura del secreto;
- proteccion contra ejecuciones concurrentes;
- payload validado con tipo de trabajo y limite maximo;
- respuesta pequena con estado y contadores;
- sin credenciales de Twitch/IGDB expuestas al cliente.

## Fase 5: webhooks de IGDB

Despues de estabilizar el flujo incremental:

1. Crear un endpoint HTTP publico para eventos de juegos.
2. Validar el secreto configurado al registrar el webhook.
3. Convertir cada evento en una actualizacion puntual y reintentable.
4. Responder rapidamente y efectuar el trabajo pesado de forma diferida.
5. Manejar creaciones, actualizaciones y eliminaciones.
6. Conservar el cron diario como reconciliacion por si se pierde un evento.

Los webhooks reducen polling, pero no sustituyen la reconciliacion periodica.

## Fase 6: observabilidad y recuperacion

- Exponer una consulta administrativa con el ultimo resultado de cada trabajo.
- Registrar duracion, paginas, registros recibidos, modificados, omitidos y fallidos.
- Alertar si un trabajo no completa dos periodos consecutivos.
- Aplicar reintentos con backoff para respuestas `429` y errores `5xx`.
- No reintentar indefinidamente errores de validacion.
- Guardar una lista acotada de IDs fallidos para reprocesamiento manual.
- Evitar registrar tokens, secretos o cuerpos completos potencialmente grandes.

## Pruebas

### Unitarias

- Normalizacion de campos IGDB.
- Comparacion de checksums.
- Conversion de fechas y URLs de caratulas.
- Calculo y avance del cursor.
- Clasificacion de errores reintentables.

### Integracion

- Insercion de un juego nuevo.
- Actualizacion de un juego cambiado.
- Omision de un juego sin cambios.
- Reejecucion idempotente del mismo lote.
- Recuperacion de un job con heartbeat vencido.
- Respuesta ante `429`, token vencido y payload parcial.

### Regresion

- Buscar y abrir juegos en web y movil.
- Crear backlog, favorito, resena y articulo relacionados con un juego.
- Verificar Discover, nuevos lanzamientos y tendencias.
- Confirmar que los IDs actuales de juegos no cambian.

## Despliegue gradual

1. Desplegar campos opcionales y `syncJobs` sin cambiar el flujo existente.
2. Activar `upsertBatchFromIgdb` solo en desarrollo.
3. Ejecutar un lote de 100 juegos en produccion con `dryRun`.
4. Ejecutar el mismo lote con escritura y comparar metricas.
5. Activar el cron diario con un limite conservador.
6. Observar durante siete dias.
7. Activar popularidad y reconciliacion semanal.
8. Incorporar webhooks.
9. Retirar las rutas antiguas de seed masivo cuando no tengan consumidores.

Cada fase debe poder desactivarse sin perder datos ni cambiar el contrato del cliente.

## Criterios de exito

- Ninguna ejecucion procesa mas del limite configurado.
- Las ejecuciones duplicadas no crean registros duplicados.
- Al menos el 90 % de los juegos sin cambios se omite sin escritura.
- La sincronizacion diaria termina dentro del presupuesto definido.
- No se producen errores de cuota durante 30 dias.
- Las fichas nuevas aparecen como maximo 24 horas despues de estar disponibles en IGDB.
- Existe visibilidad administrativa del ultimo job y sus errores.

## Criterios para reconsiderar Convex

Evaluar una migracion completa a Supabase/PostgreSQL solo si, despues de aplicar este plan, ocurre alguno de estos casos de forma sostenida:

- la transferencia optimizada sigue excediendo la cuota;
- el costo proyectado de Convex supera claramente el costo y mantenimiento de PostgreSQL;
- las consultas sociales requieren joins o agregaciones que Convex no puede resolver de manera razonable;
- el catalogo supera la capacidad operativa prevista;
- se necesita control SQL, backups o portabilidad que justifiquen la migracion.

La decision debe basarse en 30 dias de metricas. Si se migra, se migrara el backend completo por etapas y no se dejara una arquitectura permanente con referencias cruzadas entre dos bases.

## Orden recomendado de implementacion

1. Linea base y medicion.
2. Reducir campos solicitados.
3. Agregar checksum y timestamp de IGDB.
4. Implementar upsert por lotes.
5. Implementar estado y cursor de jobs.
6. Activar sincronizacion diaria incremental.
7. Agregar reconciliacion y popularidad selectiva.
8. Incorporar webhooks.
9. Medir durante 30 dias.
10. Decidir si Convex permanece o se migra completamente.


## Estado de la implementacion

Implementado en `apps/backend/convex` (todo apagado por defecto; nada cambia hasta activar las variables):

| Pieza | Archivo |
| --- | --- |
| Campos basicos, normalizacion, checksum, cursor, errores | `lib/igdbSync.ts` |
| `igdbUpdatedAt`, `igdbChecksum`, `syncStatus`, `lastSyncError`, tablas `syncJobs` y `syncEvents` | `schema.ts` |
| `upsertBatchFromIgdb` (max. 100, idempotente, `dryRun`) y `markMissingInIgdb` | `games.ts` |
| Bloqueo, heartbeat, cursor, contadores, cola de eventos, `getStatus` (admin), `checkHealth` | `syncJobs.ts` |
| Jobs por pagina con reintentos y backoff, registro de webhooks | `catalogSync.ts` |
| Cron diario / 12 h / semanal / drenaje horario / salud | `crons.ts` |
| `POST /sync/trigger` y `POST /igdb/webhook/{create,update,delete}` | `syncHttp.ts` |
| Tarjeta "Catalogue Sync" en el panel de administracion | `apps/web/app/admin/components/CatalogSyncStatus.tsx` |
| Pruebas unitarias y de integracion (`pnpm --filter backend test`) | `lib/igdbSync.test.ts`, `catalogSync.test.ts` |

Decisiones tomadas al implementar:

- Cada invocacion procesa una sola pagina (max. 100 juegos, 1-2 solicitudes a IGDB) y programa la siguiente con 1 s de separacion; el presupuesto por ejecucion se da en paginas (`maxPages`).
- La reconciliacion recorre el catalogo por `igdbId` con cursor propio y solo consulta a IGDB los juegos con `lastUpdated` mayor a 30 dias. Como los juegos sin cambios no se escriben, la posicion no puede vivir en `lastUpdated`.
- `recent_releases` filtra por `(hypes >= 3 | total_rating_count >= 5)`. Medido el 2026-09-19 contra IGDB: sin filtro entran ~2.600 juegos/dia (18.360 en 7 dias) y el cursor nunca alcanzaria el presente con 300/dia; con el filtro son ~240/dia (1.672 en 7 dias). Lo que queda por debajo sigue entrando bajo demanda desde la busqueda.
- `recent_releases` usa una marca de agua sobre `updated_at` (`>=`, orden ascendente). Los empates en el borde se releen y se omiten por checksum.
- Los juegos que IGDB deja de devolver (o elimina por webhook) se marcan con `syncStatus: "error"` y `lastSyncError: "not_found_in_igdb"`; nunca se borran porque resenas, backlog y articulos pueden referenciarlos.
- Los webhooks solo encolan el ID (tabla `syncEvents`, job adicional `events`); la descarga se hace despues en lotes. Un evento fallido se reintenta hasta 5 veces.
- Las sincronizaciones generales no piden ni tocan artworks, screenshots, videos ni websites. La ficha web los muestra (`MediaGallery`, `ExternalLinks`) y los obtiene bajo demanda con `igdb.ensureGameMedia`: una sola solicitud a IGDB al abrir la ficha si faltan o tienen mas de 30 dias (`mediaFetchedAt`), escribiendo solo esos campos.
- `_generated/api.d.ts` se actualizo a mano porque no habia deployment configurado; `npx convex dev` lo regenera igual.

### Variables de entorno (Convex)

| Variable | Efecto |
| --- | --- |
| `CATALOG_SYNC_ENABLED=true` | Activa cron, trigger HTTP y drenaje de webhooks. Sin ella son no-ops. Las ejecuciones manuales la ignoran. |
| `SYNC_TRIGGER_SECRET` | Secreto Bearer de `POST /sync/trigger`. Sin ella el endpoint responde 401. |
| `IGDB_WEBHOOK_SECRET` | Secreto `X-Secret` de los webhooks. Sin ella el endpoint responde 401. |

### Operacion

```bash
# Paso 3 del despliegue: lote de 100 en seco (no escribe ni mueve el cursor)
npx convex run catalogSync:start '{"jobType":"recent_releases","manual":true,"dryRun":true,"maxPages":1}'
# Paso 4: el mismo lote con escritura
npx convex run catalogSync:start '{"jobType":"recent_releases","manual":true,"maxPages":1}'
# Backfill manual, una pagina; repetir para continuar desde el cursor
npx convex run catalogSync:start '{"jobType":"backfill","manual":true,"minRatingCount":20}'
# Webhooks (una vez por deployment, con IGDB_WEBHOOK_SECRET definido)
npx convex run catalogSync:registerIgdbWebhooks
# Disparador externo (solo si el cron de Convex resulta ser el limite)
curl -X POST "$CONVEX_SITE_URL/sync/trigger" -H "Authorization: Bearer $SYNC_TRIGGER_SECRET" \
  -d '{"jobType":"recent_releases","maxPages":3}'
```

Los contadores de cada ejecucion quedan en `syncJobs` y en el panel de administracion. `checkHealth` escribe un `console.error` con el prefijo `[catalogSync] ALERT` cuando un job pierde dos periodos; la alerta externa se configura sobre ese log.

### Pendiente (requiere un deployment real)

- Fase 0: tabla de mediciones iniciales y finales (solicitudes, lecturas/escrituras, transferencia, duracion) con el lote de 100 en desarrollo.
- Pasos 3 a 8 del despliegue gradual y la observacion de 7 y 30 dias.
- Paso 9: retirar `seedTrendingGames`, `seedNewReleases`, `seedTopRatedGames`, `seedGamesByCategory` y `upsertFromIgdb` cuando el panel de administracion deje de usarlos.
