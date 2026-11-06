// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// render-board.js: writes board.html for a run, a single self-contained page. The board is
// the result: after every sparring and battle round the host opens it in the
// person's browser (open-board.js), a local file, never published.
//
//   node render-board.js --run <run folder>
//
// The page (Part 106, one screen, the look as data): the strip at the top (the motto, the run,
// the latest round's task in one line from lib.roundTask with whether a rating was asked and how
// many seats answered, the tabs Draft, Scoreboard and Run details, the Light / dark button); the
// top box with the newest draft in full at full width beside a column with the brief and the
// reader (the scoreboard of every round and the run details sit under the tabs in the same box);
// the hand, one card per seat side by side in its company's identity (the face, the frame's rule
// and shape, the accent; the seat's own number as the corner index; the company as the suit; the
// seat's one-line verdict large; the citation to the model by name and company with the round;
// the seat's own note when that seat was asked something different; its rating or its state
// (critique, failed read, missing); a read-aloud control on every read card (issue 82: the
// browser's own speech synthesis with pause and stop, the answer spoken as plain text, one seat
// at a time, none on a missing or failed read); the full read open on the card, scrolling inside
// it); the bar at the bottom (every seat's latest number in its company colour, the next
// commands). The scoreboard (one row per seat, one column per round, every rating on its own,
// flips marked valid or invalid with the earlier number kept, Stand, missing, not asked, failed
// reads, truncated reads) carries the round history under it and the final reads when a final
// round exists; the run details carry the crew line, the Seats line when the crew is short, the
// seat key, the drafts, the measured facts, the brief, the reader (Part 84), where the run
// started, the packets' price, and the one link, to record.md. Light and dark follow the system
// setting, with a toggle; the dark set is designed, not inverted. No external request of any
// kind: the four faces are embedded as data from plugins/combat-writing/fonts (OFL), and no
// script, style or image is fetched. Nothing is averaged. Every seat's words are escaped: an
// answer is text, never markup; a small markdown subset (lists, bold, italic, code) is then
// rendered, no link among it (lib.renderLite). Under 1100 px wide the rows stack and the page
// scrolls. Rebuilt after every round from the files and log.jsonl.
//
// Champion: when the run holds a champion.shipped line, a Shipped strip sits
// under the round strip (the Shipped line, the address as text with its scheme cut, never a
// link, and the counts of results and insights); the draft heading says whether the newest
// draft is the canon or a revision after it; the draft panel gets three client-side controls on
// the canon, like a canon piece in the Combat Writing app: read aloud (the browser's own speech
// synthesis, with pause and stop), copy (the clipboard, the canon text exactly) and download (a
// .txt named for the run), and nothing is fetched for any of them; a "Champion" heading under
// the Run details tab carries the record's Shipped, Result and Insight lines. With no canon the
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
var readerText=lib.readReader(runDir);
// The brief by name (Part 86), from run.created.
var briefName=(function(){ var c=log.filter(function(e){return e.event==='run.created';})[0]; return c&&c.brief&&c.brief.name?c.brief.name:null; })();

var esc=lib.escapeHtml;
// A seat's read: lib.renderLite, the markdown subset after escaping. The draft keeps paras(): the author's text as pasted.
var read=lib.renderLite;
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
// The fence lines (issue 108) stay in the
// file for the checker and leave the page: the fold's full read and the spoken text drop them, and the
// spoken text drops the bare Answer label too, so a reading opens on the seat's words.
function isFence(l){ var s=String(l).trim().replace(/^[`*_]+|[`*_]+$/g,'').trim(); return s===lib.REWRITE_BEGIN||s===lib.REWRITE_END; }
function foldText(t){ return String(t||'').split(/\r?\n/).filter(function(l){return !isFence(l);}).join('\n'); }
// The read on the card drops its own RATING line (the number is the corner index, Part 106); the file keeps it.
function cardText(t){ var lines=foldText(t).split('\n'); if(lines.length&&/^RATING: \d+\/10\s*$/.test(lines[0].trim()))lines.shift(); return lines.join('\n').replace(/^\s*\n/,''); }
// The spoken text is lib.spokenPlain (Part 81): the board and speak.js read one rule.
// THE MAC SPEAKS THE FILES (Part 81, issue 121): speak.js writes rounds/<round>/voices.json and one
// audio file per answered seat; a frame whose seat has a file carries it, and the page plays the
// file instead of asking the browser to speak. No file, the browser path as before.
var voicesCache={};
function voicesOf(round){
  if(voicesCache[round]!==undefined)return voicesCache[round];
  var p=path.join(runDir,'rounds',round,'voices.json'), v=null;
  if(fs.existsSync(p)){ try{ v=JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ v=null; } }
  voicesCache[round]=v; return v;
}
// Part 82: every rendered voice for the seat rides with the frame (voice name to file and seconds),
// the seat's own voice first; a render listed but missing on disk is left out.
function voiceFile(round,seatId){
  var v=voicesOf(round); if(!v||!v.files||!v.files[seatId])return null;
  var f=v.files[seatId]; if(!fs.existsSync(path.join(runDir,'rounds',round,f)))return null;
  var voice=(v.assigned&&v.assigned[seatId])||'';
  var renders={};
  var own=(v.renders&&v.renders[seatId]&&v.renders[seatId][voice])||null;
  renders[voice]={src:'rounds/'+round+'/'+f,seconds:own&&typeof own.seconds==='number'?own.seconds:(v.seconds&&typeof v.seconds[seatId]==='number'?v.seconds[seatId]:null)};
  var rs=(v.renders&&v.renders[seatId])||{};
  Object.keys(rs).forEach(function(name){
    if(name===voice||!rs[name]||!rs[name].file)return;
    if(!fs.existsSync(path.join(runDir,'rounds',round,rs[name].file)))return;
    renders[name]={src:'rounds/'+round+'/'+rs[name].file,seconds:typeof rs[name].seconds==='number'?rs[name].seconds:null};
  });
  return {src:'rounds/'+round+'/'+f,voice:voice,renders:renders};
}
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

