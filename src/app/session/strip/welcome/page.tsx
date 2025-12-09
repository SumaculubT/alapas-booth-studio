'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function WelcomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Strip layout is currently disabled - redirect to landscape
    router.replace('/session/landscape/welcome');
  }, [router]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
      <div>Redirecting...</div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading...</div>}>
      <WelcomeRedirect />
    </Suspense>
  );
}
