"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { AdSpace } from "@/app/components/AdSpace";
import { type FeedReviewEntry } from "./components/FeedReviewList";
import { FeedActivityList, type FeedArticleEntry } from "./components/FeedActivityList";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Skeleton } from "@/app/components/ui/skeleton";
import { FeedPageSkeleton } from "@/app/components/PageSkeleton";
import { PenLine, BookOpen, ArrowRight, Compass, ChevronRight, Sparkles } from "lucide-react";
import { Cover, OpenCaseLink, PageHero, Pill, Prompt, SectionHeading, Segmented, StatusChip, type LibraryItem } from "@/app/components/playchive";
import { MoveMenu } from "@/app/components/playchive/LibraryCard";
import { useScrollReveal } from "@/app/lib/useScrollReveal";
import { mediumOf } from "@/app/lib/medium";

type ActivityTab = "friends" | "community";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function FeedPage() {
  const router = useRouter();
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [tab, setTab] = useState<ActivityTab>("community");

  const timeline = useQuery(api.feed.timeline, currentUser ? { limit: 30, includeArticles: true } : "skip");
  const people = useQuery(api.users.search, { query: "", limit: 30 });
  const playing = useQuery(api.backlog.listForUser, currentUser ? { userId: currentUser._id, status: "playing", limit: 12 } : "skip");
  const stats = useQuery(api.backlog.getStatsForUser, currentUser ? { userId: currentUser._id } : "skip");
  const trending = useQuery(api.games.getTrendingGames, { limit: 12 });

  const community = useMemo(() => (timeline?.community ?? []) as FeedReviewEntry[], [timeline]);
  const friends = useMemo(() => (timeline?.friends ?? []) as FeedReviewEntry[], [timeline]);
  const communityArticles = useMemo(() => (timeline?.articleCommunity ?? []) as FeedArticleEntry[], [timeline]);
  const friendArticles = useMemo(() => (timeline?.articleFriends ?? []) as FeedArticleEntry[], [timeline]);

  const activityReviews = tab === "friends" ? friends : community;
  const activityArticles = tab === "friends" ? friendArticles : communityArticles;

  const peopleToShow = useMemo(() => (people ?? []).filter(u => !currentUser || u._id !== currentUser._id).slice(0, 5), [people, currentUser]);
  const friendShelf = useMemo(() => {
    const seen = new Set<string>();
    return friends.map(e => e.game).filter(g => (seen.has(g._id) ? false : (seen.add(g._id), true))).slice(0, 8);
  }, [friends]);
  const trendingGames = (trending?.games ?? []) as { _id: string; title: string; coverUrl?: string }[];

  const shelfRef = useRef<HTMLDivElement>(null);
  const shelfReveal = useScrollReveal(shelfRef, "pk-reveal");
  const activityRef = useRef<HTMLDivElement>(null);
  const activityReveal = useScrollReveal(activityRef, "pk-reveal");

  if (isUserLoading || !currentUser) return <FeedPageSkeleton />;

  const loading = timeline === undefined;
  const firstName = currentUser.name.split(" ")[0];
  const playingItems = (playing ?? []) as LibraryItem[];
  const friendCount = friends.length + friendArticles.length;

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-bg">
      <PageHero
        tone="cobalt"
        eyebrow={<>{greeting()}, {firstName}</>}
        title={<>What are you <em>playing</em> today?</>}
        lede="Keep your shelf honest, tell people what stayed with you, and find your next favorite from friends who play like you."
        aside={<>
          <Pill href="/review/new" tone="gold"><PenLine size={17} />Write a review</Pill>
          <Pill href="/article/new" tone="ghost"><BookOpen size={17} />Tell a story</Pill>
        </>}
        strip={stats ? (
          [
            { key: "playing", label: "Playing", value: stats.playing },
            { key: "want_to_play", label: "In the backlog", value: stats.want_to_play },
            { key: "completed", label: "Finished", value: stats.completed },
            { key: "total", label: "On your shelf", value: stats.total },
          ].map(s => (
            <Link key={s.key} href={`/backlog${s.key === "total" ? "" : `?status=${s.key}`}`} className="pk-stat">
              <strong>{s.value}</strong><span>{s.label}</span>
            </Link>
          ))
        ) : [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-32 rounded-xl bg-white/10" />)}
      />

      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        {/* Now playing: the user’s own shelf, moveable in place. */}
        <section ref={shelfRef} className={`${shelfReveal} pt-10`}>
          <SectionHeading eyebrow={<>Now playing <b>{playingItems.length ? String(playingItems.length).padStart(2, "0") : ""}</b></>} title={playingItems.length ? "Pick up where you left off." : "Your shelf is quiet."} action={{ label: "Open my library", href: "/backlog" }} />
          {playing === undefined ? (
            <div className="pk-shelf">{[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-surface" />)}</div>
          ) : playingItems.length ? (
            <div className="pk-shelf">
              {playingItems.map(item => item.game && (
                <div key={item._id} className="pk-lib">
                  <OpenCaseLink href={`/game/${item.game._id}`} gameId={item.game._id} coverUrl={item.game.coverUrl} title={item.game.title} className="pk-lib-cover" aria-label={item.game.title}>
                    <StatusChip status={item.status} />
                    <Cover src={item.game.coverUrl} title={item.game.title} sizes="148px" gameId={item.game._id} medium={mediumOf(item.game)} />
                  </OpenCaseLink>
                  <p className="pk-lib-title">{item.game.title}</p>
                  <div className="pk-lib-meta"><span>{item.platform ?? item.game.releaseYear ?? ""}</span><MoveMenu item={item} compact /></div>
                </div>
              ))}
              <Link href="/discover" className="pk-cover grid place-items-center text-center bg-surface text-textMuted hover:text-white" data-tilt="true" style={{ boxShadow: "none", border: "1px dashed #2D3E59" }}>
                <span className="px-3 text-sm font-semibold"><Compass className="mx-auto mb-2" size={22} />Add a game</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Prompt tone="gold" eyebrow="Start here" title="Mark what you’re playing right now." text="Games you flag as Playing show up here so you can jump back in and move them when you’re done." href="/discover" cta="Find a game" />
              <Prompt tone="night" eyebrow="Or catch up" title="Your backlog is waiting." text="Anything you saved for later lives in your library, ready to move to Playing." href="/backlog?status=want_to_play" cta="Open the backlog" />
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-10 pt-12">
          <div ref={activityRef} className={`${activityReveal} min-w-0`}>
            <SectionHeading eyebrow="The feed" title={tab === "friends" ? "From people you follow." : "What the community is saying."}>
              <Segmented value={tab} onChange={setTab} label="Activity source" options={[{ value: "friends", label: "For you", count: friendCount || undefined }, { value: "community", label: "Everyone" }]} />
            </SectionHeading>
            <FeedActivityList
              reviewEntries={activityReviews}
              articleEntries={activityArticles}
              isLoading={loading}
              emptyMessage={tab === "friends" ? "Follow a few players and their reviews and stories will land here." : "No one has posted yet. Be the first review on Playchive."}
              emptyAction={tab === "friends" ? { label: "Find people", href: "/discover/people" } : { label: "Write a review", href: "/review/new" }}
            />

            {friendShelf.length > 0 && (
              <section className="pt-12">
                <SectionHeading eyebrow="On your friends’ shelves" title="Games your people are talking about." action={{ label: "See all reviews", onClick: () => setTab("friends") }} />
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                  {friendShelf.map(game => (
                    <OpenCaseLink key={game._id} href={`/game/${game._id}`} gameId={game._id} coverUrl={game.coverUrl} title={game.title} className="pk-lib" aria-label={game.title}>
                      <Cover src={game.coverUrl} title={game.title} sizes="180px" gameId={game._id} medium={mediumOf(game)} />
                      <p className="pk-lib-title">{game.title}</p>
                    </OpenCaseLink>
                  ))}
                </div>
              </section>
            )}

            <section className="pt-12">
              <SectionHeading eyebrow="Trending on Playchive" title="Big right now." action={{ label: "Explore more", href: "/discover" }} />
              {trending === undefined ? (
                <div className="pk-shelf">{[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-surface" />)}</div>
              ) : (
                <div className="pk-shelf">
                  {trendingGames.map(game => (
                    <OpenCaseLink key={game._id} href={`/game/${game._id}`} gameId={game._id} coverUrl={game.coverUrl} title={game.title} className="pk-lib" aria-label={game.title}>
                      <Cover src={game.coverUrl} title={game.title} sizes="148px" gameId={game._id} medium={mediumOf(game)} />
                      <p className="pk-lib-title">{game.title}</p>
                    </OpenCaseLink>
                  ))}
                </div>
              )}
            </section>

            <div className="pt-8"><AdSpace variant="banner" /></div>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <Prompt tone="orange" eyebrow={<><Sparkles size={13} aria-hidden="true" /> Stories</>} title="Got a take longer than a rating?" text="Write an article: criticism, opinion or analysis. Spoiler-gated, linked to the games it’s about." href="/article/new" cta="Start writing" />

            <section className="pk-panel">
              <div className="flex items-baseline justify-between gap-3">
                <h3>People to follow</h3>
                <Link href="/discover/people" className="pk-textlink text-sm py-0">All<ArrowRight size={14} /></Link>
              </div>
              {people === undefined ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg bg-bgAlt" />)}</div>
              ) : peopleToShow.length === 0 ? (
                <p className="text-sm text-textMuted">No players to suggest yet.</p>
              ) : peopleToShow.map(u => (
                <button key={u._id} type="button" className="pk-person" onClick={() => router.push(`/profile/${u.username}`)}>
                  <Avatar className="h-9 w-9 rounded-full">
                    <AvatarImage src={u.avatarUrl} alt="" />
                    <AvatarFallback className="bg-primary text-white text-xs">{u.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1"><p className="truncate">{u.name}</p><p className="truncate">@{u.username}</p></div>
                  <ChevronRight size={15} className="text-textDim" />
                </button>
              ))}
            </section>

            <section className="pk-panel">
              <h3>Quick actions</h3>
              <div className="flex flex-col gap-2">
                <Pill href="/review/new" tone="gold" size="sm"><PenLine size={15} />Write a review</Pill>
                <Pill href="/discover" tone="ghost" size="sm"><Compass size={15} />Discover games</Pill>
                <Pill href="/backlog" tone="ghost" size="sm"><ArrowRight size={15} />Open my library</Pill>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
