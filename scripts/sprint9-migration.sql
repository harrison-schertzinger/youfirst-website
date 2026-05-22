-- Sprint 9 migration — tournament rosters

CREATE TABLE tournament_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, player_id)
);

CREATE INDEX idx_tournament_rosters_tournament ON tournament_rosters(tournament_id);
CREATE INDEX idx_tournament_rosters_player ON tournament_rosters(player_id);

ALTER TABLE tournament_rosters ENABLE ROW LEVEL SECURITY;
