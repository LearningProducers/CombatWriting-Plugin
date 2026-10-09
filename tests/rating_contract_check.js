// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// rating_contract_check.js: a seat's answer passes the rating contract only when
// its first line is exactly RATING: X/10, uppercase, X from 1 to 10, never 7,
// nothing else on the line, with reasoning after it and the whole under the cap.
//
// Runs the REAL check-answer.js from plugins/combat-writing/scripts as a child
// process on fixture files (never a re-implementation of the rule), and the REAL
// lib.checkAnswer on the same texts, and pins that both agree.
//
// What it pins: 8/10 passes; every number 1 to 10 but 7 passes; 7 fails; 0 and 11
// fail; lowercase "Rating:" fails; a rating line with trailing text fails; a
// rating on the second line fails; an empty first line fails; a rating with no
// reasoning fails; an answer over the word cap fails and under a raised cap
// passes; a BOM before the rating line still passes; CRLF line endings pass; trailing
// spaces or a tab on the first line pass on every contract while trailing text fails;
// --run appends an answer.checked line to the run's log; with --run and no
// --word-cap the cap is the one the seat was sent: a packet built at 600 lets a
// 502-word answer pass, the same answer fails without the run, and --word-cap
// still overrides the packet's cap. The app's two final contracts are picked from the
// file name (<seat>.sn.answer.md: S/N RATIO: XX%, 0 to 100; <seat>.redflag.answer.md:
// NO RED FLAGS or RED FLAGS FOUND: X, X 1 or more), with no 7 rule and a 250 cap, and
// --contract overrides the name. The critique contract (ruled 2026-10-09: a battle round
// asks for no rating unless --rerate): an answer with no RATING line passes, one that
// opens with a RATING line fails, an empty one fails; with --run the contract comes from
// the packet the seat was sent, so the same RATING answer passes in a --rerate battle
// packet and fails in one built without it, and a plain critique does the reverse.
//
// Run from the repo root:   node tests/rating_contract_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var scripts=path.join(__dirname,'..','plugins','combat-writing','scripts');
var lib=require(path.join(scripts,'lib.js'));
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-rating-'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

function run(text,extra){
  var f=path.join(tmp,'answer-'+(passes+failures.length)+'.answer.md');
  fs.writeFileSync(f,text);
  var r=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),f].concat(extra||[]),{encoding:'utf8'});
  var lines=r.stdout.trim().split('\n');
  var summary=null; try{summary=JSON.parse(lines[lines.length-1]);}catch(e){}
  return {code:r.status,first:lines[0]||'',summary:summary,stderr:r.stderr};
}
function expectPass(name,text,extra){
  var r=run(text,extra);
  check(r.code===0,name+': expected pass, got exit '+r.code+' ('+r.first+')');
  check(lib.checkAnswer(text,extra&&extra[1]?parseInt(extra[1],10):undefined).ok===true,name+': lib.checkAnswer disagrees with the script');
  return r;
}
function expectFail(name,text,reasonRe,extra){
  var r=run(text,extra);
  check(r.code===1,name+': expected exit 1, got '+r.code+' ('+r.first+')');
  check(reasonRe.test(r.first),name+': reason line "'+r.first+'" does not match '+reasonRe);
  check(lib.checkAnswer(text,extra&&extra[1]?parseInt(extra[1],10):undefined).ok===false,name+': lib.checkAnswer disagrees with the script');
  return r;
}

var good='RATING: 8/10\nThe ask lands in the first paragraph: "We should buy the company." The evidence is thin after that.\n';
var r=expectPass('8/10',good);
check(r.summary&&r.summary.rating===8&&r.summary.ok===true,'8/10: summary JSON missing rating 8');

[1,2,3,4,5,6,8,9,10].forEach(function(n){ expectPass(n+'/10','RATING: '+n+'/10\nReasoning with evidence.\n'); });
expectFail('7/10','RATING: 7/10\nReasoning.\n',/forbidden/);
expectFail('0/10','RATING: 0/10\nReasoning.\n',/outside 1 to 10/);
expectFail('11/10','RATING: 11/10\nReasoning.\n',/outside 1 to 10/);
expectFail('lowercase','Rating: 8/10\nReasoning.\n',/uppercase/);
expectFail('trailing text','RATING: 8/10 because it works\nReasoning.\n',/uppercase|not the rating line/);
expectFail('second line','Here is my read.\nRATING: 8/10\nReasoning.\n',/not the rating line/);
expectFail('empty first line','\nRATING: 8/10\nReasoning.\n',/empty/);
expectFail('no reasoning','RATING: 8/10\n',/no reasoning/);
expectFail('no reasoning, blank lines','RATING: 8/10\n\n   \n',/no reasoning/);

