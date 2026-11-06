import { describe, expect, it, vi } from 'vitest';
import { LIMITS } from './config';
import { CHAT_MODEL, EARLY_MODEL } from './config';
import { mergeBrief, modelFor, runChat, type ChatEvent, type ChatResult } from './run';
import { runTool } from './tools';

const usage = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };

type Round = { text?: string; calls?: { name: string; input: unknown }[]; stop?: string };

/** Stands in for the SDK stream: one scripted round per call, recording what was sent. */
function fakeClient(rounds: Round[]) {
  const sent: Record<string, unknown>[] = [];
  const stream = vi.fn((params: Record<string, unknown>) => {
    sent.push(structuredClone(params));
    const round = rounds[sent.length - 1];
    const calls = (round.calls ?? []).map((call, index) => ({ type: 'tool_use', id: 'call' + index, name: call.name, input: call.input }));
    return {
      async *[Symbol.asyncIterator]() {
        if (round.text) yield { type: 'content_block_delta', delta: { type: 'text_delta', text: round.text } };
      },
      finalMessage: async () => ({
        content: [...(round.text ? [{ type: 'text', text: round.text }] : []), ...calls],
        stop_reason: round.stop ?? (calls.length ? 'tool_use' : 'end_turn'), usage,
      }),
    };
  });
  return { client: { stream } as unknown as Parameters<typeof runChat>[0], sent };
}

async function collect(client: Parameters<typeof runChat>[0], brief: Parameters<typeof runChat>[2] = []) {
  const events: ChatEvent[] = [];
  const chat = runChat(client, [{ role: 'user', content: 'hello' }], brief);
  let step = await chat.next();
  while (!step.done) {
    events.push(step.value);
    step = await chat.next();
  }
  return { events, result: step.value as ChatResult };
}

const fact = (key: string, value: string, state: 'known' | 'open' = 'known') => ({ key, label: key, value, state });
/** A person it knows enough about, which puts the turn on Sonnet. */
const onSonnet = [fact('who', 'Roofer'), fact('priorities', 'Safety'), fact('budget', '30,000')];
const form = { language: 'en', questions: [{ key: 'load', label: 'How heavy is it?', kind: 'number', unit: 'kg' }] };

describe('asking about the person', () => {
  const asked = (turns: number) => Array.from({ length: turns - 1 }, (_, index) => [{ role: 'user' as const, content: 'answer ' + index }, { role: 'assistant' as const, content: 'question ' + index }]).flat();
  const ask = async (turns: number, brief: Parameters<typeof runChat>[2]) => {
    const { client, sent } = fakeClient([{ text: 'Fine.' }]);
    const chat = runChat(client, [...asked(turns), { role: 'user', content: 'hello' }], brief);
    while (!(await chat.next()).done);
    return JSON.stringify((sent[0].messages as unknown[]).at(-1));
  };
  const who = fact('who', 'Roofer');

  it('leaves the first turns to the job', async () => {
    expect(await ask(LIMITS.askByTurn - 1, [who])).not.toContain('You still do not know');
  });

  it('then tells the adviser what it still has to find out', async () => {
    const note = await ask(LIMITS.askByTurn, [who]);
    expect(note).toContain('You still do not know: priorities, budget');
  });

  it('stops asking once it knows', async () => {
    expect(await ask(LIMITS.askByTurn, [who, fact('priorities', 'Safety'), fact('budget', '30,000')])).not.toContain('You still do not know');
  });
});

describe('language', () => {
  const lastSent = async (text: string, chosen?: 'en' | 'de') => {
    const { client, sent } = fakeClient([{ text: 'Fine.' }]);
    const chat = runChat(client, [{ role: 'user', content: text }], [], undefined, chosen);
    while (!(await chat.next()).done);
    return JSON.stringify((sent[0].messages as unknown[]).at(-1));
  };

  it('follows the switch whatever the person types', async () => {
    expect(await lastSent('We need a robot for the site', 'de')).toContain('Write in German');
  });

  it('guesses from the words when nobody touched the switch', async () => {
    expect(await lastSent('Wir suchen einen Roboter für die Baustelle')).toContain('Write in German');
    expect(await lastSent('We need a robot for the site')).toContain('Write in English');
  });
});

