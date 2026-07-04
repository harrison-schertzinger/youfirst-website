// The season as a designed calendar band: June through February live in
// Carolina blue; March–May sit quiet. Nine straight months, drawn not told.

const MONTHS = ["JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR", "APR", "MAY"];
const ACTIVE = 9;

export default function SeasonBandSvg() {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <svg
        viewBox="0 0 1240 158"
        className="w-full min-w-[720px] h-auto"
        role="img"
        aria-label="Season calendar: training options June through February, off March through May"
      >
        {/* bracket over the active nine months */}
        <path d="M22 44 V36 H918 V44" stroke="#4B9CD3" strokeWidth="2.5" fill="none" />
        <text x="470" y="24" textAnchor="middle" fontSize="15" fontWeight="800" letterSpacing="3" fill="#0A0A0A" fontFamily="inherit">
          NINE STRAIGHT MONTHS
        </text>

        {MONTHS.map((m, i) => {
          const x = 20 + i * 101;
          const active = i < ACTIVE;
          return (
            <g key={m}>
              <rect
                x={x}
                y={60}
                width={93}
                height={66}
                rx={14}
                fill={active ? "#4B9CD3" : "#FFFFFF"}
                stroke={active ? "none" : "#E3E9F0"}
                strokeWidth={active ? 0 : 2}
              />
              <text
                x={x + 46.5}
                y={100}
                textAnchor="middle"
                fontSize="19"
                fontWeight="700"
                letterSpacing="1.5"
                fill={active ? "#FFFFFF" : "#98A0AB"}
                fontFamily="inherit"
              >
                {m}
              </text>
            </g>
          );
        })}

        <text x="20" y="152" fontSize="13" fontWeight="500" fill="#98A0AB" fontFamily="inherit">
          Summer into winter — practice most weekends outside of holidays.
        </text>
      </svg>
    </div>
  );
}
