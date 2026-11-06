import { LEGAL_READY } from '@/lib/site';

// The owner chose Sonnet 5.5 on 2026-11-06 for good judgement on a $50 monthly limit. It chooses the robots.
export const CHAT_MODEL = 'claude-sonnet-5-5';
// Getting to know the person is lighter work at a twentieth of the price. Setting this variable to the
// Sonnet id turns the mix off without a code change.
export const EARLY_MODEL = process.env.CHAT_EARLY_MODEL || 'claude-haiku-5-5';

type Price = { input: number; output: number; cacheWrite: number; cacheRead: number };

/** USD per million tokens, for the running cost shown to the owner. The Console limit is what stops
 *  spending; this figure only reports it. Cache writes cost 1.25× input, reads 0.1×. */
export const PRICES: Record<string, Price> = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
};
export const WEB_SEARCH_PRICE = 0.01;

export const LIMITS = {
  // People talk into the box and describe their whole company, so this is far longer than a typed line.
  messageChars: 2000,
  // A consultation runs over several messages, so this has to allow a few whole chats.
  perVisitorPerDay: 40,
  // Catches a script hammering the route from many addresses before the monthly limit is gone.
  allVisitorsPerDay: 600,
  messagesPerConversation: 40,
  // Earlier turns sent back to the model. Older ones cost tokens and rarely change the advice.
  historyMessages: 24,
  toolRounds: 6,
  // From this turn on the adviser is told to ask what it still has to know, instead of digging into the job.
  askByTurn: 3,
  // Until this turn the adviser may not conclude without knowing who it talks to. From it on it must.
  conclusionTurn: 6,
  // Per message. Search results are long, so each search costs more in tokens than in fees.
  webSearches: 3,
  maxTokens: 6000,
  // Each one is a read on the owner's page, and the page only has to show what is new.
  chatsOnAdminPage: 50,
};

export type ChatStatus = { ready: true } | { ready: false; reason: 'no_key' | 'no_storage' | 'no_legal' };

/** The chat stays closed until it can keep its promises: a key to answer with, a store for the chats,
 *  and an Impressum and privacy page that name who runs it. */
export function chatStatus(): ChatStatus {
  if (!process.env.ANTHROPIC_API_KEY) return { ready: false, reason: 'no_key' };
  if (process.env.NODE_ENV !== 'production') return { ready: true };
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ready: false, reason: 'no_storage' };
  if (!LEGAL_READY) return { ready: false, reason: 'no_legal' };
  return { ready: true };
}
