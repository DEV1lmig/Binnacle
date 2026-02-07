"use client";

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

/**
 * Conditionally renders the Navigation component based on the current route.
 * Hides navigation on authentication pages (sign-in, sign-up, sign-out).
 */
export function ConditionalNavigation() {
  const pathname = usePathname();
  
  const hideNavigation = pathname === '/' ||
                         pathname?.startsWith('/sign-in') || 
                         pathname?.startsWith('/sign-up') || 
                         pathname?.startsWith('/sign-out') ||
                         pathname?.startsWith('/landingpage');
  
  if (hideNavigation) {
    return null;
  }
  
  return <Navigation />;
}
