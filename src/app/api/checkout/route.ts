import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { PAYMENT_PLANS } from "@/lib/feesData";

export async function POST(request: NextRequest) {
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.json(
      {
        error:
          "Payment system is being configured. Please contact kathleen@youfirstelitelacrosseclub.com to register.",
      },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { planId } = body;

  const plan = PAYMENT_PLANS.find((p) => p.id === planId);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
  }

  if (!plan.stripePriceId) {
    return NextResponse.json(
      {
        error:
          "This plan is not yet available for online payment. Please contact kathleen@youfirstelitelacrosseclub.com.",
      },
      { status: 503 }
    );
  }

  const origin = request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: plan.payments === 1 ? "payment" : "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: `${origin}/fees?success=true`,
    cancel_url: `${origin}/fees?canceled=true`,
    metadata: { planId: plan.id, planName: plan.name },
  });

  return NextResponse.json({ url: session.url });
}
