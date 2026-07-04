// Minimal section divider — field hash marks on a thin line.
export default function FieldDivider() {
  return (
    <div className="flex justify-center py-2" aria-hidden="true">
      <svg viewBox="0 0 160 14" className="w-36 h-auto">
        <path d="M0 7 H58" stroke="#E3E9F0" strokeWidth="1.5" />
        <path d="M68 2 V12 M80 2 V12 M92 2 V12" stroke="#4B9CD3" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M102 7 H160" stroke="#E3E9F0" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
