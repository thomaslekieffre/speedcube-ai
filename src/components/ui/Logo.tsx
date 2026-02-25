export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top face */}
      <path d="M16 5L27 11L16 17L5 11Z" fill="white" opacity="0.95" />
      {/* Left face */}
      <path d="M5 11L16 17L16 27L5 21Z" fill="white" opacity="0.7" />
      {/* Right face */}
      <path d="M16 17L27 11L27 21L16 27Z" fill="white" opacity="0.5" />
      {/* Grid - top */}
      <line x1="8.7" y1="9.7" x2="19.7" y2="15.7" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="12.3" y1="8.3" x2="23.3" y2="14.3" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="12.3" y1="14.3" x2="23.3" y2="8.3" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      <line x1="8.7" y1="12.7" x2="19.7" y2="6.7" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
      {/* Grid - left */}
      <line x1="5" y1="14.3" x2="16" y2="20.3" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="5" y1="17.7" x2="16" y2="23.7" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="8.7" y1="15" x2="8.7" y2="25" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="12.3" y1="17" x2="12.3" y2="27" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      {/* Grid - right */}
      <line x1="16" y1="20.3" x2="27" y2="14.3" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="16" y1="23.7" x2="27" y2="17.7" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="19.7" y1="17" x2="19.7" y2="27" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="23.3" y1="15" x2="23.3" y2="25" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}
