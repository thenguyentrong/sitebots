import Link from 'next/link';
import type { ReactNode } from 'react';
import { ui } from '@/lib/ui';

// The model writes a small subset of markdown (see lib/chat/system.ts). Rendering it here as React
// nodes, never as HTML, means an answer can only ever produce these elements, and links can only
// point inside the site or to https pages.
const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push(text.slice(last, index));
    const [whole, bold, label, link] = match;
    // The model sometimes writes this site's own links in full. They are still inside the site.
    const href = link?.replace(/^https:\/\/(www\.)?sitebots\.de(?=\/)/, '');
    if (bold) out.push(<strong key={index} className="font-semibold">{bold}</strong>);
    else if (href.startsWith('/') && !href.startsWith('//')) out.push(<Link key={index} href={href} className={ui.link}>{label}</Link>);
    else if (href.startsWith('https://')) out.push(<a key={index} href={href} target="_blank" rel="noopener noreferrer nofollow" className={ui.link}>{label}</a>);
    else out.push(label ?? whole);
    last = index + whole.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MessageText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <div className="space-y-3 text-[15px] leading-relaxed">
    {blocks.map((block, index) => {
      const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return <ul key={index} className="list-disc space-y-1.5 pl-5">{lines.map((line, row) => <li key={row}>{inline(line.replace(/^[-*]\s+/, ''))}</li>)}</ul>;
      }
      if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
        return <ol key={index} className="list-decimal space-y-1.5 pl-5">{lines.map((line, row) => <li key={row}>{inline(line.replace(/^\d+[.)]\s+/, ''))}</li>)}</ol>;
      }
      return <p key={index}>{inline(lines.join(' '))}</p>;
    })}
  </div>;
}
