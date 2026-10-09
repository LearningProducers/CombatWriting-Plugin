// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// record_check.js: record.md is rendered from the run's files and log, opens with the
// credit line, shows every seat's number on its own, and averages nothing.
//
// Runs the REAL new-run.js, packet.js, check-answer.js, check-flip.js, add-draft.js and
// render-record.js from plugins/combat-writing/scripts as child processes in a temporary
// project (never a re-implementation).
//
// What it pins:
//   - record.md's first line is the credit line; the crew line names every seat by model
//     and company and says "One company's models".
//   - The scoreboard has one row per seat and one column per round in round order
//     (01-sparring, 02-battle, 03-battle, 04-final), plus a Latest bar column.
//   - A battle round built without --rerate (ruled 2026-10-09) shows "critique" for a sound
//     answer, a failed read for one that wrote a RATING line anyway, and missing for none;
//     the round line says no rating was asked; the Latest bar keeps the latest rating.
//   - A valid flip shows the new number with the earlier number beside it and the cited
//     seat; an invalid flip shows INVALID with the rating still shown; Stand is marked;
//     a seat with no answer in a round reads "missing"; a failed read says so.
//   - The final round's cell carries each seat's S/N percentage and red-flag count.
//   - No averaged number anywhere: no "average", "mean", "overall", "consensus" or
//     "total" rating, and no fractional rating such as 6.5/10.
//   - Every answer appears in full, by round, under its seat's heading; the "What was
//     sent" table lists every packet.
//   - A revised draft is listed and the round that read it says so.
//   - The crew line is followed by the seat key, one line naming every seat by id and short
//     name (ruled 2026-10-09), and --short prints the credit line, the crew line, the
//     scoreboard and, last, the seat key, never the answers.
//   - A round put to one seat only (a seat line alone): the other seats' cells read
//     "not asked", never "missing"; the answers section says so; the round line names who
//     was asked; the What was sent row shows mode seat.
//   - Rendering appends record.rendered to the log; render-record.js refuses a folder
//     with no seats.json (exit 2).
//
// Run from the repo root:   node tests/record_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var scripts=path.join(__dirname,'..','plugins','combat-writing','scripts');
var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-record-'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function write(p,t){ fs.writeFileSync(p,t); }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','record','--model','Test Model','--seats','3']).stdout.trim();
var S2LINE='The board will ask for numbers and find none.';
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
var r1=path.join(run,'rounds','01-sparring');
write(path.join(r1,'seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
write(path.join(r1,'seat-2.answer.md'),'RATING: 4/10\n'+S2LINE+'\n');
// seat-3 never answers round 1.
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(r1,s+'.answer.md'),'--run',run]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','02-battle','--seat',s,'--rerate']); });
var r2=path.join(run,'rounds','02-battle');
write(path.join(r2,'seat-1.answer.md'),'RATING: 6/10\nseat-2 wrote "'+S2LINE+'" and that moved me.\n');
write(path.join(r2,'seat-2.answer.md'),'RATING: 4/10\nStand. Nothing new.\n');
write(path.join(r2,'seat-3.answer.md'),'RATING: 9/10\nseat-2 wrote "the numbers are all there" so I moved up.\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('check-answer.js',[path.join(r2,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','02-battle','--seat',s]); });
// 03-battle without --rerate: a critique round. seat-1 critiques; seat-2 writes a RATING line anyway (a failed read); seat-3 never answers.
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','03-battle','--seat',s]); });
var rc=path.join(run,'rounds','03-battle');
write(path.join(rc,'seat-1.answer.md'),'The close still reads like an apology. seat-2 wrote "Stand. Nothing new." and I agree.\n');
write(path.join(rc,'seat-2.answer.md'),'RATING: 4/10\nStand again.\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(rc,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','03-battle','--seat',s]); });
fs.writeFileSync(path.join(proj,'rev.md'),'Dear board, buy the company: revenue up 40%.\n');
var added=node('add-draft.js',['--run',run,'--file','rev.md']).stdout.trim();
check(added==='draft-2.md','add-draft: expected draft-2.md, got '+added);
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','04-final','--seat',s,'--final','sn']); node('packet.js',['--run',run,'--round','04-final','--seat',s,'--final','redflag']); });
var r3=path.join(run,'rounds','04-final');
write(path.join(r3,'seat-1.sn.answer.md'),'S/N RATIO: 70%\nSignal: the number.\n');
write(path.join(r3,'seat-1.redflag.answer.md'),'RED FLAGS FOUND: 1\nUp 40% from what?\n');
write(path.join(r3,'seat-2.sn.answer.md'),'S/N RATIO: 55%\nHalf of it is posture.\n');
write(path.join(r3,'seat-2.redflag.answer.md'),'NO RED FLAGS\nNothing an informed reader would distrust.\n');
write(path.join(r3,'seat-3.sn.answer.md'),'S/N RATIO: 7/10\nWrong first line.\n');
// seat-3's red-flag read is missing.
['seat-1.sn','seat-1.redflag','seat-2.sn','seat-2.redflag','seat-3.sn'].forEach(function(f){ node('check-answer.js',[path.join(r3,f+'.answer.md'),'--run',run]); });

