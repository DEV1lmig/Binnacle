"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Trophy, PenLine, BookOpen, ArrowRight, Clock, Gamepad2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Cover, OpenCaseLink, PageHero, Pill, ScoreMark, SectionHeading, StatusChip, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/app/components/playchive";
import { relativeTime } from "@/app/components/ReviewCard";

export interface ProfileDashboardData {
  user: { _id: Id<"users">; _creationTime: number; name: string; username: string; bio?: string; avatarUrl?: string };
  followerCount: number;
  followingCount: number;
  viewerFollows: boolean;
  viewerIsSelf: boolean;
  reviewStats: { reviewCount: number; averageRating?: number; totalPlaytimeHours: number; topPlatforms: Array<{ name: string; count: number }> };
  backlogStats: { total: number; want_to_play: number; playing: number; completed: number; dropped: number; on_hold: number };
  topGames: Array<{ rank: number; note?: string; game: { _id: Id<"games">; title: string; coverUrl?: string; releaseYear?: number; aggregatedRating?: number } }>;
  recentReviews: Array<{ _id: Id<"reviews">; _creationTime: number; rating: number; text?: string; playtimeHours?: number; platform?: string; game: { _id: Id<"games">; title: string; coverUrl?: string; releaseYear?: number } }>;
  recentArticles: Array<{ _id: Id<"articles">; _creationTime: number; title: string; excerpt?: string; type?: string; coverUrl?: string; publishedAt?: number }>;
  draftArticleCount: number;
}

interface ProfileDashboardContentProps {
  data: ProfileDashboardData;
  headerAction?: ReactNode;
  socialActions?: ReactNode;
  errorBanner?: ReactNode;
}

const TYPE_LABEL: Record<string, string> = { review: "Review", opinion: "Opinion", analysis: "Analysis" };

