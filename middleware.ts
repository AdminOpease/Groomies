import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 introduced `proxy.ts` as the replacement for `middleware.ts`,
// but proxy.ts is Node.js-only by design — and OpenNext Cloudflare Workers
// only support Edge runtime. So we stay on the deprecated (but functional)
// middleware.ts convention, which is Edge by default. The deprecation
// warning at build time is harmless until Cloudflare supports Node runtime
// or Next.js allows Edge proxies.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // Refresh the session cookie on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const isAdminRoute = url.pathname.startsWith("/admin");
  const isLoginRoute = url.pathname === "/admin/login";

  // Un-authed access to /admin/** → send to login.
  if (isAdminRoute && !isLoginRoute && !user) {
    const redirect = url.clone();
    redirect.pathname = "/admin/login";
    redirect.searchParams.set("next", url.pathname);
    return NextResponse.redirect(redirect);
  }

  // Authed user visiting /admin/login → send to dashboard.
  if (isLoginRoute && user) {
    const redirect = url.clone();
    redirect.pathname = "/admin";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     *   - _next/static (static assets)
     *   - _next/image (image optimisation)
     *   - favicon.ico, .png, .jpg, .svg etc
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
