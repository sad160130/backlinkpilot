import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "blp_session";
const COOKIE_VALUE = "authenticated";

export function middleware(req: NextRequest) {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === COOKIE_VALUE) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|api/health).*)"],
};
