"use client";

import { useState, useCallback, useEffect } from "react";
import PlayerInfo from "./RegistrationSteps/PlayerInfo";
import PlayerContact from "./RegistrationSteps/PlayerContact";
import PrimaryGuardian from "./RegistrationSteps/PrimaryGuardian";
import SecondGuardian from "./RegistrationSteps/SecondGuardian";
import ReviewSubmit from "./RegistrationSteps/ReviewSubmit";

// ─── Types ───────────────────────────────────────────────

export interface RegistrationData {
  // Player
  photo: File | null;
  photoPreview: string | null;
  firstName: string;
  lastName: string;
  graduationYear: string;
  position: string;
  jerseyNumber: string;
  // Player contact
  playerEmail: string;
  playerPhone: string;
  // Guardian 1
  guardian1FirstName: string;
  guardian1LastName: string;
  guardian1Email: string;
  guardian1Phone: string;
  guardian1Relationship: string;
  guardian1Address: string;
  guardian1City: string;
  guardian1State: string;
  guardian1Zip: string;
  // Guardian 2
  hasSecondGuardian: boolean;
  guardian2FirstName: string;
  guardian2LastName: string;
  guardian2Email: string;
  guardian2Phone: string;
  guardian2Relationship: string;
  guardian2Address: string;
  guardian2City: string;
  guardian2State: string;
  guardian2Zip: string;
  // Emergency
  emergencySameAsGuardian: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  medicalNotes: string;
}

const INITIAL_DATA: RegistrationData = {
  photo: null,
  photoPreview: null,
  firstName: "",
  lastName: "",
  graduationYear: "",
  position: "",
  jerseyNumber: "",
  playerEmail: "",
  playerPhone: "",
  guardian1FirstName: "",
  guardian1LastName: "",
  guardian1Email: "",
  guardian1Phone: "",
  guardian1Relationship: "",
  guardian1Address: "",
  guardian1City: "",
  guardian1State: "",
  guardian1Zip: "",
  hasSecondGuardian: false,
  guardian2FirstName: "",
  guardian2LastName: "",
  guardian2Email: "",
  guardian2Phone: "",
  guardian2Relationship: "",
  guardian2Address: "",
  guardian2City: "",
  guardian2State: "",
  guardian2Zip: "",
  emergencySameAsGuardian: "guardian1",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelationship: "",
  medicalNotes: "",
};

const STEP_LABELS = [
  "Player Info",
  "Contact",
  "Guardian",
  "2nd Guardian",
  "Review",
];

