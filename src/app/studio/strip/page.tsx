'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function StripStudioRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Strip layout is currently disabled - redirect to landscape
    router.replace('/studio/landscape');
  }, [router]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div>Redirecting to landscape studio...</div>
    </div>
  );
}

export default function StripStudioPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-background flex items-center justify-center">Loading...</div>}>
      <StripStudioRedirect />
    </Suspense>
  );
}

