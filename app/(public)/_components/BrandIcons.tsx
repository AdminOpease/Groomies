export function PawIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <ellipse cx="16" cy="22" rx="7" ry="6" />
      <circle cx="7" cy="14" r="3.2" />
      <circle cx="25" cy="14" r="3.2" />
      <circle cx="12" cy="8" r="2.8" />
      <circle cx="20" cy="8" r="2.8" />
    </svg>
  );
}

export function LaurelIcon({ className = "" }: { className?: string }) {
  // Simple botanical spray — used decoratively behind headings.
  return (
    <svg
      viewBox="0 0 120 160"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M60 10 Q60 80 60 150" />
        {/* Left branches */}
        <path d="M60 30 Q40 26 30 38" />
        <path d="M60 50 Q36 46 24 60" />
        <path d="M60 72 Q34 70 22 86" />
        <path d="M60 96 Q36 96 26 112" />
        <path d="M60 120 Q40 122 32 136" />
        {/* Right branches */}
        <path d="M60 30 Q80 26 90 38" />
        <path d="M60 50 Q84 46 96 60" />
        <path d="M60 72 Q86 70 98 86" />
        <path d="M60 96 Q84 96 94 112" />
        <path d="M60 120 Q80 122 88 136" />
      </g>
      <g fill="currentColor">
        {/* Left leaves */}
        <ellipse cx="30" cy="38" rx="8" ry="3.4" transform="rotate(-30 30 38)" />
        <ellipse cx="24" cy="60" rx="10" ry="3.8" transform="rotate(-25 24 60)" />
        <ellipse cx="22" cy="86" rx="10" ry="3.8" transform="rotate(-20 22 86)" />
        <ellipse cx="26" cy="112" rx="9" ry="3.6" transform="rotate(-25 26 112)" />
        <ellipse cx="32" cy="136" rx="8" ry="3.2" transform="rotate(-30 32 136)" />
        {/* Right leaves */}
        <ellipse cx="90" cy="38" rx="8" ry="3.4" transform="rotate(30 90 38)" />
        <ellipse cx="96" cy="60" rx="10" ry="3.8" transform="rotate(25 96 60)" />
        <ellipse cx="98" cy="86" rx="10" ry="3.8" transform="rotate(20 98 86)" />
        <ellipse cx="94" cy="112" rx="9" ry="3.6" transform="rotate(25 94 112)" />
        <ellipse cx="88" cy="136" rx="8" ry="3.2" transform="rotate(30 88 136)" />
      </g>
    </svg>
  );
}

export function ScissorsIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="8" cy="10" r="3.5" />
      <circle cx="8" cy="22" r="3.5" />
      <path d="M11 12 L28 22" />
      <path d="M11 20 L28 10" />
    </svg>
  );
}

export function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
    </svg>
  );
}

export function VanIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M2 22 L2 10 L22 10 L28 14 L36 14 L36 22 Z" />
      <line x1="22" y1="10" x2="22" y2="14" />
      <line x1="22" y1="14" x2="28" y2="14" />
      <circle cx="10" cy="24" r="3" fill="currentColor" />
      <circle cx="30" cy="24" r="3" fill="currentColor" />
    </svg>
  );
}

export function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="5" y="8" width="22" height="20" rx="2" />
      <line x1="5" y1="14" x2="27" y2="14" />
      <line x1="11" y1="4" x2="11" y2="10" />
      <line x1="21" y1="4" x2="21" y2="10" />
      <circle cx="16" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function QuoteMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6 8 C4 8 3 9.5 3 12 L3 18 L9 18 L9 12 L6 12 C6 10 7 8 8 8 Z" />
      <path d="M17 8 C15 8 14 9.5 14 12 L14 18 L20 18 L20 12 L17 12 C17 10 18 8 19 8 Z" />
    </svg>
  );
}

export function DropletIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M16 4 C11 12 6 18 6 23 A10 10 0 0 0 26 23 C26 18 21 12 16 4 Z" />
    </svg>
  );
}

export function LeafIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 26 C6 14 14 6 26 6 C26 18 18 26 6 26 Z" />
      <path d="M6 26 L18 14" />
    </svg>
  );
}

export function FlaskIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M13 4 L19 4" />
      <path d="M14 4 L14 12 L8 24 A2 2 0 0 0 10 27 L22 27 A2 2 0 0 0 24 24 L18 12 L18 4" />
    </svg>
  );
}

export function BerryIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="16" cy="20" r="8" />
      <path d="M16 12 C16 7 20 4 22 4" />
      <path d="M22 4 C22 6 20 8 18 8" />
    </svg>
  );
}

export function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 10 L8 20 L14 12 L16 22 L18 12 L24 20 L28 10 L26 24 L6 24 Z" />
    </svg>
  );
}

export function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M5 12 L10 17 L20 6" />
    </svg>
  );
}

/**
 * Circular ornamental seal, styled after the "Professional Grooming Brought
 * To Your Door" badge on the printed price list. Text follows the perimeter.
 */
export function GroomingBadge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <path
          id="badge-top"
          d="M 100,100 m -74,0 a 74,74 0 1,1 148,0"
        />
        <path
          id="badge-bottom"
          d="M 100,100 m -74,0 a 74,74 0 1,0 148,0"
        />
      </defs>
      {/* Outer ring */}
      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
      <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />

      {/* Curved text top */}
      <text
        style={{ fontFamily: "var(--font-display), serif" }}
        fill="currentColor"
        fontSize="13"
        letterSpacing="4"
      >
        <textPath href="#badge-top" startOffset="50%" textAnchor="middle">
          PROFESSIONAL GROOMING
        </textPath>
      </text>
      <text
        style={{ fontFamily: "var(--font-display), serif" }}
        fill="currentColor"
        fontSize="13"
        letterSpacing="4"
      >
        <textPath href="#badge-bottom" startOffset="50%" textAnchor="middle">
          · BROUGHT TO YOUR DOOR ·
        </textPath>
      </text>

      {/* Centre: paw + italic tagline */}
      <g transform="translate(100 82)" fill="currentColor">
        <ellipse cx="0" cy="8" rx="14" ry="12" />
        <circle cx="-14" cy="-2" r="5.5" />
        <circle cx="14" cy="-2" r="5.5" />
        <circle cx="-6" cy="-14" r="4.8" />
        <circle cx="6" cy="-14" r="4.8" />
      </g>
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontSize="15"
        fill="currentColor"
        fontStyle="italic"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Gentle care.
      </text>
      <text
        x="100"
        y="146"
        textAnchor="middle"
        fontSize="15"
        fill="currentColor"
        fontStyle="italic"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Beautiful results.
      </text>
    </svg>
  );
}

