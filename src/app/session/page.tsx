'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function SessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    const savedSettings = sessionStorage.getItem('session-settings');
    if (savedSettings) {
      router.replace('/session/welcome');
    } else {
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
