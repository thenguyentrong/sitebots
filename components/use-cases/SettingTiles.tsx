import { localePath, type Lang } from '@/lib/i18n/config';
import { formatNumber } from '@/lib/i18n/format';
import { requestLang } from '@/lib/i18n/server';
import { TILE_TEXT } from '@/lib/i18n/use-cases';
import type { SettingTile } from '@/lib/market/use-case-views';
import { settingText } from '@/lib/market/use-cases';
import { CountryFlag } from './parts';

// The settings as picture tiles: the biggest is a large square, the next a wide tile, the rest fill the rows,
// and the last tiles widen so no row is left with a hole.
function spans(n: number): string[] {
  const out: string[] = Array.from({ length: n }, (_, i) => i === 0 ? 'col-span-2 md:row-span-2' : i === 1 ? 'col-span-2' : '');
  const rest = (n + 4) % 4; // cells used: 4 + 2 + (n - 2)
  if (n > 2 && rest === 2) { out[n - 1] = 'md:col-span-2'; out[n - 2] = 'md:col-span-2'; }
  if (n > 2 && rest === 3) out[n - 1] = 'col-span-2';
  if (n > 2 && rest === 1) out[n - 1] = 'col-span-2 md:col-span-4';
  return out;
}

/** `base` is the page the tiles jump into: this page by default, the use-case page from elsewhere. It is written
 * as the English path; the tiles are plain links, so the language prefix is added here. */
export function SettingTiles({ tiles, base = '', lang = requestLang() }: { tiles: SettingTile[]; base?: string; lang?: Lang }) {
  const span = spans(tiles.length);
  const t = TILE_TEXT[lang];
  return <div className="grid auto-rows-[200px] grid-cols-2 gap-3 md:auto-rows-[210px] md:grid-cols-4">
    {tiles.map((tile, i) => { const words = settingText(tile.id, lang); return <a key={tile.id} href={localePath(base + '#' + tile.id, lang)} className={'group relative overflow-hidden rounded-2xl bg-subtle ' + span[i]}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {tile.picture ? <img src={tile.picture.src} alt="" loading={i < 4 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover object-[50%_30%] transition duration-700 group-hover:scale-[1.04]" /> : null}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/0" />
      <span className={'absolute right-3 top-3 items-center gap-1 rounded-full bg-black/45 px-2 py-1.5 ' + (i < 2 ? 'flex' : 'hidden md:flex')}>{tile.countries.slice(0, i === 0 ? 6 : 4).map((code) => <CountryFlag key={code} code={code} className="ring-white/30" />)}{tile.countries.length > (i === 0 ? 6 : 4) ? <span className="num pl-0.5 text-[10px] font-medium text-white">+{tile.countries.length - (i === 0 ? 6 : 4)}</span> : null}</span>
      <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4 text-white">
        <span className="flex items-baseline gap-1.5">
          <span className={'num font-semibold leading-none tracking-tight ' + (i === 0 ? 'text-6xl' : 'text-3xl md:text-4xl')}>{formatNumber(tile.count, lang)}</span>
          <span className="text-sm font-medium text-white/85">{t.uses(tile.count)}</span>
        </span>
        <span className={'block font-semibold leading-snug ' + (i === 0 ? 'text-2xl' : 'text-sm md:text-base')}>{words.label}</span>
        <span className="block text-xs text-white/80">{t.facts(formatNumber(tile.stages.deployment, lang), tile.robots, tile.countries.length)}</span>
        {i === 0 ? <span className="mt-1 hidden max-w-md text-sm text-white/80 md:block">{words.intro}</span> : null}
      </span>
    </a>; })}
  </div>;
}
