import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { del, get, list, put } from '@vercel/blob';
import { getCache } from '@vercel/functions';
import type { ChatTurn } from './run';
import type { BriefFact, ChatOption, LeftOut } from './tools';

export type SavedMessage = {
  role: ChatTurn['role']; content: string; at: string;
  robots?: string[]; trace?: string[]; inputTokens?: number; outputTokens?: number; costUsd?: number; model?: string;
};

/** One whole chat, stored as one file. A chat goes on to a short list of messages, so reading the file
 *  once and writing it once per message costs less than any database that has to stay awake. */
export type Chat = {
  id: string; title: string; startedAt: string; lastAt: string;
  brief: BriefFact[]; options: ChatOption[] | null; leftOut: LeftOut[]; messages: SavedMessage[];
};

/** Where chat files live. `fresh` skips the CDN, which can lag a minute behind an overwrite. */
export type Shelf = {
  read(id: string, fresh: boolean): Promise<Chat | null>;
  write(chat: Chat): Promise<void>;
  entries(): Promise<{ id: string; savedAt: Date }[]>;
  remove(ids: string[]): Promise<void>;
};

const blobPath = (id: string) => 'chats/' + id + '.json';
const idOf = (name: string) => name.replace(/^chats\//, '').replace(/\.json$/, '');

/** Private: these are people's messages, so a file can only be read with the site's own token. */
export const blobShelf: Shelf = {
  async read(id, fresh) {
    const found = await get(blobPath(id), { access: 'private', useCache: !fresh });
    return found?.statusCode === 200 ? JSON.parse(await new Response(found.stream).text()) as Chat : null;
  },
  async write(chat) {
    await put(blobPath(chat.id), JSON.stringify(chat), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
  },
  async entries() {
    const found: { id: string; savedAt: Date }[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: 'chats/', cursor, limit: 1000 });
      found.push(...page.blobs.map((blob) => ({ id: idOf(blob.pathname), savedAt: blob.uploadedAt })));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return found;
  },
  async remove(ids) {
    if (ids.length) await del(ids.map(blobPath));
  },
};

/** Local testing only: chatStatus keeps the chat closed in production without a Blob store. */
export function diskShelf(folder: string): Shelf {
  const file = (id: string) => join(folder, id + '.json');
  return {
    async read(id) {
      return JSON.parse(await readFile(file(id), 'utf8').catch(() => 'null')) as Chat | null;
    },
    async write(chat) {
      await mkdir(folder, { recursive: true });
      await writeFile(file(chat.id), JSON.stringify(chat));
    },
    async entries() {
      const names = await readdir(folder).catch(() => [] as string[]);
      return Promise.all(names.map(async (name) => ({ id: idOf(name), savedAt: (await stat(join(folder, name))).mtime })));
    },
    async remove(ids) {
      await Promise.all(ids.map((id) => rm(file(id), { force: true })));
    },
  };
}

const shelf = () => process.env.BLOB_READ_WRITE_TOKEN ? blobShelf : diskShelf(join(process.cwd(), '.cache', 'chats'));

/** Rotates at midnight UTC and never stores the address: enough to count today's messages, not
 *  enough to follow a visitor from one day to the next. */
export function visitorId(ip: string, userAgent: string, now = new Date()): string {
  const salt = process.env.CHAT_SALT || process.env.BLOB_READ_WRITE_TOKEN || 'local';
  return createHash('sha256').update([salt, now.toISOString().slice(0, 10), ip, userAgent].join('|')).digest('hex').slice(0, 32);
}

const allKey = (now: Date) => 'chat-everyone-' + now.toISOString().slice(0, 10);

/** Counted in the runtime cache and gone after two days, so counting never touches stored chats. A
 *  cache that fails must not close the chat: the monthly limit in the Claude Console is the real stop. */
export async function counted(key: string): Promise<number> {
  return Number(await getCache().get(key).catch(() => 0)) || 0;
}

export async function setCount(key: string, value: number, ttl: number): Promise<void> {
  await getCache().set(key, value, { ttl }).catch((error) => console.warn('count not saved', error));
}

export async function messagesToday(visitor: string, now = new Date()): Promise<{ visitor: number; everyone: number }> {
  const [mine, everyone] = await Promise.all([counted(visitor), counted(allKey(now))]);
  return { visitor: mine, everyone };
}

export async function countMessage(visitor: string, today: { visitor: number; everyone: number }, now = new Date()): Promise<void> {
  const twoDays = 2 * 24 * 3600;
  await Promise.all([setCount(visitor, today.visitor + 1, twoDays), setCount(allKey(now), today.everyone + 1, twoDays)]);
}

export function newChat(id: string, firstMessage: string, now = new Date()): Chat {
  return { id, title: firstMessage.slice(0, 120), startedAt: now.toISOString(), lastAt: now.toISOString(), brief: [], options: null, leftOut: [], messages: [] };
}

/** What the next message needs must be the newest version, so this always skips the CDN. */
export const readChat = (id: string): Promise<Chat | null> => shelf().read(id, true);

export function writeChat(chat: Chat, now = new Date()): Promise<void> {
  return shelf().write({ ...chat, lastAt: now.toISOString() });
}

export type ConversationRow = { id: string; title: string; startedAt: string; lastAt: string; messages: number; costUsd: number };

const spent = (chat: Chat) => chat.messages.reduce((sum, message) => sum + (message.costUsd ?? 0), 0);

/** The newest chats and their totals. Each chat is one read, so the owner's page stays at a fixed number
 *  of them, and a chat in the list may lag the live one by a minute. */
export async function chatOverview(limit: number, source = shelf(), now = new Date()) {
  const entries = (await source.entries()).sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  const chats = (await Promise.all(entries.slice(0, limit).map((entry) => source.read(entry.id, false)))).filter((chat): chat is Chat => chat !== null);
  const month = now.toISOString().slice(0, 7);
  const rows: ConversationRow[] = chats.map((chat) => ({ id: chat.id, title: chat.title, startedAt: chat.startedAt, lastAt: chat.lastAt, messages: chat.messages.length, costUsd: spent(chat) }));
  return {
    rows,
    total: entries.length,
    questions: chats.reduce((sum, chat) => sum + chat.messages.filter((message) => message.role === 'user').length, 0),
    monthCostUsd: chats.filter((chat) => chat.lastAt.startsWith(month)).reduce((sum, chat) => sum + spent(chat), 0),
  };
}

export type ReportData = { startedAt: string; brief: BriefFact[]; options: ChatOption[]; leftOut: LeftOut[]; messages: MessageRow[] };

export type MessageRow = { id: string; role: string; content: string; robots: string[]; trace: string[]; costUsd: number; createdAt: string };

export function messageRows(chat: Chat): MessageRow[] {
  return chat.messages.map((message, index) => ({ id: String(index), role: message.role, content: message.content, robots: message.robots ?? [], trace: message.trace ?? [], costUsd: message.costUsd ?? 0, createdAt: message.at }));
}

export async function reportData(id: string): Promise<ReportData | null> {
  const chat = await readChat(id);
  return chat && { startedAt: chat.startedAt, brief: chat.brief, options: chat.options ?? [], leftOut: chat.leftOut, messages: messageRows(chat) };
}

/** The privacy page promises six months, and a store only forgets what it is told to. */
export async function purgeOldChats(source = shelf(), now = new Date()): Promise<number> {
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - 6);
  const old = (await source.entries()).filter((entry) => entry.savedAt < limit).map((entry) => entry.id);
  await source.remove(old);
  return old.length;
}
