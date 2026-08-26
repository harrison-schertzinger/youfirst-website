"use client";

import PlayerProfileTile, {
  type ProfilePlayer,
} from "./PlayerProfileTile";

/**
 * The profile tile for the admin preview.
 *
 * A server component cannot supply the save callbacks, so this thin wrapper
 * does — and passes `preview`, which disables saving. The guardian is
 * deliberately half-filled so the incomplete state is visible: this screen
 * exists to show what a family sees before they have finished, not after.
 */
export default function PlayerProfileTilePreview({
  player,
}: {
  player: ProfilePlayer;
}) {
  return (
    <PlayerProfileTile
      player={player}
      guardian={{
        id: "preview",
        first_name: "Dana",
        last_name: "Sample",
        email: "dana.sample@example.com",
        phone: null,
        relationship: "Mother",
      }}
      onPlayerUpdated={() => {}}
      onGuardianUpdated={() => {}}
      preview
    />
  );
}