var noRoundsLine=newestDraft?'No rounds yet. The draft'+(hasBrief?' and the brief are':' is')+' stored; no seat has read it. Next: '+lib.CMD.sparring+' for the first reads and ratings, or '+lib.CMD.battle+' to start with the discussion.'
  :'No rounds yet. The brief is stored; there is no draft yet. Next: '+lib.CMD.sparring+' or '+lib.CMD.battle+' with the draft pasted; it joins this run.';

// The page (Part 106): one screen, the look as data. The frame is a grid of four rows: the
// strip (the motto, the run, the round line, the tabs, the theme button); the top box (the
// draft at full width beside a column with the brief and the reader; the scoreboard and the
// run details under the tabs in the same box); the hand (one card per seat, side by side, in
// its company's identity: the rating as the corner index, the company as the suit, the verdict
// large, the byline, the full read on the card scrolling inside it, the read-aloud controls);
// the bar (every seat's latest number in its company colour, the next commands). Under
// 1100 px the rows stack and the page scrolls. The tokens and the identity table below are the
// data a theme changes; the markup never hard-wires a colour or a face.
var companies=seats.map(function(s){return s.company;}).filter(function(v,i,a){return a.indexOf(v)===i;});
// A company's identity: a class on the card and on its score in the bar, from the table in the
// CSS below; a company not in the table takes the default identity (`co-other`).
var IDENTITIES={anthropic:'anthropic',alibaba:'alibaba',openai:'openai'};
function coClass(company){ var k=String(company||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,''); return 'co-'+(IDENTITIES[k]||'other'); }
// The four faces, embedded as data so every user sees the same board with no network (the OFL
// texts ride in LICENSES/ and NOTICE). A missing file falls back to the system face named in the CSS.
var FONTS=[
  {family:'Source Serif 4',file:'source-serif-4.woff2',weight:'400 700'},
  {family:'Manrope',file:'manrope.woff2',weight:'400 800'},
  {family:'JetBrains Mono',file:'jetbrains-mono.woff2',weight:'400 700'},
  {family:'Inter',file:'inter.woff2',weight:'400 800'}
];
function fontFaces(){
  return FONTS.map(function(f){
    var p=path.join(__dirname,'..','fonts',f.file);
    if(!fs.existsSync(p))return '';
    return '@font-face{font-family:"'+f.family+'";font-style:normal;font-weight:'+f.weight+';font-display:swap;src:url(data:font/woff2;base64,'+fs.readFileSync(p).toString('base64')+')format("woff2")}';
  }).join('');
}
var UI='Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
var html=[];
html.push('<!doctype html>');
html.push('<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
html.push('<title>Combat Writing board — '+esc(path.basename(runDir))+'</title>');
html.push('<style>');
html.push(fontFaces());
// The tokens: light, then dark under the system setting and under the toggle. The dark set is
// designed for a dark surface, not inverted (the pinned pages, cw-crew-art comps/board/).
html.push(':root{color-scheme:light;--surface:#ECE9E1;--paper:#FFFDF8;--surface-2:#F6F3EC;--ink:#111111;--ink-2:#4A4640;--ink-3:#5E5952;--read-ink:#111111;--rule:#CFC9BC;--rule-2:#D9D4C8;--btn:#FFFDF8;--btn-rule:#B5AFA2;--cmd:#FFFDF8;--cmd-rule:#CFC9BC;--send:#1a6b3a;--good:#1a7f37;--bad:#c62828;--c-anthropic:#C2410C;--c-alibaba:#1D4ED8;--c-openai:#1F2937;--c-other:#4A4640;}');
var DARK='color-scheme:dark;--surface:#0F1114;--paper:#1B1E24;--surface-2:#171A1F;--ink:#F3F1EA;--ink-2:#B5B0A6;--ink-3:#A8A399;--read-ink:#E6E2D8;--rule:#2B3038;--rule-2:#343941;--btn:#23272E;--btn-rule:#3A404A;--cmd:#171A1F;--cmd-rule:#3A404A;--send:#2e8b57;--good:#4caf6e;--bad:#ef6b6b;--c-anthropic:#F09A74;--c-alibaba:#7FB0FF;--c-openai:#C9D4DE;--c-other:#B5B0A6;';
html.push('@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){'+DARK+'}}');
html.push(':root[data-theme="dark"]{'+DARK+'}');
// The frame.
html.push('*{box-sizing:border-box}html,body{height:100%}body{margin:0;background:var(--surface);color:var(--ink);font-family:'+UI+';-webkit-font-smoothing:antialiased}main.board{height:100dvh;min-height:900px;padding:12px 24px;display:grid;grid-template-rows:auto minmax(0,3fr) minmax(0,7fr) auto;gap:12px;overflow:hidden}main.board.norounds{grid-template-rows:auto minmax(0,1fr) auto}');
html.push('@media (max-width:1100px){main.board,main.board.norounds{height:auto;min-height:100dvh;overflow:visible;grid-template-rows:auto auto auto auto}main.board .top{grid-template-columns:1fr}main.board .hand{grid-template-columns:1fr;overflow:visible}main.board .frame{max-height:80vh}}');
// The strip.
html.push('.strip{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap;border-bottom:1px solid var(--rule);padding-bottom:10px}.strip .left{display:flex;align-items:baseline;gap:22px;flex-wrap:wrap;min-width:0}.strip .right{display:flex;gap:4px;align-items:center;flex-wrap:wrap}.kicker{font:700 11px/1.4 '+UI+';letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin:0}h1{margin:0;font:700 15px/1.3 '+UI+';letter-spacing:-.01em}.round{margin:0;font:13.5px/1.5 '+UI+';color:var(--ink-2);overflow-wrap:anywhere}.round b{color:var(--ink)}.round.shipped{flex-basis:100%}');
html.push('.tab{font:700 11px/1 '+UI+';letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2);background:transparent;border:1px solid transparent;padding:8px 12px;border-radius:6px;cursor:pointer;min-height:36px}.tab[aria-selected="true"]{color:var(--ink);background:var(--btn);border-color:var(--rule)}button.plain,#theme{font:600 12px/1 '+UI+';color:var(--ink);background:var(--btn);border:1px solid var(--btn-rule);border-radius:6px;padding:9px 12px;cursor:pointer;min-height:36px;margin-left:10px}');
// The top box: the panels under the tabs, the side column.
html.push('.top{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:24px;min-height:0;background:var(--surface-2);border:1px solid var(--rule);border-radius:8px;padding:16px 24px}.panels{overflow:auto;min-height:0}.panel[hidden]{display:none}h2{font:700 11px/1.4 '+UI+';letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px}.panel h2+h2{margin-top:18px}.meta{color:var(--ink-2);font:13px/1.5 '+UI+';margin:8px 0}.note{font:12.5px/1.5 '+UI+';color:var(--ink-2)}');
html.push('.paper{font-family:"Source Serif 4",Georgia,serif;font-size:17.5px;line-height:1.5;overflow-wrap:anywhere}.paper p{margin:0 0 .8em}.paper p:last-child{margin:0}.canon-controls{margin:0 0 10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font:13px/1.5 '+UI+';color:var(--ink-2)}.canon-controls button:disabled{opacity:.5;cursor:default}');
html.push('.side{overflow:auto;min-height:0;display:flex;flex-direction:column;gap:8px;font:12.5px/1.45 '+UI+';border-left:1px solid var(--rule);padding-left:18px;color:var(--ink-2)}.side p{margin:0;overflow-wrap:anywhere}.side b{color:var(--ink)}.side .under{margin-top:auto;font-size:11.5px}');
// The hand: one card per seat in its company identity.
html.push('.hand{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:18px;min-height:0;overflow:auto}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.frame>.full{min-height:0;flex:1 1 auto}.frame>.suit,.frame>.badge,.frame>blockquote,.frame>figcaption,.frame>.final,.frame>.rewrite,.frame>.read-controls{flex:0 0 auto}');
html.push('.frame{position:relative;margin:0;background:var(--paper);padding:46px 24px 20px;display:flex;flex-direction:column;gap:9px;color:var(--ink);min-height:0;overflow:hidden;border:2px solid var(--c-other);border-radius:10px}.frame .ix{position:absolute;font:800 40px/1 '+UI+';letter-spacing:-.03em;font-variant-numeric:tabular-nums;color:var(--c-other)}.frame .ix small{display:block;font:700 10px/1.2 '+UI+';letter-spacing:.12em;text-transform:uppercase}.frame .ix.tl{top:14px;left:18px}.frame .ix.br{right:18px;bottom:12px;transform:rotate(180deg)}.frame .suit{font:800 11px/1 '+UI+';letter-spacing:.22em;text-transform:uppercase;text-align:center;color:var(--c-other)}');
html.push('.badge{font:600 11px/1.4 '+UI+';letter-spacing:.1em;text-transform:uppercase;text-align:center;color:var(--ink-2)}.badge.failed,.badge.missing{color:var(--bad)}.badge .mark{font-weight:400;letter-spacing:0;text-transform:none;margin-left:6px}.flip-valid .badge .mark{color:var(--good)}.flip-invalid .badge .mark{color:var(--bad)}');
html.push('.frame blockquote{margin:0;padding:0;font:700 20px/1.3 '+UI+';text-align:center;overflow-wrap:anywhere}.frame figcaption{font:500 12px/1.5 '+UI+';color:var(--ink-2);text-align:center}.frame figcaption .seat{color:var(--ink-3)}.frame figcaption .note-line{display:block;margin-top:4px}.frame .final{font:12px/1.4 '+UI+';color:var(--ink-2);text-align:center;margin:0}');
html.push('.frame .rewrite{font-size:14px;line-height:1.5;max-height:30%;overflow:auto;border-top:1px solid var(--rule-2);padding-top:8px}.read-controls{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;font:12px/1.4 '+UI+';color:var(--ink-2)}.read-controls button,.canon-controls button{font:600 12px/1 '+UI+';color:var(--ink);background:var(--btn);border:1px solid var(--btn-rule);border-radius:999px;padding:9px 12px;cursor:pointer;min-height:36px}.read-controls button:disabled{opacity:.5;cursor:default}.read-controls select.seat-voice{font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:6px;padding:2px 6px;max-width:18em}');
html.push('.full{display:flex;flex-direction:column;min-height:0;margin:0}.full>.fold{font:600 12px/1.5 '+UI+';color:var(--ink-2);border-top:1px solid var(--rule-2);padding:8px 44px 0;text-align:center;margin:8px 0 0}.read{text-align:left;font-size:14.5px;line-height:1.55;color:var(--read-ink);margin:0;overflow:auto;min-height:0;flex:1 1 auto;overflow-wrap:anywhere}.read p{margin:0 0 .7em}.read ul,.read ol{margin:0 0 .7em 1.3em;padding:0}.read li{margin:0 0 .3em}.read code{font-size:13px;background:var(--surface-2);padding:0 4px;border-radius:3px}.read.failed{color:var(--ink-2)}details.fold{margin-top:8px}details.fold>summary{cursor:pointer;font:13px/1.5 '+UI+';color:var(--ink-2)}');
// The identity table, one entry per company: the face of the verdict and the read, the frame's
// rule and shape, the accent on the index, the suit and the score.
html.push('figure.co-anthropic{border:3px double var(--c-anthropic);border-radius:14px}figure.co-anthropic .ix,figure.co-anthropic .suit{color:var(--c-anthropic)}figure.co-anthropic blockquote{font:600 25px/1.3 "Source Serif 4",Georgia,serif;font-size:clamp(17px,1.75vw,25px)}figure.co-anthropic .read{font-family:"Source Serif 4",Georgia,serif;font-size:15.5px;line-height:1.55}');
html.push('figure.co-alibaba{border:2px solid var(--c-alibaba);border-radius:22px}figure.co-alibaba .ix,figure.co-alibaba .suit{color:var(--c-alibaba)}figure.co-alibaba blockquote{font:800 23px/1.3 Manrope,system-ui,sans-serif;letter-spacing:-.01em;font-size:clamp(16px,1.6vw,23px)}figure.co-alibaba .read{font-family:Manrope,system-ui,sans-serif;font-size:14.5px;line-height:1.6}');
html.push('figure.co-openai{border:4px solid var(--c-openai);border-radius:6px}figure.co-openai .ix,figure.co-openai .suit{color:var(--c-openai)}figure.co-openai blockquote{font:700 18px/1.4 "JetBrains Mono",ui-monospace,monospace;font-size:clamp(13px,1.3vw,18px)}figure.co-openai .read{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:13px;line-height:1.55}');
html.push('.score.co-anthropic{color:var(--c-anthropic)}.score.co-alibaba{color:var(--c-alibaba)}.score.co-openai{color:var(--c-openai)}.score.co-other{color:var(--c-other)}');
// The bar, the tables.
html.push('.bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--rule);padding-top:10px;font:12px/1.5 '+UI+';color:var(--ink-2)}.scores{display:flex;gap:12px;flex-wrap:wrap;font:700 13px/1.4 '+UI+'}.bar .kicker+.kicker,.bar .scores+.kicker{margin-left:14px}.cmd{font:500 12.5px/1 "JetBrains Mono",ui-monospace,monospace;color:var(--ink);background:var(--cmd);border:1px solid var(--cmd-rule);padding:9px 11px;border-radius:4px}');
html.push('table{border-collapse:collapse;width:100%;font:13px/1.45 '+UI+';margin-top:8px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--rule);vertical-align:top;overflow-wrap:anywhere}th{color:var(--ink-2);font-weight:600}td.num{font-variant-numeric:tabular-nums;white-space:nowrap}.mark{color:var(--ink-2);font-size:12px}td.flip-valid .mark{color:var(--good)}td.flip-invalid .mark{color:var(--bad)}.missing,.failed{color:var(--ink-3);font-style:italic}.critique{color:var(--ink-2)}code{font-size:13px}.rounds{list-style:none;padding:0;margin:14px 0 0;font:13px/1.5 '+UI+';color:var(--ink-2)}.rounds li{padding:4px 0;border-bottom:1px solid var(--rule);overflow-wrap:anywhere}.rounds b{color:var(--ink)}a{color:inherit}');
html.push('</style></head><body>');

// The round strip: the latest round's task, visible with nothing opened.
// roundLine renders one round for the strip and for the history under the scoreboard tab.
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
    parts[0]=(task.kind==='seat'?'seat lines to ':esc(lib.taskLine(task))+' · put to ')+a.put.map(function(s){var n=seatNote(round,s.id);return esc(s.id)+(n?' (“'+esc(n)+'”)':'');}).join(', ');
  }
  var r=lib.ratingLine(task,round); if(r)parts.push(esc(r));
  parts.push(a.done.length+' of '+a.put.length+' seat'+(a.put.length===1?'':'s')+' answered');
  return '<b>Round '+esc(round)+'</b> · '+parts.join(' · ');
}

