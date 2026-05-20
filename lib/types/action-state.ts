export type ActionState =
  | { ok: true; id?: string }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };
