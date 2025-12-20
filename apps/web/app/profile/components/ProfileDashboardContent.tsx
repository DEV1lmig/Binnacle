'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { GameCard } from '@/app/components/GameCard';
import { Gamepad2, Trophy, Users, CalendarClock, Star, ListOrdered } from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';
import type { ReactNode } from 'react';

export interface ProfileDashboardData {
  user: {
    _id: Id<'users'>;
    _creationTime: number;
    name: string;
    username: string;
    bio?: string;
    avatarUrl?: string;
  };
  followerCount: number;
  followingCount: number;
  viewerFollows: boolean;
  viewerIsSelf: boolean;
  reviewStats: {
    reviewCount: number;
    averageRating?: number;
    totalPlaytimeHours: number;
    topPlatforms: Array<{ name: string; count: number }>;
  };
  backlogStats: {
    total: number;
    want_to_play: number;
    playing: number;
    completed: number;
    dropped: number;
    on_hold: number;
  };
  topGames: Array<{
    rank: number;
    note?: string;
    game: {
      _id: Id<'games'>;
      title: string;
      coverUrl?: string;
      releaseYear?: number;
      aggregatedRating?: number;
    };
  }>;
  recentReviews: Array<{
    _id: Id<'reviews'>;
    _creationTime: number;
    rating: number;
    text?: string;
    playtimeHours?: number;
    platform?: string;
    game: {
      _id: Id<'games'>;
      title: string;
      coverUrl?: string;
      releaseYear?: number;
    };
  }>;
}

interface ProfileDashboardContentProps {
  data: ProfileDashboardData;
  headerAction?: ReactNode;
}