// The Shipped strip: the latest shipping, visible with nothing opened. The
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

// 1. The strip.
html.push('<main class="board'+(tableRounds.length?'':' norounds')+'">');
html.push('<header class="strip"><div class="left"><p class="motto kicker">Reading is Peace. Writing is War.</p><h1>Combat Writing board — '+esc(path.basename(runDir))+'</h1>');
if(rounds.length)html.push('<p class="round">'+roundLine(rounds[rounds.length-1])+'</p>');
if(lastShip)html.push('<p class="round shipped"><b>Shipped</b> · '+esc(lib.shippedLine(lastShip).replace(/^Shipped /,''))+(lastShip.url?' · '+esc(lib.stripScheme(lastShip.url)):'')+' · '+nResults+' result'+(nResults===1?'':'s')+' · '+nInsights+' insight'+(nInsights===1?'':'s')+'</p>');
html.push('</div><div class="right"><div class="tabs" role="tablist" aria-label="The board"><button type="button" role="tab" class="tab" id="tab-draft" aria-selected="true" aria-controls="panel-draft">Draft</button><button type="button" role="tab" class="tab" id="tab-scoreboard" aria-selected="false" aria-controls="panel-scoreboard">Scoreboard</button><button type="button" role="tab" class="tab" id="tab-details" aria-selected="false" aria-controls="panel-details">Run details</button></div><button type="button" id="theme" aria-label="Switch light and dark">Light / dark</button></div></header>');

