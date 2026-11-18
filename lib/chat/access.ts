import type { Session } from '@/lib/auth/session';
import { API_KEY_PATTERN } from './visitor-key';
import { freeLeft, type Account } from './accounts';
import type { Chat, PaidBy } from './store';

// Who may send this message, and who pays for the answer. Kept apart from the route so every case
// can be tested without a server: the rest of the site is free, the adviser is not free to run.

export type Access =
  | { ok: true; paidBy: PaidBy; owner: string | undefined; newFreeChat: boolean }
  | { ok: false; code: 'bad_key' | 'sign_in' | 'free_closed' | 'not_yours' | 'quota'; status: number };

export function decideAccess({ apiKey, session, chat, account, freeOpen, signInRequired = true, now = new Date() }: {
  apiKey: string | null; session: Session | null; chat: Chat | null; account: Account | null; freeOpen: boolean; signInRequired?: boolean; now?: Date;
}): Access {
  // Their own key pays, so no allowance applies. A signed-in person still owns what they start.
  if (apiKey) {
    if (!API_KEY_PATTERN.test(apiKey)) return { ok: false, code: 'bad_key', status: 400 };
    return { ok: true, paidBy: 'own_key', owner: chat?.owner ?? session?.uid, newFreeChat: false };
  }
  // No sign-in set up yet: open to everyone as before, held only by the daily limits in the route.
  if (!session && !signInRequired) {
    if (!freeOpen) return { ok: false, code: 'free_closed', status: 503 };
    if (chat?.owner) return { ok: false, code: 'not_yours', status: 403 };
    return { ok: true, paidBy: 'free', owner: undefined, newFreeChat: false };
  }
  if (!session) return { ok: false, code: 'sign_in', status: 401 };
  if (!freeOpen) return { ok: false, code: 'free_closed', status: 503 };
  if (chat?.owner && chat.owner !== session.uid) return { ok: false, code: 'not_yours', status: 403 };
  // A chat already on the allowance goes on free. Anything else starts a new free consultation:
  // a new chat, or one begun with a key that has since been removed.
  if (chat && chat.paidBy === 'free' && chat.owner === session.uid) return { ok: true, paidBy: 'free', owner: session.uid, newFreeChat: false };
  if (freeLeft(account, now) <= 0) return { ok: false, code: 'quota', status: 402 };
  return { ok: true, paidBy: 'free', owner: session.uid, newFreeChat: true };
}
