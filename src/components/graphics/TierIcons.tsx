// Custom tier iconography — Carolina blue line work, one icon per stage.
// Jumpstart: a ball with rising energy. Launch: a trajectory taking off.
// Elite: the star. All stroke-based, currentColor, crisp at 40-56px.

interface IconProps {
  className?: string;
}

export function JumpstartIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <circle cx="24" cy="31" r="8.5" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 15V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 19l-5.5-5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M35 19l5.5-5.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LaunchIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M6 41c10-1 17-5.5 22.5-13.5C33 21 36.5 15 41 9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M34.5 9.5H41.5V16.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="34" r="2" fill="currentColor" />
      <circle cx="14" cy="36.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function EliteIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 6l5.1 11.6L41.5 19l-9.4 8.3L35 40 24 33.4 13 40l2.9-12.7L6.5 19l12.4-1.4L24 6z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