// 2. The top box: the draft panel, the scoreboard panel, the run details panel; the side column.
html.push('<section class="top"><div class="panels">');
html.push('<section class="panel" id="panel-draft" role="tabpanel" aria-labelledby="tab-draft">');
if(newestDraft){
  var canonClause=!canonFile?'':canonCurrent?' · shipped as '+esc(canonFile)+(canonFroze?', which froze '+esc(canonFroze):''):' · '+esc(canonFile)+' froze '+esc(canonFroze||'an earlier draft')+'; this revision is not shipped';
  html.push('<h2>The draft'+(newestDraft!=='draft.md'?' · '+esc(newestDraft)+', a revision':'')+canonClause+'</h2>');
  if(!rounds.length)html.push('<p class="meta">'+esc(noRoundsLine)+'</p>');
  // The canon controls, only when the run holds a canon: read aloud, copy,
  // download, all on the canon text exactly, all in the browser, nothing fetched.
  if(canonFile){
    html.push('<div class="canon-controls" aria-label="The canon, '+esc(canonFile)+'"><span class="meta">Canon: '+esc(canonFile)+(canonFroze?' froze '+esc(canonFroze):'')+'</span> <button type="button" id="canon-speak" aria-label="Read the canon aloud">🔊 Read aloud</button> <button type="button" id="canon-pause" aria-label="Pause or resume the reading" disabled>Pause</button> <button type="button" id="canon-stop" aria-label="Stop the reading" disabled>Stop</button> <button type="button" id="canon-copy" aria-label="Copy the canon text">Copy</button> <button type="button" id="canon-download" aria-label="Download the canon as a text file">Download .txt</button> <span class="meta" id="canon-status" aria-live="polite"></span></div>');
    html.push('<div id="canon-text" hidden>'+esc(canonText)+'</div>');
  }
  html.push('<div class="paper">'+paras(lib.readText(path.join(runDir,newestDraft)))+'</div>');
}else{
  html.push('<h2>The draft</h2><p class="meta">None yet. The brief is stored; the draft joins the run when sparring or battle brings it.</p>');
  if(!rounds.length)html.push('<p class="meta">'+esc(noRoundsLine)+'</p>');
}
html.push('</section>');

