import { type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { exportSubscribersForCsv } from '@/lib/db/queries/subscribers';
import {
  listSubscribersFilterSchema,
  normaliseFilterStatus,
} from '@/lib/validators/newsletter';
import { audit } from '@/lib/audit';

// ─── RFC 4180 CSV escaping ────────────────────────────────────────────────────

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsvRow(cells: string[]): string {
  return cells.map(escapeCsvCell).join(',');
}

// ─── GET /admin/newsletter/export ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  // Defense-in-depth: layout + middleware already enforce admin, but call here
  // too so this route is secure even if accessed directly via fetch.
  await requireAdmin();

  const { searchParams } = request.nextUrl;
  const rawFilter = {
    status: searchParams.get('status') ?? undefined,
    search: searchParams.get('q') ?? undefined,
  };

  const parsed = listSubscribersFilterSchema.safeParse(rawFilter);
  // Default to 'confirmed' if no status param — admins almost always want
  // confirmed-only for broadcast sends (pending rows must never be exported).
  const rawFilterStatus =
    parsed.success && parsed.data.status ? parsed.data.status : 'confirmed';
  // Normalise 'active' → 'confirmed' for back-compat with existing bookmark URLs.
  const filterStatus = normaliseFilterStatus(rawFilterStatus) ?? 'confirmed';
  const filterSearch = parsed.success ? (parsed.data.search ?? '') : '';

  // Fetch rows from DB, applying the status filter.
  let rows = await exportSubscribersForCsv({
    status: filterStatus === 'all' ? undefined : filterStatus,
  });

  // Apply the search filter inline (the DB export helper filters by status only;
  // search is a list-view convenience that carries over to the export).
  if (filterSearch) {
    const searchLower = filterSearch.toLowerCase();
    rows = rows.filter((row) => row.email.toLowerCase().includes(searchLower));
  }

  // Build CSV string.
  const headerRow = toCsvRow([
    'email',
    'subscribed_at',
    'confirmed_at',
    'unsubscribed_at',
    'source',
    'status',
  ]);
  const dataRows = rows.map((row) =>
    toCsvRow([
      row.email,
      row.subscribedAt.toISOString(),
      row.confirmedAt ? row.confirmedAt.toISOString() : '',
      row.unsubscribedAt ? row.unsubscribedAt.toISOString() : '',
      row.source,
      row.status,
    ]),
  );
  const csvString = [headerRow, ...dataRows].join('\r\n');

  // Audit the export before returning.
  await audit('subscriber.export', 'subscriber', 'csv', {
    count: rows.length,
    filterStatus,
    filterSearch: filterSearch || null,
  });

  const filename = `dph-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csvString, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
