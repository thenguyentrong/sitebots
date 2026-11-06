import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { GraphExplorer } from '@/components/graph/GraphExplorer';
import { ADMIN_COOKIE, isAdmin } from '@/lib/chat/admin';
import { loadGraph } from '@/lib/graph';
import { graphView } from '@/lib/graph/view';
import { PRIVATE_METADATA } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Knowledge graph', ...PRIVATE_METADATA };

/** The owner's map of what the adviser knows. Visitors never see it: on the live site it sits behind the
 *  chat password, and on the owner's own machine it just opens. */
export default async function GraphPage() {
  const store = await cookies();
  if (process.env.NODE_ENV === 'production' && !isAdmin(store.get(ADMIN_COOKIE)?.value)) redirect('/admin/chats');
  return <GraphExplorer view={graphView(loadGraph())} />;
}
