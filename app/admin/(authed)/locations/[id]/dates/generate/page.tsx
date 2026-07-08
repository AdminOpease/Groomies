import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { todayLondonISO } from "@/lib/format";
import { GenerateForm } from "./_components/GenerateForm";

export const dynamic = "force-dynamic";

function nextMonday(): string {
  // Return the ISO date of the next Monday in London (or today, if today is Monday).
  const today = todayLondonISO();
  const d = new Date(`${today}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = Sun
  const daysToAdd = dow === 1 ? 0 : (8 - dow) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

export default async function GeneratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: locationId } = await params;
  const supabase = await getSupabaseServer();

  const { data: location, error } = await supabase
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .single();

  if (error || !location) notFound();

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link
          href="/admin/locations"
          className="hover:text-stone-800 underline underline-offset-2"
        >
          Locations
        </Link>{" "}
        /{" "}
        <Link
          href={`/admin/locations/${locationId}`}
          className="hover:text-stone-800 underline underline-offset-2"
        >
          {location.name}
        </Link>{" "}
        /{" "}
        <Link
          href={`/admin/locations/${locationId}/dates`}
          className="hover:text-stone-800 underline underline-offset-2"
        >
          Schedule
        </Link>{" "}
        / <span aria-current="page">Generate</span>
      </nav>

      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
        Generate recurring schedule
      </h1>
      <p className="mt-1 text-sm text-stone-500 mb-8">
        Open up multiple weeks in one go. Existing dates and slots are left
        alone.
      </p>

      <GenerateForm locationId={locationId} defaultStartDate={nextMonday()} />
    </div>
  );
}
