import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/app/components/ConvexClientProvider"; // Adjust path if needed
import { CurrentUserProvider } from "@/app/context/CurrentUserContext";
import { ConditionalNavigation } from "@/app/components/ConditionalNavigation";
import { AuthGuard } from "@/app/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Binnacle",
  description: "Your game backlog",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConvexClientProvider>
          <CurrentUserProvider>
            <AuthGuard>
              <ConditionalNavigation />
              {children}
            </AuthGuard>
          </CurrentUserProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}