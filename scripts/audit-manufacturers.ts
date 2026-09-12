import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { load } from 'cheerio';
import { politeFetch, politeAsset } from './scrape/_lib/fetch';
import sharp from 'sharp';

const OUT = process.env.MANUFACTURER_AUDIT_DIR ?? '.out/manufacturer-audit-20260912';
const inventory = JSON.parse(readFileSync(`${OUT}/inventory.json`, 'utf8')) as {slug:string;name:string;website:string|null;robots:{sourceUrls:string[]}[]}[];
const extraFile=`${OUT}/website-overrides.json`;
const overrides: Record<string,string> = existsSync(extraFile) ? JSON.parse(readFileSync(extraFile,'utf8')) : {};
const only=process.env.MANUFACTURER_ONLY?.split(',');
const evidenceFile=`${OUT}/evidence.json`;
const results: Record<string,unknown> = existsSync(evidenceFile) ? JSON.parse(readFileSync(evidenceFile,'utf8')) : {};
mkdirSync(`${OUT}/logos`,{recursive:true});
function absolute(value:string|undefined,base:string) {try {const url=new URL(value??'',base);return /^https?:$/.test(url.protocol)?url.href:null;}catch{return null;}}
function plain(value:string){return value.replace(/\s+/g,' ').trim();}
async function inspect(m:typeof inventory[number]) {
 const site=overrides[m.slug]??m.website;
 if(!site){results[m.slug]={name:m.name,status:'no_official_website',checkedAt:new Date().toISOString()};return;}
 try {
  const snap=await politeFetch(site); const $=load(snap.body),base=snap.finalUrl;
  const logos:{url?:string;svg?:string;score:number;alt:string}[]=[];
  $('img').each((_,e)=>{const image=$(e),src=absolute(image.attr('src')||image.attr('data-src'),base),alt=image.attr('alt')??'';if(!src)return;const clues=src+' '+alt+' '+(image.attr('class')??'');const inHeader=image.closest('header,nav,[class*=header],[id*=header]').length>0;if(/logo|brand/i.test(clues))logos.push({url:src,score:80+(inHeader?30:0)-(/footer|partner|client/i.test(clues)?30:0),alt});});
  $('link[rel*="icon"]').each((_,e)=>{const link=$(e),url=absolute(link.attr('href'),base);if(url)logos.push({url,score:/apple|180|192|512/.test(link.toString())?60:25,alt:'Official site icon'});});
  $('header a svg,nav a svg,a[aria-label] svg').each((_,e)=>{const svg=$(e),anchor=svg.closest('a'),label=anchor.attr('aria-label')??'';if(!/logo|brand|home/i.test(svg.attr('class')+' '+label)&&!/^\/?$/.test(anchor.attr('href')??'x'))return;const copy=load($.html(e),{xmlMode:true});copy('script,foreignObject,iframe,image').remove();copy('*').each((_,n)=>{for(const a of Object.keys('attribs' in n ? n.attribs : {}))if(/^on/i.test(a))copy(n).removeAttr(a);});copy('svg').attr('xmlns','http://www.w3.org/2000/svg');logos.push({svg:copy.root().html()??'',score:90,alt:label||'Official header logo'});});
  const links=$('a[href]').map((_,e)=>({text:plain($(e).text()).slice(0,140),url:absolute($(e).attr('href'),base)})).get().filter(l=>l.url&&/buy|shop|store|order|purchase|sales|quote|product|robot|demo|contact|about|预订|购买|产品|机器人|联系我们/i.test(l.text+' '+l.url)).slice(0,65);
  $('script,style,noscript,svg').remove();const text=plain($('body').text());
  const snippets=[...text.matchAll(/.{0,90}(?:pre.?order|buy now|request.{0,8}quote|order now|contact sales|commercial|deliver|shipping|purchase|available|announc|pilot|develop|university|research|institute|销售|购买|量产|预订|研发|大学|研究院).{0,180}/gi)].slice(0,18).map(m=>m[0]);
  const candidates=logos.sort((a,b)=>b.score-a.score).filter((l,i,a)=>!l.url||a.findIndex(p=>p.url===l.url)===i).slice(0,5);
  let logo:unknown=null;const logoErrors:string[]=[];
  for (const [index,c] of candidates.entries()) {
   try {const bytes=c.svg?Buffer.from(c.svg):await politeAsset(c.url!,25_000);const meta=await sharp(bytes).metadata();if(!meta.width||!meta.height||meta.width<16||meta.height<12)throw Error('Logo dimensions too small');const file=`${m.slug}.png`;await sharp(bytes).trim({threshold:12}).resize({width:300,height:120,fit:'inside',withoutEnlargement:false}).png().toFile(`${OUT}/logos/${file}`);logo={url:c.url??base,sourceUrl:base,file:`logos/${file}`,width:meta.width,height:meta.height,alt:c.alt,candidate:index};break;}catch(e){logoErrors.push(String(e).slice(0,200));}
  }
  results[m.slug]={name:m.name,website:site,finalUrl:base,status:'fetched',title:plain($('title').text()),description:$('meta[name="description"]').attr('content')??null,snippets,text:text.slice(0,14000),links,logo,logoErrors,checkedAt:new Date().toISOString(),sourceFetchedAt:snap.fetchedAt};
 }catch(e){results[m.slug]={name:m.name,website:site,status:'unverified',error:String(e),checkedAt:new Date().toISOString()};}
 console.log(m.slug,JSON.stringify({status:(results[m.slug] as any).status,logo:!!(results[m.slug] as any).logo}));
}
async function main(){let index=0;const makers=inventory.filter(m=>!only||only.includes(m.slug));async function worker(){while(index<makers.length){const maker=makers[index++];if(!only&&results[maker.slug])continue;await inspect(maker);writeFileSync(evidenceFile,JSON.stringify(results,null,2));}}await Promise.all(Array.from({length:8},worker));console.log('COMPLETE',Object.keys(results).length);}
main().catch(e=>{console.error(e);process.exit(1)});
