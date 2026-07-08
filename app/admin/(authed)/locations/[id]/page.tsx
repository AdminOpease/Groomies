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
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
        Edit location
      </h1>

      {created ? (
        <p
          role="status"
          className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          Location created. You can now open up dates and slots on it in Phase 4.
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
