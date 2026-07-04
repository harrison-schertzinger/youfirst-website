import ScrollReveal from "./ScrollReveal";
import PhotoSlot from "@/components/shared/PhotoSlot";

export default function Backyard() {
  return (
    <section className="relative py-28 sm:py-40 overflow-hidden bg-[#0A0A0B]">
      <PhotoSlot
        name="backyard.jpg"
        alt="A young player tossing a lacrosse ball in the backyard"
        sizes="100vw"
        positionClassName="object-[center_35%]"
      />
      <div className="absolute inset-0 bg-[#0A0A0B]/60" />
      <div className="relative mx-auto max-w-[1180px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="max-w-2xl rounded-2xl bg-white/[0.08] backdrop-blur-md border border-white/15 shadow-[0_8px_60px_rgba(0,0,0,0.45)] p-8 sm:p-12">
            <h2 className="text-[2.5rem] md:text-[3.25rem] lg:text-[3.75rem] font-bold tracking-tight leading-[1.08] text-white">
              The backyard is{" "}
              <span className="gradient-text-blue">where it starts.</span>
            </h2>
            <p className="mt-6 text-[16px] sm:text-[17px] text-white/85 leading-[1.85]">
              Here is the truth about the best players in the country: growing
              up, someone tossed with them in the backyard, almost every day.
              That is our hope for our youngest players. A few minutes of catch
              with mom or dad most days does more than any single practice. It
              makes the commitment that comes later feel natural, because the
              love and the habit were there from the start. We will give her
              the coaching, the reps, and the standard. The backyard is where
              it becomes hers.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
