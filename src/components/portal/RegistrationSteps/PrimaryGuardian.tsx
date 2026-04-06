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

export default function PrimaryGuardian({ data, onChange, errors }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">Primary Guardian</h3>
        <p className="text-sm text-[#9CA3AF]">
          This person will be the main point of contact and portal login.
        </p>
      </div>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            First Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.guardian1FirstName}
            onChange={(e) => onChange({ guardian1FirstName: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
              errors.guardian1FirstName ? "border-red-400" : "border-[#E5E7EB]"
            }`}
            placeholder="First name"
          />
          {errors.guardian1FirstName && (
            <p className="text-xs text-red-500 mt-1">{errors.guardian1FirstName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Last Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.guardian1LastName}
            onChange={(e) => onChange({ guardian1LastName: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
              errors.guardian1LastName ? "border-red-400" : "border-[#E5E7EB]"
            }`}
            placeholder="Last name"
          />
          {errors.guardian1LastName && (
            <p className="text-xs text-red-500 mt-1">{errors.guardian1LastName}</p>
          )}
        </div>
      </div>

      {/* Email + Phone */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Email <span className="text-red-400">*</span>
        </label>
        <input
          type="email"
          value={data.guardian1Email}
          onChange={(e) => onChange({ guardian1Email: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
            errors.guardian1Email ? "border-red-400" : "border-[#E5E7EB]"
          }`}
          placeholder="parent@email.com"
        />
        {errors.guardian1Email && (
          <p className="text-xs text-red-500 mt-1">{errors.guardian1Email}</p>
        )}
        <p className="text-xs text-[#9CA3AF] mt-1">This becomes the portal sign-in email.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Phone <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          value={data.guardian1Phone}
          onChange={(e) => onChange({ guardian1Phone: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
            errors.guardian1Phone ? "border-red-400" : "border-[#E5E7EB]"
          }`}
          placeholder="(555) 123-4567"
        />
        {errors.guardian1Phone && (
          <p className="text-xs text-red-500 mt-1">{errors.guardian1Phone}</p>
        )}
      </div>

      {/* Relationship */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Relationship <span className="text-red-400">*</span>
        </label>
        <select
          value={data.guardian1Relationship}
          onChange={(e) => onChange({ guardian1Relationship: e.target.value })}
          className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 bg-white ${
            errors.guardian1Relationship ? "border-red-400" : "border-[#E5E7EB]"
          }`}
        >
          <option value="">Select relationship</option>
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {errors.guardian1Relationship && (
          <p className="text-xs text-red-500 mt-1">{errors.guardian1Relationship}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          Address
        </label>
        <input
          type="text"
          value={data.guardian1Address}
          onChange={(e) => onChange({ guardian1Address: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 mb-3"
          placeholder="Street address"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            type="text"
            value={data.guardian1City}
            onChange={(e) => onChange({ guardian1City: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
            placeholder="City"
          />
          <input
            type="text"
            value={data.guardian1State}
            onChange={(e) => onChange({ guardian1State: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
            placeholder="State"
            maxLength={2}
          />
          <input
            type="text"
            value={data.guardian1Zip}
            onChange={(e) => onChange({ guardian1Zip: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200"
            placeholder="ZIP"
            maxLength={10}
          />
        </div>
      </div>
    </div>
  );
}
