import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {politeFetch,politeAsset} from './scrape/_lib/fetch';
import {loadSolutionReviews} from '../lib/solutions/load';
import {REVIEW_IMAGES} from '../lib/discovery/media';

// This research loop stages observations only. A successful HTTP response never verifies a specification.
async function main(){
 const args=process.argv.slice(2), imageMode=args.includes('--images');
 const number=(key:string,fallback:number)=>{const i=args.indexOf(key);const n=i<0?fallback:Number(args[i+1]);if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid '+key);return n;};
 const limit=number('--limit',30),offset=number('--offset',0);
 const output='.out/research-coverage';mkdirSync(output,{recursive:true});
 const path=output+(imageMode?'/image-health.json':'/source-observations.json');
 const observations:Record<string,unknown>=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{};
 const sourceURLs=[...new Set(loadSolutionReviews().flatMap(review=>review.sourceURLs))].sort();
 const urls=imageMode?[...new Set(Object.values(REVIEW_IMAGES).map(photo=>photo.url))]:sourceURLs;
 const queue=urls.filter(url=>args.includes('--fresh')||!observations[url]).slice(offset,offset+limit);
 console.log(JSON.stringify({mode:imageMode?'images':'sources',total:urls.length,queued:queue.length,previouslyObserved:Object.keys(observations).length}));
 await Promise.all(Array.from({length:3},async()=>{while(queue.length){const url=queue.shift()!;try{
   if(imageMode){const data=await politeAsset(url,20000);const sharp=(await import('sharp')).default;const metadata=await sharp(data).metadata();observations[url]={status:'ok',checkedAt:new Date().toISOString(),width:metadata.width,height:metadata.height,format:metadata.format,sha256:createHash('sha256').update(data).digest('hex')};}
   else {const snap=await politeFetch(url);const $=load(snap.body);observations[url]={status:'retrieved',checkedAt:new Date().toISOString(),fetchedAt:snap.fetchedAt,fromCache:snap.fromCache,finalUrl:snap.finalUrl,redirected:snap.finalUrl!==url,contentType:snap.contentType,sha256:snap.sha256,title:$('title').text().slice(0,300),imageCandidates:$('img').toArray().map(e=>({url:$(e).attr('src'),alt:$(e).attr('alt')})).filter(image=>image.url&&!/logo|icon|flag/i.test(image.url+' '+image.alt)).slice(0,16),note:'Staged source observation; exact model, fields and image identity require review.'};}
 }catch(error){observations[url]={status:'unavailable',checkedAt:new Date().toISOString(),reason:String(error)};}
 writeFileSync(path,JSON.stringify(observations,null,2)+'\n');console.log((observations[url] as {status:string}).status+' '+url.slice(0,100));}}));
 console.log(JSON.stringify({observed:Object.keys(observations).length,remaining:urls.filter(url=>!observations[url]).length}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
