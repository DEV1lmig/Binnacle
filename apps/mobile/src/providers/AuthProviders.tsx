import { PropsWithChildren, useEffect } from "react";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { api } from "@binnacle/convex-generated/api";
import { env } from "../lib/env";

const convex = new ConvexReactClient(env.convexUrl);

function AuthBootstrap({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncCurrentUser = useMutation(api.users.syncCurrent);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void syncCurrentUser({});
    }
  }, [isAuthenticated, isLoading, syncCurrentUser]);

  return <>{children}</>;
}

export function AuthProviders({ children }: PropsWithChildren) {
  return (
    <ClerkProvider publishableKey={env.clerkPublishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AuthBootstrap>{children}</AuthBootstrap>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
