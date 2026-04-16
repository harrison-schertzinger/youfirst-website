"use client";

import { useState, useEffect } from "react";

export default function PaymentBanner({
  paid,
  canceled,
}: {
  paid: string | null;
  canceled: string | null;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  if (paid) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pt-6">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#34D399]/10 border border-[#34D399]/25 px-5 py-4">
          <div className="flex items-center gap-3">
            <svg
              className="w-5 h-5 text-[#34D399] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm font-semibold text-[#1A1A1A]">
              Payment received! Your account will update shortly.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 pt-6">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F0F1F3] border border-[#E5E7EB] px-5 py-4">
          <p className="text-sm text-[#6B7280]">
            Payment canceled. Try again when you're ready.
          </p>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
}