// The scoreboard panel: every round.
html.push('<section class="panel" id="panel-scoreboard" role="tabpanel" aria-labelledby="tab-scoreboard" hidden>');
if(rounds.length){
  html.push('<h2>Every round: the scoreboard</h2>');
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
          html.push('<details class="fold"><summary>'+esc(lib.seatLabel(s))+' · '+esc(r)+' · '+(x.c==='sn'?'S/N read':'red-flag read')+' ('+x.words+' words)</summary><div class="read">'+read(x.answer)+'</div></details>');
        });
      });
    });
  }
}else{
  html.push('<h2>Every round: the scoreboard</h2><p class="meta">'+esc(noRoundsLine)+'</p>');
}
html.push('</section>');

// The run details panel: the champion's lines when the log holds any, then the run details.
html.push('<section class="panel" id="panel-details" role="tabpanel" aria-labelledby="tab-details" hidden>');
if(champ.length){
  html.push('<h2>Champion: shipped, results, insights</h2>');
  html.push('<p class="note">What was shipped, what came back, and what the run taught. The live and match marks are measured by code against the page text the host saved, never by a seat.</p>');
  if(!shipped.length)html.push('<p class="meta"><strong>Shipped:</strong> not recorded.</p>');
  champ.forEach(function(e){
    if(e.event==='champion.shipped')html.push('<p class="meta"><strong>Shipped:</strong> '+esc(lib.shippedLine(e).replace(/^Shipped /,''))+(e.url?' · '+esc(lib.stripScheme(e.url)):'')+'</p>');
    else if(e.event==='champion.result')html.push('<p class="meta"><strong>Result:</strong> '+esc(lib.dateUtc(e.at))+' · '+esc(String(e.text||'').replace(/\s+/g,' ').trim())+'</p>');
    else if(e.event==='champion.insight')html.push('<p class="meta"><strong>Insight:</strong> '+esc(lib.dateUtc(e.at))+' · '+esc(e.text)+' · '+esc(e.vault)+'</p>');
  });
}
html.push('<h2>Run details</h2>');
html.push('<p class="meta"><strong>Crew:</strong> '+esc(seats.map(lib.seatLabel).join('; '))+'. '+(companies.length===1?'One company\'s models ('+esc(companies[0])+').':companies.length+' companies: '+esc(companies.join(', '))+'.')+' '+esc(lib.nameSources(seats))+'</p>');
lib.crewStateLines(runDir,seats,log).forEach(function(l){ html.push('<p class="meta"><strong>Seats:</strong> '+esc(l)+'</p>'); });
html.push('<p class="meta"><strong>Seat key:</strong> '+esc(lib.seatKey(seats))+'</p>');
html.push('<p class="meta"><strong>Drafts:</strong> '+(drafts.length?esc(drafts.map(function(d){return d+' ('+lib.draftFactsLine(lib.draftFacts(lib.readText(path.join(runDir,d))))+')';}).join(', '))+'.':'none yet; the draft joins the run when sparring or battle brings it.')+(hasBrief?' <strong>Brief'+(briefName?' ('+esc(briefName)+', combat-writing/briefs/'+esc(briefName)+'.md)':'')+':</strong> '+esc(lib.readText(path.join(runDir,'brief.md')).trim()):'')+'</p>');
// The counts every packet carries: the person sees what the seats were told.
if(newestDraft)html.push('<p class="meta facts"><strong>'+esc(lib.FACTS_HEADING)+':</strong> '+esc(lib.draftFactsFull(lib.draftFacts(lib.readText(path.join(runDir,newestDraft)))))+'.</p>');
// The reader (Part 84): under the brief, this run's own, as every packet carries it.
if(readerText!==null)html.push('<p class="meta reader"><strong>Reader:</strong> '+esc(readerText)+' <span class="note">(who this piece is for, from the author; this run\'s own, carried in every packet after the brief)</span></p>');
html.push('<p class="meta"><strong>Started at:</strong> '+esc(lib.startedAtLine(runDir,log,rounds))+'</p>');
// The price of every round (issue 95), here and not on the terminal: accessible, not presented.
var budgetLines=lib.budgetLines(runDir,log);
if(budgetLines.length)html.push('<p class="meta"><strong>Packets:</strong> '+esc('Tokens are estimated at four characters each, the add-on\'s rule. '+budgetLines.join(' '))+'</p>');
if(!rounds.length)html.push('<p class="note">'+esc(noRoundsLine)+'</p>');
html.push('<p class="note">The full record, every answer in full and the log of what was sent, is <a href="record.md">record.md</a> in this folder.</p>');
html.push('</section>');
html.push('</div>');
// The side column: the brief, the reader, the pointer.
html.push('<aside class="side" aria-label="The brief and the reader">');
if(hasBrief)html.push('<p><b>Brief.</b> '+esc(lib.readText(path.join(runDir,'brief.md')).trim())+'</p>');
if(readerText!==null)html.push('<p><b>Reader.</b> '+esc(readerText)+'</p>');
if(!hasBrief&&readerText===null)html.push('<p>No brief and no reader on this run.</p>');
html.push('<p class="under">Measured facts, the full brief and the record are under Run details.</p>');
html.push('</aside></section>');