/** Player profile: night hero with identity and counts, hall of fame shelf, shelf breakdown, recent reviews and stories. */
export function ProfileDashboardContent({ data, headerAction, socialActions, errorBanner }: ProfileDashboardContentProps) {
  const { user, reviewStats, backlogStats } = data;
  const averageRating = reviewStats.averageRating ? reviewStats.averageRating / 10 : null;
  const memberSince = useMemo(() => new Date(user._creationTime).toLocaleDateString("en-US", { month: "long", year: "numeric" }), [user._creationTime]);
  const firstName = user.name.split(" ")[0];
  const self = data.viewerIsSelf;

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-bg">
      <PageHero
        tone="night"
        eyebrow={<>Player profile · since {memberSince}</>}
        title={<><span className="inline-flex items-center gap-4 align-middle"><Avatar className="h-[0.9em] w-[0.9em] rounded-full ring-4 ring-gold"><AvatarImage src={user.avatarUrl} alt="" /><AvatarFallback className="bg-surface text-gold text-[0.45em] font-extrabold">{user.name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>{user.name}</span></>}
        lede={<><span className="text-gold font-semibold">@{user.username}</span>{user.bio ? <> · {user.bio}</> : null}</>}
        aside={<>{headerAction}{socialActions}</>}
        strip={[
          { label: "Reviews", value: reviewStats.reviewCount, href: "#reviews" },
          { label: "Avg rating", value: averageRating ? averageRating.toFixed(1) : "—" },
          { label: "Hours logged", value: reviewStats.totalPlaytimeHours },
          { label: "On the shelf", value: backlogStats.total, href: "#shelf" },
          { label: "Followers", value: data.followerCount },
          { label: "Following", value: data.followingCount },
        ].map(s => s.href
          ? <a key={s.label} href={s.href} className="pk-stat"><strong>{s.value}</strong><span>{s.label}</span></a>
          : <div key={s.label} className="pk-stat"><strong>{s.value}</strong><span>{s.label}</span></div>)}
      >
        {errorBanner && <div className="mt-4">{errorBanner}</div>}
      </PageHero>

      <div className="max-w-[1400px] mx-auto px-5 md:px-8">
        <section className="pt-10">
          <SectionHeading eyebrow="Hall of fame" title={self ? "The games that made you." : `The games that made ${firstName}.`} />
          {data.topGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-6">
              {data.topGames.map(entry => (
                <OpenCaseLink key={entry.game._id} href={`/game/${entry.game._id}`} gameId={entry.game._id} coverUrl={entry.game.coverUrl} title={entry.game.title} className="pk-lib" aria-label={`#${entry.rank} ${entry.game.title}`}>
                  <span className="pk-lib-cover"><span className="pk-rank">#{entry.rank}</span><Cover src={entry.game.coverUrl} title={entry.game.title} sizes="(max-width: 767px) 45vw, 240px" gameId={entry.game._id} /></span>
                  <p className="pk-lib-title">{entry.game.title}</p>
                  {entry.note && <p className="text-xs italic text-textDim line-clamp-2">“{entry.note}”</p>}
                </OpenCaseLink>
              ))}
            </div>
          ) : (
            <div className="pk-empty"><Trophy size={36} /><h3>{self ? "Pick your top games" : "No top games yet"}</h3><p>{self ? "Choose up to five games that define you as a player. They lead your profile." : `${firstName} hasn’t chosen a hall of fame yet.`}</p></div>
          )}
        </section>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] pt-12">
          <div className="min-w-0 space-y-12">
            <section id="reviews">
              <SectionHeading eyebrow={<>Recent reviews <b>{reviewStats.reviewCount}</b></>} title={self ? "Your last verdicts." : "Latest verdicts."} action={self ? { label: "Write a review", href: "/review/new" } : undefined} />
              {data.recentReviews.length === 0 ? (
                <div className="pk-empty"><PenLine size={36} /><h3>No reviews yet</h3><p>{self ? "Your reviews land here and in the community feed." : `${firstName} hasn’t reviewed anything yet.`}</p>{self && <Pill href="/review/new" tone="gold" size="sm">Write the first one</Pill>}</div>
              ) : (
                <div className="space-y-3">
                  {data.recentReviews.map(review => (
                    <Link key={review._id} href={`/review/${review._id}`} className="pk-lib-row !grid-cols-[56px_minmax(0,1fr)_auto]">
                      <Cover src={review.game.coverUrl} title={review.game.title} sizes="56px" tilt={false} />
                      <span className="min-w-0">
                        <span className="pk-lib-title">{review.game.title}</span>
                        {review.text && <span className="mt-1 block text-sm text-textMuted line-clamp-2">{review.text}</span>}
                        <span className="pk-lib-meta mt-1.5 justify-start gap-3"><span>{relativeTime(review._creationTime)}</span>{review.platform && <span className="inline-flex items-center gap-1"><Gamepad2 size={12} aria-hidden="true" />{review.platform}</span>}{!!review.playtimeHours && <span className="inline-flex items-center gap-1"><Clock size={12} aria-hidden="true" />{review.playtimeHours}h</span>}</span>
                      </span>
                      <ScoreMark value={review.rating} size="sm" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <SectionHeading eyebrow={<>Stories {self && data.draftArticleCount > 0 && <b>{data.draftArticleCount} draft{data.draftArticleCount === 1 ? "" : "s"}</b>}</>} title={self ? "Your longer takes." : `${firstName}’s stories.`} action={self ? { label: "Write a story", href: "/article/new" } : undefined} />
              {data.recentArticles.length === 0 ? (
                <div className="pk-empty"><BookOpen size={36} /><h3>No stories published</h3><p>{self ? "Articles are for takes longer than a rating: criticism, opinion, analysis." : `${firstName} hasn’t published a story yet.`}</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {data.recentArticles.map(article => (
                    <Link key={article._id} href={`/article/${article._id}`} className="pk-panel flex flex-col gap-3 hover:border-orange-400" style={{ borderColor: undefined }}>
                      <span className="pk-article-kind !static !inline-flex self-start" data-kind={article.type ?? "opinion"}>{TYPE_LABEL[article.type ?? "opinion"] ?? article.type}</span>
                      <h3 className="!mb-0 !text-[22px] leading-tight">{article.title}</h3>
                      {article.excerpt && <p className="text-sm text-textMuted line-clamp-3">{article.excerpt}</p>}
                      <span className="mt-auto inline-flex items-center gap-2 text-xs text-textDim">{relativeTime(article.publishedAt ?? article._creationTime)}<ArrowRight size={13} className="ml-auto text-gold" /></span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section id="shelf" className="pk-panel">
              <div className="flex items-baseline justify-between gap-3"><h3>The shelf</h3>{self && <Link href="/backlog" className="pk-textlink py-0 text-sm">Open<ArrowRight size={14} /></Link>}</div>
              {backlogStats.total === 0 ? (
                <p className="text-sm text-textMuted">Nothing on the shelf yet.</p>
              ) : (
                <>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-bgAlt" role="img" aria-label={`${backlogStats.total} games: ${STATUS_ORDER.map(s => `${backlogStats[s]} ${STATUS_LABEL[s]}`).join(", ")}`}>
                    {STATUS_ORDER.map(s => backlogStats[s] > 0 && <span key={s} style={{ width: `${(backlogStats[s] / backlogStats.total) * 100}%`, background: STATUS_COLOR[s] }} />)}
                  </div>
                  <ul className="mt-4 space-y-2">
                    {STATUS_ORDER.map(s => (
                      <li key={s} className="flex items-center justify-between text-sm">
                        {self ? <Link href={`/backlog?status=${s}`} className="hover:opacity-80"><StatusChip status={s} /></Link> : <StatusChip status={s} />}
                        <span className="font-semibold tabular-nums">{backlogStats[s]}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            {reviewStats.topPlatforms.length > 0 && (
              <section className="pk-panel">
                <h3>Plays mostly on</h3>
                <ul className="space-y-2">
                  {reviewStats.topPlatforms.slice(0, 5).map(p => {
                    const max = reviewStats.topPlatforms[0]?.count || 1;
                    return <li key={p.name} className="text-sm"><div className="flex justify-between"><span>{p.name}</span><span className="tabular-nums text-textDim">{p.count}</span></div><div className="mt-1 h-1 rounded-full bg-bgAlt"><div className="h-full rounded-full bg-primary" style={{ width: `${(p.count / max) * 100}%` }} /></div></li>;
                  })}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen pb-24 bg-bg">
      <div className="pk-hero" data-tone="night"><div className="pk-hero-inner"><div className="space-y-4"><Skeleton className="h-4 w-40 bg-surface" /><Skeleton className="h-16 w-80 bg-surface" /><Skeleton className="h-5 w-56 bg-surface" /></div><div className="pk-hero-strip">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-32 rounded-xl bg-surface" />)}</div></div></div>
      <div className="max-w-[1400px] mx-auto px-5 md:px-8 pt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-surface" />)}</div>
    </div>
  );
}
