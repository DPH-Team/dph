/**
 * lib/audit.ts — Server-only audit logging for District Pour Haus.
 *
 * All writes go through the service-role admin client so they bypass RLS.
 * (RLS deliberately denies user-session writes to audit_log.)
 *
 * FAILURE POLICY
 * ──────────────
 * • login / logout events: THROW on insert failure. A failed audit for an
 *   auth event is a security gap; callers must handle the error.
 * • create / update / delete events: console.error and CONTINUE. A failed
 *   audit must not break a legitimate user mutation.
 *
 * CREDENTIAL MASKING
 * ──────────────────
 * auditUpdate masks any key matching /api_key|token|credentials|password|secret/i
 * in both the before and after blobs. If you pass credential payloads to any
 * other sugar function (auditCreate, auditDelete, etc.) you MUST mask those
 * fields yourself before calling — no other path performs masking.
 */

import 'server-only';

import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditInput {
  action: string;
  entityType?: string;
  entityId?: string;
  diff?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Override actor resolution (e.g. for login.failure — no session exists). */
  actorOverride?: {
    id?: string;
    email?: string;
  };
}

// ─── Internal ────────────────────────────────────────────────────────────────

const SENSITIVE_KEY_RE = /api_key|token|credentials|password|secret/i;

function maskSensitiveKeys(
  obj: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!obj) return obj;
  const masked: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    masked[k] = SENSITIVE_KEY_RE.test(k) ? '***' : v;
  }
  return masked;
}

async function resolveContext(): Promise<{
  actorId: string | null;
  actorEmail: string | null;
  ip: string | null;
  ua: string | null;
}> {
  // IP + UA from request headers
  let ip: string | null = null;
  let ua: string | null = null;
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for');
    ip = forwarded ? forwarded.split(',')[0].trim() : null;
    ua = h.get('user-agent');
  } catch {
    // headers() may throw outside a request context (e.g. tests)
  }

  // Actor from session
  let actorId: string | null = null;
  let actorEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      actorId = user.id;
      actorEmail = user.email ?? null;
    }
  } catch {
    // No session — actor stays null
  }

  return { actorId, actorEmail, ip, ua };
}

/**
 * Core write. Always uses the admin client (service-role) to bypass RLS.
 * Returns false if the insert failed, true on success.
 */
async function record(
  input: AuditInput,
  failurePolicy: 'throw' | 'continue',
): Promise<boolean> {
  const { actorId, actorEmail, ip, ua } = await resolveContext();

  const effectiveActorId = input.actorOverride?.id ?? actorId;
  const effectiveActorEmail = input.actorOverride?.email ?? actorEmail;

  const admin = createAdminClient();
  const { error } = await admin.from('audit_log').insert({
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    diff: input.diff ?? null,
    metadata: input.metadata ?? null,
    actor_id: effectiveActorId ?? null,
    actor_email: effectiveActorEmail ?? null,
    ip: ip ?? null,
    user_agent: ua ?? null,
  });

  if (error) {
    if (failurePolicy === 'throw') {
      throw new Error(`audit_log insert failed: ${error.message}`);
    }
    console.error('[audit] Failed to write audit log entry:', {
      action: input.action,
      error: error.message,
    });
    return false;
  }
  return true;
}

// ─── Sugar wrappers ───────────────────────────────────────────────────────────

/**
 * Record a create event. Failures are non-fatal (console.error + continue).
 *
 * NOTE: If your entity payload contains credential fields, mask them yourself
 * before passing — auditCreate does not perform masking.
 */
export async function auditCreate(
  entityType: string,
  entityId: string,
  after: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await record(
    {
      action: `${entityType}.create`,
      entityType,
      entityId,
      diff: { after },
      metadata,
    },
    'continue',
  );
}

/**
 * Record an update event. Shallow-diffs before vs after and masks any key
 * matching /api_key|token|credentials|password|secret/i in both blobs.
 * Failures are non-fatal (console.error + continue).
 */
export async function auditUpdate(
  entityType: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  // Compute which keys changed
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed = Array.from(allKeys).filter(
    (k) => before[k] !== after[k],
  );

  await record(
    {
      action: `${entityType}.update`,
      entityType,
      entityId,
      diff: {
        before: maskSensitiveKeys(before),
        after: maskSensitiveKeys(after),
        changed,
      },
      metadata,
    },
    'continue',
  );
}

/**
 * Record a delete event. Failures are non-fatal (console.error + continue).
 *
 * NOTE: If your entity payload contains credential fields, mask them yourself
 * before passing — auditDelete does not perform masking.
 */
export async function auditDelete(
  entityType: string,
  entityId: string,
  before: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await record(
    {
      action: `${entityType}.delete`,
      entityType,
      entityId,
      diff: { before },
      metadata,
    },
    'continue',
  );
}

/**
 * Record a login attempt. THROWS on insert failure.
 *
 * Pass actorEmail because on login.failure there may be no active session.
 */
export async function auditLogin(
  success: boolean,
  email: string,
  reason?: string,
): Promise<void> {
  await record(
    {
      action: success ? 'auth.login.success' : 'auth.login.failure',
      entityType: 'auth',
      metadata: reason ? { reason } : undefined,
      // On failure there is no session yet; pass the attempted email as override
      actorOverride: success ? undefined : { email },
    },
    'throw',
  );
}

/**
 * Record a logout. THROWS on insert failure.
 */
export async function auditLogout(): Promise<void> {
  await record(
    {
      action: 'auth.logout',
      entityType: 'auth',
    },
    'throw',
  );
}

/**
 * Generic audit helper for actions that don't fit the create/update/delete
 * sugar wrappers — e.g. view_resume, export, download.
 * Failures are non-fatal (console.error + continue).
 */
export async function audit(
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await record(
    {
      action,
      entityType,
      entityId,
      metadata,
    },
    'continue',
  );
}

/**
 * Record an integration test result. Failures are non-fatal (console.error + continue).
 */
export async function auditIntegrationTest(
  name: string,
  status: 'success' | 'failure',
  error?: string,
): Promise<void> {
  await record(
    {
      action: 'integration.test',
      entityType: 'integration',
      entityId: name,
      metadata: { status, ...(error ? { error } : {}) },
    },
    'continue',
  );
}
