'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAction } from 'convex/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ArrowDown, ArrowUp, Plus, Search, Star, Trash2, Loader2, Gamepad2 } from 'lucide-react';
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from '@/app/lib/design-system';
import { CornerMarkers } from '@/app/lib/design-primitives';

export interface TopGameFormEntry {
  gameId: Id<'games'>;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
  aggregatedRating?: number;
  note?: string;
}

interface EditTopGamesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialGames: ReadonlyArray<TopGameFormEntry>;
  onSubmit: (entries: Array<{ gameId: Id<'games'>; note?: string }>) => Promise<void>;
  submitting: boolean;
  errorMessage?: string | null;
}

type SearchResult = {
  convexId: Id<'games'>;
  title: string;
  coverUrl?: string;
  releaseYear?: number;
  aggregatedRating?: number;
};

const MAX_TOP_GAMES = 5;

export function EditTopGamesDialog({
  open,
  onOpenChange,
  initialGames,
  onSubmit,
  submitting,
  errorMessage,
}: EditTopGamesDialogProps) {
  const [selected, setSelected] = useState<TopGameFormEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchAction = useAction(api.igdb.searchOptimizedWithFallback);

  useEffect(() => {
    if (open) {
      setSelected(initialGames.map((entry) => ({ ...entry, note: entry.note ?? '' })));
      setSearchTerm('');
      setSearchResults([]);
    }
  }, [open, initialGames]);

  useEffect(() => {
    const performSearch = async () => {
      const trimmed = searchTerm.trim();

      if (!open || trimmed.length < 2) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const result = await searchAction({
          query: trimmed,
          limit: 10,
          minCachedResults: 5,
          includeDLC: false,
        });

        const normalizedResults = Array.isArray((result as { results?: unknown } | null | undefined)?.results)
          ? ((result as { results: unknown[] }).results
              .map((raw): SearchResult | null => {
                if (!raw || typeof raw !== 'object') return null;
                const r = raw as Record<string, unknown>;

                const convexId = r.convexId;
                const title = r.title;
                if (typeof convexId !== 'string' || typeof title !== 'string') return null;

                const coverUrl = typeof r.coverUrl === 'string' ? r.coverUrl : undefined;
                const releaseYear = typeof r.releaseYear === 'number' ? r.releaseYear : undefined;
                const aggregatedRating = typeof r.aggregatedRating === 'number' ? r.aggregatedRating : undefined;

                return {
                  convexId: convexId as Id<'games'>,
                  title,
                  coverUrl,
                  releaseYear,
                  aggregatedRating,
                };
              })
              .filter((x): x is SearchResult => x !== null))
          : [];

        setSearchResults(normalizedResults);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [open, searchTerm, searchAction]);

  const availableResults: SearchResult[] = useMemo(() => {
    const selectedIds = new Set(selected.map((g) => g.gameId));
    return searchResults.filter((result) => !selectedIds.has(result.convexId));
  }, [searchResults, selected]);

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleNoteChange = (index: number) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setSelected((previous) =>
      previous.map((entry, position) =>
        position === index ? { ...entry, note: value } : entry,
      ),
    );
  };

  const addGame = (result: SearchResult) => {
    if (selected.length >= MAX_TOP_GAMES) return;
    const alreadySelected = selected.some((entry) => entry.gameId === result.convexId);
    if (alreadySelected) return;
    setSelected((previous) => [
      ...previous,
      {
        gameId: result.convexId,
        title: result.title,
        coverUrl: result.coverUrl,
        releaseYear: result.releaseYear,
        aggregatedRating: result.aggregatedRating,
        note: '',
      },
    ]);
  };

  const removeGame = (index: number) => {
    setSelected((previous) => previous.filter((_, position) => position !== index));
  };

  const moveGame = (index: number, direction: 'up' | 'down') => {
    setSelected((previous) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= previous.length) return previous;
      const next = [...previous];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = selected.map((entry) => ({
      gameId: entry.gameId,
      note: entry.note?.trim() ? entry.note.trim() : undefined,
    }));
    await onSubmit(payload);
  };

  const iconBtnStyle = (disabled: boolean, danger?: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: `1px solid ${danger ? C.red + '55' : C.border}`,
    borderRadius: 2,
    background: 'transparent',
    color: danger ? C.red : C.textDim,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.35 : 1,
    transition: 'border-color 0.2s, color 0.2s',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[85vh] overflow-y-auto"
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 2,
          color: C.text,
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 22,
              fontWeight: 200,
              color: C.text,
              letterSpacing: '-0.01em',
            }}
          >
            Manage Top Games
          </DialogTitle>
          <DialogDescription
            style={{
              fontFamily: FONT_BODY,
              fontSize: 13,
              color: C.textMuted,
              fontWeight: 300,
            }}
          >
            Select up to five all-time favorites to pin on your profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-2">
          {/* Search input */}
          <div className="space-y-2">
            <label
              htmlFor="top-games-search"
              style={{
                display: 'block',
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.textDim,
              }}
            >
              Search Your Favorites
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: 16, height: 16, color: C.textDim }}
              />
              <input
                id="top-games-search"
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search for a game..."
                style={{
                  width: '100%',
                  padding: '10px 14px 10px 38px',
                  background: C.bgAlt,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  color: C.text,
                  fontFamily: FONT_BODY,
                  fontSize: 14,
                  fontWeight: 300,
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = C.gold;
                  e.currentTarget.style.boxShadow = `0 0 0 1px ${C.gold}33`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            {isSearching ? (
              <p
                className="flex items-center gap-2"
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  color: C.gold,
                }}
              >
                <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />
                Searching...
              </p>
            ) : searchTerm.length > 0 && searchTerm.length < 2 ? (
              <p
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 10,
                  letterSpacing: '0.04em',
                  color: C.textDim,
                }}
              >
                Type at least two characters to see results.
              </p>
            ) : null}
          </div>

          {/* Search results */}
          {availableResults.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {availableResults.map((result) => {
                const disabled = selected.some((entry) => entry.gameId === result.convexId) || selected.length >= MAX_TOP_GAMES;
                return (
                  <button
                    key={result.convexId}
                    type="button"
                    onClick={() => addGame(result)}
                    disabled={disabled}
                    className="flex items-center gap-3 text-left"
                    style={{
                      padding: 12,
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      background: C.bgAlt,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!disabled) {
                        e.currentTarget.style.borderColor = C.gold;
                        e.currentTarget.style.boxShadow = `0 0 12px ${C.bloom}`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.border;
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      className="flex-shrink-0 overflow-hidden"
                      style={{
                        width: 48,
                        height: 64,
                        borderRadius: 2,
                        backgroundColor: C.bg,
                      }}
                    >
                      <ImageWithFallback src={result.coverUrl} alt={result.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                          fontWeight: 400,
                          color: C.text,
                        }}
                      >
                        {result.title}
                      </p>
                      <div
                        className="flex items-center gap-2 mt-1"
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          color: C.textDim,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {result.releaseYear && <span>{result.releaseYear}</span>}
                        {result.aggregatedRating != null && (
                          <span className="flex items-center gap-1">
                            <Star style={{ width: 10, height: 10, color: C.amber }} />
                            {(result.aggregatedRating / 10).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="flex items-center gap-1 flex-shrink-0"
                      style={{
                        padding: '3px 8px',
                        border: `1px solid ${C.gold}33`,
                        borderRadius: 2,
                        fontFamily: FONT_MONO,
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: C.gold,
                      }}
                    >
                      <Plus style={{ width: 10, height: 10 }} /> Add
                    </span>
                  </button>
                );
              })}
            </div>
          ) : searchTerm.trim().length >= 2 && !isSearching ? (
            <div
              className="relative flex items-center justify-center py-8"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                background: C.bgAlt,
              }}
            >
              <CornerMarkers size={6} />
              <p
                style={{
                  fontFamily: FONT_BODY,
                  fontSize: 13,
                  color: C.textDim,
                }}
              >
                No results found. Try a different search.
              </p>
            </div>
          ) : null}

          {/* Selected games */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: FONT_HEADING,
                  fontSize: 18,
                  fontWeight: 200,
                  color: C.text,
                }}
              >
                Selected Games
              </span>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  color: selected.length >= MAX_TOP_GAMES ? C.amber : C.textDim,
                }}
              >
                {selected.length}/{MAX_TOP_GAMES}
              </span>
            </div>

            {selected.length > 0 ? (
              <div className="space-y-3">
                {selected.map((entry, index) => (
                  <div
                    key={entry.gameId}
                    className="relative"
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 2,
                      background: C.bgAlt,
                      padding: 16,
                    }}
                  >
                    <CornerMarkers size={6} />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        {/* Rank badge */}
                        <span
                          className="flex items-center justify-center flex-shrink-0"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            background: `${C.gold}15`,
                            color: C.gold,
                            fontFamily: FONT_MONO,
                            fontSize: 12,
                            fontWeight: 500,
                            letterSpacing: '0.05em',
                          }}
                        >
                          #{index + 1}
                        </span>

                        {/* Cover thumb */}
                        <div
                          className="flex-shrink-0 overflow-hidden"
                          style={{
                            width: 40,
                            height: 52,
                            borderRadius: 2,
                            backgroundColor: C.bg,
                          }}
                        >
                          {entry.coverUrl ? (
                            <img
                              src={entry.coverUrl}
                              alt={entry.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              <Gamepad2 style={{ width: 16, height: 16, color: C.textDim }} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p
                            className="truncate"
                            style={{
                              fontFamily: FONT_BODY,
                              fontSize: 14,
                              fontWeight: 400,
                              color: C.text,
                            }}
                          >
                            {entry.title}
                          </p>
                          <div
                            className="flex items-center gap-3 mt-0.5"
                            style={{
                              fontFamily: FONT_MONO,
                              fontSize: 10,
                              color: C.textDim,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {entry.releaseYear && <span>{entry.releaseYear}</span>}
                            {entry.aggregatedRating != null && (
                              <span className="flex items-center gap-1">
                                <Star style={{ width: 10, height: 10, color: C.amber }} />
                                {(entry.aggregatedRating / 10).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Reorder + remove buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => moveGame(index, 'up')}
                          disabled={index === 0}
                          style={iconBtnStyle(index === 0)}
                          aria-label="Move up"
                        >
                          <ArrowUp style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveGame(index, 'down')}
                          disabled={index === selected.length - 1}
                          style={iconBtnStyle(index === selected.length - 1)}
                          aria-label="Move down"
                        >
                          <ArrowDown style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGame(index)}
                          style={iconBtnStyle(false, true)}
                          aria-label="Remove"
                        >
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="mt-3">
                      <label
                        htmlFor={`top-game-note-${index}`}
                        style={{
                          display: 'block',
                          fontFamily: FONT_MONO,
                          fontSize: 9,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: C.textDim,
                          marginBottom: 4,
                        }}
                      >
                        Optional Note
                      </label>
                      <textarea
                        id={`top-game-note-${index}`}
                        value={entry.note ?? ''}
                        onChange={handleNoteChange(index)}
                        placeholder="Why is this game in your top five?..."
                        maxLength={140}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: C.bg,
                          border: `1px solid ${C.border}`,
                          borderRadius: 2,
                          color: C.text,
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                          fontWeight: 300,
                          outline: 'none',
                          resize: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = C.gold;
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = C.border;
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="relative flex flex-col items-center justify-center py-10"
                style={{
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  background: C.bgAlt,
                }}
              >
                <CornerMarkers size={6} />
                <Gamepad2 style={{ width: 28, height: 28, color: C.textDim, marginBottom: 8 }} />
                <p
                  style={{
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    color: C.textDim,
                  }}
                >
                  No games selected yet. Search above to add favorites.
                </p>
              </div>
            )}
          </div>

          {errorMessage && (
            <div
              className="px-3 py-2"
              style={{
                border: `1px solid ${C.red}33`,
                borderRadius: 2,
                background: `${C.red}08`,
              }}
            >
              <p
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  color: C.red,
                }}
              >
                {errorMessage}
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                background: 'transparent',
                color: C.textMuted,
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.5 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2"
              style={{
                border: 'none',
                borderRadius: 2,
                background: C.gold,
                color: C.bg,
                fontFamily: FONT_MONO,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 500,
                cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: `0 0 16px ${C.bloom}`,
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting && (
                <Loader2
                  className="animate-spin"
                  style={{ width: 14, height: 14 }}
                />
              )}
              {submitting ? 'Saving...' : 'Save Selection'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
