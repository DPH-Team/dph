-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0038: add 'careers_body' to content_blocks_key_check, seed row
-- Table: public.content_blocks
-- Constraint: content_blocks_key_check
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.content_blocks
  drop constraint content_blocks_key_check;

alter table public.content_blocks
  add constraint content_blocks_key_check
    check (key in ('home_hero', 'home_callouts', 'about_body', 'careers_body'));

-- ─── Seed: careers_body row from lib/fixtures/careers.ts ─────────────────────
-- Nice-to-have for parity with the other keys — the app upserts on first admin
-- save and falls back to the fixture when the row is absent either way.

insert into public.content_blocks (key, value) values
  (
    'careers_body',
    '{
      "eyebrow": "Hiring",
      "headline": "Work With Us",
      "lead": "We''re hiring people who give a damn. If you care about craft, community, and showing up for your team, this is your place.",
      "whyEyebrow": "Why DPH",
      "whyHeading": "What we offer",
      "whyUs": [
        {
          "icon": "dollar-sign",
          "title": "Competitive pay",
          "description": "We pay above market for every role — front of house, kitchen, and operations. We review comp annually and give increases based on performance, not tenure alone."
        },
        {
          "icon": "trending-up",
          "title": "Real tips",
          "description": "Self-pour means higher check averages and happy guests who''ve chosen exactly what they want. That translates into better tips for the team on the floor."
        },
        {
          "icon": "heart",
          "title": "The vibe is the job",
          "description": "We''re a community taproom. Game days, live music, trivia nights — it''s a great place to work because it''s a great place to be. No drama, no ego, just good beer and good people."
        }
      ]
    }'::jsonb
  )
on conflict (key) do nothing;
