import Anthropic from '@anthropic-ai/sdk';
import { CHAT_MODEL, EARLY_MODEL, LIMITS, PRICES, WEB_SEARCH_PRICE } from './config';
import { REPLY_KEY, STEP_TEXT, WORK_TEXT, guessLang, type Lang } from './i18n';
import { SYSTEM_PROMPT } from './system';
import { CHAT_TOOLS, runTool, toolStatus, type BriefFact, type ChatForm, type ChatOption, type LeftOut } from './tools';

export type ChatEvent =
  /** What the adviser is busy with now. */
  | { t: 'status'; text: string }
  /** A lookup it finished. */
  | { t: 'step'; text: string }
  | { t: 'text'; delta: string }
  | { t: 'brief'; facts: BriefFact[] }
  | { t: 'form'; form: ChatForm }
  | { t: 'options'; options: ChatOption[]; leftOut: LeftOut[] }
  | { t: 'report' };

export type ChatResult = {
  text: string; brief: BriefFact[]; options: ChatOption[] | null; leftOut: LeftOut[]; form: ChatForm | null;
  trace: string[]; inputTokens: number; outputTokens: number; costUsd: number; refused: boolean; model: string;
};

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

type Client = Pick<Anthropic['beta']['messages'], 'stream'>;

/** How a shown result is noted in the saved text, so later turns know a conclusion exists. */
export const OPTIONS_SHOWN = '(Options shown:';
/** Same for a form. A form may be used once in a chat, because a chat is not a questionnaire. */
export const FORM_SHOWN = '(Asked:';

/** For the person's company and work only: every robot fact still comes from the database. Haiku fails on
 *  the newer search version, and one tool list for both models keeps a switch inside a turn safe. */
const WEB_SEARCH = { type: 'web_search_20250305', name: 'web_search', max_uses: LIMITS.webSearches, user_location: { type: 'approximate', country: 'DE', timezone: 'Europe/Berlin' } } as const;

/** What the adviser has to know before it may recommend anything: good advice needs a person, not only a job. */
const MUST_KNOW = ['who', 'priorities', 'budget'];

const stillOpen = (brief: readonly BriefFact[]) => MUST_KNOW.filter((key) => !brief.some((fact) => fact.key === key && (fact.state === 'known' || fact.state === 'not_needed')));
const knowsEnough = (brief: readonly BriefFact[]) => stillOpen(brief).length === 0;

/** Sonnet takes over the moment the adviser may recommend, because choosing robots is the judgement this
 *  site exists for. A switch inside a turn is safe: Sonnet reads Haiku's thinking, never the reverse. */
export const modelFor = (turn: number, brief: readonly BriefFact[], concluded: boolean) =>
  concluded || turn >= LIMITS.conclusionTurn || knowsEnough(brief) ? CHAT_MODEL : EARLY_MODEL;

/** Tools that look nothing up: after one of these there is nothing new to say. */
const CLOSING_TOOLS = new Set(['update_brief', 'ask_questions', 'offer_report']);

const SILENT = 'You stopped without replying. Reply to their last message now, in a normal chat message.';
const REFUSED = 'I can only help with robots and construction work. Tell me about a job and I will look at it.';

/** New facts replace old ones with the same key, so a changed answer never sits beside its old value. */
export function mergeBrief(current: readonly BriefFact[], updates: readonly BriefFact[]): BriefFact[] {
  const merged = new Map(current.map((fact) => [fact.key, fact]));
  for (const fact of updates) merged.set(fact.key, fact);
  return [...merged.values()];
}

/** The brief goes in with the newest message rather than the system prompt, because it comes from the
 *  visitor and changes every turn: the cached prefix stays stable and it keeps user-level trust. The same
 *  place carries the nudge to conclude, because a model left alone keeps asking questions for ever. */
