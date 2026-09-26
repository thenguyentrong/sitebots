import type { ReactNode } from 'react';
import { Steps } from '@/components/journey/Steps';
import './plan.css';
import './journey.css';

/** The Decide pages: the three steps as one row under the header, then the page on the same column. Personal state; nothing here is indexed. */
export default function PlanLayout({ children }: { children: ReactNode }) {
  return (
    <main className="jp-page plan-page">
      <Steps />
      {children}
    </main>
  );
}
