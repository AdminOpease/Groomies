import Link from "next/link";

type Settings = {
  business_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  social_links: Record<string, unknown> | null;
};

export function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="mt-24 border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 font-semibold tracking-tight text-stone-900">
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold"
            >
              G
            </span>
            <span>{settings.business_name}</span>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            Premium mobile pet grooming — we come to you.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-stone-900">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            <li>
              <Link href="/services" className="hover:text-stone-900">
                Services
              </Link>
            </li>
            <li>
              <Link href="/locations" className="hover:text-stone-900">
                Locations
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-stone-900">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-stone-900">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-stone-900">Get in touch</h3>
          <ul className="mt-3 space-y-2 text-sm text-stone-600">
            {settings.contact_email ? (
              <li>
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="hover:text-stone-900"
                >
                  {settings.contact_email}
                </a>
              </li>
            ) : null}
            {settings.contact_phone ? (
              <li>
                <a
                  href={`tel:${settings.contact_phone.replace(/\s+/g, "")}`}
                  className="hover:text-stone-900"
                >
                  {settings.contact_phone}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-100">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-stone-500">
          <p>
            © {new Date().getFullYear()} {settings.business_name}. All rights
            reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-stone-800">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-stone-800">
              Terms
            </Link>
            <Link href="/refund" className="hover:text-stone-800">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