describe('one message per turn from Haiku', () => {
  it('keeps only what it wrote after its last lookup', async () => {
    const { client } = fakeClient([
      { text: 'First thought.', calls: [{ name: 'find_jobs', input: { query: 'drywall' } }] },
      { text: 'Same thought again.' },
    ]);
    const { events, result } = await collect(client);
    expect(result.text).toBe('Same thought again.');
    expect(events.filter((event) => event.t === 'text')).toHaveLength(1);
  });

  it('ends the turn after saving the brief, and keeps the tap answers', async () => {
    const { client, sent } = fakeClient([{ text: 'Noted. Which floor? [[replies: Ground | Upper]]', calls: [{ name: 'update_brief', input: { facts: [{ key: 'job', label: 'Job', value: 'Drywall', state: 'known' }] } }] }]);
    const { events, result } = await collect(client);
    expect(sent).toHaveLength(1);
    expect(result.text).toBe('Noted. Which floor?');
    expect(events.at(-1)).toMatchObject({ t: 'form' });
  });

  it('falls back on its earlier words if it never writes again', async () => {
    const { client } = fakeClient([{ text: 'What I found. [[replies: Yes | No]]', calls: [{ name: 'find_jobs', input: { query: 'drywall' } }] }, {}]);
    const { events, result } = await collect(client);
    expect(result.text).toBe('What I found.');
    expect(events.at(-1)).toMatchObject({ t: 'form' });
  });
});

describe('modelFor', () => {
  const known = [fact('who', 'Roofer'), fact('priorities', 'Safety'), fact('budget', '30,000')];

  it('uses the cheap model while it gets to know the person', () => {
    expect(modelFor(1, [], false)).toBe(EARLY_MODEL);
    expect(modelFor(2, known.slice(0, 2), false)).toBe(EARLY_MODEL);
  });

  it('uses Sonnet as soon as it may recommend', () => {
    expect(modelFor(2, known, false)).toBe(CHAT_MODEL);
    expect(modelFor(LIMITS.conclusionTurn, [], false)).toBe(CHAT_MODEL);
    expect(modelFor(2, [], true)).toBe(CHAT_MODEL);
  });

  it('never asks Haiku for a server-side fallback, and caches the chat on both', async () => {
    const { client, sent } = fakeClient([{ text: 'Hello' }]);
    await collect(client);
    expect(sent[0].model).toBe(EARLY_MODEL);
    expect(sent[0].fallbacks).toBeUndefined();
    expect(sent[0].cache_control).toEqual({ type: 'ephemeral' });
  });

  it('hands the turn to Sonnet when the brief fills up, so Haiku never picks the robots', async () => {
    const { client, sent } = fakeClient([
      { calls: [{ name: 'update_brief', input: { facts: known } }, { name: 'show_options', input: { options: [] } }] },
      { text: 'Now I will choose.' },
    ]);
    const { result } = await collect(client);
    expect(sent.map((params) => params.model)).toEqual([EARLY_MODEL, CHAT_MODEL]);
    expect(sent[1].fallbacks).toBe('default');
    expect(result.options).toBeNull();
    expect(result.model).toBe(CHAT_MODEL);
  });
});

