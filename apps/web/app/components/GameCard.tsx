import { ImageWithFallback } from './figma/ImageWithFallback';
import { StatusBadge } from './StatusBadge';
import { Star, Clock } from 'lucide-react';
import { C, FONT_BODY, FONT_MONO } from '@/app/lib/design-system';
import type { Game } from '@/app/lib/mockData';

interface GameCardProps {
  game: Partial<Game> & {
    id?: string;
    _id?: string;
    title: string;
    cover?: string;
    coverUrl?: string;
    rating?: number;
    aggregatedRating?: number;
    status?: string;
    releaseYear?: number;
  };
  onClick?: () => void;
  variant?: 'default' | 'compact';
}

export type GameCardGame = GameCardProps["game"];

export function GameCard({ game, onClick, variant = 'default' }: GameCardProps) {
  const coverImage = game.cover || game.coverUrl || '';
  const rating = game.rating || game.aggregatedRating || 0;

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="group w-full overflow-hidden transition-all text-left"
        style={{
          borderRadius: 2,
          border: `1px solid ${C.border}`,
          background: C.surface,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = C.gold;
          e.currentTarget.style.boxShadow = `0 0 20px ${C.bloom}`;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = C.border;
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div className="aspect-[2/3] w-full overflow-hidden relative">
          <ImageWithFallback
            src={coverImage}
            alt={game.title}
          />
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              background: `linear-gradient(to top, ${C.bg}, transparent)`,
            }}
          />

          {game.status && (
            <div className="absolute top-2 right-2">
              <StatusBadge status={game.status} label="" />
            </div>
          )}

          <div
            className="absolute bottom-2 left-2 flex items-center gap-1 backdrop-blur-sm px-2 py-1"
            style={{
              background: `${C.bg}d9`,
              borderRadius: 2,
            }}
          >
            <Star
              className="w-3 h-3"
              style={{ fill: C.amber, color: C.amber }}
            />
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: 12,
                fontWeight: 600,
                color: C.text,
              }}
            >
              {rating ? (rating / 10).toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        <div className="p-3 h-[60px] flex flex-col justify-between">
          <h3
            className="line-clamp-2"
            style={{
              fontFamily: FONT_BODY,
              fontSize: 14,
              fontWeight: 500,
              color: C.text,
            }}
          >
            {game.title}
          </h3>
          {game.releaseYear && (
            <p
              style={{
                fontFamily: FONT_MONO,
                fontSize: 11,
                color: C.textDim,
                textTransform: 'uppercase',
              }}
            >
              {game.releaseYear}
            </p>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group w-full text-left overflow-hidden transition-all"
      style={{
        borderRadius: 2,
        border: `1px solid ${C.border}`,
        background: C.surface,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.gold;
        e.currentTarget.style.boxShadow = `0 0 20px ${C.bloom}`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div className="flex gap-4 p-4">
        <div
          className="w-24 h-36 flex-shrink-0 overflow-hidden"
          style={{ borderRadius: 2 }}
        >
          <ImageWithFallback
            src={game.cover}
            alt={game.title}
          />
          {game.userRating && (
            <div
              className="absolute top-2 right-2 flex items-center gap-1 backdrop-blur-sm px-2 py-1"
              style={{
                background: `${C.bg}d9`,
                borderRadius: 2,
              }}
            >
              <Star
                className="w-3 h-3"
                style={{ fill: C.amber, color: C.amber }}
              />
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 12,
                  fontWeight: 600,
                  color: C.text,
                }}
              >
                {game.userRating}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3
                className="line-clamp-2"
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  fontWeight: 500,
                  color: C.text,
                }}
              >
                {game.title}
              </h3>
              <p
                className="mt-1"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  color: C.textDim,
                  textTransform: 'uppercase',
                }}
              >
                {[game.releaseYear, game.developer].filter(Boolean).join(' / ') || ''}
              </p>
            </div>
            {game.status && <StatusBadge status={game.status} />}
          </div>

          {game.genre && (
            <div className="flex flex-wrap gap-2 mb-2">
              {game.genre.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-1"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: C.textMuted,
                    background: C.bgAlt,
                    borderRadius: 2,
                  }}
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-3">
            {game.rating && (
              <div className="flex items-center gap-1">
                <Star
                  className="w-4 h-4"
                  style={{ fill: C.amber, color: C.amber }}
                />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                  }}
                >
                  {game.rating.toFixed(1)}
                </span>
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 11,
                    color: C.textDim,
                  }}
                >
                  / 5.0
                </span>
              </div>
            )}
            {game.playTime && (
              <div className="flex items-center gap-1" style={{ color: C.textMuted }}>
                <Clock className="w-4 h-4" />
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 13,
                  }}
                >
                  {game.playTime}h played
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
