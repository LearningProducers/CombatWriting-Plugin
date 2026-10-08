// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// flip_check.js: a seat that changes its rating must quote who moved it, word for word,
// attributed to the right seat; a seat that holds says Stand.
//
// Runs the REAL new-run.js, packet.js and check-flip.js from plugins/combat-writing/
// scripts as child processes in a temporary project (never a re-implementation), and the
// REAL lib.checkFlip on the same texts, and pins that both agree.
//
// What it pins:
//   - first: a seat with no earlier answer is "first", exit 0.
//   - stand: the same rating with the word Stand is "stand", exit 0; without Stand it is
//     "held", exit 0, with a reason.
//   - flip-valid: a changed rating with a quote in double quotes, word for word, on a
//     line naming the quoted seat by id, is "flip-valid" and names the cited seat;
//     curly quotes and extra whitespace still match; "seat-2", "Seat 2", "seat2" and
//     "SEAT-2" all name seat-2, while "seat-12" and "seating" name nobody; the quote on
//     the line after the name matches.
//   - model name: a line naming the quoted seat by its model name alone attributes the
//     quote when that name belongs to exactly one other seat; a name two seats share, a
//     company name, or a partial name attributes nothing.
//   - flip-invalid, misattributed: the quote is real but credited to the wrong seat.
//   - flip-invalid, altered: the quote has a changed word.
//   - flip-invalid, no quote: a changed rating with no attributed quote.
//   - flip-invalid, self-quote: quoting one's own earlier turn does not count.
//   - a quote under three words does not count.
//   - a seat with no answer file is "missing", exit 1; a non-rating first line is
//     "unrated", exit 1; every check appends flip.checked to the log.
//   - check-flip.js refuses a final round and an unknown seat (exit 2).
//
// Run from the repo root:   node tests/flip_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var scripts=path.join(__dirname,'..','plugins','combat-writing','scripts');
var lib=require(path.join(scripts,'lib.js'));
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-flip-'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}); }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company.\n');
var run=node('new-run.js',['--draft','draft.md','--name','flip','--model','Test Model','--seats','3']).stdout.trim();
var seats=JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8')).seats;
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
var r1=path.join(run,'rounds','01-sparring');
var S2LINE='The board will ask for numbers and find none.';
var S3LINE='The close reads like an apology, not an ask.';
fs.writeFileSync(path.join(r1,'seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
fs.writeFileSync(path.join(r1,'seat-2.answer.md'),'RATING: 4/10\nThere is no evidence. '+S2LINE+'\n');
fs.writeFileSync(path.join(r1,'seat-3.answer.md'),'RATING: 6/10\n'+S3LINE+' Fix the close.\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','02-battle','--seat',s]); });
var r2=path.join(run,'rounds','02-battle');

// Each case: write seat-1's round-2 answer, run check-flip, compare with lib.checkFlip.
var prevAnswers=lib.roundAnswers(run,'01-sparring',seats);
var ownPrev=prevAnswers[0].text;
function flipCase(name,seatId,text,wantStatus,wantExit,extra){
  var f=path.join(r2,seatId+'.answer.md');
  if(text===null){ if(fs.existsSync(f))fs.unlinkSync(f); }
  else fs.writeFileSync(f,text);
  var r=node('check-flip.js',['--run',run,'--round','02-battle','--seat',seatId]);
  var lines=r.stdout.trim().split('\n'); var sum=null; try{sum=JSON.parse(lines[lines.length-1]);}catch(e){}
  check(r.status===wantExit,name+': expected exit '+wantExit+', got '+r.status+' ('+lines[0]+')');
  check(sum&&sum.status===wantStatus,name+': expected status '+wantStatus+', got '+(sum&&sum.status)+' ('+lines[0]+')');
  if(text!==null){
    var seat=seats.filter(function(s){return s.id===seatId;})[0];
    var own=prevAnswers.filter(function(a){return a.seat.id===seatId&&!a.missing;})[0];
    var mine=lib.checkFlip(text,seat,own?own.text:null,prevAnswers);
    check(mine.status===wantStatus,name+': lib.checkFlip says '+mine.status+', expected '+wantStatus);
  }
  if(extra)extra(sum,lines[0]);
  return sum;
}

