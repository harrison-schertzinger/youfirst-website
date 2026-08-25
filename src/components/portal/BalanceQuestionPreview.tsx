"use client";

import BalanceQuestion from "./BalanceQuestion";
import { PreviewProvider } from "./PaymentDashboard";

/**
 * On the real portal the balance box sits in the rail, outside
 * PaymentDashboard's preview context. On the preview screen it therefore has no
 * way to know it is a preview — so this wrapper supplies the context itself.
 * Without it, submitting on the preview would write a real row against a
 * synthetic player id.
 */
export default function BalanceQuestionPreview({
  playerFirstName,
}: {
  playerFirstName: string;
}) {
  return (
    <PreviewProvider value>
      <BalanceQuestion
        playerId="00000000-0000-0000-0000-000000000000"
        playerFirstName={playerFirstName}
      />
    </PreviewProvider>
  );
}
