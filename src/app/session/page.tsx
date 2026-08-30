"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasSessionSettings } from "@/lib/session";

function SessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace(hasSessionSettings() ? "/session/welcome" : "/");
  }, [router]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
      <div>Redirecting...</div>
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center bg-black text-white">Loading session...</div>}>
      <SessionRedirect />
    </Suspense>
  );
}
