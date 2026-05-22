-- Sprint 10 migration — reusable email snippets

CREATE TABLE email_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_snippets ENABLE ROW LEVEL SECURITY;

-- Seed the three reusable blocks
INSERT INTO email_snippets (key, label, content) VALUES
('summer_schedule', 'Summer Schedule',
'Summer Schedule:
Live Love Lax (2029s) — June 13-14
Summer Genesis (Everyone) — June 20-21
Continental Cup (Everyone) — June 26-28
Maryland Cup (2028s) — July 17
MidAtlantics Summer Club Championship:
  2027s: July 17-18
  2028s, 2029s, 2030s: July 18-19

Practice is the same as last year — after the CLA mornings, 12:00-1:00pm twice a week (Tuesday & Thursday).'),
('faq_block', 'FAQs',
'FAQs

Is the Academy and Club different?
Yes.

Does she have to come to the Academy every day?
No.

If we cannot make all the tournaments are the fees adjusted?
Yes — club fees can never be a barrier. We want players who want to be there.'),
('club_links', 'Club Links',
'Club: https://www.youfirstlacrosse.com/
Academy: https://cincinnatilacrosseacademy.com/
YOU.PRJCT: https://www.youprjct.com/');
