"use client";

import type { RegistrationData } from "../RegistrationModal";

interface Props {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
}

export default function PlayerContact({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">Player Contact</h3>
        <p className="text-sm text-[#9CA3AF]">
          Optional — not every athlete has their own email yet, and that&apos;s fine.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Player Email
        </label>
        <input
          type="email"
          value={data.playerEmail}
          onChange={(e) => onChange({ playerEmail: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
          placeholder="player@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Player Phone
        </label>
        <input
          type="tel"
          value={data.playerPhone}
          onChange={(e) => onChange({ playerPhone: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="rounded-xl bg-accent-blue/5 border border-accent-blue/10 p-5">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-accent-blue flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-sm text-[#6B7280] leading-relaxed">
            Guardian contact info on the next step is what we&apos;ll primarily use for
            club communication. Player contact is just a nice-to-have.
          </p>
        </div>
      </div>
    </div>
  );
}
