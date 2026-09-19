import http from "./clerk";
import { registerSyncRoutes } from "./syncHttp";

registerSyncRoutes(http);

export default http;
