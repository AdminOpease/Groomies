import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
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
