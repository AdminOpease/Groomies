import Link from "next/link";
import { FadeIn } from "../../_components/FadeIn";

export const dynamic = "force-dynamic";

export default async function BookPlaceholder({
  params,
}: {
  params: Promise<{ slotId: string }>;
}) {
  await params;

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-20 text-center">
      <FadeIn>
        <p className="text-xs font-medium text-emerald-800 uppercase tracking-wider">
          Almost there
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-stone-900">
          Booking form arriving soon
        </h1>
        <p className="mt-4 text-stone-600">
          You've picked your slot — the payment-ready booking form lands
          shortly. Your slot isn't reserved until you submit it.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/locations"
            className="inline-flex items-center rounded-full bg-white hover:bg-stone-50 border border-stone-300 text-stone-800 text-sm font-medium px-5 py-2.5 transition-colors"
          >
            ← Back to locations
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