flipCase('stand','seat-1','RATING: 8/10\nStand. seat-2 wants numbers, but the board has them already.\n','stand',0);
flipCase('held without Stand','seat-1','RATING: 8/10\nI keep my number. seat-2 wants numbers.\n','held',0,function(s){check(/Stand/.test(s.reason||''),'held: no reason naming Stand');});
flipCase('flip valid, seat id on the line','seat-1','RATING: 6/10\nseat-2 wrote "'+S2LINE+'" and that moved me from 8 to 6.\n','flip-valid',0,function(s){check(s.cited==='seat-2'&&s.from===8&&s.to===6,'flip valid: wrong cited/from/to '+JSON.stringify(s));});
flipCase('flip valid, curly quotes and spacing','seat-1','RATING: 6/10\nseat-2 said “The board   will ask for numbers and find none.”  Right.\n','flip-valid',0);
flipCase('flip valid, "Seat 2" with a space','seat-1','RATING: 6/10\nSeat 2 put it plainly: "'+S2LINE+'"\n','flip-valid',0,function(s){check(s.cited==='seat-2','Seat 2: cited '+s.cited);});
flipCase('flip valid, "seat2" with nothing','seat-1','RATING: 6/10\nseat2 put it plainly: "'+S2LINE+'"\n','flip-valid',0);
flipCase('flip valid, "SEAT-2" uppercase','seat-1','RATING: 6/10\nSEAT-2 put it plainly: "'+S2LINE+'"\n','flip-valid',0);
flipCase('flip invalid, "seat-12" does not name seat-2 or seat-1','seat-1','RATING: 6/10\nseat-12 put it plainly: "'+S2LINE+'"\n','flip-invalid',1,function(s){check(/no quote/.test(s.reason||''),'seat-12: should count as no attribution, reason "'+s.reason+'"');});
flipCase('flip invalid, "seating" is not a seat','seat-1','RATING: 6/10\nThe seating 2 rows back said "'+S2LINE+'"\n','flip-invalid',1);
flipCase('flip invalid, shared model name alone is ambiguous','seat-1','RATING: 6/10\nTest Model wrote "'+S2LINE+'" and moved me.\n','flip-invalid',1,function(s){check(/no quote/.test(s.reason||''),'shared model name: should count as no attribution, reason "'+s.reason+'"');});
flipCase('flip valid, name on the line before','seat-1','RATING: 6/10\nWhat moved me was seat-3:\n"'+S3LINE+'"\nThat is right.\n','flip-valid',0,function(s){check(s.cited==='seat-3','name on the line before: cited '+s.cited);});
flipCase('flip invalid, misattributed','seat-1','RATING: 6/10\nseat-3 wrote "'+S2LINE+'" and that moved me.\n','flip-invalid',1,function(s){check(/misattributed|altered/.test(s.reason||''),'misattributed: reason is "'+s.reason+'"');});
flipCase('flip invalid, altered','seat-1','RATING: 6/10\nseat-2 wrote "The board will ask for figures and find none." and that moved me.\n','flip-invalid',1);
flipCase('flip invalid, no quote','seat-1','RATING: 6/10\nseat-2 convinced me that the evidence is thin.\n','flip-invalid',1,function(s){check(/no quote/.test(s.reason||''),'no quote: reason is "'+s.reason+'"');});
flipCase('flip invalid, self quote','seat-1','RATING: 6/10\nseat-1 wrote "The ask lands in the first line." and I no longer believe it.\n','flip-invalid',1);
flipCase('flip invalid, two-word quote','seat-1','RATING: 6/10\nseat-2 wrote "find none." and that moved me.\n','flip-invalid',1);
flipCase('unrated','seat-1','My rating is 6/10 now.\nBecause seat-2.\n','unrated',1);
flipCase('missing','seat-1',null,'missing',1);
// seat-2 holds; seat-3 flips with a valid quote of seat-2.
flipCase('seat-2 stand','seat-2','RATING: 4/10\nStand. Nothing here adds evidence.\n','stand',0);
flipCase('seat-3 flips on seat-2','seat-3','RATING: 4/10\nseat-2 is right: "'+S2LINE+'" I was grading the prose, not the case.\n','flip-valid',0,function(s){check(s.cited==='seat-2'&&s.from===6&&s.to===4,'seat-3 flip: '+JSON.stringify(s));});

