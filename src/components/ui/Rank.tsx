/** Stacked rank chevrons, like the rank insignia on a CoD profile. */
export function Rank({ count = 3, className = 'h-5 w-5' }: { count?: number; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {Array.from({ length: count }, (_, i) => (
        <path key={i} d={`M3 ${9 + i * 5}l9-5 9 5`} />
      ))}
    </svg>
  );
}
