import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Session } from '@/lib/auth/session';
import { decideAccess } from './access';
import { FREE_CHATS_PER_MONTH, diskStore, freeLeft, newAccount, withNewChat, type Account } from './accounts';
import { newChat, type Chat } from './store';

const KEY = 'sk-ant-api03-' + 'a'.repeat(40);
const me: Session = { uid: 'me', provider: 'google', label: 'me@x.de', exp: 9999999999 };
const now = new Date('2026-11-18T12:00:00Z');
const used = (n: number): Account => ({ ...newAccount('me', 'google', now), months: { '2026-11': n } });
const chat = (over: Partial<Chat>): Chat => ({ ...newChat('c1', 'hello', now), ...over });
const decide = (over: Partial<Parameters<typeof decideAccess>[0]>) => decideAccess({ apiKey: null, session: null, chat: null, account: null, freeOpen: true, now, ...over });

describe('who may ask the adviser, and who pays', () => {
  it('asks a visitor with neither an account nor a key to sign in', () => {
    expect(decide({})).toMatchObject({ ok: false, code: 'sign_in', status: 401 });
  });

  it('lets an own key through without any allowance, and refuses what is not a key', () => {
    expect(decide({ apiKey: KEY })).toMatchObject({ ok: true, paidBy: 'own_key', newFreeChat: false });
    expect(decide({ apiKey: KEY, session: me, account: used(FREE_CHATS_PER_MONTH) })).toMatchObject({ ok: true, paidBy: 'own_key', owner: 'me' });
    expect(decide({ apiKey: 'sk-proj-openai-key-here-1234567890' })).toMatchObject({ ok: false, code: 'bad_key' });
  });

  it('starts free consultations until the month is used up', () => {
    expect(decide({ session: me, account: null })).toMatchObject({ ok: true, paidBy: 'free', newFreeChat: true });
    expect(decide({ session: me, account: used(FREE_CHATS_PER_MONTH - 1) })).toMatchObject({ ok: true, newFreeChat: true });
    expect(decide({ session: me, account: used(FREE_CHATS_PER_MONTH) })).toMatchObject({ ok: false, code: 'quota', status: 402 });
  });

  it('carries on a free chat already started, even with nothing left this month', () => {
    expect(decide({ session: me, account: used(FREE_CHATS_PER_MONTH), chat: chat({ owner: 'me', paidBy: 'free' }) })).toMatchObject({ ok: true, paidBy: 'free', newFreeChat: false });
  });

  it('never lets one account carry on another account\'s chat', () => {
    expect(decide({ session: me, chat: chat({ owner: 'someone-else', paidBy: 'free' }) })).toMatchObject({ ok: false, code: 'not_yours' });
  });

  it('counts a chat begun with a key, then without it, as a new free consultation', () => {
    expect(decide({ session: me, account: used(0), chat: chat({ owner: 'me', paidBy: 'own_key' }) })).toMatchObject({ ok: true, paidBy: 'free', newFreeChat: true });
  });

  it('stays open to everyone while no sign-in is set up, but not into an account\'s chat', () => {
    expect(decide({ signInRequired: false })).toMatchObject({ ok: true, paidBy: 'free', owner: undefined, newFreeChat: false });
    expect(decide({ signInRequired: false, chat: chat({}) })).toMatchObject({ ok: true, paidBy: 'free' });
    expect(decide({ signInRequired: false, chat: chat({ owner: 'me', paidBy: 'free' }) })).toMatchObject({ ok: false, code: 'not_yours' });
    expect(decide({ signInRequired: false, freeOpen: false })).toMatchObject({ ok: false, code: 'free_closed' });
    // Someone who did sign in still uses their own allowance.
    expect(decide({ signInRequired: false, session: me, account: used(FREE_CHATS_PER_MONTH) })).toMatchObject({ ok: false, code: 'quota' });
  });

  it('closes the free door when the site has no key of its own, but not the own-key door', () => {
    expect(decide({ session: me, freeOpen: false })).toMatchObject({ ok: false, code: 'free_closed' });
    expect(decide({ apiKey: KEY, freeOpen: false })).toMatchObject({ ok: true, paidBy: 'own_key' });
  });
});

describe('the free allowance', () => {
  it('counts per calendar month and starts again on the 1st', () => {
    const account = withNewChat(withNewChat(newAccount('me', 'google', now), 'a', true, now), 'b', true, now);
    expect(freeLeft(account, now)).toBe(FREE_CHATS_PER_MONTH - 2);
    expect(freeLeft(account, new Date('2026-12-01T00:00:00Z'))).toBe(FREE_CHATS_PER_MONTH);
  });

  it('remembers own-key chats as the account\'s own without counting them', () => {
    const account = withNewChat(newAccount('me', 'google', now), 'k', false, now);
    expect(freeLeft(account, now)).toBe(FREE_CHATS_PER_MONTH);
    expect(account.chats).toEqual(['k']);
  });

  it('stores an account and forgets it on delete', async () => {
    const store = diskStore(mkdtempSync(join(tmpdir(), 'sitebots-accounts-')));
    await store.write(withNewChat(newAccount('me', 'google', now), 'a', true, now));
    expect((await store.read('me'))?.chats).toEqual(['a']);
    expect(await store.count()).toBe(1);
    await store.remove('me');
    expect(await store.read('me')).toBeNull();
  });
});
