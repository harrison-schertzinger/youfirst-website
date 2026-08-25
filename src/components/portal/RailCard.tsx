/** Shared shell for every card in the dashboard's right rail. */
export default function RailCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF] mb-4">
        {label}
      </p>
      {children}
    </section>
  );
}
