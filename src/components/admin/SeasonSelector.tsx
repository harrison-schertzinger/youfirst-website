"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface Props {
  seasons: string[];
  current: string;
}

export default function SeasonSelector({ seasons, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function set(season: string) {
    const next = new URLSearchParams(params);
    next.set("season", season);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <select
      value={current}
      onChange={(e) => set(e.target.value)}
      className="text-[13px] bg-white border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-[#0A0A0B] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]/20 focus:border-[#4A90D9]"
      aria-label="Season"
    >
      {seasons.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}
