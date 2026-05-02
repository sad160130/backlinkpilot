import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseSession(req: NextRequest): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const projectRef = url.match(/^https?:\/\/([^.]+)\./)?.[1];
  if (!projectRef) return false;

  const cookieName = `sb-${projectRef}-auth-token`;
  const raw = req.cookies.get(cookieName)?.value;
  if (!raw) return false;

  let payload = raw;
  if (payload.startsWith("base64-")) {
    try {
      payload = atob(payload.slice("base64-".length));
    } catch {
      return false;
    }
  }
  try {
    const parsed = JSON.parse(payload);
    return Boolean(parsed?.access_token);
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  if (!hasSupabaseSession(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