// 3. The hand: one card per seat.
if(tableRounds.length){
  html.push('<h2 class="sr">The seats</h2>');
  html.push('<section class="hand" aria-label="The seats">');
  seats.forEach(function(s){
    var t=latestTurn(s);
    var c=t?t.cell:null;
    var kind=c?c.kind:'unread';
    var badge, quote, fold='', ix='';
    if(!c){ badge='<span class="badge missing">Not yet read</span>'; quote='This seat has not been put to the draft yet.'; }
    else if(c.kind==='missing'){ badge='<span class="badge missing">Missing</span>'; quote='No answer this round. Nothing stands in for it.'; }
    else if(c.kind==='failed'){
      badge='<span class="badge failed">Failed read'+(c.mark?'<span class="mark">'+esc(c.mark)+'</span>':'')+'</span>';
      quote='Failed read: '+c.reasons[0]+'.';
      fold='<div class="full"><div class="read failed">'+read(c.answer)+'</div><p class="fold">The failed read ('+c.words+' words)</p></div>';
    }else{
      badge=c.kind==='critique'
        ?'<span class="badge critique">'+(c.rewrite?(c.copy?'Rewrite · a copy of '+esc(c.copy.model)+'\'s':'Rewrite · no rating asked'):'Critique · no rating asked')+(c.mark&&!c.copy?'<span class="mark">'+esc(c.mark)+'</span>':c.mark&&c.copy&&c.mark!==lib.copyMark(c.copy)?'<span class="mark">'+esc(c.mark.replace(lib.copyMark(c.copy),'').replace(/^ · | · $/g,''))+'</span>':'')+'</span>'
        :'<span class="badge'+(c.rewrite||c.mark?'':' sr')+'">Rating '+c.rating+'/10'+(c.rewrite?' · rewrite':'')+(c.mark?'<span class="mark">'+esc(c.mark)+'</span>':'')+'</span>';
      // The corner index: the seat's own number, large, top-left and again bottom-right.
      if(c.rating!==null&&c.rating!==undefined)ix='<span class="ix tl" aria-hidden="true">'+c.rating+'<small>of 10</small></span><span class="ix br" aria-hidden="true">'+c.rating+'<small>of 10</small></span>';
      quote=lib.verdictLine(c.answer,c.contract)||'(no words after the first line)';
      // The second pass of a first round (issue 88): under the read and in the spoken text.
      var crew=t?lib.crewPassOf(runDir,t.round,s.id,log):null;
      var crewHtml=crew?'<p><strong>'+esc(lib.CREW_PASS_HEADING)+'</strong></p>'+read(crew.text):'';
      var spoken=lib.spokenPlain(c.answer,crew?crew.text:null);
      // Read aloud (issue 82): the answer as plain text in the page, the controls on the card; the
      // script below wires every card to the browser's speech synthesis, one seat at a time.
      // The rewrite (issue 103): the whole of it on the card, before the read; the quote above is its opening.
      fold=(c.rewrite?'<div class="read rewrite"><p class="meta">The rewrite, in full:</p>'+read(c.rewrite)+'</div>':'')
        +'<div class="read-controls"><button type="button" class="seat-speak" aria-label="Read this seat\'s '+(c.kind==='critique'?'critique':'read')+' aloud">🔊 Read aloud</button> <button type="button" class="seat-pause" aria-label="Pause or resume the reading" disabled>Pause</button> <button type="button" class="seat-stop" aria-label="Stop the reading" disabled>Stop</button> <select class="seat-voice" aria-label="Voice for this seat" hidden><option value="">Voice: automatic</option></select> <span class="meta seat-status" aria-live="polite"></span></div>'
        +'<div class="seat-text" hidden>'+esc(spoken)+'</div>'
        +'<div class="full"><div class="read">'+read(cardText(c.answer))+crewHtml+'</div><p class="fold">The full '+(c.kind==='critique'?'critique':'read')+' ('+c.words+' words'+(crew?', then '+crew.words+' to the crew':'')+')</p></div>';
    }
    var finalLine='';
    if(finalRounds.length){ var f=finalCell(s,finalRounds[finalRounds.length-1]); finalLine='<p class="final">'+esc(finalRounds[finalRounds.length-1])+': '+esc(finalText(f))+'</p>'; }
    var note=t?seatNote(t.round,s.id):null;
    var vf=t&&c&&c.kind!=='missing'&&c.kind!=='not-asked'?voiceFile(t.round,s.id):null;
    html.push('<figure class="frame '+esc(kind)+' '+coClass(s.company)+'" data-seat="'+esc(s.id)+'"'+(vf?' data-audio="'+esc(vf.src)+'" data-voice="'+esc(vf.voice)+'" data-renders="'+esc(JSON.stringify(vf.renders))+'"':'')+'>'+ix+'<span class="suit">'+esc(s.company)+'</span>'+badge+'<blockquote>'+esc(quote)+'</blockquote><figcaption>— '+esc(lib.seatLabel(s))+(t?' <span class="seat">· round '+esc(t.round)+'</span>':'')+(note?' <span class="note-line">· your note: “'+esc(note)+'”</span>':'')+'</figcaption>'+finalLine+fold+'</figure>');
  });
  html.push('</section>');
}

