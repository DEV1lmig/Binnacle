import type { Metadata } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/app/components/ConvexClientProvider"; // Adjust path if needed
import { CurrentUserProvider } from "@/app/context/CurrentUserContext";
import { ConditionalNavigation } from "@/app/components/ConditionalNavigation";
import { AuthGuard } from "@/app/components/AuthGuard";
import { Toaster } from "@/app/components/ui/sonner";
import { CaseTransitionProvider, ScrollReset } from "@/app/components/playchive";
import { CaseStageRoot } from "@/app/components/playchive/case3d/CaseStageRoot";

const display = Outfit({ subsets: ["latin"], weight: ["700", "800"], variable: "--playchive-display" });
const body = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--playchive-body" });

export const metadata: Metadata = {
  title: "Playchive",
  description: "Your games. Your story. Organize your collection and share what you play.",
  icons: { icon: "/brand/playchive-symbol.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        <ConvexClientProvider>
          <CurrentUserProvider>
            <AuthGuard>
              <CaseTransitionProvider>
                <ScrollReset />
                <ConditionalNavigation />
                {children}
                <Toaster />
                <CaseStageRoot />
              </CaseTransitionProvider>
            </AuthGuard>
          </CurrentUserProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