describe('runChat', () => {
  it('streams a plain answer and counts its cost', async () => {
    const { client } = fakeClient([{ text: 'Use a Jaibot.' }]);
    const { events, result } = await collect(client);
    expect(events).toEqual([{ t: 'text', delta: 'Use a Jaibot.' }]);
    expect(result.costUsd).toBeCloseTo((100 * 0.1 + 50 * 0.5) / 1_000_000, 9);
  });

  it('goes on after a paused web search, without losing what was said', async () => {
    const { client, sent } = fakeClient([{ text: 'Looking you up.', stop: 'pause_turn' }, { text: 'Found you.' }]);
    const { result } = await collect(client, onSonnet);
    expect(sent).toHaveLength(2);
    expect(result.text).toBe('Looking you up.\n\nFound you.');
  });

  it('will not recommend before it knows who it talks to, what matters and the budget', async () => {
    const option = { language: 'en', left_out: [], options: [{ robot_id: 'unitree-b2', label: 'Typical choice', why: 'Fits.', pros: ['Sold here'], cons: ['Heavy'], confirm: [] }] };
    const round = [{ calls: [{ name: 'show_options', input: option }] }, { text: 'Who are you?' }];
    const early = await collect(fakeClient(round).client);
    expect(early.result.options).toBeNull();
    const known = [fact('who', 'A builder'), fact('priorities', 'Price'), { ...fact('budget', ''), state: 'not_needed' as const }];
    expect((await collect(fakeClient(round).client, known)).result.options).toHaveLength(1);
  });

  it('keeps the brief across turns and hands it to the model with the newest message', async () => {
    const { client, sent } = fakeClient([{ calls: [{ name: 'update_brief', input: { facts: [fact('load', '20 kg')] } }] }, { text: 'Noted.' }]);
    const { result } = await collect(client, [fact('job', 'Carry boards')]);
    expect(result.brief.map((item) => item.key)).toEqual(['job', 'load']);
    expect(JSON.stringify(sent[0].messages)).toContain('Carry boards');
  });

  it('ends the turn at a form, so the model does not talk over its own questions', async () => {
    const { client, sent } = fakeClient([{ text: 'Two numbers decide it.', calls: [{ name: 'ask_questions', input: form }] }, { text: 'never sent' }]);
    const { events, result } = await collect(client);
    expect(sent).toHaveLength(1);
    expect(events.some((event) => event.t === 'form')).toBe(true);
    expect(result.form?.questions[0].key).toBe('load');
  });

  it('keeps what the adviser said above its question', async () => {
    const { client } = fakeClient([{ text: 'Dogs are out at this weight. How heavy is it?', calls: [{ name: 'ask_questions', input: form }] }]);
    const { result } = await collect(client);
    expect(result.text).toBe('Dogs are out at this weight. How heavy is it?');
  });

  it('sends a form without a message back, so a form never stands in for a message', async () => {
    const { client, sent } = fakeClient([{ calls: [{ name: 'ask_questions', input: form }] }, { text: 'Now with a thought.', calls: [{ name: 'ask_questions', input: form }] }]);
    const { result } = await collect(client);
    expect(sent).toHaveLength(2);
    expect(result.form?.questions[0].key).toBe('load');
    expect(result.text).toBe('Now with a thought.');
  });

  it('allows one form in a chat', async () => {
    const { client } = fakeClient([{ text: 'Another form.', calls: [{ name: 'ask_questions', input: form }] }, { text: 'Fine, in words.' }]);
    const chat = runChat(client, [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'Hello\n\n(Asked: Load)' }, { role: 'user', content: 'ok' }], []);
    let step = await chat.next();
    while (!step.done) step = await chat.next();
    expect(step.value.form).toBeNull();
  });

  it('turns a reply line into tap answers and never shows it as text', async () => {
    const { client } = fakeClient([{ text: 'Tracks look best. What is the route?\n[[replies: Rough yard | Flat floor]]' }]);
    const { events, result } = await collect(client);
    expect(result.text).toBe('Tracks look best. What is the route?');
    expect(events.filter((event) => event.t === 'text').map((event) => event.delta).join('')).not.toContain('[[');
    expect(result.form?.questions[0].options).toEqual(['Rough yard', 'Flat floor']);
  });

  it.each(['[[[replies: Yes | No]]]', '[replies: Yes | No]'])('copes with the model typing the reply line as %s', async (line) => {
    const { client } = fakeClient([{ text: 'Is it far?\n' + line }]);
    const { events, result } = await collect(client);
    expect(result.text).toBe('Is it far?');
    expect(events.filter((event) => event.t === 'text').map((event) => event.delta).join('')).not.toContain('replies');
    expect(result.form?.questions[0].options).toEqual(['Yes', 'No']);
  });

  it('keeps links intact, which also start with a bracket', async () => {
    const { client } = fakeClient([{ text: 'Look at [Spot](/robots/spot) first.' }]);
    expect((await collect(client)).result.text).toBe('Look at [Spot](/robots/spot) first.');
  });

  it('pushes for a conclusion from the set turn on, and stops once there is one', async () => {
    const asked = Array.from({ length: LIMITS.conclusionTurn - 1 }, (_, index) => [{ role: 'user' as const, content: 'answer ' + index }, { role: 'assistant' as const, content: 'question' }]).flat();
    const run = async (history: typeof asked) => {
      const { client, sent } = fakeClient([{ text: 'Done.' }]);
      const chat = runChat(client, [...history, { role: 'user', content: 'next' }], []);
      let step = await chat.next();
      while (!step.done) step = await chat.next();
      return JSON.stringify(sent[0].messages);
    };
    expect(await run(asked)).toContain('give your conclusion');
    expect(await run(asked.slice(2))).not.toContain('give your conclusion');
    expect(await run([...asked, { role: 'user', content: 'x' }, { role: 'assistant', content: 'Here.\n\n(Options shown: Spot)' }])).not.toContain('give your conclusion');
  });

  it('reports each lookup with what it found, in the language of the chat', async () => {
    const { client } = fakeClient([{ calls: [{ name: 'search_robots', input: { type: 'quadruped', min_carry_kg: 40 } }] }, { text: 'Done.' }]);
    const chat = runChat(client, [{ role: 'user', content: 'Wir suchen einen Roboter für die Baustelle' }], []);
    const steps: string[] = [];
    for (let step = await chat.next(); !step.done; step = await chat.next()) if (step.value.t === 'step') steps.push(step.value.text);
    expect(steps[0]).toMatch(/^Roboterhunde, ab 40 kg Traglast gesucht: \d+ gefunden$/);
  });

  it('starts text after a lookup as a new paragraph, without an empty one before it', async () => {
    const { client } = fakeClient([{ text: 'Let me check.', calls: [{ name: 'find_jobs', input: { query: 'drilling' } }] }, { text: 'Found it.' }]);
    const { events, result } = await collect(client, onSonnet);
    expect(result.text).toBe('Let me check.\n\nFound it.');
    expect(events.filter((event) => event.t === 'text').map((event) => event.delta)).toEqual(['Let me check.', '\n\nFound it.']);
  });

  it('never runs a tool call cut off at max_tokens', async () => {
    const { client } = fakeClient([{ calls: [{ name: 'ask_questions', input: form }], stop: 'max_tokens' }, { text: 'Recovered.' }]);
    const { result } = await collect(client);
    expect(result.form).toBeNull();
  });

  it('never ends a turn in silence after its lookups', async () => {
    const { client, sent } = fakeClient([{ calls: [{ name: 'find_jobs', input: { query: 'drilling' } }] }, {}, { text: 'Here is my answer.' }]);
    const { result } = await collect(client);
    expect(sent).toHaveLength(3);
    expect(result.text).toBe('Here is my answer.');
  });

  it('asks once, so a model that stays silent cannot loop', async () => {
    const { client, sent } = fakeClient([{}, {}]);
    await collect(client);
    expect(sent).toHaveLength(2);
  });

  it('replaces a declined turn with a plain sentence', async () => {
    const { client } = fakeClient([{ text: 'partial', stop: 'refusal' }]);
    const { result } = await collect(client);
    expect(result.refused).toBe(true);
    expect(result.text).not.toContain('partial');
  });

  it('forces a final answer when the tool rounds run out', async () => {
    const looping = Array.from({ length: LIMITS.toolRounds }, () => ({ calls: [{ name: 'find_jobs', input: { query: 'drilling' } }] }));
    const { client, sent } = fakeClient([...looping, { text: 'Best I can say.' }]);
    await collect(client);
    expect(sent).toHaveLength(LIMITS.toolRounds + 1);
    expect(sent.at(-1)?.tool_choice).toEqual({ type: 'none' });
  });

  it('keeps the system prompt stable, so the cache holds across rounds', async () => {
    const { client, sent } = fakeClient([{ calls: [{ name: 'find_jobs', input: { query: 'drilling' } }] }, { text: 'Done.' }]);
    await collect(client);
    expect(JSON.stringify(sent[0].system)).toBe(JSON.stringify(sent[1].system));
    expect(JSON.stringify(sent[0].system)).toContain('ephemeral');
  });
});

