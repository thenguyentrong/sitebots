import Link from 'next/link';
import { CompareRemove } from '@/components/compare/CompareControls';
import { FactValues } from '@/components/compare/FactValues';
import { visibleRows } from '@/lib/compare/facts';
import type { CompareColumn } from '@/lib/queries/compare';

/**
 * Robots as columns, facts as rows, one fixed order for every robot type. The table states what was
 * published and with which conditions. It marks no best value and draws no conclusion: the reader
 * decides. The label column stays put while the robots scroll sideways inside their own box.
 */
export function CompareTable({ columns }: { columns: CompareColumn[] }) {
  const rows = visibleRows(columns);
  const items = columns.map(({ id, name }) => ({ id, name }));
  return (
    <div className="card overflow-x-auto" data-compare-table>
      <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: 112 + columns.length * 168 }}>
        <thead>
          <tr className="border-b border-edge align-top">
            <th scope="col" className="sticky left-0 z-10 w-28 bg-card px-3 py-3 text-left font-normal sm:w-44 sm:px-5 sm:py-4"><span className="sr-only">Fact</span></th>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="px-3 py-3 text-left font-normal sm:px-4 sm:py-4">
                <Link href={column.href} className="group block">
                  {/* The picture box stays light in both themes, like the product photos on the robot cards. */}
                  <span className="block h-24 overflow-hidden rounded-xl bg-[#f4f4f5] p-2">
                    {column.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a local market picture or a remote catalogue picture
                      <img src={column.picture.src} alt={column.picture.alt} referrerPolicy="no-referrer" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                    ) : <span className="grid h-full place-items-center text-xs text-[#52525b]">No picture published</span>}
                  </span>
                  <span className="mt-2 block text-xs text-muted">{column.maker}</span>
                  <span className="block text-base font-semibold leading-tight tracking-tight underline-offset-4 group-hover:underline">{column.name}</span>
                </Link>
                <CompareRemove id={column.id} name={column.name} items={items} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-edge/60 align-top" data-fact={row.key}>
              <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-xs font-normal leading-snug text-muted sm:px-5 sm:text-sm">{row.label}</th>
              {columns.map((column) => <td key={column.id} className="px-3 py-2.5 sm:px-4"><FactValues values={column.facts[row.key]} /></td>)}
            </tr>
          ))}
          <tr className="border-t border-edge/60 align-top">
            <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2.5 text-left text-xs font-normal leading-snug text-muted sm:px-5 sm:text-sm">Sources</th>
            {columns.map((column) => <td key={column.id} className="px-3 py-2.5 text-xs sm:px-4"><Link href={column.href + '#sources'} className="text-muted underline underline-offset-2 hover:text-foreground">All sources on the robot page</Link></td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
