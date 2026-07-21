-- roster_confirmations_grad_year_widen_2035 — APPLIED to prod iklgrzabcloaqyghlggr 2026-07-21.
-- /roster now accepts Class of 2035 (maps to Development). Repo copy for the record.
alter table public.roster_confirmations
  drop constraint roster_confirmations_player_grad_year_check;
alter table public.roster_confirmations
  add constraint roster_confirmations_player_grad_year_check
  check (player_grad_year >= 2028 and player_grad_year <= 2035);
notify pgrst, 'reload schema';
