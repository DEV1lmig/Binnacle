"use client";

import { ReactNode, useEffect } from "react";
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { api } from "@binnacle/convex-generated/api";
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClerkProvider
      dynamic
      appearance={{
        cssLayerName: "clerk",
        variables: {
          colorPrimary: "#38bdf8",
          colorForeground: "#e5e7eb",
          borderRadius: "1.5rem",
        },
        layout: {
          socialButtonsVariant: "iconButton",
          socialButtonsPlacement: "bottom",
        },
      }}
  signInUrl="/sign-in"
  signUpUrl="/sign-up"
  signInFallbackRedirectUrl="/feed"
      signUpFallbackRedirectUrl="/complete-profile"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AuthBootstrap>{children}</AuthBootstrap>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function AuthBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const syncCurrentUser = useMutation(api.users.syncCurrent);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      void syncCurrentUser({});
    }
  }, [isAuthenticated, isLoading, syncCurrentUser]);

  return <>{children}</>;
}
