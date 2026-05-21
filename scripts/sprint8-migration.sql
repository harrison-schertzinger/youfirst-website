-- Sprint 8 migration — prospects + email templates + position editability
-- Run in Supabase SQL editor.

-- 1. Prospects table
CREATE TABLE prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  graduation_year integer,
  position text,
  school text,
  prospect_email text,
  parent_first_name text,
  parent_last_name text,
  parent_email text,
  parent_phone text,
  source text,
  stage text NOT NULL DEFAULT 'interested'
    CHECK (stage IN (
      'interested',
      'contacted',
      'parent_confirmed',
      'ready_to_onboard',
      'converted',
      'declined'
    )),
  last_contacted_at timestamptz,
  notes text,
  converted_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_stage ON prospects(stage);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_prospects_graduation_year ON prospects(graduation_year);
CREATE INDEX idx_prospects_last_contacted_at ON prospects(last_contacted_at DESC);

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- 2. Email templates table
CREATE TABLE email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'general'
    CHECK (type IN (
      'intro',
      'logistics',
      'payment_reminder',
      'overdue_notice',
      'announcement',
      'general',
      'custom'
    )),
  subject text NOT NULL,
  body text NOT NULL,
  description text,
  is_default boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_templates_type ON email_templates(type);
CREATE INDEX idx_email_templates_status ON email_templates(status);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Seed five empty templates so the UI has something to show
INSERT INTO email_templates (name, type, subject, body, description, is_default) VALUES
('Intro to the Club', 'intro',
 'Welcome to You. First Elite Lacrosse',
 '',
 'First contact after a parent confirms interest.',
 true),
('Season Logistics', 'logistics',
 'You. First Lacrosse — Season Logistics',
 '',
 'Once-per-season operational details email.',
 true),
('Payment Reminder', 'payment_reminder',
 'Reminder: Outstanding Balance for {{player_name}}',
 '',
 'Friendly reminder with embedded Stripe payment link.',
 true),
('Overdue Notice', 'overdue_notice',
 'Outstanding Balance — {{player_name}}',
 '',
 'Firmer follow-up for older outstanding balances.',
 true),
('Generic Announcement', 'announcement',
 '',
 '',
 'Blank canvas for one-off announcements.',
 true);

-- 3. Confirm players.position is text (no enum constraint blocking edits)
-- Verify in psql query: SELECT column_name, data_type FROM
-- information_schema.columns WHERE table_name='players' AND
-- column_name='position';
-- Expected: text, nullable. No migration needed if already correct.
