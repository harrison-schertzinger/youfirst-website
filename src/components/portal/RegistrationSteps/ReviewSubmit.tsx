"use client";

import type { RegistrationData } from "../RegistrationModal";

interface Props {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  errors: Record<string, string>;
  onEditStep: (step: number) => void;
}

export default function ReviewSubmit({ data, onChange, errors, onEditStep }: Props) {
  function handleSameAsGuardian(value: string) {
    onChange({ emergencySameAsGuardian: value });
    if (value === "guardian1") {
      onChange({
        emergencySameAsGuardian: value,
        emergencyName: `${data.guardian1FirstName} ${data.guardian1LastName}`,
        emergencyPhone: data.guardian1Phone,
        emergencyRelationship: data.guardian1Relationship,
      });
    } else if (value === "guardian2") {
      onChange({
        emergencySameAsGuardian: value,
        emergencyName: `${data.guardian2FirstName} ${data.guardian2LastName}`,
        emergencyPhone: data.guardian2Phone,
        emergencyRelationship: data.guardian2Relationship,
      });
    } else {
      onChange({
        emergencySameAsGuardian: "",
        emergencyName: "",
        emergencyPhone: "",
        emergencyRelationship: "",
      });
    }
  }

  return (
    <div className="space-y-8">
      {/* Emergency contact */}
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">Emergency Contact</h3>
          <p className="text-sm text-[#9CA3AF]">Who should we call in an emergency?</p>
        </div>

        {/* Same as guardian */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E7EB] hover:border-accent-blue/30 transition-all duration-200 cursor-pointer">
            <input
              type="radio"
              name="emergencySame"
              checked={data.emergencySameAsGuardian === "guardian1"}
              onChange={() => handleSameAsGuardian("guardian1")}
              className="accent-accent-blue"
            />
            <span className="text-sm text-[#1A1A1A]">
              Same as {data.guardian1FirstName || "Guardian 1"}
            </span>
          </label>
          {data.hasSecondGuardian && data.guardian2FirstName && (
            <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E7EB] hover:border-accent-blue/30 transition-all duration-200 cursor-pointer">
              <input
                type="radio"
                name="emergencySame"
                checked={data.emergencySameAsGuardian === "guardian2"}
                onChange={() => handleSameAsGuardian("guardian2")}
                className="accent-accent-blue"
              />
              <span className="text-sm text-[#1A1A1A]">
                Same as {data.guardian2FirstName}
              </span>
            </label>
          )}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-[#E5E7EB] hover:border-accent-blue/30 transition-all duration-200 cursor-pointer">
            <input
              type="radio"
              name="emergencySame"
              checked={data.emergencySameAsGuardian === ""}
              onChange={() => handleSameAsGuardian("")}
              className="accent-accent-blue"
            />
            <span className="text-sm text-[#1A1A1A]">Someone else</span>
          </label>
        </div>

        {data.emergencySameAsGuardian === "" && (
          <div className="space-y-4 animate-fade-in-up">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={data.emergencyName}
                onChange={(e) => onChange({ emergencyName: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
                  errors.emergencyName ? "border-red-400" : "border-[#E5E7EB]"
                }`}
                placeholder="Emergency contact name"
              />
              {errors.emergencyName && (
                <p className="text-xs text-red-500 mt-1">{errors.emergencyName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={data.emergencyPhone}
                onChange={(e) => onChange({ emergencyPhone: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
                  errors.emergencyPhone ? "border-red-400" : "border-[#E5E7EB]"
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.emergencyPhone && (
                <p className="text-xs text-red-500 mt-1">{errors.emergencyPhone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                Relationship <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={data.emergencyRelationship}
                onChange={(e) => onChange({ emergencyRelationship: e.target.value })}
                className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
                  errors.emergencyRelationship ? "border-red-400" : "border-[#E5E7EB]"
                }`}
                placeholder="e.g. Grandmother, Uncle"
              />
              {errors.emergencyRelationship && (
                <p className="text-xs text-red-500 mt-1">{errors.emergencyRelationship}</p>
              )}
            </div>
          </div>
        )}

        {/* Medical notes */}
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Medical Notes / Allergies
          </label>
          <textarea
            value={data.medicalNotes}
            onChange={(e) => onChange({ medicalNotes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 resize-none"
            placeholder="Any allergies, medications, or conditions we should know about (optional)"
          />
        </div>
      </div>

      {/* Review summary */}
      <div className="gradient-divider" />

      <div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Review & Submit</h3>

        {/* Player card */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Player</h4>
            <button
              type="button"
              onClick={() => onEditStep(0)}
              className="text-xs text-accent-blue hover:text-accent-blue-hover transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="flex items-center gap-4">
            {data.photoPreview && (
              <img src={data.photoPreview} alt="" className="w-12 h-12 rounded-full object-cover" />
            )}
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {data.firstName} {data.lastName}
              </p>
              <p className="text-xs text-[#6B7280]">
                Class of {data.graduationYear}
                {data.position && ` · ${data.position}`}
              </p>
            </div>
          </div>
        </div>

        {/* Gear sizing card */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Gear Sizing</h4>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-xs text-accent-blue hover:text-accent-blue-hover transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">Shirt</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{data.shirtSize || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">Short</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{data.shortSize || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">Sweatshirt</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{data.sweatshirtSize || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">Shooting Shirt</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">{data.shootingShirtSize || "—"}</span>
            </div>
          </div>
        </div>

        {/* Guardian 1 card */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Primary Guardian</h4>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="text-xs text-accent-blue hover:text-accent-blue-hover transition-colors"
            >
              Edit
            </button>
          </div>
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {data.guardian1FirstName} {data.guardian1LastName}
          </p>
          <p className="text-xs text-[#6B7280]">
            {data.guardian1Relationship} · {data.guardian1Email} · {data.guardian1Phone}
          </p>
        </div>

        {/* Guardian 2 card */}
        {data.hasSecondGuardian && data.guardian2FirstName && (
          <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Second Guardian</h4>
              <button
                type="button"
                onClick={() => onEditStep(4)}
                className="text-xs text-accent-blue hover:text-accent-blue-hover transition-colors"
              >
                Edit
              </button>
            </div>
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {data.guardian2FirstName} {data.guardian2LastName}
            </p>
            <p className="text-xs text-[#6B7280]">
              {data.guardian2Relationship} · {data.guardian2Email} · {data.guardian2Phone}
            </p>
          </div>
        )}

        {/* Emergency contact card */}
        <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-5">
          <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Emergency Contact</h4>
          <p className="text-sm font-semibold text-[#1A1A1A]">{data.emergencyName}</p>
          <p className="text-xs text-[#6B7280]">
            {data.emergencyRelationship} · {data.emergencyPhone}
          </p>
          {data.medicalNotes && (
            <p className="text-xs text-[#6B7280] mt-2 italic">{data.medicalNotes}</p>
          )}
        </div>
      </div>
    </div>
  );
}
