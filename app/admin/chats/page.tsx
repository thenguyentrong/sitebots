import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isAdmin } from '@/lib/chat/admin';
import { LIMITS } from '@/lib/chat/config';
import { chatOverview, messageRows, readChat } from '@/lib/chat/store';
import { PRIVATE_METADATA } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Chats', ...PRIVATE_METADATA };

type Search = Promise<{ id?: string }>;

const when = (iso: string) => iso.slice(0, 16).replace('T', ' ');
const money = (usd: number) => '$' + usd.toFixed(usd < 1 ? 3 : 2);

/** The owner's view of what visitors ask. Private: behind a password, out of the sitemap, not indexed. */
export default async function ChatsPage({ searchParams }: { searchParams: Search }) {
  const { id } = await searchParams;
  const store = await cookies();
  if (!isAdmin(store.get(ADMIN_COOKIE)?.value)) redirect('/admin');

  const [overview, chat] = await Promise.all([chatOverview(LIMITS.chatsOnAdminPage), id ? readChat(id) : Promise.resolve(null)]);
  const conversations = overview.rows;
  const messages = id ? (chat ? messageRows(chat) : []) : null;
  const shown = overview.total > conversations.length ? 'the newest ' + conversations.length + ' of ' + overview.total + ' chats' : conversations.length + ' chats';

  return <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
    <div className="flex items-baseline justify-between gap-4"><h1 className="text-3xl font-semibold tracking-tight">Chats</h1><Link href="/admin" className="text-sm underline underline-offset-4">Admin</Link></div>
    <p className="mt-3 text-muted">
      {overview.questions} questions in {shown}. This month: {money(overview.monthCostUsd)} of the $50 limit, as counted here. The Claude Console shows the exact figure.
    </p>

    <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="card overflow-hidden" aria-label="Conversations">
        {conversations.length ? <ul>
          {conversations.map((row) => <li key={row.id} className="border-b border-edge/60 last:border-b-0">
            <Link href={'/admin/chats?id=' + row.id} aria-current={row.id === id ? 'true' : undefined} className={'block px-4 py-3 transition hover:bg-subtle' + (row.id === id ? ' bg-subtle' : '')}>
              <span className="block truncate text-sm font-medium">{row.title || 'Untitled'}</span>
              <span className="num mt-1 block text-xs text-muted">{when(row.lastAt)}, {row.messages} messages, {money(row.costUsd)}</span>
            </Link>
          </li>)}
        </ul> : <p className="p-6 text-sm text-muted">No chats yet. They appear here as soon as someone asks a question.</p>}
      </section>

      <section aria-label="Messages" className="space-y-4">
        {messages === null ? <p className="card p-6 text-sm text-muted">Pick a chat to read it.</p> : null}
        {messages?.length === 0 ? <p className="card p-6 text-sm text-muted">This chat has no messages.</p> : null}
        {messages?.map((message) => <article key={message.id} className="card p-4">
          <header className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span className="font-medium text-foreground">{message.role === 'user' ? 'Visitor' : 'Adviser'}</span>
            <span className="num">{when(message.createdAt)}{message.costUsd ? ', ' + money(message.costUsd) : ''}</span>
          </header>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          {message.robots.length ? <p className="mt-2 text-xs text-muted">Robots shown: {message.robots.join(', ')}</p> : null}
          {message.trace.length ? <p className="mt-1 text-xs text-faint">Looked up: {message.trace.join('; ')}</p> : null}
        </article>)}
      </section>
    </div>
  </main>;
}
