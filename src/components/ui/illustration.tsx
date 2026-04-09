// ═══════════════════════════════════════════════
// SVG Illustration System — Geometric, single-color, brand-consistent
// Reference: Stripe documentation illustrations
// ═══════════════════════════════════════════════

interface IllustrationProps {
  type: "funnel" | "differentiation" | "analytics" | "content" | "sales" | "retention" | "empty";
  size?: number;
  className?: string;
}

const Illustration = ({ type, size = 64, className = "" }: IllustrationProps) => {
  const illustrations: Record<string, React.JSX.Element> = {
    funnel: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <path d="M8 12h48l-14 16v16l-20 8V28L8 12z" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.1" />
        <path d="M22 28l20-16" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
        <circle cx="32" cy="48" r="3" fill="currentColor" opacity="0.6" />
      </svg>
    ),
    differentiation: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.05" />
        <line x1="32" y1="12" x2="32" y2="52" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
        <line x1="12" y1="32" x2="52" y2="32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
        <circle cx="32" cy="32" r="4" fill="currentColor" />
        <circle cx="32" cy="32" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      </svg>
    ),
    analytics: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <rect x="10" y="40" width="8" height="16" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="22" y="28" width="8" height="28" rx="2" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="34" y="20" width="8" height="36" rx="2" fill="currentColor" fillOpacity="0.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="46" y="12" width="8" height="44" rx="2" fill="currentColor" fillOpacity="0.7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10 36 L22 24 L34 16 L46 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
    ),
    content: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.05" />
        <line x1="20" y1="20" x2="44" y2="20" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        <line x1="20" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <line x1="20" y1="34" x2="36" y2="34" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <line x1="20" y1="40" x2="42" y2="40" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
        <circle cx="44" cy="44" r="8" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
        <path d="M42 44l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    sales: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <path d="M16 44 C16 44, 24 20, 32 24 C40 28, 48 8, 48 8" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="16" cy="44" r="3" fill="currentColor" opacity="0.4" />
        <circle cx="32" cy="24" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="48" cy="8" r="3" fill="currentColor" />
        <rect x="8" y="52" width="48" height="4" rx="2" fill="currentColor" fillOpacity="0.1" />
        <path d="M48 8l-4 2 2 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </svg>
    ),
    retention: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="32" cy="32" r="20" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.05" />
        <path d="M32 16 A16 16 0 0 1 48 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M48 32 A16 16 0 0 1 32 48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <path d="M32 48 A16 16 0 0 1 16 32" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        <path d="M44 16l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="5" fill="currentColor" fillOpacity="0.3" />
      </svg>
    ),
    empty: (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <rect x="16" y="16" width="32" height="32" rx="8" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.05" strokeDasharray="4 4" />
        <line x1="28" y1="28" x2="36" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
        <line x1="36" y1="28" x2="28" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
  };

  return illustrations[type] || illustrations.empty;
};

export default Illustration;
