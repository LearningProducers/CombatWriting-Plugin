// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// render-board.js: writes board.html for a run, a single self-contained page. The board is
// the result (2026-10-14): after every sparring and battle round the host opens it in the
// person's browser (open-board.js), a local file, never published.
//
//   node render-board.js --run <run folder>
//
// The page, top to bottom: the motto; the round strip (ruled 2026-10-15: the latest round's
// prompt is visible at the top with nothing opened, from lib.roundTask, with whether a rating
// was asked and how many seats answered); the newest draft, in full; the verdict box, only when
// the run holds a number (ruled 2026-10-15): SEND or BACK TO THE DRAWING BOARD from every
// seat's own latest rating and nothing averaged (every seat 8 or more sends; any seat 6 or
// less sends it back, and the band names that seat), or FINAL READS over each seat's S/N and
// red-flag numbers when the run holds final reads and no rating, and no box at all otherwise;
// then one framed quote per seat, the seat's one-line verdict in bold, cited to the model by
// name and company (and the provider that served an outside seat) with the round it came
// from, and the seat's own note when that seat was asked something different (a seat line),
// the seat's rating or its state (critique, failed read, missing) on the frame, a read-aloud
// control on every read frame (issue 82, 2026-10-26: the browser's own speech synthesis with
// pause and stop, the answer spoken as plain text with its markdown marks dropped, one seat at
// a time, none on a missing or failed read), and the full read folded under a click; then,
// folded, the scoreboard of every round (one row per seat,
// one column per round, every rating on its own, flips marked valid or invalid with the
// earlier number kept, Stand, missing, not asked, failed reads, truncated reads) with the
// round history under it (every round's task in one line), the final reads when a final
// round exists, and the run details (the crew line, the Seats line when the crew is short,
// the seat key, the drafts, the brief, where the run started, a link to record.md). Light and dark
// follow the system setting, with a toggle. No external request of any kind: no script,
// style, font or image is fetched. Nothing is averaged. Every seat's words are escaped: an
// answer is text, never markup; a small markdown subset (lists, bold, italic, code) is then
// rendered, no link among it (lib.renderLite). The measure (2026-10-15): the page is 1360 px
// wide, the cards sit three abreast at 45 to 50 characters a line on a laptop and two on a
// tablet, an opened read spans the row at 70 characters, the draft panel is 76 characters,
// and long words and addresses wrap. Rebuilt after every round from the files and log.jsonl.
//
// Champion (ruled 2026-10-19): when the run holds a champion.shipped line, a Shipped strip sits
// under the round strip (the Shipped line, the address as text with its scheme cut, never a
// link, and the counts of results and insights); the draft heading says whether the newest
// draft is the canon or a revision after it; the draft panel gets three client-side controls on
// the canon, like a canon piece in the Combat Writing app: read aloud (the browser's own speech
// synthesis, with pause and stop), copy (the clipboard, the canon text exactly) and download (a
// .txt named for the run), and nothing is fetched for any of them; a folded "Champion" section
// before Run details carries the record's Shipped, Result and Insight lines. With no canon the
// controls are not on the page.
//
// Prints the page's path on stdout and appends board.rendered to the log.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
var seats=lib.readSeats(runDir).seats;
var log=lib.readLog(runDir);
var rounds=lib.listRounds(runDir);
var tableRounds=rounds.filter(function(r){return !lib.isFinalRound(r);});
var finalRounds=rounds.filter(lib.isFinalRound);
var drafts=lib.listDrafts(runDir);
var newestDraft=lib.latestDraft(runDir);
var hasBrief=fs.existsSync(path.join(runDir,'brief.md'));

