// The player's arc through the club — JUMPSTART → LAUNCH → ELITE → college —
// as a rising stepped path. The Carolina line draws itself in when scrolled
// into view (CSS in globals.css, keyed off ScrollReveal's .visible class;
// reduced-motion users see it fully drawn).

const PATH = "M40 274 H330 L410 192 H660 L740 110 H1035";

export default function JourneyArc() {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <svg
        viewBox="0 0 1240 340"
        className="w-full min-w-[760px] h-auto"
        role="img"
        aria-label="The player path: Jumpstart for classes 2033 to 2036, Launch for class 2032, Elite for classes 2031 and up, building toward college lacrosse"
      >
        {/* base track */}
        <path d={PATH} stroke="#E3E9F0" strokeWidth="4" fill="none" strokeLinecap="round" />
        {/* animated Carolina progress line */}
        <path d={PATH} className="journey-progress" stroke="#4B9CD3" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* start marker */}
        <circle cx="40" cy="274" r="6" fill="#0A0A0A" />

        {/* stage nodes */}
        {[
          { x: 185, y: 274, name: "JUMPSTART", sub: "Classes 2033–2036 · rising 3rd–6th" },
          { x: 535, y: 192, name: "LAUNCH", sub: "Class 2032 · rising 7th" },
          { x: 887, y: 110, name: "ELITE", sub: "Classes 2031 and up · rising 8th+" },
        ].map((s) => (
          <g key={s.name}>
            <circle cx={s.x} cy={s.y} r="12" fill="#FFFFFF" stroke="#4B9CD3" strokeWidth="3" />
            <circle cx={s.x} cy={s.y} r="4.5" fill="#4B9CD3" />
            <text
              x={s.x}
              y={s.y - 28}
              textAnchor="middle"
              fontSize="22"
              fontWeight="800"
              letterSpacing="2"
              fill="#0A0A0A"
              fontFamily="inherit"
            >
              {s.name}
            </text>
            <text
              x={s.x}
              y={s.y + 38}
              textAnchor="middle"
              fontSize="13.5"
              fontWeight="500"
              fill="#5B6470"
              fontFamily="inherit"
            >
              {s.sub}
            </text>
          </g>
        ))}

        {/* college pennant at the top of the climb */}
        <path d="M1100 110 V30" stroke="#0A0A0A" strokeWidth="3" strokeLinecap="round" />
        <path d="M1100 30 L1168 45 L1100 60 Z" fill="#4B9CD3" />
        <text x="1100" y="140" textAnchor="middle" fontSize="13.5" fontWeight="700" letterSpacing="1.5" fill="#5B6470" fontFamily="inherit">
          COLLEGE
        </text>
      </svg>
    </div>
  );
}
