"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@binnacle/convex-generated/api";

const inputClasses =
  "w-full rounded-xl border border-white/15 bg-stone-900/60 px-4 py-3 text-white placeholder:text-stone-500 focus:border-blue-400 focus:outline-none";

/**
 * Renders a post-sign up step where newly registered players can review and update their profile names.
 */
export default function CompleteProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const syncCurrentUser = useMutation(api.users.syncCurrent);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
  }, [isLoaded, router, user]);

  /**
   * Persists the player's preferred names in Clerk and syncs the Convex profile.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();

    if (!trimmedFirst || !trimmedLast) {
      setErrorMessage("Please provide both a first and last name before continuing.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await user.update({ firstName: trimmedFirst, lastName: trimmedLast });
      await syncCurrentUser({});
      router.replace("/app");
    } catch (error) {
      console.error("Failed to update profile", error);
      setErrorMessage("We could not save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Allows the player to exit the profile step without making additional changes.
   */
  const handleSkip = () => {
    router.replace("/app");
  };

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 px-4 py-16 text-white">
        <p className="text-sm text-stone-400">Loading your profile...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-950 via-stone-950/95 to-stone-900 px-4 py-16 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-stone-950/90 p-10 shadow-[0_40px_80px_rgba(2,6,23,0.5)] backdrop-blur-xl">
        <header className="mb-8 flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300/70">Profile setup</p>
          <h1 className="text-3xl font-semibold text-white">Double-check your name</h1>
          <p className="text-sm text-stone-300">
            Some providers skip name entry during quick sign up. Take a moment to set how your crew will see you.
          </p>
        </header>
        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="firstName" className="text-sm text-stone-300">
              First name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              className={inputClasses}
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="lastName" className="text-sm text-stone-300">
              Last name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              autoComplete="family-name"
              className={inputClasses}
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-medium text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save and continue"}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm font-medium text-stone-400 underline-offset-4 hover:text-stone-200 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