// 4. The bar: every seat's latest number in its company colour, the next commands.
html.push('<footer class="bar"><span class="kicker">Every round</span><span class="scores">'+seats.map(function(s){var lr=latestRating(s);return '<span class="score '+coClass(s.company)+'">'+esc(s.id)+' '+(lr?lr.rating+'/10':'—')+'</span>';}).join('')+'</span>');
html.push('<span class="kicker">Next</span><span class="cmd">'+esc(lib.CMD.battle)+' fq: a question for every seat</span><span class="cmd">'+esc(lib.CMD.sparring)+' debate</span><span class="cmd">'+esc(lib.CMD.battle)+' final</span></footer>');
html.push('<script>');
html.push('(function(){var b=document.getElementById("theme");var r=document.documentElement;b.addEventListener("click",function(){var dark=r.getAttribute("data-theme")==="dark"||(r.getAttribute("data-theme")!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.setAttribute("data-theme",dark?"light":"dark");});})();');
// The tabs: one panel shown at a time in the top box; the draft first.
html.push('(function(){var tabs=document.querySelectorAll(".tab");function show(id){for(var i=0;i<tabs.length;i++){var t=tabs[i],on=t.getAttribute("aria-controls")===id;t.setAttribute("aria-selected",on?"true":"false");var p=document.getElementById(t.getAttribute("aria-controls"));if(p)p.hidden=!on;}}for(var i=0;i<tabs.length;i++)tabs[i].addEventListener("click",function(e){show(e.currentTarget.getAttribute("aria-controls"));});})();');
// Read aloud on every read frame (issue 82): the browser's own speech synthesis, the seat's answer as the
// plain text in the page, one seat at a time (starting one cancels another). No request leaves the page.
// A voice per seat (issue 101): seat-1 reads in
// the browser's default voice as before; every later seat gets its own from the browser's list, the
// page's language first, the standard voices by name first (issue 109: sorted by name alone the picker
// landed on macOS's novelty voices, Albert and Bad News, measured in Chromium), the novelty set
// skipped, the machine's own voices next, then by name, seat-2 the first of them and seat-3 the
// second, so a seat sounds the same every time on one machine. The list is asked for at page open and
// the picks are cleared when the browser's list arrives, so a first click never lands every seat on the
// default. Another machine has other
// voices. The canon's reader is unchanged. Nothing is sent anywhere.
// Issue 111 (measured in Safari: seats 2 and 3 read in seat-1's voice, the
// status line naming none): Safari fills its voice list late, and the picker asked once at open. Now
// every Read aloud waits for the list (voiceschanged or 1.5 s), the utterance carries the voice's
// language too, a menu on every read frame lets the person pick a voice for that seat, remembered
// in this browser (localStorage, never a file), automatic by default, and the status line says when
// no other voice was found and how many the list held.
// Part 76, THE VOICE FLOOR (issue 114): automatic picks only from voices named Premium or Enhanced in the page's language,
// Premium above Enhanced, then ORDER, then by name, seat k the k-th distinct one, wrapping; with none
// installed every seat reads in the browser default and the menu stays hidden. The stock list and the
// novelty set are gone: no stock voice is ever picked for anyone. The help names where macOS keeps
// the downloads.
// Part 76.1 (issue 119, measured in Safari after Part 76: seats 1 and 3 on the
// default with "68 voices in the list", seat 2 in Daniel): Safari names the premium and enhanced
// voices plainly ("Ava") and carries the mark in the identifier (com.apple.voice.premium.en-US.Ava),
// so tier() reads the name or the identifier; a pick remembered from an older board is honored only
// when it is in the quality pool, else cleared; the fallback line names what was looked for.
html.push('(function(){var synth=window.speechSynthesis;var frames=document.querySelectorAll(".frame");var playing=null;var ORDER=["Ava","Nathan","Allison","Zoe","Samantha","Evan","Joelle","Noelle","Tom","Susan","Nicky","Aaron"];function tier(v){var n=String(v.name||"")+" "+String(v.voiceURI||"");return /\\(Premium\\)|\\.premium\\./i.test(n)?2:(/\\(Enhanced\\)|\\.enhanced\\./i.test(n)?1:0);}function plainName(v){var n=String(v.name||"");var p=n.indexOf(" (");return (p>0?n.slice(0,p):n).trim();}function rank(v){var i=ORDER.indexOf(plainName(v));return i<0?ORDER.length:i;}var pick={};function qualityPool(all){var lang=(document.documentElement.lang||"en").slice(0,2).toLowerCase();var pool=all.filter(function(v){return tier(v)>0&&String(v.lang||"").slice(0,2).toLowerCase()===lang;});if(!pool.length)pool=all.filter(function(v){return tier(v)>0;});pool.sort(function(a,b){return tier(b)-tier(a)||rank(a)-rank(b)||String(a.name).localeCompare(String(b.name));});return pool;}function seatNo(f){return parseInt(String(f.getAttribute("data-seat")||"").replace(/^seat-/,""),10);}function stored(k){try{return localStorage.getItem("cw.voice.seat-"+k)||"";}catch(e){return "";}}function store(k,id){try{if(id)localStorage.setItem("cw.voice.seat-"+k,id);else localStorage.removeItem("cw.voice.seat-"+k);}catch(e){}}function voiceId(v){return String(v.voiceURI||v.name)+"|"+String(v.lang||"");}function voicesNow(cb){if(!synth||!synth.getVoices){cb([]);return;}var all=synth.getVoices()||[];if(all.length){cb(all);return;}var done=false;function fire(){if(done)return;done=true;cb(synth.getVoices()||[]);}if("onvoiceschanged" in synth)synth.addEventListener("voiceschanged",fire,{once:true});setTimeout(fire,1500);}function autoVoice(k,all){if(!(k>=1))return null;if(pick[k]!==undefined)return pick[k];var pool=qualityPool(all);if(!pool.length){pick[k]=null;return null;}var v=pool[(k-1)%pool.length];pick[k]=v;return v;}function chosenVoice(f,all){var k=seatNo(f);var sel=f.querySelector(".seat-voice");var id=(sel&&sel.value)||stored(k);if(id){var pool=qualityPool(all);for(var i=0;i<pool.length;i++)if(voiceId(pool[i])===id||pool[i].name===id||plainName(pool[i])===plainName({name:id}))return pool[i];if(id.indexOf("|")>=0){store(k,"");if(sel)sel.value="";}}return autoVoice(k,all);}function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");}function rendersOf(f){try{return JSON.parse(f.getAttribute("data-renders")||"{}")||{};}catch(e){return {};}}function fillMenu(f,all){var sel=f.querySelector(".seat-voice");if(!sel)return;if(f.getAttribute("data-audio")&&f.getAttribute("data-renders"))return;var k=seatNo(f);var pool=qualityPool(all);if(!pool.length){sel.hidden=true;sel.innerHTML="<option value=\\"\\">Voice: automatic</option>";return;}sel.hidden=false;var auto=autoVoice(k,all);var id=stored(k);var opts=["<option value=\\"\\">Voice: automatic"+(auto?" ("+esc(auto.name)+")":"")+"</option>"];pool.forEach(function(v){var vid=voiceId(v);opts.push("<option value=\\""+esc(vid)+"\\""+(vid===id?" selected":"")+">"+esc(v.name)+"</option>");});sel.innerHTML=opts.join("");}voicesNow(function(all){for(var i=0;i<frames.length;i++)fillMenu(frames[i],all);});if(synth&&"onvoiceschanged" in synth)synth.addEventListener("voiceschanged",function(){pick={};var all=synth.getVoices()||[];for(var i=0;i<frames.length;i++)fillMenu(frames[i],all);});function wire(f){var t=f.querySelector(".seat-text"),speak=f.querySelector(".seat-speak"),pause=f.querySelector(".seat-pause"),stop=f.querySelector(".seat-stop"),st=f.querySelector(".seat-status"),sel=f.querySelector(".seat-voice");if(!t||!speak)return;var audioSrc=f.getAttribute("data-audio"),renders=audioSrc?rendersOf(f):{},current=f.getAttribute("data-voice")||"";var kept=audioSrc?stored(seatNo(f)):"";if(kept&&renders[kept]){current=kept;audioSrc=renders[kept].src;}var au=audioSrc?new Audio(audioSrc):null;if(au)au.preload="none";var held=false;function say(m){st.textContent=m;}function idle(){held=false;pause.disabled=true;stop.disabled=true;pause.textContent="Pause";speak.disabled=false;if(playing===f)playing=null;}function setRender(name){if(!renders[name])return;if(au&&playing===f){au.pause();idle();}current=name;audioSrc=renders[name].src;au=new Audio(audioSrc);au.preload="none";}if(sel&&audioSrc){var names=Object.keys(renders),dflt=f.getAttribute("data-voice")||"";var o=[];names.forEach(function(n){o.push("<option value=\\""+esc(n)+"\\""+(n===current?" selected":"")+">"+esc(n)+(n===dflt?" (default)":"")+"</option>");});sel.innerHTML=o.join("");sel.hidden=names.length<2;}if(sel)sel.addEventListener("change",function(){if(renders[sel.value]){setRender(sel.value);store(seatNo(f),sel.value);say(sel.value+" for this seat, kept in this browser for every run.");return;}if(audioSrc)return;store(seatNo(f),sel.value);say(sel.value?"Voice set for this seat in this browser.":"Voice back to automatic.");});');
html.push('speak.addEventListener("click",function(){if(au){if(playing&&playing!==f&&playing.idle)playing.idle();if(synth&&synth.cancel)synth.cancel();au.currentTime=0;au.onended=function(){say("Finished playing.");idle();};au.onerror=function(){say("The audio file could not be played; reading with the browser instead.");au=null;idle();speak.click();};var pr=au.play();say("Playing "+(current||"the file")+", a file the Mac rendered.");pause.disabled=false;stop.disabled=false;speak.disabled=true;playing=f;if(pr&&pr.catch)pr.catch(function(){say("The audio file could not be played; reading with the browser instead.");au=null;idle();speak.click();});return;}if(!synth||!window.SpeechSynthesisUtterance){say("This browser has no speech synthesis.");return;}if(playing&&playing!==f&&playing.idle)playing.idle();synth.cancel();speak.disabled=true;say("Finding a voice.");voicesNow(function(all){var u=new SpeechSynthesisUtterance(t.textContent);var v=chosenVoice(f,all);if(v){u.voice=v;u.lang=v.lang||u.lang;}var k=seatNo(f);u.onstart=function(){say(v?"Reading aloud in the voice "+v.name+".":"Reading aloud in the browser default voice: no voice named or identified as Premium or Enhanced among the "+all.length+" in the list.");pause.disabled=false;stop.disabled=false;speak.disabled=true;playing=f;};u.onend=function(){say("Finished reading.");idle();};u.onerror=function(e){var why=e&&e.error?e.error:"";if(why!=="interrupted"&&why!=="canceled")say("Reading stopped"+(why?": "+why:"")+".");idle();};synth.speak(u);});});');
html.push('pause.addEventListener("click",function(){if(au){if(held){held=false;au.play();pause.textContent="Pause";say("Resumed.");}else{held=true;au.pause();pause.textContent="Resume";say("Paused.");}return;}if(!synth)return;if(held){held=false;synth.resume();pause.textContent="Pause";say("Resumed.");}else{held=true;synth.pause();pause.textContent="Resume";say("Paused.");}});stop.addEventListener("click",function(){if(au){au.pause();au.currentTime=0;say("Stopped.");idle();return;}if(!synth)return;synth.cancel();say("Stopped.");idle();});f.idle=idle;}for(var i=0;i<frames.length;i++)wire(frames[i]);})();');
if(canonFile){
  // The canon controls: the browser's own speech synthesis (the system's voices), the clipboard,
  // and a download built from the text in the page. No request leaves the page.
  html.push('(function(){var t=document.getElementById("canon-text");if(!t)return;var text=t.textContent;var speak=document.getElementById("canon-speak"),pause=document.getElementById("canon-pause"),stop=document.getElementById("canon-stop"),copy=document.getElementById("canon-copy"),dl=document.getElementById("canon-download"),st=document.getElementById("canon-status");function say(m){st.textContent=m;}var synth=window.speechSynthesis;var held=false;function idle(){held=false;pause.disabled=true;stop.disabled=true;pause.textContent="Pause";speak.disabled=false;}');
  html.push('speak.addEventListener("click",function(){if(!synth||!window.SpeechSynthesisUtterance){say("This browser has no speech synthesis.");return;}synth.cancel();var u=new SpeechSynthesisUtterance(text);u.onstart=function(){say("Reading the canon aloud.");pause.disabled=false;stop.disabled=false;speak.disabled=true;};u.onend=function(){say("Finished reading.");idle();};u.onerror=function(e){var why=e&&e.error?e.error:"";if(why!=="interrupted"&&why!=="canceled")say("Reading stopped"+(why?": "+why:"")+".");idle();};synth.speak(u);});');
  // The engine's own paused flag changes asynchronously (measured in Chromium), so the
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
