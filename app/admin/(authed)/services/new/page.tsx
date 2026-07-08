import Link from "next/link";
import { createService } from "../actions";
import { ServiceForm } from "../_components/ServiceForm";

export default function NewServicePage() {
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-sm text-stone-500">
        <Link href="/admin/services" className="hover:text-stone-800 underline underline-offset-2">
          Services
        </Link>{" "}
        / <span aria-current="page">New</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
        New service
      </h1>
      <ServiceForm action={createService} submitLabel="Create service" />
    </div>
  );
}
