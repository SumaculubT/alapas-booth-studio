
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function SessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check sessionStorage for settings to determine which layout to use
    const savedSettings = sessionStorage.getItem('session-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        // Strip layout is disabled, always redirect to landscape
        router.replace('/session/landscape/welcome');
      } catch (error) {
        // If error parsing, default to landscape
        router.replace('/session/landscape/welcome');
      }
    } else {
      // No settings found, redirect to home page to choose layout
      router.replace('/');
    }
  }, [router]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
      <div>Redirecting...</div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading session...</div>}>
      <SessionRedirect />
    </Suspense>
  );
}
