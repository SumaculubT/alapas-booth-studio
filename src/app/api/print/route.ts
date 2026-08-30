import { NextRequest, NextResponse } from "next/server";

function isLocalHost(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("[::1]");
}

export async function POST(request: NextRequest) {
  if (!isLocalHost(request)) {
    return NextResponse.json(
      { error: "Server-side printing is disabled. Use the browser Print button." },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      error: "Server-side printing is disabled. Use the browser Print button on the preview screen.",
    },
    { status: 410 }
  );
}
