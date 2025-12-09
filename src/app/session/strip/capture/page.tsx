'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function CaptureRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Strip layout is currently disabled - redirect to landscape
    router.replace('/session/landscape/capture');
  }, [router]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
      <div>Redirecting...</div>
    </div>
  );
}

export default function CapturePage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading camera...</div>}>
      <CaptureRedirect />
    </Suspense>
  );
}
