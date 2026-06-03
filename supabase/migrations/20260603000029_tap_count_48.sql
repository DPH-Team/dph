-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0029: correct tap count from 32 to 48 in content_blocks seed data
-- Targets already-seeded databases (staging / production) where the historical
-- seed migration (0011) has already run with the old "32" copy.
-- Three narrow, idempotent replace() passes — one per distinct phrase — so that
-- any other copy the owner has edited via the admin UI is not overwritten.
-- Table: public.content_blocks  Column: value (jsonb)
-- ─────────────────────────────────────────────────────────────────────────────

-- home_hero: "lead" field
update public.content_blocks
set value = replace(value::text, '32 craft taps', '48 craft taps')::jsonb
where value::text like '%32 craft taps%';

-- home_callouts: first callout "title" field
update public.content_blocks
set value = replace(value::text, '32 Taps, Your Rules', '48 Taps, Your Rules')::jsonb
where value::text like '%32 Taps, Your Rules%';

-- about_body: second paragraph
update public.content_blocks
set value = replace(value::text, 'RFID card, 32 taps', 'RFID card, 48 taps')::jsonb
where value::text like '%RFID card, 32 taps%';
