const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL for mobile app.");
}

if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY for mobile app.");
}

export const env = {
  convexUrl,
  clerkPublishableKey,
} as const;
