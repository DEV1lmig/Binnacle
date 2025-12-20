'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAction } from 'convex/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ArrowDown, ArrowUp, Plus, Search, Star, Trash2 } from 'lucide-react';

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
  
  // Use action for search (same as Discover page) - supports IGDB fallback
  const searchAction = useAction(api.igdb.searchOptimizedWithFallback);

  useEffect(() => {
    if (open) {
      setSelected(initialGames.map((entry) => ({ ...entry, note: entry.note ?? '' })));
      setSearchTerm('');
      setSearchResults([]);
    }
  }, [open, initialGames]);

  // Perform search with debouncing
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
        
        const normalizedResults = Array.isArray(result?.results)
          ? result.results.map((r: any) => ({
              convexId: r.convexId as Id<'games'>,
              title: r.title as string,
              coverUrl: r.coverUrl as string | undefined,
              releaseYear: r.releaseYear as number | undefined,
              aggregatedRating: r.aggregatedRating as number | undefined,
            }))
          : [];
        
        setSearchResults(normalizedResults);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search to avoid excessive API calls
    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [open, searchTerm, searchAction]);

  const availableResults: SearchResult[] = useMemo(() => {
    // Filter out already-selected games
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
    if (selected.length >= MAX_TOP_GAMES) {
      return;
    }
    const alreadySelected = selected.some((entry) => entry.gameId === result.convexId);
    if (alreadySelected) {
      return;
    }
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
      if (targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage top games</DialogTitle>
          <DialogDescription>Select up to five all-time favorites to pin on your profile.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="top-games-search">Search your favorites</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--bkl-color-text-secondary)]" />
              <Input
                id="top-games-search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search for a game"
                className="pl-9"
              />
            </div>
            {isSearching ? (
              <p className="text-xs text-[var(--bkl-color-accent-primary)] animate-pulse">Searching...</p>
            ) : searchTerm.length > 0 && searchTerm.length < 2 ? (
              <p className="text-xs text-[var(--bkl-color-text-secondary)]">Type at least two characters to see results.</p>
            ) : null}
          </div>

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
                    className="flex items-center gap-3 rounded-[var(--bkl-radius-md)] border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-primary)] p-3 text-left hover:border-[var(--bkl-color-accent-primary)] disabled:opacity-50"
                  >
                    <div className="relative w-12 h-16 overflow-hidden rounded-md">
                      <ImageWithFallback src={result.coverUrl} alt={result.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--bkl-color-text-primary)]" style={{ fontWeight: 'var(--bkl-font-weight-semibold)' }}>
                        {result.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[var(--bkl-color-text-secondary)]">
                        {result.releaseYear ? <span>{result.releaseYear}</span> : null}
                        {result.aggregatedRating ? (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-[var(--bkl-color-accent-secondary)]" />
                            {(result.aggregatedRating / 10).toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : searchTerm.trim().length >= 2 && !isSearching ? (
            <p className="text-sm text-[var(--bkl-color-text-secondary)]">No results found. Try a different search.</p>
          ) : null}

          <div className="space-y-4">
            <h4 className="text-[var(--bkl-color-text-primary)]" style={{ fontSize: 'var(--bkl-font-size-lg)', fontWeight: 'var(--bkl-font-weight-semibold)' }}>
              Selected games ({selected.length}/{MAX_TOP_GAMES})
            </h4>
            {selected.length > 0 ? (
              <div className="space-y-4">
                {selected.map((entry, index) => (
                  <div
                    key={entry.gameId}
                    className="rounded-[var(--bkl-radius-md)] border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-primary)] p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bkl-color-accent-primary)]/10 text-[var(--bkl-color-accent-primary)] font-semibold">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-[var(--bkl-color-text-primary)]" style={{ fontWeight: 'var(--bkl-font-weight-semibold)' }}>
                            {entry.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-[var(--bkl-color-text-secondary)]">
                            {entry.releaseYear ? <span>{entry.releaseYear}</span> : null}
                            {entry.aggregatedRating ? (
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-[var(--bkl-color-accent-secondary)]" />
                                {(entry.aggregatedRating / 10).toFixed(1)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => moveGame(index, 'up')}
                          disabled={index === 0}
                          className="border-[var(--bkl-color-border)]"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => moveGame(index, 'down')}
                          disabled={index === selected.length - 1}
                          className="border-[var(--bkl-color-border)]"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeGame(index)}
                          className="border-red-500 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`top-game-note-${index}`}>Optional note</Label>
                      <Textarea
                        id={`top-game-note-${index}`}
                        value={entry.note ?? ''}
                        onChange={handleNoteChange(index)}
                        placeholder="Why is this game in your top five?"
                        maxLength={140}
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--bkl-color-text-secondary)]">No games selected yet.</p>
            )}
          </div>

          {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90">
              {submitting ? 'Saving...' : 'Save selection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
