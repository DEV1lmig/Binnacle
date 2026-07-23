"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ArticleEditor } from "./ArticleEditor";
import { ArticleGamePicker, type PickedGame } from "./ArticleGamePicker";
import { ArticleMetaPanel, type ArticleType } from "./ArticleMetaPanel";
import { ArticleCoverField } from "./ArticleCoverField";
import { C, FONT_HEADING, FONT_MONO, FONT_BODY } from "@/app/lib/design-system";

const EMPTY_CONTENT = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });
const autosaveDelayMs = 4000;

type ArticleFormProps = {
  articleId?: Id<"articles">;
  initialGameId?: Id<"games">;
};

export function ArticleForm({ articleId: initialArticleId, initialGameId }: ArticleFormProps) {
  const router = useRouter();

  const existing = useQuery(api.articles.getById, initialArticleId ? { articleId: initialArticleId } : "skip");
  const preselectGame = useQuery(api.games.getById, initialGameId ? { gameId: initialGameId } : "skip");

  const createArticle = useMutation(api.articles.create);
  const updateArticle = useMutation(api.articles.update);
  const publishArticle = useMutation(api.articles.publish);

  const [articleId, setArticleId] = useState<Id<"articles"> | null>(initialArticleId ?? null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(EMPTY_CONTENT);
  const [excerpt, setExcerpt] = useState("");
  const [type, setType] = useState<ArticleType | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [coverUrl, setCoverUrl] = useState("");
  const [games, setGames] = useState<PickedGame[]>([]);

  const [hydrated, setHydrated] = useState(!initialArticleId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from an existing draft.
  useEffect(() => {
    if (!initialArticleId || hydrated || existing === undefined) return;
    if (existing === null) {
      setError("Article not found.");
      setHydrated(true);
      return;
    }

    setTitle(existing.title);
    setContent(existing.content);
    setExcerpt(existing.excerpt ?? "");
    setType(existing.type as ArticleType | undefined);
    setTags(existing.tags ?? []);
    setContainsSpoilers(existing.containsSpoilers);
    setCoverUrl(existing.coverUrl ?? "");
    setGames(existing.games);
    setHydrated(true);
  }, [existing, initialArticleId, hydrated]);

  // Preselect a game passed via ?gameId= when starting a fresh article.
  useEffect(() => {
    if (initialArticleId || !preselectGame || games.length > 0) return;
    setGames([
      {
        _id: preselectGame._id,
        title: preselectGame.title,
        coverUrl: preselectGame.coverUrl ?? undefined,
        releaseYear: preselectGame.releaseYear ?? undefined,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectGame, initialArticleId]);

  const isReadyForAutosave = hydrated;

  const persist = async (): Promise<Id<"articles"> | null> => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return articleId;
    }

    setIsSaving(true);
    setError(null);

    try {
      const gameIds = games.map((g) => g._id);

      if (!articleId) {
        const newId = await createArticle({
          title: trimmedTitle,
          content,
          excerpt: excerpt.trim() ? excerpt.trim() : undefined,
          type,
          tags,
          containsSpoilers,
          coverUrl: coverUrl.trim() ? coverUrl.trim() : undefined,
          gameIds,
        });
        setArticleId(newId);
        setLastSavedAt(Date.now());
        return newId;
      }

      await updateArticle({
        articleId,
        title: trimmedTitle,
        content,
        excerpt: excerpt.trim() ? excerpt.trim() : undefined,
        type,
        tags,
        containsSpoilers,
        coverUrl: coverUrl.trim() ? coverUrl.trim() : undefined,
        gameIds,
      });
      setLastSavedAt(Date.now());
      return articleId;
    } catch (submissionError) {
      console.error("[ArticleForm] Failed to save article", submissionError);
      setError(submissionError instanceof Error ? submissionError.message : "Failed to save your draft.");
      return articleId;
    } finally {
      setIsSaving(false);
    }
  };

  // Debounced autosave whenever meaningful fields change.
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isReadyForAutosave) return;
    if (!title.trim()) return;

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(() => {
      void persist();
    }, autosaveDelayMs);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, excerpt, type, tags, containsSpoilers, coverUrl, games, isReadyForAutosave]);

  const handlePublish = async () => {
    if (!title.trim()) {
      setError("Add a title before publishing.");
      return;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const id = await persist();
      if (!id) {
        setError("Add a title before publishing.");
        return;
      }

      await publishArticle({ articleId: id });
      router.replace(`/article/${id}`);
    } catch (submissionError) {
      console.error("[ArticleForm] Failed to publish article", submissionError);
      setError(submissionError instanceof Error ? submissionError.message : "Failed to publish your article.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSaveDraft = async () => {
    const id = await persist();
    if (id) {
      router.push(`/profile`);
    }
  };

  const fallbackCoverUrl = games.find((g) => g.coverUrl)?.coverUrl;

  return (
    <div className="min-h-screen pb-20 md:pb-8" style={{ backgroundColor: C.bg }}>
      <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 transition-colors"
          style={{ color: C.textMuted, fontFamily: FONT_MONO, fontSize: 12 }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 2 }}>
          <header className="p-6" style={{ borderBottom: `1px solid ${C.border}` }}>
            <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 200, color: C.text }}>
              {articleId ? "Edit Article" : "Write an Article"}
            </h1>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              {isSaving
                ? "Saving…"
                : lastSavedAt
                  ? `Draft saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "Drafts save automatically as you write."}
            </p>
          </header>

          <div className="grid gap-6 p-6">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Article title…"
              style={{
                backgroundColor: C.bgAlt,
                borderColor: C.border,
                color: C.text,
                borderRadius: 2,
                fontSize: 20,
                fontFamily: FONT_HEADING,
                height: 52,
              }}
            />

            <ArticleEditor content={content} onChange={setContent} />

            <div className="grid gap-2">
              <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Excerpt (optional — auto-generated if left blank)
              </p>
              <Textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A short teaser for cards and previews…"
                className="min-h-[72px] resize-none"
                style={{ backgroundColor: C.bgAlt, borderColor: C.border, color: C.text, borderRadius: 2, fontSize: 14, fontFamily: FONT_BODY }}
              />
            </div>

            <div>
              <p style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Games (optional)
              </p>
              <ArticleGamePicker selected={games} onChange={setGames} />
            </div>

            <ArticleCoverField value={coverUrl} onChange={setCoverUrl} fallbackCoverUrl={fallbackCoverUrl} />

            <ArticleMetaPanel
              type={type}
              onTypeChange={setType}
              tags={tags}
              onTagsChange={setTags}
              containsSpoilers={containsSpoilers}
              onSpoilersChange={setContainsSpoilers}
            />

            {error ? (
              <div className="p-3 rounded-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", border: `1px solid ${C.red}`, color: C.red, fontFamily: FONT_BODY, fontSize: 13 }}>
                {error}
              </div>
            ) : null}

            <footer className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={!title.trim() || isSaving || isPublishing}
              >
                Save as draft
              </Button>
              <Button
                type="button"
                onClick={handlePublish}
                disabled={!title.trim() || isPublishing}
                className="text-white disabled:opacity-50"
                style={{ backgroundColor: C.gold }}
              >
                {isPublishing ? "Publishing…" : "Publish Article"}
              </Button>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
