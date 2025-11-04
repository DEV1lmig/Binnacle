import { redirect } from "next/navigation";

/**
 * Old landing page - DEPRECATED
 * All users are now redirected to the main feed page.
 * This was replaced by the new design in /feed, /backlog, /discover, and /profile pages.
 * 
 * @deprecated Use /feed instead
 * @see /app/feed/page.tsx - New feed-based home page
 * @see /app/backlog/page.tsx - User's backlog view
 * @see /app/discover/page.tsx - Game and people discovery
 */
export default function Home() {
  redirect("/feed");
}
