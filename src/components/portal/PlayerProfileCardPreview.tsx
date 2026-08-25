"use client";

import PlayerProfileCard, {
  type PlayerProfileData,
} from "@/components/portal/PlayerProfileCard";

/**
 * PlayerProfileCard needs an onUpdated callback, which a server component
 * cannot pass. This wrapper exists only so the preview page can stay a server
 * component. Saving is disabled by `preview`, so the callback never fires.
 */
export default function PlayerProfileCardPreview({
  player,
}: {
  player: PlayerProfileData;
}) {
  return <PlayerProfileCard player={player} onUpdated={() => {}} preview />;
}
