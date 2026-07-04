import ScrollReveal from "@/components/home/ScrollReveal";

export default function TrustBadge() {
  return (
    <section className="py-16 sm:py-20 bg-background">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex flex-col items-center gap-4 text-center">
            {/* Lock + Stripe badge */}
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-[#9CA3AF]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              <span className="text-sm font-medium text-[#9CA3AF]">
                Secure payments powered by
              </span>
              {/* Stripe wordmark */}
              <svg
                className="h-6 text-[#6772E5]"
                viewBox="0 0 60 25"
                fill="currentColor"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5.866 8.203c0-.953.784-1.318 2.08-1.318 1.86 0 4.21.564 6.07 1.57V3.024C11.98 2.098 9.97 1.75 7.946 1.75 3.234 1.75 0 4.32 0 8.477c0 6.57 9.042 5.52 9.042 8.352 0 1.128-.98 1.493-2.35 1.493-2.032 0-4.633-.836-6.693-1.965v5.555c2.278.98 4.583 1.388 6.694 1.388 4.834 0 8.16-2.392 8.16-6.588-.024-7.093-9.087-5.828-9.087-8.509h.1zM20.16 1.35l-4.565.972-.015 17.598c0 3.252 2.441 5.644 5.694 5.644 1.802 0 3.122-.33 3.85-.722v-4.32c-.704.286-4.18 1.296-4.18-1.956V10.62h4.18V6.126h-4.18L20.16 1.35zm10.873 6.2l-.293-1.424h-4.246v18.14h4.876V12.034c1.153-1.506 3.105-1.228 3.716-1.016V6.126c-.635-.237-2.954-.677-4.053 1.424zm5.165-2.848l4.899-1.048V0l-4.899 1.048v3.654zm0 1.424h4.899v18.14h-4.899V6.126zm12.816-.475c-1.9 0-3.122.895-3.803 1.515l-.253-1.04h-4.287v24.5l4.876-1.037.012-5.948c.704.51 1.74 1.234 3.455 1.234 3.49 0 6.672-2.81 6.672-8.994-.024-5.659-3.231-8.23-6.672-8.23zm-1.175 12.65c-1.15 0-1.83-.413-2.3-0.923l-.024-7.28c.5-.564 1.197-.953 2.324-.953 1.778 0 3.006 1.993 3.006 4.578 0 2.633-1.204 4.578-3.006 4.578zm16.405-12.65c-3.932 0-6.386 3.354-6.386 8.295 0 5.47 2.843 8.23 6.904 8.23 1.985 0 3.472-.45 4.607-1.08v-3.848c-1.135.564-2.44.91-4.086.91-1.618 0-3.048-.57-3.231-2.541h8.148c.024-.219.036-1.092.036-1.493-.012-4.94-2.393-8.474-5.992-8.474zm-2.418 6.614c0-1.89 1.157-2.673 2.2-2.673 1.012 0 2.103.783 2.103 2.673h-4.303z" />
              </svg>
            </div>
            <p className="text-xs text-[#9CA3AF] max-w-sm leading-relaxed">
              We never see or store your payment information. All transactions are
              encrypted and processed securely through Stripe.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
