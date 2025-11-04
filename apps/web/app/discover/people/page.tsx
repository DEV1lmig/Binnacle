"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/app/context/CurrentUserContext";
import { Input } from "@/app/components/ui/input";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Search, ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";

export default function DiscoverPeoplePage() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch users from Convex
  const allUsers = useQuery(api.users.search, { query: searchQuery, limit: 50 });

  const filteredUsers = (allUsers || []).filter((user) => !currentUser || user._id !== currentUser._id);

  const isLoading = allUsers === undefined;

  return (
    <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] pb-20 md:pb-8">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header with back button */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 mb-4 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-accent-primary)] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span style={{ fontSize: "var(--bkl-font-size-sm)", fontWeight: "var(--bkl-font-weight-medium)" }}>
              Back to Discover
            </span>
          </button>

          <h1
            className="text-[var(--bkl-color-text-primary)] mb-2"
            style={{ fontSize: "var(--bkl-font-size-3xl)", fontWeight: "var(--bkl-font-weight-bold)" }}
          >
            Discover People
          </h1>
          <p
            className="text-[var(--bkl-color-text-secondary)]"
            style={{ fontSize: "var(--bkl-font-size-sm)" }}
          >
            Find and connect with other gamers
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[var(--bkl-color-text-disabled)]" />
            <Input
              type="text"
              placeholder="Search by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)] text-[var(--bkl-color-text-primary)] placeholder:text-[var(--bkl-color-text-disabled)] pl-12 pr-4 py-4 rounded-[var(--bkl-radius-lg)]"
              style={{ fontSize: "var(--bkl-font-size-base)" }}
            />
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 bg-[var(--bkl-color-bg-secondary)]" />
            ))}
          </div>
        ) : !filteredUsers || filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-[var(--bkl-color-text-disabled)]"
              style={{ fontSize: "var(--bkl-font-size-base)" }}
            >
              No users found matching &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user._id}
                className="bg-[var(--bkl-color-bg-secondary)] border border-[var(--bkl-color-border)] rounded-[var(--bkl-radius-lg)] p-6 hover:border-[var(--bkl-color-accent-primary)] transition-all hover:shadow-[var(--bkl-shadow-glow)]"
              >
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-center w-full">
                    <p
                      className="text-[var(--bkl-color-text-primary)] truncate"
                      style={{ fontSize: "var(--bkl-font-size-lg)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                    >
                      {user.name}
                    </p>
                    <p
                      className="text-[var(--bkl-color-text-disabled)] truncate mb-4"
                      style={{ fontSize: "var(--bkl-font-size-sm)" }}
                    >
                      @{user.username}
                    </p>

                    <div className="flex justify-center gap-6 mb-4">
                      <div>
                        <p
                          className="text-[var(--bkl-color-accent-primary)]"
                          style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                        >
                          0
                        </p>
                        <p
                          className="text-[var(--bkl-color-text-disabled)]"
                          style={{ fontSize: "var(--bkl-font-size-xs)" }}
                        >
                          Reviews
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-[var(--bkl-color-accent-primary)]"
                          style={{ fontSize: "var(--bkl-font-size-base)", fontWeight: "var(--bkl-font-weight-semibold)" }}
                        >
                          0
                        </p>
                        <p
                          className="text-[var(--bkl-color-text-disabled)]"
                          style={{ fontSize: "var(--bkl-font-size-xs)" }}
                        >
                          Followers
                        </p>
                      </div>
                    </div>

                    <Button
                      onClick={() => router.push(`/profile/${user.username}`)}
                      className="w-full bg-[var(--bkl-color-accent-primary)] hover:bg-[var(--bkl-color-accent-primary)]/90 text-[var(--bkl-color-bg-primary)]"
                    >
                      View Profile
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
