import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LIMITS, chatStatus } from '@/lib/chat/config';
import { REPLY_KEY, guessLang } from '@/lib/chat/i18n';
import { FORM_SHOWN, OPTIONS_SHOWN, runChat, type ChatResult } from '@/lib/chat/run';
import { countMessage, messagesToday, newChat, readChat, visitorId, writeChat } from '@/lib/chat/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RequestSchema = z.object({
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(LIMITS.messageChars),
  // The language on the page, and whether the person chose it with the switch or it is only a first guess.
  lang: z.enum(['en', 'de']).optional(),
  chosen: z.boolean().optional(),
}).strict();

const refuse = (code: string, status: number) => NextResponse.json({ error: code }, { status });

/** What the chat page can say about a failed call. A spent limit shows as a paused chat, and a busy
 *  API as a short wait. Details stay in the server log, never in the page. */
function failure(error: unknown): string {
  if (error instanceof Anthropic.RateLimitError) return 'busy';
  if (error instanceof Anthropic.APIError && error.status !== undefined && error.status < 500) return 'paused';
  return 'failed';
}

export async function POST(request: Request) {
  const status = chatStatus();
  if (!status.ready) return refuse('closed', 503);
  // The page is the only intended caller. This stops other sites spending the limit from a browser.
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin') return refuse('forbidden', 403);

  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return refuse('invalid', 400);
  const { message } = parsed.data;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const visitor = visitorId(ip, request.headers.get('user-agent') ?? '');
  const today = await messagesToday(visitor);
  // These protect the budget from the public, not from the owner testing on their own machine.
  if (process.env.NODE_ENV === 'production') {
    if (today.visitor >= LIMITS.perVisitorPerDay) return refuse('daily_limit', 429);
    if (today.everyone >= LIMITS.allVisitorsPerDay) return refuse('busy', 429);
  }

  // A first message has nothing to read, so it costs no read.
  const conversationId = parsed.data.conversationId ?? randomUUID();
  const chat = (parsed.data.conversationId ? await readChat(conversationId) : null) ?? newChat(conversationId, message);
  if (chat.messages.length >= LIMITS.messagesPerConversation) return refuse('conversation_limit', 429);
  const turns = chat.messages.slice(-(LIMITS.historyMessages - 1)).map(({ role, content }) => ({ role, content }));
  chat.messages.push({ role: 'user', content: message, at: new Date().toISOString() });
  await countMessage(visitor, today);
  // One write per message, whatever happens in it: a failed answer still leaves the question on record.
  const save = () => writeChat(chat).catch((error) => console.error('chat not saved', error));

  const client = new Anthropic({ maxRetries: 1, timeout: 50_000 });
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      const lang = parsed.data.lang && parsed.data.chosen ? parsed.data.lang : guessLang([...turns.filter((turn) => turn.role === 'user').map((turn) => turn.content), message].join(' '), parsed.data.lang);
      send({ t: 'start', conversationId, lang });
      try {
        const run = runChat(client.beta.messages, [...turns, { role: 'user', content: message }], chat.brief, request.signal, lang);
        let step = await run.next();
        while (!step.done) {
          send(step.value);
          step = await run.next();
        }
        const result: ChatResult = step.value;
        // Cards and forms are not in the text, so note them: the next turn's history must show them.
        const shown = [
          result.form && result.form.questions[0].key !== REPLY_KEY ? FORM_SHOWN + ' ' + result.form.questions.map((question) => question.label).join('; ') + ')' : '',
          result.options ? OPTIONS_SHOWN + ' ' + result.options.map((option) => option.name).join(', ') + ')' : '',
        ];
        chat.messages.push({ role: 'assistant', content: [result.text, ...shown].filter(Boolean).join('\n\n') || '(No answer)', at: new Date().toISOString(), robots: result.options?.map((option) => option.id) ?? [], trace: result.trace, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd: result.costUsd, model: result.model });
        chat.brief = result.brief;
        if (result.options) {
          chat.options = result.options;
          chat.leftOut = result.leftOut;
        }
        // Before 'done', because the page may ask for the PDF as soon as it hears that.
        await save();
        send({ t: 'done' });
      } catch (error) {
        // A visitor closing the tab is not a failure, and nothing is left to tell them.
        if (!request.signal.aborted) {
          console.error('chat failed', error);
          send({ t: 'error', code: failure(error) });
        }
        await save();
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { 'content-type': 'application/x-ndjson; charset=utf-8', 'cache-control': 'no-store' } });
}
