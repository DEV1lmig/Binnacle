"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

type CurrentUser = Doc<"users"> | null | undefined;

interface CurrentUserContextType {
  currentUser: CurrentUser;
  isLoading: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextType | undefined>(undefined);

/**
 * Provider component that fetches and caches the current user.
 * Wrap your app with this at the root level to avoid redundant queries.
 */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  // Single query point for the entire app
  const currentUser = useQuery(api.users.current);
  const isLoading = currentUser === undefined;

  const value: CurrentUserContextType = {
    currentUser,
    isLoading,
  };

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

/**
 * Hook to access the current user from anywhere in the app.
 * Must be used within a component tree wrapped by CurrentUserProvider.
 */
export function useCurrentUser() {
  const context = useContext(CurrentUserContext);
  if (context === undefined) {
    throw new Error(
      "useCurrentUser must be used within a CurrentUserProvider. " +
      "Wrap your app root with <CurrentUserProvider>."
    );
  }
  return context;
}
