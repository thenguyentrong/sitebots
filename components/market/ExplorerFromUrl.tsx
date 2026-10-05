'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MarketExplorer, type ExplorerInitial } from './MarketExplorer';

type Props = Omit<Parameters<typeof MarketExplorer>[0], 'initial'>;

/** The explorer's state as MarketExplorer writes it into the address (usecase, robot, where, ...). */
function fromParams(params: URLSearchParams): ExplorerInitial {
  const one = (name: string) => params.get(name) ?? '';
  return {
    layout: one('layout'), x: one('x'), y: one('y'), robot: one('robot') as never, where: one('where'), condition: one('conditions'),
    cluster: one('work'), query: one('search'), withRobots: one('robots') === '1', selected: one('usecase'), view: one('view'),
  };
}

function WithParams(props: Props) {
  const params = useSearchParams();
  // Read once: the explorer rewrites the address as the visitor works, and remounting on every
  // change would throw away what they did.
  const [initial] = useState(() => fromParams(params));
  return <MarketExplorer {...props} initial={initial} />;
}

/**
 * The landing is built once per deploy and served from the CDN, so the server never sees the
 * address. Shared links (`/?usecase=…#explore`) are read here, in the browser. The fallback is the
 * explorer on its defaults, which is also what the built page carries.
 */
export function ExplorerFromUrl(props: Props) {
  return <Suspense fallback={<MarketExplorer {...props} />}><WithParams {...props} /></Suspense>;
}
