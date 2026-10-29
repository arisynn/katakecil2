'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
export default function ReaderRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const allowed =
    pathname === '/' ||
    pathname === '/library' ||
    pathname === '/offline' ||
    pathname === '/reader' ||
    pathname?.startsWith('/reader/');
  useEffect(() => {
    if (pathname && !allowed) window.location.replace('/library');
  }, [allowed, pathname]);
  return allowed ? children : null;
}