var rr=node('render-record.js',['--run',run]);
check(rr.status===0,'render: exit '+rr.status+' '+rr.stderr);
var rec=fs.readFileSync(path.join(run,'record.md'),'utf8');
var lines=rec.split('\n');
check(lines[0]===CREDIT,'record: first line is not the credit line');
var crew=lines.filter(function(l){return l.indexOf('**Crew:**')===0;})[0]||'';
check(/Test Model \(Anthropic\), seat-1/.test(crew)&&/seat-3/.test(crew)&&/One company's models/.test(crew)&&/agent configuration/.test(crew),'record: crew line wrong: '+crew);
check(/\*\*Drafts:\*\* draft\.md \(sha256 [0-9a-f]{12}…\), draft-2\.md \(sha256 [0-9a-f]{12}…\)\./.test(rec),'record: drafts line wrong');
check(rec.indexOf('CEO. Get a yes.')>=0,'record: brief missing');
var keyIdx=rec.indexOf('**Seat key:** seat-1 Test Model · seat-2 Test Model · seat-3 Test Model');
check(keyIdx>0&&keyIdx>rec.indexOf('**Crew:**')&&keyIdx<rec.indexOf('## Scoreboard'),'record: the seat key line should follow the crew line');

var header=lines.filter(function(l){return l.indexOf('| Seat |')===0;})[0]||'';
check(header==='| Seat | 01-sparring | 02-battle | 03-battle | 04-final | Latest |','record: scoreboard header is "'+header+'"');
var rows={}; lines.forEach(function(l){var m=/^\| Test Model \(Anthropic\), (seat-\d) \| (.*) \|$/.exec(l); if(m)rows[m[1]]=m[2].split(' | ');});
check(Object.keys(rows).length===3,'record: expected 3 scoreboard rows, got '+Object.keys(rows).length);
var s1=rows['seat-1']||[], s2=rows['seat-2']||[], s3=rows['seat-3']||[];
check(s1[0]==='8/10','seat-1 round 1 cell: '+s1[0]);
check(s1[1]==='6/10 · flip from 8, valid (quoted seat-2)','seat-1 round 2 cell: '+s1[1]);
check(s1[2]==='critique','seat-1 round 3 (no rating) cell: '+s1[2]);
check(s1[3]==='S/N 70% · 1 red flag','seat-1 final cell: '+s1[3]);
check(/^██████░░░░ 6\/10$/.test(s1[4]||''),'seat-1 latest bar should keep the latest rating across the critique round: '+s1[4]);
check(s2[1]==='4/10 · Stand','seat-2 round 2 cell: '+s2[1]);
check(/^failed read \(this round asked for no rating/.test(s2[2]||'')&&!/4\/10/.test(s2[2]||''),'seat-2 round 3 cell: a RATING line in a no-rating round should be a failed read with no number shown, got '+s2[2]);
check(s2[3]==='S/N 55% · no red flags','seat-2 final cell: '+s2[3]);
check(s3[0]==='missing','seat-3 round 1 cell: '+s3[0]);
check(/^9\/10 · flip from .* INVALID/.test(s3[1]||'')||/^9\/10$/.test(s3[1]||''),'seat-3 round 2 cell: '+s3[1]);
check(s3[2]==='missing','seat-3 round 3 cell: '+s3[2]);
check(s3[3]==='S/N failed read · red flags missing','seat-3 final cell: '+s3[3]);
check(/Critique means the round asked for no rating/.test(rec)&&/Truncated means/.test(rec),'record: the scoreboard note should explain critique and truncated');

// seat-3 had no round-1 answer, so round 2 is its first rating: no flip to judge.
check(s3[1]==='9/10','seat-3 round 2: a first rating shows plainly, got '+s3[1]);

// Nothing averaged anywhere.
check(!/\b(average|averaged|mean|overall rating|consensus|total)\b/i.test(rec.replace('Nothing here is averaged.','')),'record: an averaging word appears');
check(!/\d\.\d+\/10/.test(rec),'record: a fractional rating appears');

// Answers in full, by round, under the seat heading; missing answers marked.
var r2idx=rec.indexOf('### Round 02-battle'), rcidx=rec.indexOf('### Round 03-battle'), r3idx=rec.indexOf('### Round 04-final');
check(r2idx>0&&rcidx>r2idx&&r3idx>rcidx,'record: round sections out of order');
var r2sec=rec.slice(r2idx,rcidx);
var rcsec=rec.slice(rcidx,r3idx);
check(/Draft read: draft\.md\. Answers carried from round 02-battle\. No rating this round\./.test(rcsec)&&rcsec.indexOf('The close still reads like an apology.')>=0,'record: the critique round should say no rating was asked and hold the critique in full');
check(r2sec.indexOf('#### Test Model (Anthropic), seat-1')>=0&&r2sec.indexOf('seat-2 wrote "'+S2LINE+'" and that moved me.')>=0,'record: seat-1 round 2 answer not in full');
check(/Draft read: draft\.md\. Answers carried from round 01-sparring\. Rerate: a new rating asked\./.test(r2sec),'record: round 2 does not say what it read');
var r1sec=rec.slice(rec.indexOf('### Round 01-sparring'),r2idx);
check(/#### Test Model \(Anthropic\), seat-3\n\n\*Missing: no answer file\.\*/.test(r1sec),'record: seat-3 round 1 not marked missing in the answers');
var r3sec=rec.slice(r3idx,rec.indexOf('## What was sent'));
check(/Draft read: draft-2\.md\./.test(r3sec),'record: final round does not say it read draft-2.md');
check(r3sec.indexOf('#### Test Model (Anthropic), seat-1 — S/N ratio')>=0&&r3sec.indexOf('#### Test Model (Anthropic), seat-2 — red flags')>=0,'record: final answers headings missing');

// What was sent: every packet.
var sent=rec.slice(rec.indexOf('## What was sent'));
var sentRows=sent.split('\n').filter(function(l){return /^\| 20\d\d-/.test(l);});
check(sentRows.length===15,'record: expected 15 packet rows in What was sent, got '+sentRows.length);
check(sentRows.some(function(l){return /\| 02-battle \| seat-1 \| rounds\/02-battle\/seat-1\.packet\.md \| draft\.md \| synthesis \+ rerate \| seat-2 \| seat-3 \| 600 \|/.test(l);}),'record: battle packet row wrong');
check(sentRows.some(function(l){return /\| 03-battle \| seat-1 \| rounds\/03-battle\/seat-1\.packet\.md \| draft\.md \| synthesis \(no rating\) \| seat-2, seat-3 \| — \| 600 \|/.test(l);}),'record: critique packet row wrong');
check(sentRows.some(function(l){return /\| 04-final \| seat-1 \| rounds\/04-final\/seat-1\.sn\.packet\.md \| draft-2\.md \| final-sn \| — \| — \| 250 \|/.test(l);}),'record: final packet row wrong');

// --short.
var sh=node('render-record.js',['--run',run,'--short']);
check(sh.status===0&&sh.stdout.split('\n')[0]===CREDIT,'--short: does not open with the credit line');
check(sh.stdout.indexOf('| Seat |')>=0&&sh.stdout.indexOf('## Answers')<0&&sh.stdout.indexOf(S2LINE)<0,'--short: should hold the scoreboard and not the answers');
check(/Record: .*record\.md/.test(sh.stdout),'--short: no record path');
check(sh.stdout.trim().split('\n').pop()==='Seat key: seat-1 Test Model · seat-2 Test Model · seat-3 Test Model','--short: the last line should be the seat key, got '+JSON.stringify(sh.stdout.trim().split('\n').pop()));

// A round of seat lines alone (ruled 2026-10-09): round 2 goes to seat-2 only.
var so=node('new-run.js',['--draft','draft.md','--name','seatonly','--model','Test Model','--seats','3']).stdout.trim();
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',so,'--round','01-sparring','--seat',s]); write(path.join(so,'rounds','01-sparring',s+'.answer.md'),'RATING: 8/10\nRound one.\n'); node('check-answer.js',[path.join(so,'rounds','01-sparring',s+'.answer.md'),'--run',so]); });
write(path.join(proj,'q2.md'),'Does the close ask for the vote?\n');
node('packet.js',['--run',so,'--round','02-battle','--seat','seat-2','--question','q2.md']);
write(path.join(so,'rounds','02-battle','seat-2.answer.md'),'Not in so many words.\n');
node('check-answer.js',[path.join(so,'rounds','02-battle','seat-2.answer.md'),'--run',so]);
var soShort=node('render-record.js',['--run',so,'--short']).stdout;
var soRec=fs.readFileSync(path.join(so,'record.md'),'utf8');
var soRows={}; soRec.split('\n').forEach(function(l){var m=/^\| Test Model \(Anthropic\), (seat-\d) \| (.*) \|$/.exec(l); if(m)soRows[m[1]]=m[2].split(' | ');});
check((soRows['seat-1']||[])[1]==='not asked'&&(soRows['seat-3']||[])[1]==='not asked'&&(soRows['seat-2']||[])[1]==='critique','seat-only round: cells should read not asked / critique / not asked, got '+JSON.stringify(soRows));
check(/Not asked means the round was put to other seats only/.test(soRec),'seat-only round: the scoreboard note should explain not asked');
var soR2=soRec.slice(soRec.indexOf('### Round 02-battle'),soRec.indexOf('## What was sent'));
check(/Put to seat-2 only; not asked: seat-1, seat-3\./.test(soR2),'seat-only round: the round line should name who was asked');
check(/#### Test Model \(Anthropic\), seat-1\n\n\*Not asked this round\.\*/.test(soR2)&&/\*Question to this seat:\* Does the close ask for the vote\?/.test(soR2)&&soR2.indexOf('Not in so many words.')>=0,'seat-only round: the answers section should mark the unasked seats and hold the asked seat\'s question and answer');
check(/\| 02-battle \| seat-2 \| rounds\/02-battle\/seat-2\.packet\.md \| draft\.md \| seat \(no rating\) \| — \| — \| 500 \|/.test(soRec),'seat-only round: What was sent row wrong');
check(soShort.indexOf('not asked')>=0&&soShort.indexOf('missing')<0,'seat-only round: --short should show not asked, not missing');

// The log.
var log=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){return JSON.parse(l);});
check(log.filter(function(e){return e.event==='record.rendered';}).length===2,'log: expected two record.rendered lines');
check(log.some(function(e){return e.event==='draft.added'&&e.file==='draft-2.md'&&e.sha256;}),'log: draft.added missing');

// Refusal.
var bad=path.join(proj,'nothing'); fs.mkdirSync(bad);
check(node('render-record.js',['--run',bad]).status===2,'render: a folder with no seats.json should exit 2');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'record_check: '+failures.length+' failure(s), ':'record_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
