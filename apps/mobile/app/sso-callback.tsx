import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { LoadingState } from "@/src/ui/LoadingState";

/**
 * Neutral deep-link target for Clerk OAuth (startSSOFlow).
 *
 * Returning from the provider browser lands here instead of `/`, which
 * would otherwise bounce the user back to the auth welcome screen while
 * the SSO flow is still resolving. The screen that started the flow is
 * responsible for the final navigation once `startSSOFlow` resolves
 * (feed, or the sign-up completion screen when more details are needed).
 */
export default function SSOCallbackScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const focusedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      focusedRef.current = true;
      return () => {
        focusedRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (isSignedIn) {
      router.replace("/(tabs)/feed");
      return;
    }

    // Fallback only: fires when nothing else handled the flow (cancelled
    // attempt or cold start from a stale redirect link). It must never run
    // while another screen (e.g. the sign-up completion form) is on top,
    // or it would interrupt an in-progress sign-up.
    const timeout = setTimeout(() => {
      if (!focusedRef.current) {
        return;
      }
      router.replace("/(auth)");
    }, 4000);

    return () => clearTimeout(timeout);
  }, [isLoaded, isSignedIn, router]);

  return <LoadingState label="Completing sign in..." />;
}
