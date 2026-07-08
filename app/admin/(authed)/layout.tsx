import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

const NAV_ITEMS: Array<{ href: string; label: string; ownerOnly?: boolean }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/staff", label: "Staff", ownerOnly: true },
];

export default async function AuthedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=no_profile");
  }

  const isOwner = profile.role === "owner";
  const nav = NAV_ITEMS.filter((item) => !item.ownerOnly || isOwner);

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/admin" className="font-semibold tracking-tight">
            Groomies <span className="text-stone-400 font-normal">admin</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-stone-500">
              {profile.full_name}
              {isOwner ? (
                <span className="ml-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                  owner
                </span>
              ) : null}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        <nav className="sm:hidden max-w-5xl mx-auto px-4 pb-2 flex items-center gap-1 overflow-x-auto">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
