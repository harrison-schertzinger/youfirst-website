"use client";

import { useEffect, useState } from "react";

export default function CheckoutToast({ type }: { type: "success" | "canceled" }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const isSuccess = type === "success";

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <div
        className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border backdrop-blur-sm ${
          isSuccess
            ? "bg-white border-[#10B981]/20"
            : "bg-white border-[#F59E0B]/20"
        }`}
      >
        {isSuccess ? (
          <svg className="w-5 h-5 text-[#10B981] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-[#F59E0B] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )}
        <p className="text-sm font-medium text-[#1A1A1A]">
          {isSuccess
            ? "Payment successful! Welcome to the family."
            : "Payment canceled. No charges were made."}
        </p>
        <button
          onClick={() => setVisible(false)}
          className="ml-2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
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