// ─── Component ───────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function RegistrationModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);
  const [data, setData] = useState<RegistrationData>(INITIAL_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const isDirty = useCallback(() => {
    return data.firstName !== "" || data.lastName !== "" || data.guardian1Email !== "";
  }, [data.firstName, data.lastName, data.guardian1Email]);

  function handleClose() {
    if (isDirty() && !success) {
      if (!window.confirm("Are you sure? Your progress will be lost.")) return;
    }
    onClose();
  }

  function update(updates: Partial<RegistrationData>) {
    setData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const cleared = { ...errors };
    for (const key of Object.keys(updates)) {
      delete cleared[key];
    }
    setErrors(cleared);
  }

  // ─── Validation ─────────────────────────────────────

  function validateStep(s: number): Record<string, string> {
    const e: Record<string, string> = {};

    if (s === 0) {
      if (!data.firstName.trim()) e.firstName = "Required";
      if (!data.lastName.trim()) e.lastName = "Required";
      if (!data.graduationYear) e.graduationYear = "Required";
    }

    if (s === 2) {
      if (!data.guardian1FirstName.trim()) e.guardian1FirstName = "Required";
      if (!data.guardian1LastName.trim()) e.guardian1LastName = "Required";
      if (!data.guardian1Email.trim()) e.guardian1Email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.guardian1Email))
        e.guardian1Email = "Enter a valid email";
      if (!data.guardian1Phone.trim()) e.guardian1Phone = "Required";
      if (!data.guardian1Relationship) e.guardian1Relationship = "Required";
    }

    if (s === 3 && data.hasSecondGuardian) {
      if (!data.guardian2FirstName.trim()) e.guardian2FirstName = "Required";
      if (!data.guardian2LastName.trim()) e.guardian2LastName = "Required";
      if (!data.guardian2Email.trim()) e.guardian2Email = "Required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.guardian2Email))
        e.guardian2Email = "Enter a valid email";
      if (!data.guardian2Phone.trim()) e.guardian2Phone = "Required";
      if (!data.guardian2Relationship) e.guardian2Relationship = "Required";
    }

    if (s === 4) {
      if (!data.emergencySameAsGuardian) {
        if (!data.emergencyName.trim()) e.emergencyName = "Required";
        if (!data.emergencyPhone.trim()) e.emergencyPhone = "Required";
        if (!data.emergencyRelationship.trim()) e.emergencyRelationship = "Required";
      }
    }

    return e;
  }

  // ─── Navigation ─────────────────────────────────────

  function goNext() {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});

    // Auto-fill emergency if "same as guardian" and entering review step
    if (step === 3 && data.emergencySameAsGuardian === "guardian1") {
      setData((prev) => ({
        ...prev,
        emergencyName: `${prev.guardian1FirstName} ${prev.guardian1LastName}`,
        emergencyPhone: prev.guardian1Phone,
        emergencyRelationship: prev.guardian1Relationship,
      }));
    }

    setDirection("forward");
    setAnimKey((k) => k + 1);
    setStep((s) => Math.min(s + 1, 4));
  }

  function goBack() {
    setErrors({});
    setDirection("back");
    setAnimKey((k) => k + 1);
    setStep((s) => Math.max(s - 1, 0));
  }

  function goToStep(target: number) {
    setErrors({});
    setDirection(target < step ? "back" : "forward");
    setAnimKey((k) => k + 1);
    setStep(target);
  }

  // ─── Submit ─────────────────────────────────────────

  async function handleSubmit() {
    const stepErrors = validateStep(4);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();
      if (data.photo) formData.append("photo", data.photo);

      // Send all data as JSON in a field
      const payload = { ...data };
      // Remove non-serializable fields
      const { photo: _p, photoPreview: _pp, ...jsonData } = payload;
      formData.append("data", JSON.stringify(jsonData));

      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        setSubmitError(result.error || "Registration failed. Please try again.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
    } catch {
      setSubmitError(
        "Unable to connect. Please try again or contact kathleen@youfirstlacrosse.com."
      );
      setSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────

  const animClass =
    direction === "forward"
      ? "animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]"
      : "animate-[slideInLeft_0.3s_cubic-bezier(0.16,1,0.3,1)_forwards]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleCheck {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes confettiBurst {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-80px) rotate(720deg); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#F0F1F3] transition-colors duration-200"
          aria-label="Close registration"
        >
          <svg className="w-5 h-5 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!success ? (
          <>
            {/* Progress bar */}
            <div className="px-8 pt-8 pb-2">
              <div className="flex items-center gap-1">
                {STEP_LABELS.map((label, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div
                      className={`w-full h-1.5 rounded-full transition-all duration-500 ${
                        i <= step ? "bg-accent-blue" : "bg-[#E5E7EB]"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider transition-colors duration-300 hidden sm:block ${
                        i <= step ? "text-accent-blue" : "text-[#9CA3AF]"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#9CA3AF] mt-3 sm:hidden">
                Step {step + 1} of 5 — {STEP_LABELS[step]}
              </p>
            </div>

            {/* Step content — scrollable */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {submitError && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {submitError}
                </div>
              )}
              <div key={animKey} className={animClass}>
                {step === 0 && <PlayerInfo data={data} onChange={update} errors={errors} />}
                {step === 1 && <PlayerContact data={data} onChange={update} />}
                {step === 2 && <PrimaryGuardian data={data} onChange={update} errors={errors} />}
                {step === 3 && <SecondGuardian data={data} onChange={update} errors={errors} />}
                {step === 4 && <ReviewSubmit data={data} onChange={update} errors={errors} onEditStep={goToStep} />}
              </div>
            </div>

            {/* Footer nav */}
            <div className="px-8 py-5 border-t border-[#E5E7EB] flex items-center justify-between bg-white">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-2 text-sm font-medium text-[#6B7280] hover:text-[#1A1A1A] transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="px-8 py-3 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100"
                >
                  {submitting ? "Submitting..." : "Submit Registration"}
                </button>
              )}
            </div>
          </>
        ) : (
          /* ─── Success state ─── */
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
            {/* Confetti dots */}
            <div className="relative mb-8">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background: i % 2 === 0 ? "#4A90D9" : "#10B981",
                    left: `${50 + 40 * Math.cos((i * Math.PI) / 4)}%`,
                    top: `${50 + 40 * Math.sin((i * Math.PI) / 4)}%`,
                    animation: `confettiBurst 1s ${i * 0.05}s cubic-bezier(0.16,1,0.3,1) forwards`,
                  }}
                />
              ))}
              {/* Checkmark circle */}
              <div
                className="w-20 h-20 rounded-full bg-accent-green/10 flex items-center justify-center"
                style={{ animation: "scaleCheck 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}
              >
                <svg className="w-10 h-10 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3">
              Welcome to{" "}
              <span className="text-[#1A1A1A]">
                You<span className="text-accent-blue">.</span> First
              </span>{" "}
              Elite Lacrosse!
            </h2>

            {/* Player summary */}
            <div className="flex items-center justify-center gap-3 mt-6 mb-6">
              {data.photoPreview && (
                <img src={data.photoPreview} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-accent-blue/20" />
              )}
              <div className="text-left">
                <p className="text-lg font-bold text-[#1A1A1A]">
                  {data.firstName} {data.lastName}
                </p>
                <p className="text-sm text-[#6B7280]">
                  Class of {data.graduationYear}
                  {data.position && ` · ${data.position}`}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAFBFC] border border-[#E5E7EB] p-5 max-w-sm w-full mb-8">
              <p className="text-sm text-[#6B7280] mb-1">Your portal login</p>
              <p className="text-base font-semibold text-[#1A1A1A]">{data.guardian1Email}</p>
            </div>

            <p className="text-sm text-[#6B7280] max-w-sm leading-relaxed mb-8">
              Check your email for a magic link to access your player&apos;s profile, schedule, and payment history.
            </p>

            <button
              onClick={onClose}
              className="px-8 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
