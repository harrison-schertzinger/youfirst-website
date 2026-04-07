"use client";

import type { RegistrationData } from "../RegistrationModal";

interface Props {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  errors: Record<string, string>;
}

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"] as const;
export type GearSize = (typeof SIZE_OPTIONS)[number] | "";

const FIELDS: Array<{
  key: "shirtSize" | "shortSize" | "sweatshirtSize" | "shootingShirtSize";
  label: string;
}> = [
  { key: "shirtSize", label: "Shirt Size" },
  { key: "shortSize", label: "Short Size" },
  { key: "sweatshirtSize", label: "Sweatshirt Size" },
  { key: "shootingShirtSize", label: "Shooting Shirt Size" },
];

export default function GearSizing({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">Gear Sizing</h3>
        <p className="text-sm text-[#9CA3AF]">
          We&apos;ll use these to order your player&apos;s gear. Sizes can be updated
          anytime through the Player Portal.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              {field.label} <span className="text-red-400">*</span>
            </label>
            <select
              value={data[field.key]}
              onChange={(e) =>
                onChange({ [field.key]: e.target.value } as Partial<RegistrationData>)
              }
              className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 bg-white ${
                errors[field.key] ? "border-red-400" : "border-[#E5E7EB]"
              }`}
            >
              <option value="">Select size</option>
              {SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {errors[field.key] && (
              <p className="text-xs text-red-500 mt-1">{errors[field.key]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
