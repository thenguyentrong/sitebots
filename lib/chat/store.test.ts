import { mkdtempSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { chatOverview, diskShelf, messageRows, newChat, purgeOldChats, visitorId, type Chat } from './store';

describe('visitorId', () => {
  const day = new Date('2026-11-06T10:00:00Z');
  it('is stable within a day', () => {
    expect(visitorId('1.2.3.4', 'browser', day)).toBe(visitorId('1.2.3.4', 'browser', new Date('2026-11-06T23:00:00Z')));
  });
  it('cannot follow a visitor to the next day', () => {
    expect(visitorId('1.2.3.4', 'browser', day)).not.toBe(visitorId('1.2.3.4', 'browser', new Date('2026-11-07T00:00:01Z')));
  });
  it('never contains the address', () => {
    expect(visitorId('203.0.113.9', 'browser', day)).not.toContain('203');
  });
});

describe('chat files', () => {
  const folder = mkdtempSync(join(tmpdir(), 'sitebots-chats-'));
  const shelf = diskShelf(folder);
  const now = new Date('2026-11-06T10:00:00Z');
  afterAll(() => rmSync(folder, { recursive: true, force: true }));

  const chat = (id: string, month: string, cost: number): Chat => ({
    ...newChat(id, 'Which robot dog?', now), lastAt: month + '-02T10:00:00.000Z',
    messages: [{ role: 'user', content: 'Which robot dog?', at: now.toISOString() }, { role: 'assistant', content: 'A dog.', at: now.toISOString(), costUsd: cost, robots: ['unitree-b2'] }],
  });

  it('gives back what was saved, and nothing for an unknown chat', async () => {
    await shelf.write(chat('one', '2026-11', 0.02));
    expect(await shelf.read('one', true)).toEqual(chat('one', '2026-11', 0.02));
    expect(await shelf.read('nobody', true)).toBeNull();
  });

  it('adds up only this month for the cost, and says how many chats there are', async () => {
    await shelf.write(chat('two', '2026-10', 5));
    const overview = await chatOverview(50, shelf, now);
    expect(overview.total).toBe(2);
    expect(overview.questions).toBe(2);
    expect(overview.monthCostUsd).toBeCloseTo(0.02);
  });

  it('reads no more chats than the page shows', async () => {
    const overview = await chatOverview(1, shelf, now);
    expect(overview.rows).toHaveLength(1);
    expect(overview.total).toBe(2);
  });

  it('keeps the report fields the PDF reads', () => {
    expect(messageRows(chat('one', '2026-11', 0))[1]).toMatchObject({ role: 'assistant', robots: ['unitree-b2'], trace: [] });
  });

  it('deletes chats after six months and keeps newer ones', async () => {
    const old = new Date('2026-04-01T00:00:00Z');
    utimesSync(join(folder, 'two.json'), old, old);
    expect(await purgeOldChats(shelf, now)).toBe(1);
    expect(await shelf.read('two', true)).toBeNull();
    expect(await shelf.read('one', true)).not.toBeNull();
  });
});
