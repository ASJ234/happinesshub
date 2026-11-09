import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

// Auth API routes never need a session check of their own.
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some(
    (path) => pathname === path || pathname === `${path}/`
  );
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/login/";
}

// "/" and "/dashboard" double as the public landing page.
function isLandingPath(pathname: string): boolean {
  return pathname === "/" || pathname === "/dashboard" || pathname === "/dashboard/";
}

function isStaticAsset(pathname: string): boolean {
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) return true;
  // Files with an extension are static assets — but never under /dashboard,
  // where a dotted path must still go through the auth check.
  return !pathname.startsWith("/dashboard") && /\.[a-z0-9]+$/i.test(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicApiPath(pathname) || isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const { url, key } = getSupabaseEnv();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getUser() may have refreshed or removed the session cookies on `response`.
  // A redirect is a new response, so those changes must be copied onto it.
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user) {
    if (isLandingPath(pathname)) {
      return response;
    }
    if (pathname.startsWith("/dashboard")) {
      return redirectTo("/login");
    }
    return response;
  }

  // Signed-in users skip the landing page and the login screen — but stay on
  // /dashboard itself (redirecting it would loop forever).
  if (pathname === "/" || isLoginPath(pathname)) {
    return redirectTo("/dashboard");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
