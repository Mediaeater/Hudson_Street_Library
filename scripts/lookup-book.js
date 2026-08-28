#!/usr/bin/env node
// Search-free book lookup. Hits indexes that answer a plain HTTP GET, so it costs
// ZERO WebSearch calls — the 200/session cap is what has stalled every wave so far.
//   usage: node plans/stub-fill/lookup.js "Mizutani Hanon"
//          node plans/stub-fill/lookup.js --isbn 9784865872941
// Rungs, in order of yield for art/photo books:
//   1. AbeBooks keyword search — emits schema.org JSON-LD (name, isbn13, publisher,
//      author, format, cover image). Best single source for anything with an ISBN.
//   2. Shopify shops — /search/suggest.json returns clean JSON incl. vendor (= publisher).
//      Verified Shopify: photobookstore.co.uk (broad retail index), mackbooks.co.uk,
//      twelve-books.com, loosejoints.biz, setantabooks.com, deadbeatclub.com, tbwbooks.com.
//   3. OpenLibrary search.json — weak on small-press art books, fine for trade titles.
// NEVER carry price/offer data out of these responses into a record (AbeBooks JSON-LD
// includes `offers.price`; the house rule is no money language in any public field).
const UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const SHOPS=['www.photobookstore.co.uk','mackbooks.co.uk','twelve-books.com','loosejoints.biz','www.setantabooks.com','deadbeatclub.com','tbwbooks.com'];
const args=process.argv.slice(2);
const isbnMode=args[0]==='--isbn';
const q=(isbnMode?args.slice(1):args).join(' ').trim();
if(!q){console.error('usage: lookup.js "author title" | lookup.js --isbn 9784865872941');process.exit(1);}
const get=async(url,json)=>{try{
  const r=await fetch(url,{headers:{'User-Agent':UA,'Accept':json?'application/json':'text/html'},signal:AbortSignal.timeout(25000)});
  if(!r.ok)return {err:`HTTP ${r.status}`};
  return json?{data:await r.json()}:{data:await r.text()};
}catch(e){return {err:e.name==='TimeoutError'?'timeout':e.message};}};

async function abebooks(){
  const url=isbnMode?`https://www.abebooks.com/servlet/SearchResults?isbn=${encodeURIComponent(q)}`
                    :`https://www.abebooks.com/servlet/SearchResults?kn=${encodeURIComponent(q)}`;
  const {data,err}=await get(url);
  if(err)return console.log(`  abebooks: ${err}`);
  const m=data.match(/\{"@context":"https:\/\/schema\.org","@type":"ItemList".*?\}\]\}/s);
  if(!m)return console.log('  abebooks: no JSON-LD (no matches, or layout changed)');
  let d;try{d=JSON.parse(m[0]);}catch(e){return console.log('  abebooks: JSON-LD parse failed');}
  const seen=new Set();
  console.log(`  abebooks: ${d.numberOfItems} record(s)`);
  for(const e of (d.itemListElement||[]).slice(0,8)){
    const b=e.item||{};const key=b.name+'|'+b.isbn;if(seen.has(key))continue;seen.add(key);
    console.log(`   - ${b.name}`);
    console.log(`     isbn ${b.isbn||'—'} | ${(b.publisher||{}).name||'—'} | ${(b.author||{}).name||'—'} | ${String(b.bookFormat||'').split('/').pop()||'—'}`);
    if(b.image)console.log(`     cover ${b.image}`);
  }
}
async function shops(){
  for(const h of SHOPS){
    const u=`https://${h}/search/suggest.json?q=${encodeURIComponent(q)}&resources%5Btype%5D=product&resources%5Blimit%5D=3`;
    const {data,err}=await get(u,true);
    if(err||!data)continue;
    const ps=((data.resources||{}).results||{}).products||[];
    for(const p of ps)console.log(`  ${h.padEnd(26)} ${String(p.title).slice(0,58).padEnd(60)} | ${p.vendor||'—'}\n${' '.repeat(29)}https://${h}${String(p.url).split('?')[0]}`);
  }
}
async function openlib(){
  const u=isbnMode?`https://openlibrary.org/search.json?isbn=${encodeURIComponent(q)}&limit=3&fields=title,author_name,publisher,first_publish_year,isbn`
                  :`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3&fields=title,author_name,publisher,first_publish_year,isbn`;
  const {data,err}=await get(u,true);
  if(err||!data)return console.log(`  openlibrary: ${err||'no data'}`);
  if(!data.numFound)return console.log('  openlibrary: 0 hits');
  console.log(`  openlibrary: ${data.numFound} hit(s)`);
  for(const d of (data.docs||[]).slice(0,3))
    console.log(`   - ${d.title} | ${(d.author_name||[])[0]||'—'} | ${(d.publisher||[])[0]||'—'} | ${d.first_publish_year||'—'}`);
}
(async()=>{
  console.log(`\n"${q}"${isbnMode?' (isbn)':''}\n${'-'.repeat(70)}`);
  await abebooks();await shops();await openlib();
  console.log('');
})();
