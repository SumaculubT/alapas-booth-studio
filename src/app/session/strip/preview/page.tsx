'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function PreviewRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Strip layout is currently disabled - redirect to landscape
    router.replace('/session/landscape/preview');
  }, [router]);

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
