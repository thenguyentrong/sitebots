import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import sharp from 'sharp';
import { politeFetch, politeAsset, FetchRefused } from './scrape/_lib/fetch';
import { tokens, scorePath } from './assets/model-matching';
import { manufacturerReview } from '../lib/manufacturers';

// Export first with audit-catalogue. This scan never opens the database or publishes candidates.
const input = process.env.CATALOGUE_SCAN_INPUT;
if (!input) throw Error('Set CATALOGUE_SCAN_INPUT to an audit-catalogue catalogue.json export');
const out = process.env.MEDIA_REVIEW_DIR ?? '.out/missing-media-review';
mkdirSync(out + '/thumbs', { recursive: true });
const rows = JSON.parse(readFileSync(input, 'utf8')).filter((r: any) => r.public && r.variant === 'base' && !r.images && !r.borrowedImages);
const result: Record<string, any> = existsSync(out + '/scan.json') ? JSON.parse(readFileSync(out + '/scan.json', 'utf8')) : {};
const blocked = new Set<string>();
const htmlCache = new Map<string, Promise<any>>();
const host = (url: string) => new URL(url).hostname;
const abs = (value: string, base: string) => { try { const u = new URL(value, base); return /^https?:$/.test(u.protocol) ? u.href : null; } catch { return null; } };
function page(url: string): Promise<any> {
  if (htmlCache.has(url)) return htmlCache.get(url)!;
  const promise = (async () => {
    if (blocked.has(host(url))) return { error: 'Host refused this scan' };
    try { return await politeFetch(url); }
    catch (error) { if (error instanceof FetchRefused && ['robots', 'blocked', 'denied'].includes(error.code)) blocked.add(host(url)); return { error: String(error) }; }
  })();
  htmlCache.set(url, promise); return promise;
}
const groups = new Map<string, any[]>();
for (const r of rows) { const site = manufacturerReview(r.maker_slug)?.website ?? r.website; groups.set(site ?? '', [...(groups.get(site ?? '') ?? []), r]); }
const queue = [...groups];
let checked = Object.keys(result).length;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (queue.length) {
    const [site, robots] = queue.shift()!;
    if (robots.every(r => result[r.key])) continue;
    const home = site ? await page(site) : { error: 'No confirmed official website' };
    const links = new Map<string, string>();
    const addLinks = (body: string, base: string) => { const $ = load(body); $('a[href]').each((_, el) => { const u = abs($(el).attr('href')!, base); if (u && host(u).replace(/^www\./, '') === host(site).replace(/^www\./, '')) links.set(u, $(el).text().trim()); }); };
    if (home.body) {
      addLinks(home.body, home.finalUrl);
      const sitemap = await page(new URL('/sitemap.xml', site).href);
      const locs = (body: string) => [...body.matchAll(/<loc>\s*(?:<!\[CDATA\[)?([^<\s]+?)(?:\]\]>)?\s*<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
      if (sitemap.body) {
        const locations = locs(sitemap.body).filter(u => /^https?:\/\//.test(u));
        if (/<sitemapindex/i.test(sitemap.body)) {
          for (const u of locations.filter(u => /product|page|robot/i.test(u) && !/image|video/i.test(u)).slice(0,4)) { const s = await page(u); if (s.body) for (const x of locs(s.body).filter(u => /^https?:\/\//.test(u))) links.set(x, ''); }
        } else for (const u of locations) links.set(u, '');
      }
      for (const u of [...links].filter(([u,t]) => /\/(products?|robots?)\/?$/.test(new URL(u).pathname) || /^(products?|robots?)$/i.test(t)).slice(0,3).map(([u])=>u)) { const p = await page(u); if (p.body) addLinks(p.body,p.finalUrl); }
    }
    for (const r of robots) {
      const key = r.key; if (result[key]) continue; const entry: any = { name: r.name, website: site || null, checkedAt: new Date().toISOString(), pages: [], images: [], status: 'unresolved' }; result[key] = entry;
      const mt = tokens(r.name).filter((t: string) => !tokens(r.maker).includes(t));
      if (!site || home.error) entry.reason = home.error;
      else {
        const hits = [...links].map(([u,t]) => ({ u, score: scorePath(u,mt,site) + (mt.length && mt.every((x:string)=>tokens(t).includes(x)) ? 2 : 0) })).filter(x => x.score > 0 && !/\.(pdf|zip|mp4)(?:\?|$)/i.test(x.u)).sort((a,b)=>b.score-a.score).slice(0,2);
        for (const source of hits.length ? hits : [{u:site,score:0}]) {
          const p = await page(source.u); if (!p.body) { entry.pages.push({url:source.u,error:p.error}); continue; }
          const $=load(p.body); $('header,footer,nav,[class*="related"],[class*="recommend"]').remove();
          const candidates = new Map<string,string>();
          const add = (raw:string,alt='') => { const u=abs(raw,p.finalUrl); if(!u||/logo|favicon|icon|placeholder|qr.?code|payment|avatar|flag|sprite/i.test(u+' '+alt)||/\.(svg|gif|ico)(?:\?|$)/i.test(u))return; if(source.score===0&&(!mt.length||!mt.every((t:string)=>tokens(decodeURIComponent(u)+' '+alt).includes(t))))return; candidates.set(u,alt); };
          $('meta[property="og:image"]').each((_,e)=>add($(e).attr('content')||''));
          $('img').each((_,e)=>add($(e).attr('data-src')||$(e).attr('data-original')||$(e).attr('src')||'',$(e).attr('alt')||''));
          $('video[poster]').each((_,e)=>add($(e).attr('poster')||''));
          entry.pages.push({url:p.finalUrl,title:$('title').text(),specific:source.score>0,candidates:candidates.size});
          for(const [url,alt] of [...candidates].slice(0,8)) {
            if(blocked.has(host(url))){entry.assetIssue='Image host refused this scan';continue;}
            try {const bytes=await politeAsset(url,12000);const meta=await sharp(bytes).metadata();if(!meta.width||!meta.height||meta.width<300||meta.height<220)continue;const hash=createHash('sha256').update(bytes).digest('hex').slice(0,18);if(entry.images.some((x:any)=>x.hash===hash))continue;const file='thumbs/'+hash+'.jpg';await sharp(bytes).resize(240,170,{fit:'contain',background:'#eee'}).flatten({background:'#eee'}).jpeg({quality:68}).toFile(out+'/'+file);entry.images.push({url,alt,page:p.finalUrl,file,hash,width:meta.width,height:meta.height});}
            catch(error){if(error instanceof FetchRefused&&['robots','blocked','denied'].includes(error.code))blocked.add(host(url));(entry.errors??=[]).push({url,error:String(error)});}
          }
        }
      }
      entry.status=entry.images.length?'review_required':'unresolved';checked++;
      writeFileSync(out+'/scan.json',JSON.stringify(result,null,2));console.log(checked+'/'+rows.length,key,entry.images.length);
    }
  }
}));
console.log('Completed',rows.length,'robots');process.exit();
