import {load} from 'cheerio';

export const VALUE_URL='https://tradingeconomics.com/calendar';
const currencies={IN:'INR',US:'USD',EA:'EUR',GB:'GBP',CN:'CNY',JP:'JPY',CA:'CAD',AU:'AUD',NZ:'NZD'};
export function parseCalendarValues(html,fetchedAt=new Date().toISOString()){
  const $=load(html),zone=$('option[selected][value="0"]').filter((_,e)=>$(e).text().trim()==='UTC');
  if(!zone.length)throw Error('Calendar timezone is not confirmed UTC');
  const items=[];
  $('tr[data-id][data-event]').each((_,row)=>{
    const r=$(row),country=currencies[r.find('.calendar-iso').first().text().trim()];
    if(!country)return;
    const cell=r.children('td').first(),day=(cell.attr('class')||'').match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    const clock=cell.text().trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if(!day)return;
    const title=r.find('.calendar-event').first().text().trim()||r.attr('data-event');
    if(!title)return;
    const value=id=>r.find('[id="'+id+'"]').first().text().replace(/\s+/g,' ').trim();
    const consensus=value('consensus'),model=value('forecast'),level=Number(cell.find('[class*="calendar-date-"]').attr('class')?.match(/calendar-date-(\d)/)?.[1]||1);
    const date=clock?day+'T'+String((+clock[1]%12)+(clock[3].toUpperCase()==='PM'?12:0)).padStart(2,'0')+':'+clock[2]+':00Z':day+'T00:00:00Z';
    items.push({title,date,dateOnly:!clock,country,indicatorId:r.attr('data-id'),reference:r.find('.calendar-reference').first().text().trim(),actual:value('actual'),previous:value('previous'),forecast:consensus||model,forecastKind:consensus?'Consensus':model?'TE model':'',modelForecast:model,impact:level>=3?'High':level===2?'Medium':'Low',impactOrigin:'Trading Economics',source:'Trading Economics public calendar',sources:['Trading Economics public calendar'],valueSource:'Trading Economics public calendar',url:new URL(r.attr('data-url')||'/calendar',VALUE_URL).href,fetchedAt,analysis:['Macro','Broad market · Sector peers','Compare the released figure with expectations and the previous period. A surprise may affect growth, inflation or interest-rate expectations; its market effect depends on the indicator and wider conditions.']});
  });
  if(!items.length)throw Error('No recognised calendar rows; public page format may have changed');
  return items;
}

export function retainCalendarHistory(current,previous=[],now=Date.now()){
  const today=new Date(now+19800000).toISOString().slice(0,10),start=Date.parse(today+'T00:00:00+05:30')-86400000;
  const key=e=>[e.country,e.indicatorId||e.title,e.date].join('|'),map=new Map();
  for(const e of previous)if(Date.parse(e.date)>=start&&Date.parse(e.date)<now)map.set(key(e),{...e,stale:true});
  for(const e of current)if(Date.parse(e.date)>=start&&Date.parse(e.date)<now+180*86400000)map.set(key(e),e);
  return [...map.values()];
}

export async function collectCalendarValues(){
  const r=await fetch(VALUE_URL,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'AsterPersonalReader/1.0','Accept':'text/html'}});
  if(!r.ok)throw Error('Public calendar HTTP '+r.status);
  const fetchedAt=new Date().toISOString(),items=parseCalendarValues(await r.text(),fetchedAt);
  return {items,sources:[{name:'Trading Economics public calendar',url:VALUE_URL,ok:true,fetchedAt,count:items.length}]};
}