// Attribution by model name, on its own: a run whose seats carry different model names (seats.json
// edited after creation, as the add-on will write it), where the attributing line holds no seat id.
var run3=node('new-run.js',['--draft','draft.md','--name','models','--seats','3']).stdout.trim();
var sj=JSON.parse(fs.readFileSync(path.join(run3,'seats.json'),'utf8'));
sj.seats[0].model='Alpha One'; sj.seats[0].company='Company A';
sj.seats[1].model='Beta Two'; sj.seats[1].company='Company B';
sj.seats[2].model='Beta Two'; sj.seats[2].company='Company B';
fs.writeFileSync(path.join(run3,'seats.json'),JSON.stringify(sj,null,2)+'\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run3,'--round','01-sparring','--seat',s]); });
var r31=path.join(run3,'rounds','01-sparring');
fs.writeFileSync(path.join(r31,'seat-1.answer.md'),'RATING: 8/10\nFine as it is.\n');
fs.writeFileSync(path.join(r31,'seat-2.answer.md'),'RATING: 4/10\n'+S2LINE+'\n');
fs.writeFileSync(path.join(r31,'seat-3.answer.md'),'RATING: 6/10\n'+S3LINE+'\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run3,'--round','02-battle','--seat',s]); });
var r32=path.join(run3,'rounds','02-battle');
function modelCase(name,seatId,text,wantStatus,wantExit,extra){
  fs.writeFileSync(path.join(r32,seatId+'.answer.md'),text);
  var r=node('check-flip.js',['--run',run3,'--round','02-battle','--seat',seatId]);
  var lines=r.stdout.trim().split('\n'); var sum=null; try{sum=JSON.parse(lines[lines.length-1]);}catch(e){}
  check(r.status===wantExit&&sum&&sum.status===wantStatus,name+': expected '+wantStatus+' exit '+wantExit+', got '+(sum&&sum.status)+' exit '+r.status+' ('+lines[0]+')');
  if(extra)extra(sum);
}
// seat-2 flips, naming seat-1 by its unique model name only.
modelCase('model name alone, unique','seat-2','RATING: 6/10\nAlpha One has a point: "Fine as it is." The structure holds.\n','flip-valid',0,function(s){check(s.cited==='seat-1','model name alone: cited '+s.cited);});
// seat-1 flips, naming "Beta Two", which two other seats share: ambiguous, no attribution.
modelCase('model name alone, shared','seat-1','RATING: 6/10\nBeta Two wrote "'+S2LINE+'" and moved me.\n','flip-invalid',1,function(s){check(/no quote/.test(s.reason||''),'shared model name: reason "'+s.reason+'"');});
// The company name is not an attribution.
modelCase('company name alone','seat-1','RATING: 6/10\nCompany B wrote "'+S2LINE+'" and moved me.\n','flip-invalid',1);
// A partial model name is not an attribution.
modelCase('partial model name','seat-2','RATING: 6/10\nAlpha said "Fine as it is." and I agree.\n','flip-invalid',1);

// A seat with no earlier answer is first.
var run2=node('new-run.js',['--draft','draft.md','--name','first','--seats','2']).stdout.trim();
node('packet.js',['--run',run2,'--round','01-sparring','--seat','seat-1']);
fs.writeFileSync(path.join(run2,'rounds','01-sparring','seat-1.answer.md'),'RATING: 8/10\nFine.\n');
var rf=node('check-flip.js',['--run',run2,'--round','01-sparring','--seat','seat-1']);
check(rf.status===0&&/"status":"first"/.test(rf.stdout),'first: expected status first exit 0, got '+rf.status+' '+rf.stdout.split('\n')[0]);

// The log carries every check.
var flips=logOf(run).filter(function(e){return e.event==='flip.checked';});
check(flips.length===20,'log: expected 20 flip.checked lines, got '+flips.length);
check(flips.every(function(e){return e.round==='02-battle'&&typeof e.status==='string'&&e.ts;}),'log: a flip.checked line is malformed');

// Refusals.
fs.mkdirSync(path.join(run,'rounds','03-final'));
check(node('check-flip.js',['--run',run,'--round','03-final','--seat','seat-1']).status===2,'final round should exit 2');
check(node('check-flip.js',['--run',run,'--round','02-battle','--seat','seat-9']).status===2,'unknown seat should exit 2');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'flip_check: '+failures.length+' failure(s), ':'flip_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
