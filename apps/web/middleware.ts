import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@binnacle/convex-generated/api';

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
  const hostHeader = request.headers.get('host');
  const hostname = (hostHeader ?? request.nextUrl.hostname).split(':')[0] ?? '';
  const pathname = request.nextUrl.pathname;

  const isAdminSubdomain = hostname.startsWith('admin.');
  const isAdminVercelDomain = hostname.startsWith('admin-') && hostname.endsWith('.vercel.app');
  const isApiRoute = pathname.startsWith('/api') || pathname.startsWith('/trpc');

  const isAuthRoute =
    pathname.startsWith('/sign-in') ||
    pathname.startsWith('/sign-up') ||
    pathname.startsWith('/sign-out');

  const isNotAuthorizedRoute = pathname === '/not-authorized';
  const isAdminHost = isAdminSubdomain || isAdminVercelDomain;
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminArea = isAdminHost || isAdminPath;

  // Serve the admin dashboard at the root of admin.<domain>
  if (isAdminArea && !isApiRoute && !isAuthRoute && !isNotAuthorizedRoute) {
    await auth.protect();

    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        const url = request.nextUrl.clone();
        url.pathname = '/not-authorized';
        return NextResponse.redirect(url);
      }

      const token = await (auth as any).getToken?.({ template: 'convex' });
      const convex = new ConvexHttpClient(convexUrl);
      if (token) convex.setAuth(token);

      const [roleInfo, needsSetup] = await Promise.all([
        convex.query(api.admin.getCurrentUserRole, {}),
        convex.query(api.admin.needsAdminSetup, {}),
      ]);

      // Allow bootstrap flow when no admins exist yet.
      if (!needsSetup && !roleInfo.isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/not-authorized';
        return NextResponse.redirect(url);
      }
    } catch {
      const url = request.nextUrl.clone();
      url.pathname = '/not-authorized';
      return NextResponse.redirect(url);
    }
  }

  if (isAdminHost) {
    // Don't rewrite auth routes or the not-authorized page on the admin host.
    if (!isApiRoute && !isAuthRoute && !isNotAuthorizedRoute && !pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === '/' ? '/admin' : `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

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