function withBrief(turns: ChatTurn[], brief: readonly BriefFact[], language: Lang): Anthropic.Beta.Messages.BetaMessageParam[] {
  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = turns.map((turn) => ({ role: turn.role, content: turn.content }));
  const last = turns[turns.length - 1];
  if (last?.role !== 'user') return messages;
  const turn = turns.filter((item) => item.role === 'user').length;
  const concluded = turns.some((item) => item.content.includes(OPTIONS_SHOWN));
  const open = stillOpen(brief);
  const notes = [
    language === 'de' ? 'Write in German and say Sie, reply line included.' : 'Write in English, reply line included.',
    brief.length ? 'Project brief so far:\n' + JSON.stringify(brief) : '',
    // Left alone, a model keeps refining the job and reaches the end without knowing the person.
    turn >= LIMITS.askByTurn && turn < LIMITS.conclusionTurn && !concluded && open.length ? 'You still do not know: ' + open.join(', ') + '. Make the first of these your one question now, and stop refining the job.' : '',
    turn >= LIMITS.conclusionTurn && !concluded ? 'You know enough now. Answer anything they just asked, then give your conclusion in this turn with show_options and state your assumptions. Do not ask another question first.' : '',
  ].filter(Boolean);
  messages[messages.length - 1] = { role: 'user', content: notes.join('\n\n') + '\n\nNew message:\n' + last.content };
  return messages;
}

/** The line of tap answers that ends an adviser message. It is an instruction to the page, never text.
 *  The model does not always type exactly two brackets, so any number counts. */