var esc=lib.escapeHtml;
// A seat's read: lib.renderLite, the markdown subset after escaping (2026-10-15). The draft keeps paras(): the author's text as pasted.
var read=lib.renderLite;
// The answer as the words a voice should read (issue 82): markdown marks dropped (bold, italic,
// code, headings, list bullets, quote marks), the two section labels left as words.
function plainText(text){
  return String(text||'').replace(/\r\n/g,'\n').replace(/^﻿/,'').split('\n').map(function(l){
    return l.replace(/^\s*#{1,6}\s+/,'').replace(/^\s*>\s?/,'').replace(/^\s*(?:[*\-•]|\d+[.)])\s+/,'');
  }).join('\n').replace(/\*\*|__|`/g,'').replace(/(^|[^*\w])\*(\S(?:[^*\n]*?\S)?)\*(?![\w*])/g,'$1$2').replace(/\n{3,}/g,'\n\n').trim();
}
function paras(text){
  return String(text).replace(/\r\n/g,'\n').replace(/^﻿/,'').trim().split(/\n\s*\n/).map(function(p){return '<p>'+esc(p).replace(/\n/g,'<br>')+'</p>';}).join('');
}
function lastLog(pred){ for(var i=log.length-1;i>=0;i--){ if(pred(log[i]))return log[i]; } return null; }
// A cut read: the add-on's (crew.answered) or the checker's (answer.checked), whichever is last for the seat, round and read.
function truncationOf(seat,round,read){
  var e=lastLog(function(x){return (x.event==='crew.answered'&&x.round===round&&x.seat===seat.id&&(x.read||'rating')===read)
    ||(x.event==='answer.checked'&&x.round===round&&x.seat===seat.id&&x.truncated&&(x.contract==='sn'||x.contract==='redflag'?x.contract:'rating')===read);});
  if(!e||!e.truncated)return null;
  return Object.assign({by:e.event==='answer.checked'?'checker':'add-on'},e.truncated);
}
function withTrunc(mark,t){ return t?(mark?mark+' · ':'')+'truncated at '+t.at+' words':mark; }

// One seat in one non-final round, from the files with the log's verdicts where it has them.
// The fence lines (issue 108, the founder's words: "why the === separators? Not necessary.") stay in the
// file for the checker and leave the page: the fold's full read and the spoken text drop them, and the
// spoken text drops the bare Answer label too, so a reading opens on the seat's words.
function isFence(l){ var s=String(l).trim().replace(/^[`*_]+|[`*_]+$/g,'').trim(); return s===lib.REWRITE_BEGIN||s===lib.REWRITE_END; }
function foldText(t){ return String(t||'').split(/\r?\n/).filter(function(l){return !isFence(l);}).join('\n'); }
function spokenText(t){ var seen=false; return String(t||'').split(/\r?\n/).filter(function(l){ if(isFence(l))return false; if(!seen&&lib.sectionLabelOf(l)==='answer'){seen=true;return false;} return true; }).join('\n'); }
function cell(seat,round){
  var p=path.join(runDir,'rounds',round,seat.id+'.answer.md');
  if(!fs.existsSync(p))return lib.wasAsked(runDir,round,seat.id,log)?{kind:'missing',text:'missing',rating:null}:{kind:'not-asked',text:'not asked',rating:null};
  var text=lib.readText(p);
  var contract=lib.contractSent(runDir,round,p,log);
  var logged=lastLog(function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&(!e.contract||e.contract===contract);});
  var check=lib.checkAnswer(text,logged?logged.word_cap:null,contract);
  var trunc=truncationOf(seat,round,'rating');
  var words=lib.wordCount(text);
  if(!check.ok)return {kind:'failed',text:'failed read',title:check.reasons.join('; '),rating:null,mark:withTrunc('',trunc),answer:text,words:words,contract:contract,reasons:check.reasons};
  var copy=logged&&logged.copy?logged.copy:null;
  if(contract==='critique')return {kind:'critique',text:'critique',title:copy?'the rewrite is a copy of '+copy.model+'\'s':'this round asked for no rating',rating:null,mark:withTrunc(lib.copyMark(copy),trunc),answer:text,words:words,contract:contract,rewrite:(lib.rewriteOf(text)||{}).text||null,copy:copy};
  var flip=lastLog(function(e){return e.event==='flip.checked'&&e.round===round&&e.seat===seat.id;});
  if(!flip){var inputs=lib.flipInputs(runDir,seat,round,seats);flip=lib.checkFlip(text,seat,inputs.ownRated?inputs.ownRated.text:null,inputs.prevAnswers);}
  var kind={first:'first',stand:'stand',held:'held','flip-valid':'flip-valid','flip-invalid':'flip-invalid',unrated:'first'}[flip.status]||'first';
  var mark={first:'',stand:'Stand',held:'held, no Stand','flip-valid':'flip from '+flip.from+', valid','flip-invalid':'flip from '+flip.from+', INVALID'}[kind]||'';
  var title={'flip-valid':'quoted '+flip.cited,'flip-invalid':flip.reason||'quote not found'}[kind]||'';
  return {kind:kind,rating:check.rating,text:check.rating+'/10',mark:withTrunc(copy?(mark?mark+' · ':'')+lib.copyMark(copy):mark,trunc),title:title,from:flip.from,answer:text,words:words,contract:contract,rewrite:(lib.rewriteOf(text)||{}).text||null,copy:copy};
}
function finalCell(seat,round){
  return ['sn','redflag'].map(function(c){
    var p=path.join(runDir,'rounds',round,seat.id+'.'+c+'.answer.md');
    if(!fs.existsSync(p))return {c:c,missing:true};
    var logged=lastLog(function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&e.contract===c;});
    var text=lib.readText(p);
    var r=lib.checkAnswer(text,logged?logged.word_cap:null,c);
    return {c:c,ok:r.ok,value:r.value,truncated:truncationOf(seat,round,c),answer:text,words:lib.wordCount(text)};
  });
}
function finalText(f){
  var snT=f[0].missing?'S/N missing':f[0].ok?'S/N '+f[0].value+'%':'S/N failed read';
  var rfT=f[1].missing?'red flags missing':f[1].ok?(f[1].value===0?'no red flags':f[1].value+' red flag'+(f[1].value===1?'':'s')):'red-flag read failed';
  return snT+' · '+rfT;
}

var grid={}; seats.forEach(function(s){grid[s.id]={};tableRounds.forEach(function(r){grid[s.id][r]=cell(s,r);});});

// Each seat's latest turn: the newest non-final round it was asked in, whatever came of it.
function latestTurn(seat){
  for(var i=tableRounds.length-1;i>=0;i--){ var c=grid[seat.id][tableRounds[i]]; if(c.kind!=='not-asked')return {round:tableRounds[i],cell:c}; }
  return null;
}
// Each seat's latest rating: its newest sound rated answer, the scoreboard's Latest column.
function latestRating(seat){
  var latest=null; tableRounds.forEach(function(r){var c=grid[seat.id][r];if(c.rating!==null&&c.rating!==undefined)latest={round:r,rating:c.rating};});
  return latest;
}

// The verdict across the top (2026-10-14): from every seat's own latest rating, nothing
// averaged. 8 to 10 is a working document and 1 to 6 a problem document, the seat's own rule;
// every rated seat at 8 or more is SEND; any seat at 6 or less is BACK TO THE DRAWING BOARD,
// and the band names that seat. The box shows only over a number (ruled 2026-10-15): with
// final reads and no rating it is FINAL READS over each seat's own two numbers; with neither
// there is no box, and the round strip says what ran.
var rated=seats.map(function(s){return {seat:s,latest:latestRating(s)};}).filter(function(x){return x.latest;});
var low=rated.filter(function(x){return x.latest.rating<=6;});
var noRoundsLine=newestDraft?'No rounds yet. The draft'+(hasBrief?' and the brief are':' is')+' stored; no seat has read it. Next: '+lib.CMD.sparring+' for the first reads and ratings, or '+lib.CMD.battle+' to start with the discussion.'
  :'No rounds yet. The brief is stored; there is no draft yet. Next: '+lib.CMD.sparring+' or '+lib.CMD.battle+' with the draft pasted; it joins this run.';
var verdict=null, verdictClass=null, verdictWhy=null;
if(!rated.length){
  if(finalRounds.length){
    verdict='FINAL READS'; verdictClass='final';
    verdictWhy='No seat has rated this draft. These are the final reads of round '+finalRounds[finalRounds.length-1]+', each seat\'s own S/N ratio and red-flag count. Nothing is averaged.';
  }
}else if(!low.length){
  verdict='SEND'; verdictClass='send';
  verdictWhy=(rated.length===1?'The one rated seat':'Every rated seat')+' put it at 8 or more: a working document by '+(rated.length===1?'its':'each seat\'s')+' own number. Nothing is averaged.';
}else{
  verdict='BACK TO THE DRAWING BOARD'; verdictClass='back';
  verdictWhy=low.map(function(x){return lib.seatLabel(x.seat)+' rated it '+x.latest.rating+'/10';}).join('; ')+': a problem document by '+(low.length===1?'that seat\'s':'those seats\'')+' own number. Nothing is averaged; one seat at 6 or less sends it back.';
}

// The page.
var companies=seats.map(function(s){return s.company;}).filter(function(v,i,a){return a.indexOf(v)===i;});
var html=[];
html.push('<!doctype html>');
html.push('<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
html.push('<title>Combat Writing board — '+esc(path.basename(runDir))+'</title>');
html.push('<style>');
html.push(':root{color-scheme:light;--surface:#f7f5f0;--paper:#fffdf8;--surface-2:#efece5;--ink:#141311;--ink-2:#55524c;--ink-3:#8a877f;--rule:#dcd8cf;--frame:#2b2823;--send:#1a6b3a;--send-ink:#ffffff;--back:#9b1c1c;--back-ink:#ffffff;--none:#6b675f;--none-ink:#ffffff;--good:#1a7f37;--bad:#c62828;}');
html.push('@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;--surface:#171614;--paper:#1f1e1b;--surface-2:#262522;--ink:#f3f1ea;--ink-2:#bdb9ae;--ink-3:#8b887f;--rule:#363430;--frame:#d9d4c7;--send:#2e8b57;--send-ink:#0b1a10;--back:#c83a3a;--back-ink:#1a0b0b;--none:#5f5c55;--none-ink:#f3f1ea;--good:#4caf6e;--bad:#ef6b6b;}}');
html.push(':root[data-theme="dark"]{color-scheme:dark;--surface:#171614;--paper:#1f1e1b;--surface-2:#262522;--ink:#f3f1ea;--ink-2:#bdb9ae;--ink-3:#8b887f;--rule:#363430;--frame:#d9d4c7;--send:#2e8b57;--send-ink:#0b1a10;--back:#c83a3a;--back-ink:#1a0b0b;--none:#5f5c55;--none-ink:#f3f1ea;--good:#4caf6e;--bad:#ef6b6b;}');
html.push('*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink);font:16px/1.55 Georgia,"Iowan Old Style","Palatino Linotype",Palatino,"Times New Roman",serif;padding:0 16px 64px}main{max-width:1360px;margin:0 auto}');
html.push('.motto{font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin:22px 0 14px}h1{font:600 20px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin:0}h2{font:600 13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin:36px 0 10px}p{margin:8px 0}.meta{color:var(--ink-2);font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}');
html.push('.bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}button{font:13px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--rule);border-radius:6px;padding:4px 10px;cursor:pointer}');
html.push('.facts{max-width:76ch;margin:10px auto 0}.paper{background:var(--paper);border:1px solid var(--rule);border-radius:4px;padding:28px 32px;font-size:17px;line-height:1.65;box-shadow:0 1px 2px rgba(0,0,0,.06);max-width:76ch;margin:0 auto;overflow-wrap:anywhere}.paper p{margin:0 0 1em}.paper p:last-child{margin-bottom:0}');
html.push('.round{margin:18px 0 0;padding:12px 16px;overflow-wrap:anywhere;border-left:4px solid var(--frame);background:var(--surface-2);border-radius:0 4px 4px 0;font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2)}.round b{color:var(--ink)}.rounds{list-style:none;padding:0;margin:14px 0 0;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2)}.rounds li{padding:4px 0;border-bottom:1px solid var(--rule)}.rounds b{color:var(--ink)}.frame figcaption .note-line{display:block;margin-top:4px;color:var(--ink-2)}');
html.push('.round.shipped{border-left-color:var(--send);margin-top:10px}.canon-controls{max-width:76ch;margin:0 auto 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2)}.canon-controls button:disabled{opacity:.5;cursor:default}');
html.push('.verdict{margin:28px 0 0;padding:34px 24px;border-radius:6px;text-align:center;color:var(--send-ink);background:var(--send)}.verdict.back{background:var(--back);color:var(--back-ink)}.verdict.final{background:var(--none);color:var(--none-ink)}.verdict .word{font:800 clamp(28px,6vw,64px)/1.05 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.06em;text-transform:uppercase;margin:0}.verdict .why{margin:14px auto 0;max-width:720px;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;opacity:.92}.verdict .numbers{list-style:none;padding:0;margin:18px 0 0;display:flex;gap:10px 22px;justify-content:center;flex-wrap:wrap;font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}.verdict .numbers b{font-size:20px;margin-right:6px;font-variant-numeric:tabular-nums}');
html.push('.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:28px;margin-top:4px}.frame:has(details[open]){grid-column:1/-1}.frame{margin:0;background:var(--paper);border:10px solid var(--frame);outline:1px solid var(--rule);box-shadow:inset 0 0 0 1px var(--rule),inset 0 0 0 6px var(--paper),inset 0 0 0 7px var(--frame),0 10px 24px rgba(0,0,0,.12);padding:34px 28px 26px;display:flex;flex-direction:column;align-items:center;text-align:center}');
html.push('.badge{font:700 12px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:.14em;text-transform:uppercase;padding:7px 12px;border:1px solid var(--frame);border-radius:999px;color:var(--ink)}.badge.failed,.badge.missing{color:var(--bad);border-color:var(--bad)}.badge.critique{color:var(--ink-2);border-color:var(--ink-3)}.badge .mark{font-weight:400;letter-spacing:0;text-transform:none;margin-left:6px;color:var(--ink-2)}.flip-valid .badge .mark{color:var(--good)}.flip-invalid .badge .mark{color:var(--bad)}');
html.push('.frame blockquote{margin:22px 0 14px;padding:0;font-weight:700;font-style:italic;font-size:22px;line-height:1.35;quotes:"\\201C" "\\201D";overflow-wrap:anywhere}.frame blockquote:before{content:open-quote;display:block;font-size:52px;line-height:.4;color:var(--ink-3);margin-bottom:14px;font-style:normal}.frame figcaption{font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2)}.frame figcaption .seat{color:var(--ink-3)}.frame .final{font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2);margin-top:10px}');
html.push('.read-controls{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;margin-top:12px;font:13px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2)}.read-controls button:disabled{opacity:.5;cursor:default}');
html.push('details{margin-top:14px;width:100%}summary{cursor:pointer;font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2);text-align:center;list-style:none}summary::-webkit-details-marker{display:none}summary:before{content:"+ ";color:var(--ink-3)}details[open]>summary:before{content:"– "}.read{text-align:left;font-size:16px;line-height:1.6;margin:12px auto 0;padding-top:12px;border-top:1px solid var(--rule);max-width:70ch;overflow-wrap:anywhere}.read p{margin:0 0 .9em}.read ul,.read ol{margin:0 0 .9em 1.3em;padding:0}.read li{margin:0 0 .3em}.read code{font-size:14px;background:var(--surface-2);padding:0 4px;border-radius:3px}.read.failed{color:var(--ink-2)}');
html.push('.fold{margin-top:28px;border-top:1px solid var(--rule);padding-top:10px}.fold>summary{text-align:left;font-weight:600;color:var(--ink)}.fold>summary:before{content:"+ "}.fold[open]>summary:before{content:"– "}');
html.push('table{border-collapse:collapse;width:100%;font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;margin-top:8px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--rule);vertical-align:top;overflow-wrap:anywhere}th{color:var(--ink-2);font-weight:600}td.num{font-variant-numeric:tabular-nums;white-space:nowrap}.mark{color:var(--ink-2);font-size:12px}td.flip-valid .mark{color:var(--good)}td.flip-invalid .mark{color:var(--bad)}.missing,.failed{color:var(--ink-3);font-style:italic}.critique{color:var(--ink-2)}code{font-size:13px}.note{font:13px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink-2)}a{color:inherit}');
html.push('</style></head><body><main>');
html.push('<p class="motto">Reading is Peace. Writing is War.</p>');
html.push('<div class="bar"><h1>Combat Writing board — '+esc(path.basename(runDir))+'</h1><button type="button" id="theme" aria-label="Switch light and dark">Light / dark</button></div>');

// The round strip (ruled 2026-10-15): the latest round's task, visible with nothing opened.
// roundLine renders one round for the strip and for the history in the scoreboard fold.
function answeredIn(round){
  var asked=lib.askedIn(runDir,round,log);
  var put=seats.filter(function(s){return !asked||asked[s.id];});
  var done=put.filter(function(s){return fs.existsSync(path.join(runDir,'rounds',round,s.id+(lib.isFinalRound(round)?'.sn':'')+'.answer.md'));});
  return {put:put,done:done,all:!asked||put.length===seats.length};
}
function seatNote(round,seatId){ var q=path.join(runDir,'rounds',round,seatId+'.question.md'); return fs.existsSync(q)?lib.readText(q).trim():null; }
function roundLine(round){
  var task=lib.roundTask(runDir,round,log);
  var a=answeredIn(round);
  var parts=[esc(lib.taskLine(task))];
  if(task.kind==='seat'||!a.all){
    parts[0]=(task.kind==='seat'?'seat lines to ':esc(lib.taskLine(task))+' · put to ')+a.put.map(function(s){var n=seatNote(round,s.id);return esc(s.id)+(n?' (\u201c'+esc(n)+'\u201d)':'');}).join(', ');
  }
  var r=lib.ratingLine(task,round); if(r)parts.push(esc(r));
  parts.push(a.done.length+' of '+a.put.length+' seat'+(a.put.length===1?'':'s')+' answered');
  return '<b>Round '+esc(round)+'</b> · '+parts.join(' · ');
}
if(rounds.length)html.push('<p class="round">'+roundLine(rounds[rounds.length-1])+'</p>');

// The Shipped strip (ruled 2026-10-19): the latest shipping, visible with nothing opened. The
// address is text with its scheme cut, never an href: the page keeps its one link.
var champ=lib.championEvents(log);
var shipped=champ.filter(function(e){return e.event==='champion.shipped';});
var lastShip=shipped.length?shipped[shipped.length-1]:null;
var nResults=champ.filter(function(e){return e.event==='champion.result';}).length;
var nInsights=champ.filter(function(e){return e.event==='champion.insight';}).length;
var canonFile=lib.latestCanon(runDir);
var canonText=canonFile?lib.readText(path.join(runDir,canonFile)):null;
// Which draft the newest canon froze, from the log line that wrote it (the files decide which
// canon is newest; the log says which draft it came from).
var canonFroze=null; shipped.forEach(function(e){ if(e.canon===canonFile&&e.canon_new)canonFroze=e.draft; });
var canonCurrent=!!canonFile&&!!newestDraft&&lib.sha256(fs.readFileSync(path.join(runDir,canonFile)))===lib.sha256(fs.readFileSync(path.join(runDir,newestDraft)));
if(lastShip)html.push('<p class="round shipped"><b>Shipped</b> · '+esc(lib.shippedLine(lastShip).replace(/^Shipped /,''))+(lastShip.url?' · '+esc(lib.stripScheme(lastShip.url)):'')+' · '+nResults+' result'+(nResults===1?'':'s')+' · '+nInsights+' insight'+(nInsights===1?'':'s')+'</p>');

// 1. The draft, in full.
if(newestDraft){
  var canonClause=!canonFile?'':canonCurrent?' · shipped as '+esc(canonFile)+(canonFroze?', which froze '+esc(canonFroze):''):' · '+esc(canonFile)+' froze '+esc(canonFroze||'an earlier draft')+'; this revision is not shipped';
  html.push('<h2>The draft'+(newestDraft!=='draft.md'?' · '+esc(newestDraft)+', a revision':'')+canonClause+'</h2>');
  if(!rounds.length)html.push('<p class="meta">'+esc(noRoundsLine)+'</p>');
  // The canon controls (ruled 2026-10-19), only when the run holds a canon: read aloud, copy,
  // download, all on the canon text exactly, all in the browser, nothing fetched.
  if(canonFile){
    html.push('<div class="canon-controls" aria-label="The canon, '+esc(canonFile)+'"><span class="meta">Canon: '+esc(canonFile)+(canonFroze?' froze '+esc(canonFroze):'')+'</span> <button type="button" id="canon-speak" aria-label="Read the canon aloud">🔊 Read aloud</button> <button type="button" id="canon-pause" aria-label="Pause or resume the reading" disabled>Pause</button> <button type="button" id="canon-stop" aria-label="Stop the reading" disabled>Stop</button> <button type="button" id="canon-copy" aria-label="Copy the canon text">Copy</button> <button type="button" id="canon-download" aria-label="Download the canon as a text file">Download .txt</button> <span class="meta" id="canon-status" aria-live="polite"></span></div>');
    html.push('<div id="canon-text" hidden>'+esc(canonText)+'</div>');
  }
  html.push('<div class="paper">'+paras(lib.readText(path.join(runDir,newestDraft)))+'</div>');
  // The counts every packet carries (ruled 2026-10-15): the person sees what the seats were told.
  html.push('<p class="meta facts"><strong>'+esc(lib.FACTS_HEADING)+':</strong> '+esc(lib.draftFactsFull(lib.draftFacts(lib.readText(path.join(runDir,newestDraft)))))+'.</p>');
}else{
  html.push('<h2>The draft</h2><p class="meta">None yet. The brief is stored; the draft joins the run when sparring or battle brings it.</p>');
  if(!rounds.length)html.push('<p class="meta">'+esc(noRoundsLine)+'</p>');
}

// 2. The verdict across the page, only over a number (ruled 2026-10-15).
if(verdict){
  html.push('<section class="verdict '+verdictClass+'" aria-label="Verdict"><p class="word">'+esc(verdict)+'</p><p class="why">'+esc(verdictWhy)+'</p>');
  if(rated.length)html.push('<ul class="numbers">'+rated.map(function(x){return '<li><b>'+x.latest.rating+'/10</b>'+esc(lib.seatLabel(x.seat))+'</li>';}).join('')+'</ul>');
  else html.push('<ul class="numbers">'+seats.map(function(s){return '<li><b>'+esc(finalText(finalCell(s,finalRounds[finalRounds.length-1])))+'</b>'+esc(lib.seatLabel(s))+'</li>';}).join('')+'</ul>');
  html.push('</section>');
}

// 3. One framed quote per seat.
if(tableRounds.length){
  html.push('<h2>The seats</h2>');
  html.push('<div class="gallery">');
  seats.forEach(function(s){
    var t=latestTurn(s);
    var c=t?t.cell:null;
    var kind=c?c.kind:'unread';
    var badge, quote, fold='';
    if(!c){ badge='<span class="badge missing">Not yet read</span>'; quote='This seat has not been put to the draft yet.'; }
    else if(c.kind==='missing'){ badge='<span class="badge missing">Missing</span>'; quote='No answer this round. Nothing stands in for it.'; }
    else if(c.kind==='failed'){
      badge='<span class="badge failed">Failed read'+(c.mark?'<span class="mark">'+esc(c.mark)+'</span>':'')+'</span>';
      quote='Failed read: '+c.reasons[0]+'.';
      fold='<details><summary>The failed read ('+c.words+' words)</summary><div class="read failed">'+read(c.answer)+'</div></details>';
    }else{
      badge=c.kind==='critique'
        ?'<span class="badge critique">'+(c.rewrite?(c.copy?'Rewrite · a copy of '+esc(c.copy.model)+'\'s':'Rewrite · no rating asked'):'Critique · no rating asked')+(c.mark&&!c.copy?'<span class="mark">'+esc(c.mark)+'</span>':c.mark&&c.copy&&c.mark!==lib.copyMark(c.copy)?'<span class="mark">'+esc(c.mark.replace(lib.copyMark(c.copy),'').replace(/^ · | · $/g,''))+'</span>':'')+'</span>'
        :'<span class="badge">Rating '+c.rating+'/10'+(c.rewrite?' · rewrite':'')+(c.mark?'<span class="mark">'+esc(c.mark)+'</span>':'')+'</span>';
      quote=lib.verdictLine(c.answer,c.contract)||'(no words after the first line)';
      // The second pass of a first round (issue 88): under the read, in the fold and in the spoken text.
      var crew=t?lib.crewPassOf(runDir,t.round,s.id,log):null;
      var crewHtml=crew?'<p><strong>'+esc(lib.CREW_PASS_HEADING)+'</strong></p>'+read(crew.text):'';
      var spoken=plainText(spokenText(c.answer))+(crew?'\n\n'+lib.CREW_PASS_HEADING+'.\n\n'+plainText(crew.text):'');
      // Read aloud (issue 82): the answer as plain text in the page, the controls on the frame; the
      // script below wires every frame to the browser's speech synthesis, one seat at a time.
      // The rewrite (issue 103): the whole of it under the frame, open, before the fold; the quote above is its opening.
      fold=(c.rewrite?'<div class="read rewrite"><p class="meta">The rewrite, in full:</p>'+read(c.rewrite)+'</div>':'')
        +'<div class="read-controls"><button type="button" class="seat-speak" aria-label="Read this seat\'s '+(c.kind==='critique'?'critique':'read')+' aloud">🔊 Read aloud</button> <button type="button" class="seat-pause" aria-label="Pause or resume the reading" disabled>Pause</button> <button type="button" class="seat-stop" aria-label="Stop the reading" disabled>Stop</button> <span class="meta seat-status" aria-live="polite"></span></div>'
        +'<div class="seat-text" hidden>'+esc(spoken)+'</div>'
        +'<details><summary>Read the full '+(c.kind==='critique'?'critique':'read')+' ('+c.words+' words'+(crew?', then '+crew.words+' to the crew':'')+')</summary><div class="read">'+read(c.answer)+crewHtml+'</div></details>';
    }
    var finalLine='';
    if(finalRounds.length){ var f=finalCell(s,finalRounds[finalRounds.length-1]); finalLine='<p class="final">'+esc(finalRounds[finalRounds.length-1])+': '+esc(finalText(f))+'</p>'; }
    var note=t?seatNote(t.round,s.id):null;
    html.push('<figure class="frame '+esc(kind)+'" data-seat="'+esc(s.id)+'">'+badge+'<blockquote>'+esc(quote)+'</blockquote><figcaption>— '+esc(lib.seatLabel(s))+(t?' <span class="seat">· round '+esc(t.round)+'</span>':'')+(note?' <span class="note-line">· your note: \u201c'+esc(note)+'\u201d</span>':'')+'</figcaption>'+finalLine+fold+'</figure>');
  });
  html.push('</div>');
}

// 4. Folded: every round, the scoreboard.
if(rounds.length){
  html.push('<details class="fold"><summary>Every round: the scoreboard</summary>');
  html.push('<p class="note">'+esc(lib.SCOREBOARD_LEGEND).replace(/`rerate`/,'<code>rerate</code>')+'</p>');
  html.push('<table><thead><tr><th>Seat</th>'+rounds.map(function(r){return '<th>'+esc(r)+'</th>';}).join('')+'<th>Latest</th></tr></thead><tbody>');
  seats.forEach(function(s){
    html.push('<tr><td>'+esc(lib.seatLabel(s))+'</td>');
    rounds.forEach(function(r){
      if(lib.isFinalRound(r)){
        var f=finalCell(s,r);
        var tr=function(x){return x.truncated?' <span class="mark">truncated at '+x.truncated.at+' words</span>':'';};
        var snT=(f[0].missing?'<span class="missing">S/N missing</span>':f[0].ok?'S/N '+f[0].value+'%':'<span class="failed">S/N failed read</span>')+tr(f[0]);
        var rfT=(f[1].missing?'<span class="missing">red flags missing</span>':f[1].ok?(f[1].value===0?'no red flags':f[1].value+' red flag'+(f[1].value===1?'':'s')):'<span class="failed">red-flag read failed</span>')+tr(f[1]);
        html.push('<td class="num">'+snT+'<br>'+rfT+'</td>');
        return;
      }
      var c=grid[s.id][r];
      if(c.kind==='missing')html.push('<td class="num"><span class="missing">missing</span></td>');
      else if(c.kind==='not-asked')html.push('<td class="num"><span class="missing" title="the round was put to other seats only">not asked</span></td>');
      else if(c.kind==='failed')html.push('<td class="num"><span class="failed" title="'+esc(c.title)+'">failed read</span>'+(c.mark?'<br><span class="mark">'+esc(c.mark)+'</span>':'')+'</td>');
      else if(c.kind==='critique')html.push('<td class="num critique"><span class="critique" title="'+esc(c.title)+'">critique</span>'+(c.mark?'<br><span class="mark">'+esc(c.mark)+'</span>':'')+'</td>');
      else html.push('<td class="num '+c.kind+'">'+c.text+(c.mark?'<br><span class="mark"'+(c.title?' title="'+esc(c.title)+'"':'')+'>'+esc(c.mark)+'</span>':'')+'</td>');
    });
    var lr=latestRating(s);
    html.push('<td class="num">'+(lr?lr.rating+'/10':'—')+'</td></tr>');
  });
  html.push('</tbody></table>');
  html.push('<ul class="rounds">'+rounds.map(function(r){return '<li>'+roundLine(r)+'</li>';}).join('')+'</ul>');
  if(finalRounds.length){
    html.push('<h2>Final reads</h2>');
    html.push('<p class="note">The S/N ratio and red-flag reads of the newest draft, one pair per seat, never averaged.</p>');
    html.push('<table><thead><tr><th>Seat</th>'+finalRounds.map(function(r){return '<th>'+esc(r)+' S/N</th><th>'+esc(r)+' red flags</th>';}).join('')+'</tr></thead><tbody>');
    seats.forEach(function(s){
      html.push('<tr><td>'+esc(lib.seatLabel(s))+'</td>'+finalRounds.map(function(r){
        var f=finalCell(s,r);
        return '<td class="num">'+(f[0].missing?'<span class="missing">missing</span>':f[0].ok?f[0].value+'%':'<span class="failed">failed read</span>')+'</td><td class="num">'+(f[1].missing?'<span class="missing">missing</span>':f[1].ok?(f[1].value===0?'none':String(f[1].value)):'<span class="failed">failed read</span>')+'</td>';
      }).join('')+'</tr>');
    });
    html.push('</tbody></table>');
    finalRounds.forEach(function(r){
      seats.forEach(function(s){
        var f=finalCell(s,r);
        f.forEach(function(x){
          if(x.missing)return;
          html.push('<details><summary>'+esc(lib.seatLabel(s))+' · '+esc(r)+' · '+(x.c==='sn'?'S/N read':'red-flag read')+' ('+x.words+' words)</summary><div class="read">'+read(x.answer)+'</div></details>');
        });
      });
    });
  }
  html.push('</details>');
}

// 4b. Folded: champion (ruled 2026-10-19), the record's lines, only when the log holds any.
if(champ.length){
  html.push('<details class="fold"><summary>Champion: shipped, results, insights</summary>');
  html.push('<p class="note">What was shipped, what came back, and what the run taught. The live and match marks are measured by code against the page text the host saved, never by a seat.</p>');
  if(!shipped.length)html.push('<p class="meta"><strong>Shipped:</strong> not recorded.</p>');
  champ.forEach(function(e){
    if(e.event==='champion.shipped')html.push('<p class="meta"><strong>Shipped:</strong> '+esc(lib.shippedLine(e).replace(/^Shipped /,''))+(e.url?' · '+esc(lib.stripScheme(e.url)):'')+'</p>');
    else if(e.event==='champion.result')html.push('<p class="meta"><strong>Result:</strong> '+esc(lib.dateUtc(e.at))+' · '+esc(String(e.text||'').replace(/\s+/g,' ').trim())+'</p>');
    else if(e.event==='champion.insight')html.push('<p class="meta"><strong>Insight:</strong> '+esc(lib.dateUtc(e.at))+' · '+esc(e.text)+' · '+esc(e.vault)+'</p>');
  });
  html.push('</details>');
}

// 5. Folded: the run details.
html.push('<details class="fold"><summary>Run details</summary>');
html.push('<p class="meta"><strong>Crew:</strong> '+esc(seats.map(lib.seatLabel).join('; '))+'. '+(companies.length===1?'One company\'s models ('+esc(companies[0])+').':companies.length+' companies: '+esc(companies.join(', '))+'.')+' '+esc(lib.nameSources(seats))+'</p>');
lib.crewStateLines(runDir,seats,log).forEach(function(l){ html.push('<p class="meta"><strong>Seats:</strong> '+esc(l)+'</p>'); });
html.push('<p class="meta"><strong>Seat key:</strong> '+esc(lib.seatKey(seats))+'</p>');
html.push('<p class="meta"><strong>Drafts:</strong> '+(drafts.length?esc(drafts.map(function(d){return d+' ('+lib.draftFactsLine(lib.draftFacts(lib.readText(path.join(runDir,d))))+')';}).join(', '))+'.':'none yet; the draft joins the run when sparring or battle brings it.')+(hasBrief?' <strong>Brief:</strong> '+esc(lib.readText(path.join(runDir,'brief.md')).trim()):'')+'</p>');
html.push('<p class="meta"><strong>Started at:</strong> '+esc(lib.startedAtLine(runDir,log,rounds))+'</p>');
// The price of every round (issue 95), here and not on the terminal: the founder's ruling, accessible, not presented.
var budgetLines=lib.budgetLines(runDir,log);
if(budgetLines.length)html.push('<p class="meta"><strong>Packets:</strong> '+esc('Tokens are estimated at four characters each, the add-on\'s rule. '+budgetLines.join(' '))+'</p>');
if(!rounds.length)html.push('<p class="note">'+esc(noRoundsLine)+'</p>');
html.push('<p class="note">The full record, every answer in full and the log of what was sent, is <a href="record.md">record.md</a> in this folder.</p>');
html.push('</details>');
html.push('<script>');
html.push('(function(){var b=document.getElementById("theme");var r=document.documentElement;b.addEventListener("click",function(){var dark=r.getAttribute("data-theme")==="dark"||(r.getAttribute("data-theme")!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.setAttribute("data-theme",dark?"light":"dark");});})();');
// Read aloud on every read frame (issue 82): the browser's own speech synthesis, the seat's answer as the
// plain text in the page, one seat at a time (starting one cancels another). No request leaves the page.
// A voice per seat (issue 101, 2026-10-27, the founder's words: "the first one for anthropic is the one it
// has now but gptoss and qwen3 have to have different ones you pick the next best two"): seat-1 reads in
// the browser's default voice as before; every later seat gets its own from the browser's list, the
// page's language first, the standard voices by name first (issue 109: sorted by name alone the picker
// landed on macOS's novelty voices, Albert and Bad News, measured in Chromium), the novelty set
// skipped, the machine's own voices next, then by name, seat-2 the first of them and seat-3 the
// second, so a seat sounds the same every time on one machine. The list is asked for at page open and
// the picks are cleared when the browser's list arrives, so a first click never lands every seat on the
// default. Another machine has other
// voices, which the founder accepted. The canon's reader is unchanged. Nothing is sent anywhere.
html.push('(function(){var synth=window.speechSynthesis;var frames=document.querySelectorAll(".frame");var playing=null;var PREFERRED=["Daniel","Karen","Alex","Moira","Tessa","Rishi","Fiona","Samantha","Aaron","Nicky","Ava","Allison","Susan","Tom","Oliver","Serena","Kate","Arthur","Martha","Gordon","Catherine","Matilda","Lee"];var NOVELTY={"albert":1,"bad news":1,"bahh":1,"bells":1,"boing":1,"bubbles":1,"cellos":1,"deranged":1,"good news":1,"hysterical":1,"jester":1,"organ":1,"pipe organ":1,"superstar":1,"trinoids":1,"whisper":1,"wobble":1,"zarvox":1,"eddy":1,"flo":1,"grandma":1,"grandpa":1,"reed":1,"rocko":1,"sandy":1,"shelley":1,"junior":1,"ralph":1,"kathy":1,"fred":1};function plainName(v){return String(v.name||"").replace(/\s*\(.*\)$/,"").trim();}function rank(v){var i=PREFERRED.indexOf(plainName(v));return i<0?PREFERRED.length:i;}var pick={};function seatVoice(f){var k=parseInt(String(f.getAttribute("data-seat")||"").replace(/^seat-/,""),10);if(!(k>1)||!synth||!synth.getVoices)return null;if(pick[k]!==undefined)return pick[k];var all=synth.getVoices()||[];var lang=(document.documentElement.lang||"en").slice(0,2).toLowerCase();var dflt=all.filter(function(v){return v.default;})[0]||null;var pool=all.filter(function(v){return !v.default&&String(v.lang||"").slice(0,2).toLowerCase()===lang&&!NOVELTY[plainName(v).toLowerCase()];});if(!pool.length)pool=all.filter(function(v){return !v.default&&!NOVELTY[plainName(v).toLowerCase()];});if(!pool.length)pool=all.filter(function(v){return !v.default;});if(!pool.length)return null;pool.sort(function(a,b){return rank(a)-rank(b)||(b.localService?1:0)-(a.localService?1:0)||String(a.name).localeCompare(String(b.name));});if(dflt){var p2=pool.filter(function(v){return plainName(v)!==plainName(dflt);});if(p2.length)pool=p2;}var v=pool[(k-2)%pool.length];pick[k]=v;return v;}if(synth&&synth.getVoices){synth.getVoices();if("onvoiceschanged" in synth)synth.onvoiceschanged=function(){pick={};};}function wire(f){var t=f.querySelector(".seat-text"),speak=f.querySelector(".seat-speak"),pause=f.querySelector(".seat-pause"),stop=f.querySelector(".seat-stop"),st=f.querySelector(".seat-status");if(!t||!speak)return;var held=false;function say(m){st.textContent=m;}function idle(){held=false;pause.disabled=true;stop.disabled=true;pause.textContent="Pause";speak.disabled=false;if(playing===f)playing=null;}');
html.push('speak.addEventListener("click",function(){if(!synth||!window.SpeechSynthesisUtterance){say("This browser has no speech synthesis.");return;}if(playing&&playing!==f&&playing.idle)playing.idle();synth.cancel();var u=new SpeechSynthesisUtterance(t.textContent);var v=seatVoice(f);if(v)u.voice=v;u.onstart=function(){say("Reading aloud"+(v?" in the voice "+v.name:"")+".");pause.disabled=false;stop.disabled=false;speak.disabled=true;playing=f;};u.onend=function(){say("Finished reading.");idle();};u.onerror=function(e){var why=e&&e.error?e.error:"";if(why!=="interrupted"&&why!=="canceled")say("Reading stopped"+(why?": "+why:"")+".");idle();};synth.speak(u);});');
html.push('pause.addEventListener("click",function(){if(!synth)return;if(held){held=false;synth.resume();pause.textContent="Pause";say("Resumed.");}else{held=true;synth.pause();pause.textContent="Resume";say("Paused.");}});stop.addEventListener("click",function(){if(!synth)return;synth.cancel();say("Stopped.");idle();});f.idle=idle;}for(var i=0;i<frames.length;i++)wire(frames[i]);})();');
if(canonFile){
  // The canon controls: the browser's own speech synthesis (the system's voices), the clipboard,
  // and a download built from the text in the page. No request leaves the page.
  html.push('(function(){var t=document.getElementById("canon-text");if(!t)return;var text=t.textContent;var speak=document.getElementById("canon-speak"),pause=document.getElementById("canon-pause"),stop=document.getElementById("canon-stop"),copy=document.getElementById("canon-copy"),dl=document.getElementById("canon-download"),st=document.getElementById("canon-status");function say(m){st.textContent=m;}var synth=window.speechSynthesis;var held=false;function idle(){held=false;pause.disabled=true;stop.disabled=true;pause.textContent="Pause";speak.disabled=false;}');
  html.push('speak.addEventListener("click",function(){if(!synth||!window.SpeechSynthesisUtterance){say("This browser has no speech synthesis.");return;}synth.cancel();var u=new SpeechSynthesisUtterance(text);u.onstart=function(){say("Reading the canon aloud.");pause.disabled=false;stop.disabled=false;speak.disabled=true;};u.onend=function(){say("Finished reading.");idle();};u.onerror=function(e){var why=e&&e.error?e.error:"";if(why!=="interrupted"&&why!=="canceled")say("Reading stopped"+(why?": "+why:"")+".");idle();};synth.speak(u);});');
  // The engine's own paused flag changes asynchronously (measured in Chromium, 2026-10-19), so the
  // button keeps its own state.
  html.push('pause.addEventListener("click",function(){if(!synth)return;if(held){held=false;synth.resume();pause.textContent="Pause";say("Resumed.");}else{held=true;synth.pause();pause.textContent="Resume";say("Paused.");}});');
  html.push('stop.addEventListener("click",function(){if(!synth)return;synth.cancel();say("Stopped.");idle();});');
  html.push('copy.addEventListener("click",function(){function ok(){say("Canon copied to the clipboard.");}function fallback(){var ta=document.createElement("textarea");ta.value=text;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.left="-9999px";document.body.appendChild(ta);ta.select();var done=false;try{done=document.execCommand("copy");}catch(e){}document.body.removeChild(ta);if(done)ok();else say("Copy failed; select the draft and copy it by hand.");}if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(ok,fallback);else fallback();});');
  html.push('dl.addEventListener("click",function(){var a=document.createElement("a");a.setAttribute("href","data:text/plain;charset=utf-8,"+encodeURIComponent(text));a.download='+JSON.stringify(path.basename(runDir)+'-'+canonFile.replace(/\.md$/,'')+'.txt')+';document.body.appendChild(a);a.click();document.body.removeChild(a);say("Downloaded "+a.download+".");});');
  html.push('window.addEventListener("pagehide",function(){if(synth)synth.cancel();});})();');
}
html.push('</script>');
html.push('</main></body></html>');
fs.writeFileSync(path.join(runDir,lib.BOARD_FILE),html.join('\n')+'\n');
lib.appendLog(runDir,{event:'board.rendered',file:lib.BOARD_FILE,rounds:rounds.length});
process.stdout.write(path.join(runDir,lib.BOARD_FILE)+'\n');
