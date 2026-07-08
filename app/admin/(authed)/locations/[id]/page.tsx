import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  updateLocation,
  deleteLocation,
  toggleLocationActive,
} from "../actions";
import { LocationForm } from "../_components/LocationForm";
import { DeleteLocation } from "../_components/DeleteLocation";

export const dynamic = "force-dynamic";

export default async function EditLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const supabase = await getSupabaseServer();
  const { data: location, error } = await supabase
    .from("locations")
    .select("id, name, type, address, description, is_active")
    .eq("id", id)
    .single();

  if (error || !location) notFound();

  const updateWithId = updateLocation.bind(null, id);
  const deleteWithId = deleteLocation.bind(null, id);
  const deactivate = async () => {
    "use server";
    await toggleLocationActive(id, false);
  };

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link href="/admin/locations" className="hover:text-stone-800 underline underline-offset-2">
          Locations
        </Link>{" "}
        / <span aria-current="page">{location.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Edit location
        </h1>
        <Link
          href={`/admin/locations/${id}/dates`}
          className="inline-flex items-center rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
        >
          Manage schedule →
        </Link>
      </div>

      {created ? (
        <p
          role="status"
          className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          Location created. Next: click <strong>Manage schedule</strong> above
          to open up dates and slots.
        </p>
      ) : null}

      <LocationForm
        location={location}
        action={updateWithId}
        submitLabel="Save changes"
      />

      <DeleteLocation
        locationName={location.name}
        isActive={location.is_active}
        deleteAction={deleteWithId}
        deactivateAction={deactivate}
      />
    </div>
  );
}
