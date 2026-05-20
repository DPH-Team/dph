-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0011: content_blocks RLS, triggers, cross-schema FK, and seed data
-- Applies after the Drizzle-generated 0010 migration that creates the table.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Cross-schema FK (Drizzle cannot reference auth schema) ──────────────────

alter table public.content_blocks
  add constraint content_blocks_updated_by_fkey
  foreign key (updated_by) references auth.users(id) on delete set null;

-- ─── updated_at trigger (using existing public.set_updated_at()) ──────────────

create trigger content_blocks_set_updated_at
  before update on public.content_blocks
  for each row execute procedure public.set_updated_at();

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

alter table public.content_blocks enable row level security;

-- ─── RLS policies: content_blocks ────────────────────────────────────────────

-- Anon + authenticated: read all rows (content blocks are public information;
-- the public site displays them directly with no draft concept).
create policy "content_blocks_select_all"
  on public.content_blocks
  for select
  using (true);

-- Staff + admin: insert / update / delete
create policy "content_blocks_write_staff"
  on public.content_blocks
  for all
  using (public.is_staff())
  with check (public.is_staff());

-- ─── Seed: 3 rows from lib/fixtures ─────────────────────────────────────────
-- Values are translated from the TypeScript fixtures.
-- home_hero → lib/fixtures/hero.ts
-- home_callouts → lib/fixtures/home-callouts.ts
-- about_body → lib/fixtures/about.ts (paragraphs[] — no storyHtml)

insert into public.content_blocks (key, value) values
  (
    'home_hero',
    '{
      "eyebrow": "Wisconsin Self-Pour Taproom",
      "headline": "Our Haus is Your Haus",
      "lead": "32 craft taps, a scratch kitchen, and a front-row seat to the game. Pour your own adventure — you set the pace.",
      "primaryCta": {"label": "See What''s Pouring", "href": "/taps"},
      "secondaryCta": {"label": "Reserve a Table", "href": "/reservations"},
      "imageUrl": null
    }'::jsonb
  ),
  (
    'home_callouts',
    '[
      {
        "eyebrow": "Self-Pour",
        "title": "32 Taps, Your Rules",
        "body": "Load an RFID card and pour exactly what you want — a taste, a half-pint, or a full pour. No waiting, no waste.",
        "href": "/taps",
        "cta": "See What''s Pouring"
      },
      {
        "eyebrow": "Scratch Kitchen",
        "title": "Food Worth Staying For",
        "body": "Smoked brisket, pale ale cheese curds, and a rotating kringle. Everything on the menu pairs with something on the wall.",
        "href": "/menu",
        "cta": "Browse the Menu"
      },
      {
        "eyebrow": "Events",
        "title": "Game Day Is Sacred",
        "body": "Every Packers game is an event at District Pour Haus. We open early, we get loud, and we stay until the final whistle.",
        "href": "/events",
        "cta": "Upcoming Events"
      }
    ]'::jsonb
  ),
  (
    'about_body',
    '{
      "headline": "Our Haus is Your Haus",
      "lead": "We built District Pour Haus because we wanted a place where the beer was great, the food was honest, and the Wi-Fi password was somewhere on the wall. A place that felt like yours the minute you walked in.",
      "paragraphs": [
        "It started with a craving — not for a specific beer, but for a specific feeling. That rare thing where you walk into a bar and immediately relax, where the person next to you is already talking about the game, and where nobody''s rushing you out.",
        "District Pour Haus opened in Green Bay because this city deserved a taproom that matched its energy: big, bold, and genuinely proud of where it''s from. We''re a self-pour taproom, which means you''re in charge. RFID card, 32 taps, pour as much or as little as you want. Try the imperial stout. Try the farmhouse ale. Try three things on the same Saturday afternoon — that''s the whole point.",
        "The kitchen came next. Because you can''t drink on an empty stomach, and because Wisconsin has good food if you know where to look. We smoke our own brisket, batter our curds in pale ale, and bake a kringle that rotates with the seasons. Everything pairs with something on the wall."
      ],
      "rfidSteps": [
        {
          "icon": "credit-card",
          "label": "Get an RFID Card",
          "description": "Tap your card at the kiosk or get one from the bar. Load it with credit and you''re set."
        },
        {
          "icon": "beer",
          "label": "Tap and Pour",
          "description": "Hold your card to any tap. Pour what you want, as much as you want. The display tracks it live."
        },
        {
          "icon": "receipt",
          "label": "Settle Up",
          "description": "When you''re done, return your card at the bar. We charge only what you poured."
        }
      ],
      "values": [
        {
          "title": "Wisconsin First",
          "description": "Our tap list prioritizes Wisconsin breweries. Our menu uses Wisconsin ingredients wherever we can source them."
        },
        {
          "title": "Craft Always",
          "description": "We don''t cut corners on ingredients, process, or people. If it''s worth doing, it''s worth doing right."
        },
        {
          "title": "Community Is the Product",
          "description": "The beer is great. But the reason you''ll come back is the people. We hire for warmth as much as skill."
        },
        {
          "title": "Game Day Is Sacred",
          "description": "We bleed green and gold. Every Packers game is an event. The whole Haus shows up for it.",
          "isGameDay": true
        }
      ]
    }'::jsonb
  )
on conflict (key) do nothing;
