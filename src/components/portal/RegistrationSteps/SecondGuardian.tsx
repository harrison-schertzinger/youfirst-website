"use client";

import type { RegistrationData } from "../RegistrationModal";

interface Props {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  errors: Record<string, string>;
}

const RELATIONSHIPS = [
  "Mother",
  "Father",
  "Stepmother",
  "Stepfather",
  "Legal Guardian",
  "Other",
];

export default function SecondGuardian({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">Second Guardian</h3>
        <p className="text-sm text-[#9CA3AF]">Optional — add another parent or guardian.</p>
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={() => onChange({ hasSecondGuardian: !data.hasSecondGuardian })}
        className="flex items-center gap-3 w-full p-4 rounded-xl border border-[#E5E7EB] hover:border-accent-blue/30 transition-all duration-200"
      >
        <div
          className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center ${
            data.hasSecondGuardian ? "bg-accent-blue" : "bg-[#D1D5DB]"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
              data.hasSecondGuardian ? "translate-x-[18px]" : "translate-x-[2px]"
            }`}
          />
        </div>
        <span className="text-sm font-medium text-[#1A1A1A]">
          Add a second guardian
        </span>
      </button>

      {data.hasSecondGuardian && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                First Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={data.guardian2FirstName}
                onChange={(e) => onChange({ guardian2FirstName: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
                  errors.guardian2FirstName ? "border-red-400" : "border-[#E5E7EB]"
                }`}
                placeholder="First name"
              />
              {errors.guardian2FirstName && (
                <p className="text-xs text-red-500 mt-1">{errors.guardian2FirstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                Last Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={data.guardian2LastName}
                onChange={(e) => onChange({ guardian2LastName: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
                  errors.guardian2LastName ? "border-red-400" : "border-[#E5E7EB]"
                }`}
                placeholder="Last name"
              />
              {errors.guardian2LastName && (
                <p className="text-xs text-red-500 mt-1">{errors.guardian2LastName}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={data.guardian2Email}
              onChange={(e) => onChange({ guardian2Email: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
                errors.guardian2Email ? "border-red-400" : "border-[#E5E7EB]"
              }`}
              placeholder="parent@email.com"
            />
            {errors.guardian2Email && (
              <p className="text-xs text-red-500 mt-1">{errors.guardian2Email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              Phone <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={data.guardian2Phone}
              onChange={(e) => onChange({ guardian2Phone: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
                errors.guardian2Phone ? "border-red-400" : "border-[#E5E7EB]"
              }`}
              placeholder="(555) 123-4567"
            />
            {errors.guardian2Phone && (
              <p className="text-xs text-red-500 mt-1">{errors.guardian2Phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              Relationship <span className="text-red-400">*</span>
            </label>
            <select
              value={data.guardian2Relationship}
              onChange={(e) => onChange({ guardian2Relationship: e.target.value })}
              className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 bg-white ${
                errors.guardian2Relationship ? "border-red-400" : "border-[#E5E7EB]"
              }`}
            >
              <option value="">Select relationship</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {errors.guardian2Relationship && (
              <p className="text-xs text-red-500 mt-1">{errors.guardian2Relationship}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={data.guardian2Address}
              onChange={(e) => onChange({ guardian2Address: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 mb-3"
              placeholder="Street address"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                value={data.guardian2City}
                onChange={(e) => onChange({ guardian2City: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
                placeholder="City"
              />
              <input
                type="text"
                value={data.guardian2State}
                onChange={(e) => onChange({ guardian2State: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
                placeholder="State"
                maxLength={2}
              />
              <input
                type="text"
                value={data.guardian2Zip}
                onChange={(e) => onChange({ guardian2Zip: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
                placeholder="ZIP"
                maxLength={10}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