var long='RATING: 6/10\n'+new Array(520).join('word ')+'\n';
expectFail('over cap',long,/over the cap of 500/);
expectPass('raised cap',long,['--word-cap','600']);
expectFail('lowered cap','RATING: 6/10\n'+new Array(60).join('word ')+'\n',/over the cap of 50/,['--word-cap','50']);

expectPass('BOM','﻿RATING: 9/10\nReasoning.\n');
expectPass('CRLF','RATING: 9/10\r\nReasoning.\r\n');
// Trailing whitespace on the rating line is tolerated; trailing text is not.
var sp=expectPass('two trailing spaces','RATING: 8/10  \nReasoning.\n');
check(sp.summary&&sp.summary.rating===8,'two trailing spaces: rating not parsed');
expectPass('trailing tab','RATING: 8/10\t\nReasoning.\n');
expectFail('trailing text still fails','RATING: 8/10 ok\nReasoning.\n',/uppercase|not the rating line/);
check(lib.parseRating('RATING: 6/10   \nx')===6,'parseRating: trailing spaces should still parse');

// --run appends to the log.
var runDir=path.join(tmp,'run'); fs.mkdirSync(path.join(runDir,'rounds','01-sparring'),{recursive:true});
fs.writeFileSync(path.join(runDir,'log.jsonl'),'');
var ans=path.join(runDir,'rounds','01-sparring','seat-2.answer.md'); fs.writeFileSync(ans,good);
var rr=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),ans,'--run',runDir],{encoding:'utf8'});
check(rr.status===0,'--run: expected pass, got '+rr.status);
var logLines=fs.readFileSync(path.join(runDir,'log.jsonl'),'utf8').trim().split('\n').filter(Boolean);
check(logLines.length===1,'--run: expected one log line, got '+logLines.length);
var entry=logLines.length?JSON.parse(logLines[0]):{};
check(entry.event==='answer.checked'&&entry.seat==='seat-2'&&entry.round==='01-sparring'&&entry.rating===8&&entry.ok===true,'--run: log line wrong: '+JSON.stringify(entry));
check(typeof entry.ts==='string'&&!isNaN(Date.parse(entry.ts)),'--run: log line has no timestamp');

// The cap comes from the packet the seat was sent. Build a real run with the real
// scripts, a packet at --word-cap 600, and a 502-word answer.
var proj=path.join(tmp,'proj'); fs.mkdirSync(proj);
fs.writeFileSync(path.join(proj,'draft.md'),'A draft.\n');
var nr=cp.spawnSync(process.execPath,[path.join(scripts,'new-run.js'),'--draft','draft.md','--name','cap'],{cwd:proj,encoding:'utf8'});
check(nr.status===0,'cap run: new-run exit '+nr.status+' '+nr.stderr);
var capRun=nr.stdout.trim();
var pk=cp.spawnSync(process.execPath,[path.join(scripts,'packet.js'),'--run',capRun,'--round','01-sparring','--seat','seat-1','--word-cap','600'],{encoding:'utf8'});
check(pk.status===0,'cap run: packet exit '+pk.status+' '+pk.stderr);
var long502='RATING: 8/10\n'+new Array(500).join('word ')+'end\n';
check(lib.wordCount(long502)===502,'cap run: fixture is '+lib.wordCount(long502)+' words, expected 502');
var capAns=path.join(capRun,'rounds','01-sparring','seat-1.answer.md'); fs.writeFileSync(capAns,long502);
var c1=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),capAns,'--run',capRun],{encoding:'utf8'});
check(c1.status===0,'cap from packet: expected pass at 600, got exit '+c1.status+' ('+c1.stdout.split('\n')[0]+')');
var c1s=JSON.parse(c1.stdout.trim().split('\n').pop());
check(c1s.word_cap===600&&c1s.word_cap_source==='packet','cap from packet: summary says cap '+c1s.word_cap+' from '+c1s.word_cap_source);
var c2=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),capAns],{encoding:'utf8'});
check(c2.status===1&&/over the cap of 500/.test(c2.stdout),'cap without run: expected fail at the 500 default, got exit '+c2.status);
var c3=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),capAns,'--run',capRun,'--word-cap','500'],{encoding:'utf8'});
check(c3.status===1&&/over the cap of 500/.test(c3.stdout),'--word-cap override: expected fail at 500, got exit '+c3.status);
// With the log line gone, the cap still comes from the packet file's "Under N words." line.
var capLog=path.join(capRun,'log.jsonl');
fs.writeFileSync(capLog,fs.readFileSync(capLog,'utf8').split('\n').filter(function(l){return l&&l.indexOf('packet.built')<0;}).join('\n')+'\n');
var c4=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),capAns,'--run',capRun],{encoding:'utf8'});
check(c4.status===0&&/"word_cap":600/.test(c4.stdout),'cap from packet file: expected pass at 600 without the log line, got exit '+c4.status);