const REPLIES = /\[+replies:([^\]]*)\]+\s*$/i;
const REPLY_START = /\[+replies:/i;
/** The end of a chunk that could still grow into a reply line. A link such as [Robot stops matching at o. */
const MAYBE_REPLY = /\[+(?:r(?:e(?:p(?:l(?:i(?:e(?:s)?)?)?)?)?)?)?$/i;

/** Lets text through until a reply line may be starting, and holds the rest until the message ends. */
function replySplitter() {
  let held = '';
  return {
    push(delta: string): string {
      held += delta;
      const start = held.search(REPLY_START);
      const maybe = held.search(MAYBE_REPLY);
      const keep = start >= 0 ? start : maybe >= 0 ? maybe : held.length;
      const passed = held.slice(0, keep);
      held = held.slice(keep);
      return passed;
    },
    end(): { text: string; replies: string[] } {
      const match = REPLIES.exec(held);
      return { text: match ? held.slice(0, match.index) : held, replies: match ? match[1].split('|').map((reply) => reply.trim()).filter(Boolean).slice(0, 5) : [] };
    },
  };
}

/** One visitor turn: the tool loop, streamed. Earlier turns are replayed as plain text, so no thinking
 *  block ever has to survive between turns; inside this loop the assistant content goes back unchanged. */
export async function* runChat(client: Client, history: ChatTurn[], brief: readonly BriefFact[], signal?: AbortSignal, chosen?: Lang): AsyncGenerator<ChatEvent, ChatResult> {
  const language = chosen ?? guessLang(history.filter((turn) => turn.role === 'user').map((turn) => turn.content).join(' '));
  const messages = withBrief(history, brief, language);
  const result: ChatResult = { text: '', brief: [...brief], options: null, leftOut: [], form: null, trace: [], inputTokens: 0, outputTokens: 0, costUsd: 0, refused: false, model: EARLY_MODEL };
  let cost = 0;
  let jsonRetries = 0;
  const turn = history.filter((item) => item.role === 'user').length;
  let nudged = false;
  let reported = false;
  // Haiku's words from before its last lookup, used only if it never writes again.
  let spare: { text: string; replies: string[] } | null = null;
  const formUsed = history.some((turn) => turn.content.includes(FORM_SHOWN));
  const concluded = history.some((turn) => turn.content.includes(OPTIONS_SHOWN));

  for (let round = 0; round <= LIMITS.toolRounds; round++) {
    if (round > 0) yield { t: 'status', text: WORK_TEXT[language].thinking };
    const model = modelFor(turn, result.brief, concluded);
    result.model = model;
    const stream = client.stream({
      model,
      max_tokens: LIMITS.maxTokens,
      output_config: { effort: 'medium' },
      // Haiku has no server-side fallback, so it must not ask for one.
      ...(model === CHAT_MODEL ? { betas: ['server-side-fallback-2026-07-01' as const], fallbacks: 'default' as const } : {}),
      // Every lookup sends the whole chat again, so this keeps the part already sent at a tenth of the price.
      cache_control: { type: 'ephemeral' },
      // Tools render before the system prompt, so this one breakpoint caches both.
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      tools: [...CHAT_TOOLS, WEB_SEARCH],
      // The last round may not call tools: the visitor gets an answer from what was found so far.
      tool_choice: round === LIMITS.toolRounds ? { type: 'none' } : { type: 'auto' },
      messages,
    }, { signal });

    // Text after a lookup is a new thought, so it starts its own paragraph.
    let opened = false;
    const say = (text: string) => {
      const delta = (!opened && result.text ? '\n\n' : '') + text;
      opened = true;
      result.text += delta;
      return delta;
    };
    // Haiku likes to write, look something up and write the same thing again, so its words wait for the
    // end of the round. It is quick enough that nobody misses the streaming, and Sonnet keeps it.
    const quiet = model !== CHAT_MODEL;
    let written = '';
    const chips = (replies: string[]): ChatEvent => {
      result.form = { language, questions: [{ key: REPLY_KEY, label: 'Reply', kind: 'choice', options: replies }] };
      return { t: 'form', form: result.form };
    };
    const splitter = replySplitter();
    for await (const event of stream) {
      if (event.type === 'content_block_start' && (event.content_block.type === 'tool_use' || event.content_block.type === 'server_tool_use')) {
        yield { t: 'status', text: toolStatus(event.content_block.name, language) };
        // What comes after a web search is a new thought, even inside one message.
        if (event.content_block.type === 'server_tool_use') opened = false;
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const passed = splitter.push(event.delta.text);
        if (quiet) written += passed;
        else if (passed) yield { t: 'text', delta: say(passed) };
      }
    }
    const { text: rest, replies } = splitter.end();
    if (quiet) written = (written + rest).trim();
    else if (rest) yield { t: 'text', delta: say(rest) };

    let message: Anthropic.Beta.Messages.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (error) {
      // A tool input that could not be parsed at all is worth one more try; API errors are not.
      if (error instanceof Anthropic.APIError || jsonRetries++ >= 1) throw error;
      continue;
    }

    const usage = message.usage;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    result.inputTokens += usage.input_tokens + cacheWrite + cacheRead;
    result.outputTokens += usage.output_tokens;
    const price = PRICES[model] ?? PRICES[CHAT_MODEL];
    cost += (usage.input_tokens * price.input + cacheWrite * price.cacheWrite + cacheRead * price.cacheRead + usage.output_tokens * price.output) / 1_000_000 + (usage.server_tool_use?.web_search_requests ?? 0) * WEB_SEARCH_PRICE;
    result.costUsd = cost;

    if (message.stop_reason === 'refusal') {
      // Partial text from a declined turn is dropped from the record, and the page replaces it.
      result.refused = true;
      result.text = REFUSED;
      yield { t: 'text', delta: '\n\n' + REFUSED };
      break;
    }

    for (const block of message.content) {
      if (block.type !== 'server_tool_use' || block.name !== 'web_search') continue;
      const line = STEP_TEXT[language].web(String((block.input as { query?: unknown }).query ?? ''));
      result.trace.push(line);
      yield { t: 'step', text: line };
    }

    // A long web search can pause. It goes on where it stopped once its own message is sent back.
    if (message.stop_reason === 'pause_turn') {
      if (written) spare = { text: written, replies };
      messages.push({ role: 'assistant', content: message.content as Anthropic.Beta.Messages.BetaContentBlockParam[] });
      continue;
    }

    const calls = message.content.filter((block): block is Anthropic.Beta.Messages.BetaToolUseBlock => block.type === 'tool_use');
    const lookingFurther = calls.some((call) => !CLOSING_TOOLS.has(call.name));
    if (written && lookingFurther) spare = { text: written, replies };
    else if (written) {
      spare = null;
      yield { t: 'text', delta: say(written) };
    }
    // A call cut off at max_tokens can parse as a valid partial object, so it must never run.
    if (!calls.length || message.stop_reason === 'max_tokens') {
      const lastWords: { text: string; replies: string[] } | null = !opened ? spare : null;
      if (lastWords) yield { t: 'text', delta: say(lastWords.text) };
      // The model can stop after its lookups without a word. Silence is the one answer a chat must
      // never give, because the person is left waiting and their question goes unanswered.
      if (!opened && !result.options && !reported && !nudged && round < LIMITS.toolRounds) {
        console.warn('chat stopped without a reply', message.stop_reason);
        nudged = true;
        messages.push({ role: 'user', content: SILENT });
        continue;
      }
      const tapAnswers = lastWords?.replies ?? replies;
      if (tapAnswers.length) yield chips(tapAnswers);
      break;
    }

    messages.push({ role: 'assistant', content: message.content as Anthropic.Beta.Messages.BetaContentBlockParam[] });
    const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
    for (const call of calls) {
      // Tool-first habits turn a chat into a questionnaire, so a form never stands in for a message.
      if (call.name === 'ask_questions' && (!result.text.trim() || formUsed)) {
        results.push({ type: 'tool_result', tool_use_id: call.id, content: formUsed ? 'A form was already used in this chat. Ask in your text, with a reply line.' : 'Write your message first: what you found and what you make of it. Then ask.', is_error: true });
        continue;
      }
      if (call.name === 'show_options' && turn < LIMITS.conclusionTurn) {
        const missing = stillOpen(result.brief);
        if (missing.length) {
          results.push({ type: 'tool_result', tool_use_id: call.id, content: 'Too early. You do not yet know: ' + missing.join(', ') + '. Ask them about this first. If they do not care or want the result now, save it as not_needed.', is_error: true });
          continue;
        }
      }
      // The brief can fill up in the same message as this call, so the check above is not enough.
      if (call.name === 'show_options' && model !== CHAT_MODEL) {
        results.push({ type: 'tool_result', tool_use_id: call.id, content: 'Check your picks against the brief with the lookups once more, then call this again.', is_error: true });
        continue;
      }
      const outcome = runTool(call.name, call.input, language);
      if (outcome.step) {
        result.trace.push(outcome.step);
        yield { t: 'step', text: outcome.step };
      }
      if (outcome.facts) {
        result.brief = mergeBrief(result.brief, outcome.facts);
        yield { t: 'brief', facts: result.brief };
      }
      if (outcome.options) {
        result.options = outcome.options;
        result.leftOut = outcome.leftOut ?? [];
        yield { t: 'options', options: outcome.options, leftOut: result.leftOut };
      }
      if (outcome.form) {
        result.form = outcome.form;
        yield { t: 'form', form: outcome.form };
      }
      if (outcome.report) {
        reported = true;
        yield { t: 'report' };
      }
      results.push({ type: 'tool_result', tool_use_id: call.id, content: outcome.content, is_error: outcome.isError });
    }
    // A form ends the turn: the answers arrive as the next message, and spending another round here
    // would only make the model talk over its own questions.
    if (result.form) break;
    // It has said its piece and only saved the brief. Asking again would only bring the same words back.
    if (written && !lookingFurther) {
      if (replies.length) yield chips(replies);
      break;
    }
    messages.push({ role: 'user', content: results });
  }
  result.text = result.text.trimEnd();
  return result;
}
