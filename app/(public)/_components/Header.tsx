import Link from "next/link";

const NAV = [
  { href: "/services", label: "Services" },
  { href: "/locations", label: "Locations" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({
  businessName,
  logoUrl,
}: {
  businessName: string;
  logoUrl: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight text-stone-900"
          >
            {logoUrl ? (
              // Header height flexes to the logo so it always sits centred
              // with equal breathing room top and bottom — no overflow tricks.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={businessName}
                className="h-14 sm:h-20 w-auto"
              />
            ) : (
              <>
                <span
                  aria-hidden
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold"
                >
                  G
                </span>
                <span>{businessName}</span>
              </>
            )}
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/locations"
            className="inline-flex items-center rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Book now
          </Link>
        </div>
        <nav className="sm:hidden flex items-center gap-1 pb-2 -mt-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
