"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { 
  Gamepad2, 
  Star, 
  Users, 
  TrendingUp, 
  Search, 
  BookMarked,
  MessageCircle,
  Trophy,
  ArrowRight,
  Check,
  Sparkles
} from "lucide-react";
import { useEffect } from "react";

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to feed
  useEffect(() => {
    if (isSignedIn) {
      router.push("/feed");
    }
  }, [isSignedIn, router]);

  if (isSignedIn) {
    return null; // Prevent flash while redirecting
  }

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-[var(--bkl-color-border)]">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#66c0f4]/5 via-transparent to-[#e1b168]/5 animate-pulse" 
             style={{ animationDuration: "8s" }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-accent-primary)]/30 rounded-full">
                <Sparkles className="w-4 h-4 text-[var(--bkl-color-accent-primary)]" />
                <span className="text-[var(--bkl-color-accent-primary)] text-sm font-medium">
                  Your gaming companion
                </span>
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-[var(--bkl-color-text-primary)] leading-tight">
                Track Your Gaming{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--bkl-color-accent-primary)] to-[var(--bkl-color-accent-secondary)]">
                  Journey
                </span>
              </h1>

              <p className="text-xl text-[var(--bkl-color-text-secondary)] leading-relaxed">
                Discover, track, and review your favorite games. Connect with gamers worldwide and never lose track of what to play next.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)] font-semibold rounded-[var(--bkl-radius-lg)] transition-all shadow-[var(--bkl-shadow-glow)] hover:shadow-lg hover:scale-105"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--bkl-color-bg-secondary)] hover:bg-[var(--bkl-color-bg-tertiary)] text-[var(--bkl-color-text-primary)] font-semibold border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] transition-all"
                >
                  Sign In
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 pt-8 border-t border-[var(--bkl-color-border)]">
                <div>
                  <div className="text-3xl font-bold text-[var(--bkl-color-accent-primary)]">10K+</div>
                  <div className="text-sm text-[var(--bkl-color-text-secondary)]">Games</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--bkl-color-accent-primary)]">5K+</div>
                  <div className="text-sm text-[var(--bkl-color-text-secondary)]">Users</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[var(--bkl-color-accent-primary)]">50K+</div>
                  <div className="text-sm text-[var(--bkl-color-text-secondary)]">Reviews</div>
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative hidden lg:block">
              <div className="relative aspect-square">
                {/* Glowing Background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--bkl-color-accent-primary)]/20 to-[var(--bkl-color-accent-secondary)]/20 rounded-[2rem] blur-3xl" />
                
                {/* Feature Cards Stack */}
                <div className="relative space-y-4">
                  <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 shadow-lg transform rotate-2 hover:rotate-0 transition-transform">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[var(--bkl-color-accent-primary)] to-[var(--bkl-color-accent-secondary)] rounded-lg flex items-center justify-center">
                        <Gamepad2 className="w-6 h-6 text-[var(--bkl-color-bg-primary)]" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--bkl-color-text-primary)]">Currently Playing</div>
                        <div className="text-sm text-[var(--bkl-color-text-secondary)]">3 games in progress</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[var(--bkl-color-status-success)] to-[var(--bkl-color-status-completed)] rounded-lg flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-[var(--bkl-color-bg-primary)]" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--bkl-color-text-primary)]">42 Games Completed</div>
                        <div className="text-sm text-[var(--bkl-color-text-secondary)]">This year</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 shadow-lg transform rotate-1 hover:rotate-0 transition-transform">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[var(--bkl-color-accent-secondary)] to-[var(--bkl-color-feedback-error)] rounded-lg flex items-center justify-center">
                        <Star className="w-6 h-6 text-[var(--bkl-color-bg-primary)]" />
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--bkl-color-text-primary)]">87 Reviews Written</div>
                        <div className="text-sm text-[var(--bkl-color-text-secondary)]">Helping the community</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 border-b border-[var(--bkl-color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--bkl-color-text-primary)] mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-[var(--bkl-color-text-secondary)] max-w-2xl mx-auto">
              Powerful features to manage your gaming library and connect with fellow gamers
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-8 transition-all hover:shadow-[var(--bkl-shadow-glow)]">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--bkl-color-accent-primary)]/20 to-[var(--bkl-color-accent-primary)]/10 rounded-[var(--bkl-radius-md)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BookMarked className="w-7 h-7 text-[var(--bkl-color-accent-primary)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Track Your Backlog
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Never forget about that game you wanted to play. Organize your backlog with custom statuses and priorities.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-8 transition-all hover:shadow-[var(--bkl-shadow-glow)]">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--bkl-color-accent-secondary)]/20 to-[var(--bkl-color-accent-secondary)]/10 rounded-[var(--bkl-radius-md)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Star className="w-7 h-7 text-[var(--bkl-color-accent-secondary)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Write Reviews
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Share your thoughts on games you've played. Rate, review, and help others discover great games.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-8 transition-all hover:shadow-[var(--bkl-shadow-glow)]">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--bkl-color-status-success)]/20 to-[var(--bkl-color-status-success)]/10 rounded-[var(--bkl-radius-md)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Search className="w-7 h-7 text-[var(--bkl-color-status-success)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Discover Games
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Find your next favorite game with our powerful search and discovery features. Browse trending and top-rated titles.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-8 transition-all hover:shadow-[var(--bkl-shadow-glow)]">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--bkl-color-status-completed)]/20 to-[var(--bkl-color-status-completed)]/10 rounded-[var(--bkl-radius-md)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-[var(--bkl-color-status-completed)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Connect with Gamers
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Follow other gamers, see what they're playing, and engage with their reviews and recommendations.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-8 transition-all hover:shadow-[var(--bkl-shadow-glow)]">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--bkl-color-feedback-error)]/20 to-[var(--bkl-color-feedback-error)]/10 rounded-[var(--bkl-radius-md)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7 text-[var(--bkl-color-feedback-error)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Engage & Discuss
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Like and comment on reviews. Join discussions about your favorite games and genres.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] hover:border-[var(--bkl-color-accent-primary)] rounded-[var(--bkl-radius-lg)] p-8 transition-all hover:shadow-[var(--bkl-shadow-glow)]">
              <div className="w-14 h-14 bg-gradient-to-br from-[var(--bkl-color-accent-primary)]/20 to-[var(--bkl-color-accent-secondary)]/10 rounded-[var(--bkl-radius-md)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-7 h-7 text-[var(--bkl-color-accent-primary)]" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Track Statistics
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                See your gaming stats, completion rates, and favorite genres. Visualize your gaming journey over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 border-b border-[var(--bkl-color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--bkl-color-text-primary)] mb-4">
              How It Works
            </h2>
            <p className="text-xl text-[var(--bkl-color-text-secondary)] max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Lines */}
            <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[var(--bkl-color-accent-primary)] via-[var(--bkl-color-accent-secondary)] to-[var(--bkl-color-accent-primary)]" />

            {/* Step 1 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--bkl-color-accent-primary)] text-[var(--bkl-color-bg-primary)] rounded-full font-bold text-2xl mb-6 shadow-[var(--bkl-shadow-glow)] z-10 relative">
                1
              </div>
              <h3 className="text-2xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Create Account
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Sign up for free in seconds. No credit card required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--bkl-color-accent-secondary)] text-[var(--bkl-color-bg-primary)] rounded-full font-bold text-2xl mb-6 shadow-[var(--bkl-shadow-glow)] z-10 relative">
                2
              </div>
              <h3 className="text-2xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Add Games
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Search and add games to your backlog, mark what you're playing, and track completions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--bkl-color-status-success)] text-[var(--bkl-color-bg-primary)] rounded-full font-bold text-2xl mb-6 shadow-[var(--bkl-shadow-glow)] z-10 relative">
                3
              </div>
              <h3 className="text-2xl font-semibold text-[var(--bkl-color-text-primary)] mb-3">
                Share & Connect
              </h3>
              <p className="text-[var(--bkl-color-text-secondary)]">
                Write reviews, follow friends, and discover what the community is playing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-[var(--bkl-color-accent-primary)]/10 to-[var(--bkl-color-accent-secondary)]/10 border border-[var(--bkl-color-accent-primary)]/30 rounded-[2rem] p-12 md:p-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--bkl-color-text-primary)] mb-6">
              Ready to Start Your Gaming Journey?
            </h2>
            <p className="text-xl text-[var(--bkl-color-text-secondary)] mb-8 max-w-2xl mx-auto">
              Join thousands of gamers tracking, reviewing, and discovering games together.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 px-10 py-5 bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-hover)] text-[var(--bkl-color-bg-primary)] font-bold text-lg rounded-[var(--bkl-radius-lg)] transition-all shadow-[var(--bkl-shadow-glow)] hover:shadow-lg hover:scale-105"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <div className="flex items-center gap-3 text-[var(--bkl-color-text-secondary)]">
                <Check className="w-5 h-5 text-[var(--bkl-color-status-success)]" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--bkl-color-border)] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-[var(--bkl-color-accent-primary)]" />
              <span className="text-xl font-bold text-[var(--bkl-color-text-primary)]">Binnacle</span>
            </div>

            <div className="text-[var(--bkl-color-text-secondary)] text-sm">
              © 2025 Binnacle. Track your gaming journey.
            </div>

            <div className="flex gap-6">
              <Link href="/sign-in" className="text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-accent-primary)] transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up" className="text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-accent-primary)] transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
