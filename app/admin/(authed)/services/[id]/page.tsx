import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { updateService } from "../actions";
import { ServiceForm } from "../_components/ServiceForm";
import { DeleteServiceButton } from "./_components/DeleteServiceButton";
import {
  ServiceVariants,
  type Variant,
} from "./_components/ServiceVariants";

export const dynamic = "force-dynamic";

export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  const supabase = await getSupabaseServer();
  const { data: service, error } = await supabase
    .from("services")
    .select(
      "id, name, description, duration_minutes, price_cents, deposit_amount_cents, is_active, price_from, category, sort_order, service_variants(id, label, price_cents, price_from, sort_order)"
    )
    .eq("id", id)
    .single();

  if (error || !service) notFound();

  const bound = updateService.bind(null, id);

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link
          href="/admin/services"
          className="hover:text-stone-800 underline underline-offset-2"
        >
          Services
        </Link>{" "}
        / <span aria-current="page">{service.name}</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
        Edit service
      </h1>

      {created ? (
        <p
          role="status"
          className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
        >
          Service created. It's now on the public Services page.
        </p>
      ) : null}

      <ServiceForm service={service} action={bound} submitLabel="Save changes" />

      <ServiceVariants
        serviceId={id}
        variants={[...((service.service_variants ?? []) as Variant[])].sort(
          (a, b) => a.sort_order - b.sort_order
        )}
      />

      <DeleteServiceButton id={id} serviceName={service.name} />
    </div>
  );
}
