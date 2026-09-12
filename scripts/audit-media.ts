import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import sharp from 'sharp';
import {politeAsset} from './scrape/_lib/fetch';
async function main(){const dir=process.env.CATALOGUE_AUDIT_DIR??'.out/catalogue-scan-20260912';mkdirSync(dir,{recursive:true});
 const assets=JSON.parse(readFileSync(join(dir,'assets.json'),'utf8')) as {url:string;kind:string;robot_id:string}[];
 const queue=[...new Set(assets.filter(a=>['image','hero'].includes(a.kind)).map(a=>a.url))];
 const results:unknown[]=[];
 await Promise.all(Array.from({length:6},async()=>{while(queue.length){const url=queue.shift()!;try{const data=url.startsWith('/')?readFileSync(join('public',url)):await politeAsset(url,30000);const m=await sharp(data).metadata();results.push({url,status:'ok',width:m.width,height:m.height,bytes:data.length});}catch(e){results.push({url,status:'unavailable',reason:String(e)});}writeFileSync(join(dir,'media-health.json'),JSON.stringify(results,null,2));console.log(`${results.length} ${url.slice(0,90)}`);}}));
 console.log('Complete',results.length);
}
main().catch(e=>{console.error(e);process.exitCode=1});
