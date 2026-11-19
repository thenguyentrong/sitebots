import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { del, get, list, put } from '@vercel/blob';
import { z } from 'zod';
import type { Provider } from '@/lib/auth/session';

// Reviews written by signed-in visitors about a robot or a company. One file per account and target, so an
// account has one review per robot it can edit or delete. Stored: the account code (to know whose it is), the
// sign-in provider, the review itself and the name the writer chose to show. Never an email.

export const TARGET = /^(robot|company):[a-z0-9][a-z0-9-]{0,120}$/;
export const ReviewInput = z.object({
  target: z.string().regex(TARGET),
  rating: z.number().int().min(1).max(5),
  worked: z.boolean(),
  role: z.string().trim().max(80).default(''),
  text: z.string().trim().min(20, 'Please write at least 20 characters.').max(2000),
});
export type ReviewInput = z.infer<typeof ReviewInput>;
export type StoredReview = ReviewInput & { uid: string; provider: Provider; createdAt: string; updatedAt: string };
/** What anyone may see: no account code. `mine` marks the reader's own review. */
export type PublicReview = Omit<StoredReview, 'uid'> & { mine: boolean };

type Store = {
  list(target: string): Promise<StoredReview[]>;
  write(review: StoredReview): Promise<void>;
  remove(target: string, uid: string): Promise<void>;
};

const folderOf = (target: string) => 'reviews/' + target.replace(':', '/');
const pathOf = (target: string, uid: string) => folderOf(target) + '/' + uid + '.json';

const blobStore: Store = {
  async list(target) {
    const out: StoredReview[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: folderOf(target) + '/', cursor, limit: 1000 });
      for (const blob of page.blobs) {
        const found = await get(blob.pathname, { access: 'private', useCache: false });
        if (found?.statusCode === 200) out.push(JSON.parse(await new Response(found.stream).text()) as StoredReview);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  },
  async write(review) {
    await put(pathOf(review.target, review.uid), JSON.stringify(review), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
  },
  async remove(target, uid) { await del(pathOf(target, uid)); },
};

export function diskStore(root: string): Store {
  const dir = (target: string) => join(root, ...folderOf(target).split('/').slice(1));
  return {
    async list(target) {
      const names = await readdir(dir(target)).catch(() => [] as string[]);
      return Promise.all(names.filter((name) => name.endsWith('.json')).map(async (name) => JSON.parse(await readFile(join(dir(target), name), 'utf8')) as StoredReview));
    },
    async write(review) { await mkdir(dir(review.target), { recursive: true }); await writeFile(join(dir(review.target), review.uid + '.json'), JSON.stringify(review)); },
    async remove(target, uid) { await rm(join(dir(target), uid + '.json'), { force: true }); },
  };
}

const store = () => process.env.BLOB_READ_WRITE_TOKEN ? blobStore : diskStore(join(process.cwd(), '.cache', 'reviews'));

export async function listReviews(target: string, reader: string | null, source = store()): Promise<PublicReview[]> {
  const rows = await source.list(target);
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(({ uid, ...rest }) => ({ ...rest, mine: uid === reader }));
}

export async function saveReview(input: ReviewInput, uid: string, provider: Provider, source = store(), now = new Date()): Promise<void> {
  const existing = (await source.list(input.target)).find((review) => review.uid === uid);
  await source.write({ ...input, uid, provider, createdAt: existing?.createdAt ?? now.toISOString(), updatedAt: now.toISOString() });
}

export const deleteReview = (target: string, uid: string, source = store()) => source.remove(target, uid);

/** With "Delete my account" every review of that account goes too. */
export async function deleteAllReviewsOf(uid: string): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const root = join(process.cwd(), '.cache', 'reviews');
    for (const kind of await readdir(root).catch(() => [] as string[])) for (const id of await readdir(join(root, kind)).catch(() => [] as string[])) await rm(join(root, kind, id, uid + '.json'), { force: true });
    return;
  }
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: 'reviews/', cursor, limit: 1000 });
    const mine = page.blobs.filter((blob) => blob.pathname.endsWith('/' + uid + '.json')).map((blob) => blob.url);
    if (mine.length) await del(mine);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}
