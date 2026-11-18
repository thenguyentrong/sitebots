import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { del, get, list, put } from '@vercel/blob';
import type { Provider } from '@/lib/auth/session';

// One small file per account: how many free consultations it started each month and which chats are
// its own, so "Delete my account" can take them along. No name and no email are stored.

export const FREE_CHATS_PER_MONTH = 3;
// Enough to delete a person's chats with their account; older ones go by the six-month purge anyway.
const CHATS_KEPT = 200;

export type Account = { uid: string; provider: Provider; createdAt: string; months: Record<string, number>; chats: string[] };

type Store = {
  read(uid: string): Promise<Account | null>;
  write(account: Account): Promise<void>;
  remove(uid: string): Promise<void>;
  count(): Promise<number>;
};

const blobPath = (uid: string) => 'users/' + uid + '.json';

const blobStore: Store = {
  async read(uid) {
    const found = await get(blobPath(uid), { access: 'private', useCache: false });
    return found?.statusCode === 200 ? JSON.parse(await new Response(found.stream).text()) as Account : null;
  },
  async write(account) {
    await put(blobPath(account.uid), JSON.stringify(account), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
  },
  async remove(uid) {
    await del(blobPath(uid));
  },
  async count() {
    let total = 0;
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: 'users/', cursor, limit: 1000 });
      total += page.blobs.length;
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return total;
  },
};

export function diskStore(folder: string): Store {
  const file = (uid: string) => join(folder, uid + '.json');
  return {
    async read(uid) { return JSON.parse(await readFile(file(uid), 'utf8').catch(() => 'null')) as Account | null; },
    async write(account) { await mkdir(folder, { recursive: true }); await writeFile(file(account.uid), JSON.stringify(account)); },
    async remove(uid) { await rm(file(uid), { force: true }); },
    async count() { return (await readdir(folder).catch(() => [] as string[])).length; },
  };
}

const store = () => process.env.BLOB_READ_WRITE_TOKEN ? blobStore : diskStore(join(process.cwd(), '.cache', 'users'));

const monthOf = (now: Date) => now.toISOString().slice(0, 7);

export const newAccount = (uid: string, provider: Provider, now = new Date()): Account => ({ uid, provider, createdAt: now.toISOString(), months: {}, chats: [] });

export function freeLeft(account: Account | null, now = new Date()): number {
  return Math.max(0, FREE_CHATS_PER_MONTH - (account?.months[monthOf(now)] ?? 0));
}

/** A new free consultation: counted for this month, and the chat noted as the account's own. */
export function withNewChat(account: Account, chatId: string, free: boolean, now = new Date()): Account {
  const month = monthOf(now);
  return {
    ...account,
    months: free ? { ...account.months, [month]: (account.months[month] ?? 0) + 1 } : account.months,
    chats: [chatId, ...account.chats.filter((id) => id !== chatId)].slice(0, CHATS_KEPT),
  };
}

export const readAccount = (uid: string, source = store()) => source.read(uid);
export const writeAccount = (account: Account, source = store()) => source.write(account);
export const removeAccount = (uid: string, source = store()) => source.remove(uid);
export const countAccounts = (source = store()) => source.count().catch(() => 0);
