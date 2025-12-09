'use client';

import { Suspense } from 'react';
import SnapStripStudio from '@/components/app/SnapStripStudio';

export default function LandscapeStudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SnapStripStudio layoutType="landscape" />
    </Suspense>
  );
}

