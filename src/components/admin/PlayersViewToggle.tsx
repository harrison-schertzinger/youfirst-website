"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Table2 } from "lucide-react";

type View = "tiles" | "spreadsheet";

export default function PlayersViewToggle({ current }: { current: View }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setView = (next: View) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "tiles") {
      params.delete("view");
      // Tiles view doesn't use the spreadsheet's sort/order — strip them so the URL stays clean.
      params.delete("sort");
      params.delete("order");
    } else {
      params.set("view", "spreadsheet");
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/players?${qs}` : "/admin/players");
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-[#E5E7EB] bg-white p-0.5">
      <ToggleButton
        active={current === "tiles"}
        onClick={() => setView("tiles")}
        label="Tiles"
        Icon={LayoutGrid}
      />
      <ToggleButton
        active={current === "spreadsheet"}
        onClick={() => setView("spreadsheet")}
        label="Spreadsheet"
        Icon={Table2}
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof LayoutGrid;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
        active
          ? "bg-[#4A90D9]/[0.08] text-[#4A90D9]"
          : "text-[#6B7280] hover:text-[#0A0A0B]",
      ].join(" ")}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
