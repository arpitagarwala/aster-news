import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCalendarValues,retainCalendarHistory} from '../scripts/calendar-values.mjs';
import {mergeMacro} from '../worker/index.js';

const fixture=`<select><option selected="selected" value="0">UTC</option></select><table><tr data-id="123" data-event="industrial production" data-url="/india/industrial-production"><td class="2026-10-15"><span class="event-0 calendar-date-3">08:00 PM</span></td><td><table><tr><td class="calendar-iso">IN</td></tr></table></td><td><a class="calendar-event">Industrial Production YoY</a><span class="calendar-reference">SEP</span></td><td><span id="actual">0%</span></td><td><span id="previous">2.1%</span></td><td><a id="consensus">2.4%</a></td><td><a id="forecast">2.8%</a></td></tr></table>`;
test('public calendar parses nested rows, zero actuals, UTC crossing IST midnight and consensus separately from model',()=>{
  const [e]=parseCalendarValues(fixture,'2026-10-16T01:00:00Z');
  assert.equal(e.date,'2026-10-15T20:00:00Z');
  assert.equal(new Date(Date.parse(e.date)+19800000).toISOString().slice(0,10),'2026-10-16');
  assert.equal(e.actual,'0%');assert.equal(e.previous,'2.1%');assert.equal(e.forecast,'2.4%');assert.equal(e.forecastKind,'Consensus');assert.equal(e.modelForecast,'2.8%');assert.equal(e.impact,'High');
  assert.throws(()=>parseCalendarValues(fixture.replace('>UTC<','>Local<')),/timezone/);
});
test('calendar retains yesterday across refreshes, removes older days and prefers current revised values',()=>{
  const now=Date.parse('2026-10-16T06:00:00Z'),base={country:'INR',title:'Release',date:'2026-10-15T00:00:00+05:30',actual:'1'};
  const rows=retainCalendarHistory([{...base,actual:'2'}],[base,{...base,date:'2026-10-14T00:00:00+05:30'}],now);
  assert.equal(rows.length,1);assert.equal(rows[0].actual,'2');
  assert.equal(retainCalendarHistory([],[base],now)[0].stale,true);
});
test('different measured series retain independent values on a shared release date',()=>{
  const base={country:'INR',title:'GDP Growth',date:'2026-11-30T12:00:00Z',source:'Trading Economics public calendar'};
  assert.equal(mergeMacro([{...base,indicatorId:'1',actual:'5%'},{...base,indicatorId:'2',actual:'2%'}]).length,2);
});
