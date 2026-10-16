import test from 'node:test';
import assert from 'node:assert/strict';
import {wallTimeISO,parseICS,parseBSE,parseNSE,mergeCompanies,mergeMacro,sourceFeed} from '../worker/index.js';

test('US official calendar handles DST, UTC, folded titles and unknown local times',()=>{
 assert.equal(wallTimeISO('20261030T083000','US-Eastern'),'2026-10-30T12:30:00.000Z');
 assert.equal(wallTimeISO('20261106T083000','US-Eastern'),'2026-11-06T13:30:00.000Z');
 assert.equal(wallTimeISO('20261030T123000Z'),'2026-10-30T12:30:00.000Z');
 assert.equal(wallTimeISO('20261030T083000'),null);
 const rows=parseICS('BEGIN:VEVENT\r\nDTSTART;TZID=US-Eastern:20261106T083000\r\nSUMMARY:Employment Situa\r\n tion\\, monthly\r\nEND:VEVENT','https://www.bls.gov/schedule/');
 assert.equal(rows[0].title,'Employment Situation, monthly');assert.equal(rows[0].impact,'High');assert.equal(rows[0].date,'2026-11-06T13:30:00.000Z');
});
test('BSE and NSE results combine without losing aliases or date-only semantics',()=>{
 const b=parseBSE([{Long_Name:'Example Ltd',short_name:'EXAMPLE',scrip_Code:'500001',meeting_date:'16 Oct 2026',URL:'javascript:alert(1)'}]);
 const n=parseNSE([{sm_name:'Example Limited',bm_symbol:'EXAMPLE',bm_date:'16-Oct-2026',bm_purpose:'Financial Results',bm_desc:'To consider unaudited financial results',attachment:'https://nsearchives.nseindia.com/test.pdf'}]);
 const rows=mergeCompanies([...b.map(x=>({...x,source:'BSE',fetchedAt:'2026-10-16T00:00:00Z'})),...n.map(x=>({...x,source:'NSE',fetchedAt:'2026-10-16T00:00:00Z'}))]);
 assert.equal(rows.length,1);assert.equal(rows[0].sources.length,2);assert.ok(rows[0].aliases.includes('500001'));assert.equal(rows[0].dateOnly,true);assert.equal(rows[0].date,'2026-10-16T00:00:00+05:30');assert.ok(!b[0].url.startsWith('javascript:'));
 const actions=parseNSE([{comp:'Example Limited',symbol:'EXAMPLE',exDate:'16-Oct-2026',recDate:'17-Oct-2026',subject:'Interim Dividend - Rs 5 Per Share'}],true);
 assert.equal(actions[0].type,'Dividend');assert.match(actions[0].description,/record date 2026-10-17/);
 assert.equal(mergeCompanies([...rows,...actions.map(x=>({...x,source:'NSE'}))]).length,2);
});
test('official GDP date merges consensus while core CPI remains distinct',()=>{
 let rows=mergeMacro([{title:'Gross Domestic Product',date:'2026-10-29T12:30:00Z',country:'USD',source:'BEA',forecast:'',previous:'',impact:'High'},{title:'Advance GDP q/q',date:'2026-10-29T12:30:00Z',country:'USD',source:'Forex Factory / Fair Economy',forecast:'2%',previous:'1%',impact:'High',impactOrigin:'Provider rating'},{title:'Core CPI m/m',date:'2026-10-29T12:30:00Z',country:'USD',source:'FF'},{title:'CPI m/m',date:'2026-10-29T12:30:00Z',country:'USD',source:'FF'}]);assert.equal(rows.length,3);assert.equal(rows[0].forecast,'2%');assert.deepEqual(rows[0].sources,['BEA','Forex Factory / Fair Economy']);
});
test('a failed provider returns last good data with its original timestamp and stale label',async()=>{
 const first=await sourceFeed('test-outage','Test','https://example.com',async()=>[{title:'Known event'}],-1);
 const fallback=await sourceFeed('test-outage','Test','https://example.com',async()=>{throw Error('HTTP 429')});
 assert.equal(fallback.ok,true);assert.equal(fallback.stale,true);assert.equal(fallback.fetchedAt,first.fetchedAt);assert.equal(fallback.items[0].stale,true);assert.equal(fallback.error,'HTTP 429');
});
test('official calendars work when the weekly provider fails, and edge cache survives a new Worker instance',async()=>{
 const realFetch=globalThis.fetch,realCaches=globalThis.caches;const store=new Map();globalThis.caches={default:{match:async k=>store.get(k.url)?.clone(),put:async(k,v)=>store.set(k.url,v.clone())}};
 const date=new Date(Date.now()+3*86400000).toISOString(),raw=date.replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
 globalThis.fetch=async url=>{if(String(url).includes('faireconomy'))return new Response('',{status:429});if(String(url).includes('bls.gov'))return new Response('BEGIN:VEVENT\nDTSTART:'+raw+'\nSUMMARY:Employment Situation\nEND:VEVENT');if(String(url).includes('bea.gov'))return Response.json({'Gross Domestic Product':{release_dates:[date]}});if(String(url).includes('mospi'))return Response.json({data:[],pagination:{totalPages:1}});throw Error('Unexpected request')};
 try{const w=(await import('../worker/index.js?independent-fallback')).default;let data=await (await w.fetch(new Request('https://test/api/calendar'))).json();assert.equal(data.ok,true);assert.equal(data.items.length,2);assert.equal(data.sources.find(x=>x.name.includes('Forex')).ok,false);assert.ok(data.items.some(x=>x.title==='Gross Domestic Product'));
 for(const [k,v] of store){let d=await v.clone().json();d.retryAt=0;store.set(k,Response.json(d))}globalThis.fetch=async()=>{throw Error('Network down')};const fresh=(await import('../worker/index.js?cold-start')).default;let cached=await (await fresh.fetch(new Request('https://test/api/calendar'))).json();assert.equal(cached.ok,true);assert.equal(cached.items.length,2);assert.ok(cached.items.every(x=>x.stale));
 }finally{globalThis.fetch=realFetch;globalThis.caches=realCaches}
});
