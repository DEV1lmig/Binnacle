import { ImageWithFallback } from './figma/ImageWithFallback';
import { StatusBadge } from './StatusBadge';
import { Star, Clock } from 'lucide-react';
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
  // Handle both mock data and backend data
  const coverImage = game.cover || game.coverUrl || '';
  const rating = game.rating || game.aggregatedRating || 0;
  
  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        className="group relative overflow-hidden rounded-[var(--bkl-radius-md)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] transition-all hover:shadow-[var(--bkl-shadow-glow)] bg-[var(--bkl-color-bg-secondary)]"
      >
        <div className="aspect-[2/3] relative">
          <ImageWithFallback
            src={coverImage}
            alt={game.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bkl-color-bg-primary)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {game.status && (
            <div className="absolute top-2 right-2">
              <StatusBadge status={game.status} label="" />
            </div>
          )}

          <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-[var(--bkl-color-bg-primary)]/80 backdrop-blur-sm px-2 py-1 rounded-[var(--bkl-radius-sm)]">
            <Star className="w-3 h-3 fill-[var(--bkl-color-accent-secondary)] text-[var(--bkl-color-accent-secondary)]" />
            <span 
              className="text-[var(--bkl-color-text-primary)]"
              style={{ fontSize: 'var(--bkl-font-size-xs)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
            >
              {rating ? (rating / 10).toFixed(1) : '0.0'}
            </span>
          </div>
        </div>
        
        <div className="p-3">
          <h3 
            className="text-[var(--bkl-color-text-primary)] line-clamp-2 mb-1"
            style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
          >
            {game.title}
          </h3>
          <p 
            className="text-[var(--bkl-color-text-disabled)]"
            style={{ fontSize: 'var(--bkl-font-size-xs)' }}
          >
            {game.releaseDate_human ? new Date(game.releaseDate_human).getFullYear() : 'N/A'}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] overflow-hidden hover:border-[var(--bkl-color-accent-primary)] transition-all hover:shadow-[var(--bkl-shadow-glow)]"
    >
      <div className="flex gap-4 p-4">
        <div className="relative w-24 h-36 flex-shrink-0 rounded-[var(--bkl-radius-md)] overflow-hidden">
          <ImageWithFallback
            src={game.cover}
            alt={game.title}
            className="w-full h-full object-cover"
          />
          {game.userRating && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-[var(--bkl-color-bg-primary)]/90 backdrop-blur-sm px-2 py-1 rounded-[var(--bkl-radius-sm)]">
              <Star className="w-3 h-3 fill-[var(--bkl-color-accent-secondary)] text-[var(--bkl-color-accent-secondary)]" />
              <span 
                className="text-[var(--bkl-color-text-primary)]"
                style={{ fontSize: 'var(--bkl-font-size-xs)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
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
                className="text-[var(--bkl-color-text-primary)] line-clamp-2"
                style={{ fontSize: 'var(--bkl-font-size-lg)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
              >
                {game.title}
              </h3>
              <p 
                className="text-[var(--bkl-color-text-secondary)] mt-1"
                style={{ fontSize: 'var(--bkl-font-size-xs)' }}
              >
                {game.releaseDate_human ? new Date(game.releaseDate_human).getFullYear() : 'N/A'} • {game.developer}
              </p>
            </div>
            {game.status && <StatusBadge status={game.status} />}
          </div>

          {game.genre && (
            <div className="flex flex-wrap gap-2 mb-2">
              {game.genre.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-1 bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)] rounded-[var(--bkl-radius-sm)]"
                  style={{ fontSize: 'var(--bkl-font-size-xs)' }}
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 mt-3">
            {game.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-[var(--bkl-color-accent-secondary)] text-[var(--bkl-color-accent-secondary)]" />
                <span 
                  className="text-[var(--bkl-color-text-primary)]"
                  style={{ fontSize: 'var(--bkl-font-size-sm)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
                >
                  {game.rating.toFixed(1)}
                </span>
                <span 
                  className="text-[var(--bkl-color-text-disabled)]"
                  style={{ fontSize: 'var(--bkl-font-size-xs)' }}
                >
                  / 5.0
                </span>
              </div>
            )}
            {game.playTime && (
              <div className="flex items-center gap-1 text-[var(--bkl-color-text-secondary)]">
                <Clock className="w-4 h-4" />
                <span style={{ fontSize: 'var(--bkl-font-size-sm)' }}>
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
