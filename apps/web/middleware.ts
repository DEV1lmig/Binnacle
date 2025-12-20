import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/discover(.*)',
  '/game/(.*)',
  '/profile/(.*)', // Public profiles
  '/review/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname;

  // Explicitly require auth for sensitive user routes, even if broadly matched as "public"
  const requiresAuthForUserRoute =
    // e.g. /profile/:id/edit should not be public
    (pathname.startsWith('/profile/') && pathname.endsWith('/edit')) ||
    // e.g. /settings and its subpaths
    pathname.startsWith('/settings');

  // Protect routes that aren't public, or that are sensitive user-level routes
  if (!isPublicRoute(request) || requiresAuthForUserRoute) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
