import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ADMIN_COOKIE, isAdmin } from '@/lib/chat/admin';
import { PRIVATE_METADATA } from '@/lib/seo';
import { ui } from '@/lib/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', ...PRIVATE_METADATA };

type Search = Promise<{ failed?: string }>;

function Login({ failed }: { failed: boolean }) {
  return <main className="mx-auto w-full max-w-sm px-4 py-20 sm:px-6">
    <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
    <form method="post" action="/api/admin/login" className="mt-6 grid gap-2">
      <label htmlFor="password" className="text-sm font-medium">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required className={ui.input} />
      {failed ? <p role="alert" className="text-sm text-destructive">That password is not right.</p> : null}
      <button type="submit" className={ui.btn + ' mt-2'}>Log in</button>
    </form>
  </main>;
}

const SECTIONS = [
  { href: '/admin/chats', title: 'Chats', text: 'What visitors asked, what the adviser answered and what each chat cost.' },
  { href: '/admin/graph', title: 'Knowledge graph', text: 'The robots, makers, sellers, jobs and rules the adviser knows, as a map.' },
];

/** The owner's way in. Private: behind a password, out of the sitemap, not indexed. */
export default async function AdminPage({ searchParams }: { searchParams: Search }) {
  const { failed } = await searchParams;
  const store = await cookies();
  if (!isAdmin(store.get(ADMIN_COOKIE)?.value)) return <Login failed={failed === '1'} />;

  return <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
    <div className="flex items-baseline justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      <form method="post" action="/api/admin/logout"><button type="submit" className="text-sm underline underline-offset-4">Log out</button></form>
    </div>
    <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {SECTIONS.map((section) => <Link key={section.href} href={section.href} className="card block p-6 transition hover:bg-subtle">
        <h2 className="font-semibold">{section.title}</h2>
        <p className="mt-2 text-sm text-muted">{section.text}</p>
      </Link>)}
    </div>
  </main>;
}
