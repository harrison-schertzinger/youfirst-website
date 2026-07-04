// Designed stat motifs for the proof tiles — a nod to our player-spotlight
// stat-bar graphics, translated fully into black / Carolina / white.

interface Props {
  variant: "sevenOfEight" | "commitments" | "coaches";
  className?: string;
}

export default function StatGraphic({ variant, className = "" }: Props) {
  if (variant === "sevenOfEight") {
    // 8 bars — 7 of them ours.
    const heights = [34, 52, 44, 62, 40, 56, 48, 66];
    return (
      <svg viewBox="0 0 170 72" className={className} aria-hidden="true">
        {heights.map((h, i) => (
          <rect
            key={i}
            x={i * 21}
            y={70 - h}
            width={14}
            height={h}
            rx={4}
            fill={i === 4 ? "#E3E9F0" : "#4B9CD3"}
          />
        ))}
        <path d="M0 71.5 H164" stroke="#0A0A0A" strokeWidth="1.5" />
      </svg>
    );
  }

  if (variant === "commitments") {
    // A rising staircase — players climbing out of Cincinnati into programs.
    const heights = [18, 30, 42, 54, 66];
    return (
      <svg viewBox="0 0 170 72" className={className} aria-hidden="true">
        {heights.map((h, i) => (
          <rect
            key={i}
            x={i * 27}
            y={70 - h}
            width={18}
            height={h}
            rx={4}
            fill={i === 4 ? "#0A0A0A" : "#4B9CD3"}
          />
        ))}
        <path d="M14 46 L118 8" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 6" />
        <path d="M112 4 L122 6.5 L115 14" stroke="#0A0A0A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M0 71.5 H140" stroke="#0A0A0A" strokeWidth="1.5" />
      </svg>
    );
  }

  // coaches — a segmented ring, every segment filled: 100%.
  return (
    <svg viewBox="0 0 72 72" className={className} aria-hidden="true">
      <circle
        cx="36"
        cy="36"
        r="27"
        fill="none"
        stroke="#4B9CD3"
        strokeWidth="9"
        strokeDasharray="10.2 3.9"
        transform="rotate(-90 36 36)"
      />
      <path d="M26 36.5l7 7 13-14" stroke="#0A0A0A" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
