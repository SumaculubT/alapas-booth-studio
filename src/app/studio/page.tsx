'use client';

import { Suspense } from 'react';
import AlpasStudio from '@/components/app/AlpasStudio';

export default function StudioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AlpasStudio />
    </Suspense>
  );
}