describe('mergeBrief', () => {
  it('replaces a changed answer instead of keeping both', () => {
    expect(mergeBrief([fact('load', '10 kg')], [fact('load', '20 kg')])).toEqual([fact('load', '20 kg')]);
  });
});

describe('option cards', () => {
  const input = { language: 'en', left_out: [], options: [{ robot_id: 'unitree-g1-edu', label: 'Best fit', why: 'Fits.', pros: ['Sold here'], cons: ['Small'], confirm: [] }] };

  it('takes price and sellers from the record, never from the model', () => {
    const { options } = runTool('show_options', { ...input, options: [{ ...input.options[0], price: '1 EUR' }] });
    expect(options?.[0].price).not.toContain('1 EUR');
    expect(options?.[0].sellers.length).toBeGreaterThan(0);
  });

  it('lists a seller once and German sellers first', () => {
    const sellers = runTool('show_options', input).options?.[0].sellers ?? [];
    expect(new Set(sellers.map((seller) => seller.name)).size).toBe(sellers.length);
    expect(sellers[0].country).toBe('DE');
  });

  it('shows real use on a card and no label of doubt on the rest', () => {
    const card = (robot_id: string) => runTool('show_options', { ...input, options: [{ ...input.options[0], robot_id }] }).options?.[0];
    expect(card('magazino-soto')?.proof).toBe('In daily use at a named customer');
    expect(card('robotnik-rb-vogui-plus')?.proof).toBeNull();
  });

  it('never hands the adviser a maker statement labelled as a claim', () => {
    const record = runTool('get_robot', { id: 'robotnik-rb-vogui-plus' }).content;
    expect(record).not.toContain('"claim"');
    expect(record).toContain('made_for');
  });

  it('finds carriers by the load on their back, per type', () => {
    const { robots } = JSON.parse(runTool('search_robots', { type: 'quadruped', min_carry_kg: 40, germany: 'orderable' }).content);
    expect(robots.length).toBeGreaterThan(0);
    expect(robots.every((robot: { carry_kg: number }) => robot.carry_kg >= 40)).toBe(true);
  });

  it('writes prices the German way on German cards', () => {
    const card = runTool('show_options', { ...input, language: 'de', options: [{ ...input.options[0], robot_id: 'robotnik-rb-kairos-plus' }] }).options?.[0];
    expect(card?.price).toBe('ab 35.950 € netto');
  });

  it('puts what people really buy first, and leaves out what cannot be ordered', () => {
    const { robots } = JSON.parse(runTool('search_robots', { type: 'quadruped', limit: 15 }).content);
    expect(robots[0].maker).toBe('Unitree Robotics');
    expect(robots[0].market).toBe('mainstream');
    expect(robots.every((robot: { germany: string }) => !/not|pre/i.test(robot.germany))).toBe(true);
  });

  it('refuses a robot that cannot be ordered, unless the person asked for that one', () => {
    const unavailable = 'construction-robotics-mule-mz100';
    expect(runTool('show_options', { ...input, options: [{ ...input.options[0], robot_id: unavailable }] }).isError).toBe(true);
    expect(runTool('show_options', { ...input, options: [{ ...input.options[0], robot_id: unavailable, person_asked_for_it: true }] }).isError).toBe(false);
  });

  it('leaves out what the owner does not recommend, unless a person asks by name', () => {
    const names = (input: object) => JSON.parse(runTool('search_robots', input).content).robots.map((robot: { id: string }) => robot.id);
    expect(names({ type: 'humanoid', limit: 15, max_price_eur: 100000 })).not.toContain('kepler-k2');
    expect(names({ query: 'Kepler K2' })).toContain('kepler-k2');
    const option = { ...input.options[0], robot_id: 'kepler-k2' };
    expect(runTool('show_options', { ...input, options: [option] }).isError).toBe(true);
    expect(runTool('show_options', { ...input, options: [{ ...option, person_asked_for_it: true }] }).isError).toBe(false);
  });

  it('reads a robot by the path of its page too', () => {
    expect(JSON.parse(runTool('get_robot', { id: 'unitree/b2' }).content).id).toBe('unitree-b2');
  });

  it('refuses invented robot ids', () => {
    expect(runTool('show_options', { ...input, options: [{ ...input.options[0], robot_id: 'made-up-robot' }] }).isError).toBe(true);
  });
});
