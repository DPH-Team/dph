// Real tables land in Phase 3.
// Each table will follow the convention:
//   id uuid primary key default gen_random_uuid()
//   created_at timestamptz default now()
//   updated_at timestamptz default now()  (via trigger)
// Every table will have RLS enabled with explicit policies.
export {};
