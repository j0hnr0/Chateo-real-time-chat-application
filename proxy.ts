import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/session";

const PUBLIC_PATHS = ["/verify-phone", "/verify-code", "/setup-profile"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  const token = request.cookies.get("chateo-session")?.value;
  const userId = token ? await verifyToken(token) : null;

  if (!isPublic && !userId) {
    return NextResponse.redirect(new URL("/verify-phone", request.url));
  }

  if (isPublic && userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
