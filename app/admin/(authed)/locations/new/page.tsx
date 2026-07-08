import Link from "next/link";
import { createLocation } from "../actions";
import { LocationForm } from "../_components/LocationForm";

export default function NewLocationPage() {
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link href="/admin/locations" className="hover:text-stone-800 underline underline-offset-2">
          Locations
        </Link>{" "}
        / <span aria-current="page">New</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
        New location
      </h1>
      <LocationForm action={createLocation} submitLabel="Create location" />
    </div>
  );
}
