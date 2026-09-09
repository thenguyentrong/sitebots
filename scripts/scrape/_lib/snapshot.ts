import type { SqlClient } from '@/lib/db';
import type { Snapshot } from './types';

/**
 * Record the raw body we parsed, so parsing can be replayed offline after an
 * adapter fix. The bytes go to Blob when a token is configured; without one
 * the disk cache under .cache/http is the copy, and the row keeps the hash so
 * the two can be matched up later.
 */
export async function persistSnapshot(
  sql: SqlClient,
  snap: Snapshot,
  meta: { runId?: string | null; sourceId: string | null },
): Promise<number | null> {
  let blobUrl: string | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import('@vercel/blob');
      const host = new URL(snap.url).hostname;
      const res = await put(`raw/${host}/${snap.sha256}`, snap.body, {
        access: 'public',
        addRandomSuffix: false,
        contentType: snap.contentType ?? 'text/plain',
      });
      blobUrl = res.url;
    } catch (e) {
      console.warn(`  blob upload failed for ${snap.url}: ${String(e)}`);
    }
  }
  const rows = (await sql`
    insert into raw_snapshots (run_id, source_id, url, fetched_at, http_status, content_type, etag, last_modified, sha256, bytes, blob_url)
    values (${meta.runId ?? null}, ${meta.sourceId}, ${snap.url}, ${snap.fetchedAt}::timestamptz, ${snap.status},
            ${snap.contentType}, ${snap.etag}, ${snap.lastModified}, ${snap.sha256}, ${snap.bytes}, ${blobUrl})
    on conflict (url, sha256) do update set fetched_at = excluded.fetched_at, run_id = coalesce(excluded.run_id, raw_snapshots.run_id)
    returning id`) as { id: number | string }[];
  return rows[0] ? Number(rows[0].id) : null;
}
