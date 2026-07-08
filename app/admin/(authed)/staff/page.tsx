import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "owner") {
    redirect("/admin");
  }

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, created_at")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Staff
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Manage who can access the admin dashboard.
      </p>

      <div className="mt-6 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <ul className="divide-y divide-stone-100">
          {(staff ?? []).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 px-4 sm:px-5 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-stone-900 truncate">
                    {p.full_name}
                  </span>
                  {p.role === "owner" ? (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                      owner
                    </span>
                  ) : (
                    <span className="text-xs text-stone-600 bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5">
                      staff
                    </span>
                  )}
                  {!p.is_active ? (
                    <span className="text-xs text-stone-500 bg-stone-100 border border-stone-200 rounded px-1.5 py-0.5">
                      inactive
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs text-stone-500 truncate">
                  Added {new Date(p.created_at).toLocaleDateString("en-GB")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 bg-stone-50 rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Invite new staff</p>
        <p className="mt-1">
          Coming in a follow-up — the schema and permissions are already role-aware,
          so adding staff is just an invite email once wired up.
        </p>
      </div>
    </div>
  );
}
