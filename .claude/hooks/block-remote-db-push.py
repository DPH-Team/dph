#!/usr/bin/env python3
"""PreToolUse(Bash) guard: hard-block any command that would write to the
REMOTE / production Supabase project for District Pour Haus.

The user directive is absolute: NEVER push to the remote production database.
Migrations are applied LOCAL-ONLY during dev (supabase start / db:reset /
drizzle-kit push against 127.0.0.1) and only ever reach production through an
explicitly-approved deploy step run by the user.

Exit code 2 = block the tool call and surface stderr back to the model.
"""
import json
import re
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    # If we can't parse, do not block (fail open for unrelated tools).
    sys.exit(0)

cmd = (data.get("tool_input") or {}).get("command", "") or ""

# Remote-targeting patterns. Local commands (supabase start/stop/status,
# supabase db reset, supabase migration up, drizzle-kit push to 127.0.0.1)
# are intentionally NOT matched.
REMOTE_PATTERNS = [
    r"supabase\s+db\s+push",          # applies migrations to the linked remote
    r"--linked",                       # any command forced at the linked project
    r"supabase\s+link\b",             # re-linking / changing target project
    r"pooler\.supabase\.com",         # remote pooler connection string
    r"\.supabase\.co",                # any remote supabase host in a conn string
    r"raigylcyufzyyykjuvqw",          # the production project ref, by name
]

for pat in REMOTE_PATTERNS:
    if re.search(pat, cmd, re.IGNORECASE):
        sys.stderr.write(
            "BLOCKED by project guard: this command targets the REMOTE production "
            f"Supabase (matched /{pat}/). The user has forbidden ANY push/write to "
            "the remote production database. Run migrations LOCAL-ONLY "
            "(supabase start, npm run db:reset, drizzle-kit push to 127.0.0.1). "
            "Remote/production changes happen only via an explicitly user-approved "
            "deploy. Do not retry this command; ask the user.\n"
        )
        sys.exit(2)

sys.exit(0)