export function ProfileDashboardContent({ data, headerAction }: ProfileDashboardContentProps) {
  const router = useRouter();

  const backlogEntries = useMemo(
    () => [
      { label: 'Total', value: data.backlogStats.total },
      { label: 'Want to play', value: data.backlogStats.want_to_play },
      { label: 'Playing', value: data.backlogStats.playing },
      { label: 'Completed', value: data.backlogStats.completed },
      { label: 'Dropped', value: data.backlogStats.dropped },
      { label: 'On hold', value: data.backlogStats.on_hold },
    ],
    [data.backlogStats],
  );

  const averageRatingDisplay = data.reviewStats.averageRating
    ? (data.reviewStats.averageRating / 10).toFixed(2)
    : null;

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-12">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <section className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 md:p-8 shadow-[var(--bkl-shadow-md)]">
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            <Avatar className="h-24 w-24 border-2 border-[var(--bkl-color-accent-primary)]">
              {data.user.avatarUrl ? (
                <AvatarImage src={data.user.avatarUrl} alt={data.user.name} />
              ) : null}
              <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] text-3xl">
                {data.user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h1
                    className="text-[var(--bkl-color-text-primary)]"
                    style={{ fontSize: 'var(--bkl-font-size-3xl)', fontWeight: 'var(--bkl-font-weight-bold)' }}
                  >
                    {data.user.name}
                  </h1>
                  <p
                    className="text-[var(--bkl-color-text-secondary)]"
                    style={{ fontSize: 'var(--bkl-font-size-sm)' }}
                  >
                    @{data.user.username}
                  </p>
                  {data.user.bio ? (
                    <p
                      className="text-[var(--bkl-color-text-secondary)] mt-3 max-w-2xl"
                      style={{ fontSize: 'var(--bkl-font-size-sm)' }}
                    >
                      {data.user.bio}
                    </p>
                  ) : null}
                </div>
                {headerAction ? <div className="flex gap-2 shrink-0">{headerAction}</div> : null}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
                <StatBadge icon={<Users className="w-4 h-4" />} label="Followers" value={data.followerCount} />
                <StatBadge icon={<Users className="w-4 h-4" />} label="Following" value={data.followingCount} />
                <StatBadge icon={<Trophy className="w-4 h-4" />} label="Reviews" value={data.reviewStats.reviewCount} />
                <StatBadge icon={<Gamepad2 className="w-4 h-4" />} label="Backlog" value={data.backlogStats.total} />
                <StatBadge
                  icon={<Star className="w-4 h-4" />}
                  label="Avg rating"
                  value={averageRatingDisplay ? Number(averageRatingDisplay) : '—'}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-7 bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-[var(--bkl-color-text-primary)]" style={{ fontSize: 'var(--bkl-font-size-xl)' }}>
                    Top games
                  </CardTitle>
                  <CardDescription className="text-[var(--bkl-color-text-secondary)]">
                    Favorite picks curated by the player.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {data.topGames.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {data.topGames.map((entry) => (
                    <div key={entry.game._id} className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)]">
                          <ListOrdered className="w-3 h-3" /> #{entry.rank}
                        </Badge>
                        {entry.note ? (
                          <span className="text-[var(--bkl-color-text-secondary)] text-xs truncate" title={entry.note}>
                            {entry.note}
                          </span>
                        ) : null}
                      </div>
                      <GameCard
                        key={entry.game._id}
                        game={{
                          _id: entry.game._id,
                          title: entry.game.title,
                          coverUrl: entry.game.coverUrl,
                          aggregatedRating: entry.game.aggregatedRating,
                          releaseYear: entry.game.releaseYear,
                        }}
                        variant="compact"
                        onClick={() => router.push(`/game/${entry.game._id}`)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--bkl-color-text-secondary)]">No top games selected yet.</p>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-5 space-y-6">
            <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
              <CardHeader>
                <CardTitle className="text-[var(--bkl-color-text-primary)]" style={{ fontSize: 'var(--bkl-font-size-lg)' }}>
                  Backlog overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  {backlogEntries.map((entry) => (
                    <div key={entry.label} className="rounded-md border border-[var(--bkl-color-border)] p-3 bg-[var(--bkl-color-bg-primary)]">
                      <dt className="text-[var(--bkl-color-text-secondary)]" style={{ fontSize: 'var(--bkl-font-size-xs)' }}>
                        {entry.label}
                      </dt>
                      <dd
                        className="text-[var(--bkl-color-text-primary)]"
                        style={{ fontSize: 'var(--bkl-font-size-lg)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
                      >
                        {entry.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
              <CardHeader>
                <CardTitle className="text-[var(--bkl-color-text-primary)]" style={{ fontSize: 'var(--bkl-font-size-lg)' }}>
                  Review highlights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)]">
                    <Trophy className="w-3 h-3" /> {data.reviewStats.reviewCount}
                  </Badge>
                  <Badge variant="secondary" className="bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-secondary)]">
                    <Star className="w-3 h-3" />
                    {averageRatingDisplay ? `${averageRatingDisplay}` : 'No ratings yet'}
                  </Badge>
                </div>
                {data.reviewStats.topPlatforms.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {data.reviewStats.topPlatforms.map((platform) => (
                      <Badge key={platform.name} variant="outline">
                        {platform.name} · {platform.count}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-[var(--bkl-color-text-secondary)] text-sm">No platform data available yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 md:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[var(--bkl-color-text-primary)]" style={{ fontSize: 'var(--bkl-font-size-xl)', fontWeight: 'var(--bkl-font-weight-semibold)' }}>
                Recent activity
              </h2>
              <p className="text-[var(--bkl-color-text-secondary)]" style={{ fontSize: 'var(--bkl-font-size-sm)' }}>
                Latest reviews from this player.
              </p>
            </div>
          </div>

          {data.recentReviews.length > 0 ? (
            <div className="space-y-4">
              {data.recentReviews.map((review) => {
                const createdAt = new Date(review._creationTime);
                return (
                  <div
                    key={review._id}
                    className="border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-md)] p-4 bg-[var(--bkl-color-bg-primary)]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => router.push(`/game/${review.game._id}`)}
                          className="text-left text-[var(--bkl-color-text-primary)] hover:underline"
                          style={{ fontSize: 'var(--bkl-font-size-lg)', fontWeight: 'var(--bkl-font-weight-semibold)' }}
                        >
                          {review.game.title}
                        </button>
                        <div className="flex items-center gap-3 mt-2 text-[var(--bkl-color-text-secondary)] text-sm">
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-[var(--bkl-color-accent-secondary)]" />
                            {review.rating.toFixed(1)}/10
                          </span>
                          {review.platform ? <span>on {review.platform}</span> : null}
                          <span className="flex items-center gap-1">
                            <CalendarClock className="w-4 h-4" />
                            {createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)]"
                        onClick={() => router.push(`/review/${review._id}`)}
                      >
                        View review
                      </Button>
                    </div>
                    {review.text ? (
                      <p className="text-[var(--bkl-color-text-secondary)] mt-4" style={{ fontSize: 'var(--bkl-font-size-sm)' }}>
                        {review.text.length > 280 ? `${review.text.slice(0, 280)}…` : review.text}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[var(--bkl-color-text-secondary)]">No recent reviews yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatBadge({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--bkl-radius-md)] border border-[var(--bkl-color-border)] bg-[var(--bkl-color-bg-primary)] p-3">
      <Badge variant="secondary" className="bg-[var(--bkl-color-accent-primary)]/10 text-[var(--bkl-color-accent-primary)]">
        {icon}
      </Badge>
      <div>
        <p className="text-[var(--bkl-color-text-secondary)]" style={{ fontSize: 'var(--bkl-font-size-xs)' }}>
          {label}
        </p>
        <p className="text-[var(--bkl-color-text-primary)]" style={{ fontSize: 'var(--bkl-font-size-lg)', fontWeight: 'var(--bkl-font-weight-semibold)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}
