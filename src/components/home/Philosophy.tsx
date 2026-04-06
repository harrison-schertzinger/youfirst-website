export default function Philosophy() {
  return (
    <section className="relative py-32 sm:py-40 lg:py-48 overflow-hidden" id="philosophy">
      {/* Full-bleed dark background — photo placeholder */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #0f1923 0%, #1a2332 50%, #2d3748 100%)",
          }}
        />
        {/* Overlay for when real photo is added */}
        <div className="absolute inset-0 bg-black/55" />
        {/* Photo indicator */}
        <div className="absolute top-6 right-6 text-white/15 text-xs font-semibold uppercase tracking-[0.2em]">
          PHOTO
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-3xl px-6 lg:px-8 text-center">
        <p className="section-label text-white/50 mb-10">
          The Philosophy
        </p>

        <h2 className="text-3xl sm:text-4xl font-bold text-white/90 mb-10 leading-tight">
          Why is the{" "}
          <span className="text-accent-blue">You.</span>{" "}
          backwards?
        </h2>

        <div className="space-y-8">
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed font-light">
            So it can only be read in the mirror — because that is what we care
            about.
          </p>
          <p className="text-xl sm:text-2xl text-white/90 leading-relaxed">
            Who do <em className="font-medium not-italic text-white">you</em>{" "}
            see staring back at you?
          </p>
          <p className="text-lg sm:text-xl text-white/80 leading-relaxed font-light">
            Are you proud of that person? Do you love that person? Are you
            oriented towards the best for yourself?
          </p>
        </div>

        {/* Closing statement — emphasized */}
        <div className="mt-14 pt-10 border-t border-white/10">
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-snug">
            This club is about{" "}
            <span className="text-accent-blue">You.</span>
            <br />
            <span className="font-light text-white/80">
              Build the best You. — with us.
            </span>
          </p>
        </div>

        {/* Mirrored .uoY watermark */}
        <div
          className="mt-16 text-6xl sm:text-7xl font-bold text-white/[0.06] select-none"
          aria-hidden="true"
          style={{ transform: "scaleX(-1)" }}
        >
          You.
        </div>
      </div>
    </section>
  );
}
