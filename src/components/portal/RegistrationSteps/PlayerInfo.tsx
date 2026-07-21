"use client";

import { useRef, useState } from "react";
import { REGISTRATION_GRAD_YEARS } from "@/lib/constants";
import type { RegistrationData } from "../RegistrationModal";

interface Props {
  data: RegistrationData;
  onChange: (updates: Partial<RegistrationData>) => void;
  errors: Record<string, string>;
}

export default function PlayerInfo({ data, onChange, errors }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    onChange({ photo: file, photoPreview: URL.createObjectURL(file) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-1">Player Information</h3>
        <p className="text-sm text-[#9CA3AF]">Tell us about the athlete.</p>
      </div>

      {/* Photo upload */}
      <div className="flex flex-col items-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files[0]);
          }}
          className={`w-28 h-28 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all duration-200 ${
            dragOver
              ? "border-accent-blue bg-accent-blue/5"
              : data.photoPreview
              ? "border-[#E5E7EB]"
              : "border-[#D1D5DB] hover:border-accent-blue"
          }`}
        >
          {data.photoPreview ? (
            <img
              src={data.photoPreview}
              alt="Player preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center">
              <svg className="w-8 h-8 text-[#9CA3AF] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <p className="text-xs text-[#9CA3AF] mt-2">
          {data.photoPreview ? "Click to change" : "Upload photo (optional)"}
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
            value={data.firstName}
            onChange={(e) => onChange({ firstName: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
              errors.firstName ? "border-red-400" : "border-[#E5E7EB]"
            }`}
            placeholder="First name"
          />
          {errors.firstName && (
            <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Last Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => onChange({ lastName: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 ${
              errors.lastName ? "border-red-400" : "border-[#E5E7EB]"
            }`}
            placeholder="Last name"
          />
          {errors.lastName && (
            <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Grad year + position */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Graduation Year <span className="text-red-400">*</span>
          </label>
          <select
            value={data.graduationYear}
            onChange={(e) => onChange({ graduationYear: e.target.value })}
            className={`w-full px-4 py-3 rounded-xl border text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 bg-white ${
              errors.graduationYear ? "border-red-400" : "border-[#E5E7EB]"
            }`}
          >
            <option value="">Select graduation year</option>
            {REGISTRATION_GRAD_YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {errors.graduationYear && (
            <p className="text-xs text-red-500 mt-1">{errors.graduationYear}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            Position
          </label>
          <select
            value={data.position}
            onChange={(e) => onChange({ position: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 bg-white"
          >
            <option value="">Select position</option>
            <option value="Attack">Attack</option>
            <option value="Midfield">Midfield</option>
            <option value="Defense">Defense</option>
            <option value="Goalie">Goalie</option>
          </select>
        </div>
      </div>

    </div>
  );
}
