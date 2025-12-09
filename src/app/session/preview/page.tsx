'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function PreviewRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if query params exist (backward compatibility)
    const eventSize = searchParams.get('size') || '2x6';
    const photoCount = searchParams.get('photoCount');
    const countdown = searchParams.get('countdown');
    const filter = searchParams.get('filter');

    // If query params exist, store them in sessionStorage
    if (photoCount && countdown) {
      sessionStorage.setItem('session-settings', JSON.stringify({
        photoCount: Number(photoCount),
        countdown: Number(countdown),
        filter: filter || 'none',
        size: eventSize
      }));
    }

    // Redirect to route-based preview page
    const layoutRoute = eventSize === '4x6' ? '/session/landscape/preview' : '/session/strip/preview';
    router.replace(layoutRoute);
  }, [router, searchParams]);

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
      <div>Redirecting...</div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading preview...</div>}>
      <PreviewRedirect />
    </Suspense>
  );
}

