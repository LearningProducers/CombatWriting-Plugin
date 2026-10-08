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
// passes; a BOM before the rating line still passes; CRLF line endings pass;
// --run appends an answer.checked line to the run's log; with --run and no
// --word-cap the cap is the one the seat was sent: a packet built at 600 lets a
// 502-word answer pass, the same answer fails without the run, and --word-cap
// still overrides the packet's cap.
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

var long='RATING: 6/10\n'+new Array(420).join('word ')+'\n';
expectFail('over cap',long,/over the cap of 400/);
expectPass('raised cap',long,['--word-cap','500']);
expectFail('lowered cap','RATING: 6/10\n'+new Array(60).join('word ')+'\n',/over the cap of 50/,['--word-cap','50']);

expectPass('BOM','﻿RATING: 9/10\nReasoning.\n');
expectPass('CRLF','RATING: 9/10\r\nReasoning.\r\n');

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
check(c2.status===1&&/over the cap of 400/.test(c2.stdout),'cap without run: expected fail at 400, got exit '+c2.status);
var c3=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),capAns,'--run',capRun,'--word-cap','500'],{encoding:'utf8'});
check(c3.status===1&&/over the cap of 500/.test(c3.stdout),'--word-cap override: expected fail at 500, got exit '+c3.status);
// With the log line gone, the cap still comes from the packet file's "Under N words." line.
var capLog=path.join(capRun,'log.jsonl');
fs.writeFileSync(capLog,fs.readFileSync(capLog,'utf8').split('\n').filter(function(l){return l&&l.indexOf('packet.built')<0;}).join('\n')+'\n');
var c4=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),capAns,'--run',capRun],{encoding:'utf8'});
check(c4.status===0&&/"word_cap":600/.test(c4.stdout),'cap from packet file: expected pass at 600 without the log line, got exit '+c4.status);

// Misuse exits 2.
var mis=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js')],{encoding:'utf8'});
check(mis.status===2,'no argument: expected exit 2, got '+mis.status);
var missing=cp.spawnSync(process.execPath,[path.join(scripts,'check-answer.js'),path.join(tmp,'nope.md')],{encoding:'utf8'});
check(missing.status===2,'missing file: expected exit 2, got '+missing.status);

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'rating_contract_check: '+failures.length+' failure(s), ':'rating_contract_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
