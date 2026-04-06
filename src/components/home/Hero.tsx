import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background — photo placeholder */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #0f1923 0%, #1a2332 40%, #2d3748 100%)",
        }}
      >
        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Photo indicator */}
        <div className="absolute top-6 right-6 text-white/15 text-xs font-semibold uppercase tracking-[0.2em]">
          PHOTO
        </div>
      </div>

      {/* Gradient overlay for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Top label */}
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-6">
          Southern Ohio&apos;s Premier College Prep Club
        </p>

        {/* Main headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] mb-6">
          <span className="block">You. First</span>
          <span className="block font-light text-[0.75em] mt-1">
            Elite Lacrosse
          </span>
        </h1>

        {/* Subline */}
        <p className="text-lg sm:text-xl text-white/70 font-light max-w-xl mx-auto mb-10">
          Build &amp; Bring the Best Together
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/schedule"
            className="inline-flex items-center justify-center px-8 py-3.5 bg-accent-blue text-white text-sm font-semibold uppercase tracking-[0.08em] rounded-lg hover:bg-accent-blue-hover transition-colors min-w-[200px]"
          >
            View Schedule
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3.5 border-2 border-white/30 text-white text-sm font-semibold uppercase tracking-[0.08em] rounded-lg hover:bg-white/10 hover:border-white/50 transition-all min-w-[200px]"
          >
            Join the Family
          </Link>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div
          className="flex flex-col items-center gap-2"
          style={{ animation: "scroll-hint 2s ease-in-out infinite" }}
        >
          <span className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-medium">
            Scroll
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-white/40"
          >
            <path
              d="M4 8L10 14L16 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
