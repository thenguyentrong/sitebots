// Web search for research runs whose search tool budget is used up: reads DuckDuckGo's plain HTML
// results page and prints title, address and snippet of each hit.
//
//   node --import tsx scripts/research/search.ts "<query>" [count]
const [query, count = '10'] = process.argv.slice(2);
const strip = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

async function main() {
  const response = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {
    headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36', 'accept-language': 'de-DE,de;q=0.9,en;q=0.8' },
    signal: AbortSignal.timeout(30_000),
  });
  const html = await response.text();
  const results = [];
  for (const block of html.split('result__body').slice(1)) {
    const link = /class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!link) continue;
    const target = /uddg=([^&]+)/.exec(link[1]);
    const snippet = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    results.push({ title: strip(link[2]), url: target ? decodeURIComponent(target[1]) : link[1], snippet: snippet ? strip(snippet[1]) : '' });
    if (results.length >= Number(count)) break;
  }
  console.log(results.length ? JSON.stringify(results, null, 1) : 'No results (status ' + response.status + ')');
}

main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