// The app's two final contracts, picked from the file name: <seat>.sn.answer.md and
// <seat>.redflag.answer.md. No 7 rule on either. --contract overrides the name.
function named(name,text,extra){
  var f=path.join(tmp,name); fs.writeFileSync(f,text);
  var r=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),f].concat(extra||[]),{encoding:'utf8'});
  var lines=r.stdout.trim().split('\n'); var s=null; try{s=JSON.parse(lines[lines.length-1]);}catch(e){}
  return {code:r.status,first:lines[0]||'',summary:s};
}
var sn=named('seat-1.sn.answer.md','S/N RATIO: 70%\nSignal: the number. Noise: the posture.\n');
check(sn.code===0&&sn.summary&&sn.summary.contract==='sn'&&sn.summary.value===70&&sn.summary.word_cap===250,'sn: expected pass with value 70 under cap 250, got '+sn.code+' '+JSON.stringify(sn.summary));
check(named('seat-1.sn.answer.md','S/N RATIO: 7%\nAlmost all noise.\n').code===0,'sn: 7% must pass, the 7 rule is a rating rule');
check(named('seat-1.sn.answer.md','S/N RATIO: 101%\nx\n').code===1,'sn: 101% must fail');
check(named('seat-1.sn.answer.md','S/N RATIO: 70\nx\n').code===1,'sn: missing percent sign must fail');
check(named('seat-1.sn.answer.md','S/N Ratio: 70%\nx\n').code===1,'sn: lowercase must fail');
check(named('seat-1.sn.answer.md','S/N RATIO: 70% because\nx\n').code===1,'sn: trailing text must fail');
check(named('seat-1.sn.answer.md','S/N RATIO: 70%  \nx\n').code===0,'sn: two trailing spaces must pass');
check(named('seat-1.sn.answer.md','RATING: 8/10\nx\n').code===1,'sn: a rating line is not an S/N line');
check(named('seat-1.sn.answer.md','S/N RATIO: 70%\n'+new Array(260).join('word ')+'\n').code===1,'sn: over 250 words must fail');
var rf0=named('seat-1.redflag.answer.md','NO RED FLAGS\nNothing an informed reader would distrust.\n');
check(rf0.code===0&&rf0.summary.contract==='redflag'&&rf0.summary.value===0,'redflag: NO RED FLAGS should pass with value 0, got '+JSON.stringify(rf0.summary));
var rf2=named('seat-1.redflag.answer.md','RED FLAGS FOUND: 2\nFirst. Second.\n');
check(rf2.code===0&&rf2.summary.value===2,'redflag: RED FLAGS FOUND: 2 should pass with value 2');
check(named('seat-1.redflag.answer.md','RED FLAGS FOUND: 0\nx\n').code===1,'redflag: FOUND: 0 must fail');
check(named('seat-1.redflag.answer.md','No red flags\nx\n').code===1,'redflag: lowercase must fail');
check(named('seat-1.redflag.answer.md','RED FLAGS FOUND: 2 — see below\nx\n').code===1,'redflag: trailing text must fail');
check(named('seat-1.redflag.answer.md','NO RED FLAGS  \nx\n').code===0,'redflag: two trailing spaces must pass');
check(named('seat-1.redflag.answer.md','RED FLAGS FOUND: 2 \nx\n').code===0,'redflag: a trailing space on the count line must pass');
check(named('seat-1.redflag.answer.md','NO RED FLAGS\n').code===1,'redflag: no reasoning must fail');
var ov=named('seat-1.answer.md','S/N RATIO: 70%\nx\n',['--contract','sn']);
check(ov.code===0&&ov.summary.contract==='sn','--contract sn on a plain answer file should apply the sn contract');
check(named('seat-1.answer.md','S/N RATIO: 70%\nx\n').code===1,'a plain answer file holds the rating contract');
check(named('seat-1.answer.md','RATING: 8/10\nx\n',['--contract','nope']).code===2,'--contract nope should exit 2');

// The critique contract: no RATING line.
var cr=named('seat-1.answer.md','The ask lands, but the close reads like an apology.\nCut the last paragraph.\n',['--contract','critique']);
check(cr.code===0&&cr.summary&&cr.summary.contract==='critique'&&cr.summary.rating===null&&cr.summary.word_cap===500,'critique: a plain critique should pass under 500, got '+cr.code+' '+JSON.stringify(cr.summary));
var crr=named('seat-1.answer.md','RATING: 8/10\nThe ask lands.\n',['--contract','critique']);
check(crr.code===1&&/asked for no rating/.test(crr.first),'critique: a RATING line must fail, got '+crr.first);
check(named('seat-1.answer.md','rating: 8\nThe ask lands.\n',['--contract','critique']).code===1,'critique: a lowercase rating line must fail too');
check(named('seat-1.answer.md','\n\n',['--contract','critique']).code===1,'critique: an empty answer must fail');
check(named('seat-1.answer.md','Critique.\n'+new Array(520).join('word ')+'\n',['--contract','critique']).code===1,'critique: over 500 words must fail');
check(lib.checkAnswer('No rating here, just the critique.\n',null,'critique').ok===true&&lib.checkAnswer('RATING: 6/10\nx\n',null,'critique').ok===false,'critique: lib.checkAnswer disagrees with the script');
// With --run the contract comes from the packet: a <nn>-battle packet asks for no rating unless --rerate.
fs.writeFileSync(path.join(capRun,'rounds','01-sparring','seat-1.answer.md'),good);
var pk2=cp.spawnSync(process.execPath,[path.join(scripts,'packet.js'),'--run',capRun,'--round','02-battle','--seat','seat-1'],{encoding:'utf8'});
check(pk2.status===0,'battle packet: exit '+pk2.status+' '+pk2.stderr);
var bAns=path.join(capRun,'rounds','02-battle','seat-1.answer.md');
fs.writeFileSync(bAns,'RATING: 8/10\nStill fine.\n');
var b1=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),bAns,'--run',capRun],{encoding:'utf8'});
check(b1.status===1&&/asked for no rating/.test(b1.stdout)&&/"contract":"critique"/.test(b1.stdout),'battle without rerate: a RATING answer should fail the critique contract, got '+b1.stdout.split('\n')[0]);
fs.writeFileSync(bAns,'Still fine. The ask lands and the close holds.\n');
var b2=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),bAns,'--run',capRun],{encoding:'utf8'});
check(b2.status===0&&/OK critique, no rating this round/.test(b2.stdout),'battle without rerate: a critique should pass, got '+b2.stdout.split('\n')[0]);
var pk3=cp.spawnSync(process.execPath,[path.join(scripts,'packet.js'),'--run',capRun,'--round','03-battle','--seat','seat-1','--rerate'],{encoding:'utf8'});
var rAns=path.join(capRun,'rounds','03-battle','seat-1.answer.md');
fs.writeFileSync(rAns,'Still fine. The ask lands and the close holds.\n');
var b3=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),rAns,'--run',capRun],{encoding:'utf8'});
check(pk3.status===0&&b3.status===1&&/not the rating line/.test(b3.stdout)&&/"contract":"rating"/.test(b3.stdout),'battle with rerate: a critique with no rating should fail the rating contract, got '+b3.stdout.split('\n')[0]);
fs.writeFileSync(rAns,'RATING: 8/10\nStill fine.\n');
check(cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),rAns,'--run',capRun],{encoding:'utf8'}).status===0,'battle with rerate: a RATING answer should pass');
// With the packet.built line gone, the packet file's no-rating line still gives the contract.
fs.writeFileSync(capLog,fs.readFileSync(capLog,'utf8').split('\n').filter(function(l){return l&&!(l.indexOf('packet.built')>=0&&l.indexOf('02-battle')>=0);}).join('\n')+'\n');
fs.writeFileSync(bAns,'RATING: 8/10\nStill fine.\n');
check(cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),bAns,'--run',capRun],{encoding:'utf8'}).status===1,'contract from the packet file: the no-rating line should apply when the log line is gone');

// Misuse exits 2.
var mis=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js')],{encoding:'utf8'});
check(mis.status===2,'no argument: expected exit 2, got '+mis.status);
var missing=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),path.join(tmp,'nope.md')],{encoding:'utf8'});
check(missing.status===2,'missing file: expected exit 2, got '+missing.status);

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'rating_contract_check: '+failures.length+' failure(s), ':'rating_contract_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
