// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// announce_check.js: the two kinds of line the person sees while a round runs (issue 33, 2026-10-19).
//
// Runs the REAL new-run.js, announce.js, packet.js and check-answer.js from
// plugins/combat-writing/scripts as child processes in a temporary project (never a
// re-implementation).
//
// What it pins:
//   - announce.js prints "Round <nn> forming: <kind> to <n> seat(s) (<id> <short>, ...)" with
//     ", rerate" only when asked, singular for one seat, the kind in the round terms (FQ, N, SN,
//     SFQ, a seat line / seat lines, the default prompt, a cold read, debate, the final reads),
//     never a seat the round does not go to, and logs round.announced with the kind, the seats
//     and the rerate flag, writing nothing else.
//   - It refuses (exit 2, nothing logged) a kind it does not know, a seat not in seats.json, a
//     round name of the wrong shape, and a missing --run, --round, --kind or --to.
//   - check-answer.js with --run leads its first line with "<seat> <short> finished round
//     <nn-kind>: " before OK or FAIL, so one line per seat prints as it finishes; without --run
//     the line is OK or FAIL alone, as before.
//
// Run from the repo root:   node tests/announce_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var scripts=path.join(root,'plugins','combat-writing','scripts');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-announce-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}); }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company. The ask lands in the first line.\n');
var run=node('new-run.js',['--draft','draft.md','--name','announce','--model','Test Model 1.0']).stdout.trim();
check(!!run&&fs.existsSync(run),'new-run failed');
var before=logOf(run).length;
var listing=fs.readdirSync(run).sort().join(',');

// One seat, no rerate.
var a1=node('announce.js',['--run',run,'--round','01-battle','--kind','N','--to','seat-1']);
check(a1.status===0&&a1.stdout==='Round 01 forming: N to 1 seat (seat-1 Test Model)\n','one seat, N: got '+JSON.stringify(a1.stdout)+' '+a1.stderr);
var l1=logOf(run); var e1=l1[l1.length-1];
check(l1.length===before+1&&e1.event==='round.announced'&&e1.round==='01-battle'&&e1.kind==='N'&&e1.to.join(',')==='seat-1'&&e1.rerate===false&&e1.line===a1.stdout.trim(),'one seat: round.announced should be logged once with the kind, the seat and rerate false, got '+JSON.stringify(e1));
check(fs.readdirSync(run).sort().join(',')===listing&&fs.readdirSync(path.join(run,'rounds')).length===0,'announce.js must write nothing but the log line, got '+fs.readdirSync(run).join(','));

// Three seats, rerate; a round of seat lines to two of them; the kinds in words.
var sj=JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8'));
sj.seats.push({id:'seat-2',model:'openai/gpt-oss-120b',company:'OpenAI',served_by:'Groq',provider:'groq',slot:'groq-a',source:'test fixture'});
sj.seats.push({id:'seat-3',model:'qwen/qwen3.8-27b',company:'Alibaba',served_by:'Groq',provider:'groq',slot:'groq-b',source:'test fixture'});
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(sj,null,2)+'\n');
var a2=node('announce.js',['--run',run,'--round','03-battle','--kind','n','--to','seat-1,seat-2,seat-3','--rerate']);
check(a2.status===0&&a2.stdout==='Round 03 forming: N2 to 3 seats (seat-1 Test Model, seat-2 gpt-oss, seat-3 qwen), rerate\n','three seats, rerate, kind in any case, the second N of the run (issue 99): got '+JSON.stringify(a2.stdout));
var a3=node('announce.js',['--run',run,'--round','04-battle','--kind','seat','--to','seat-2, seat-3']);
check(a3.status===0&&a3.stdout==='Round 04 forming: seat lines to 2 seats (seat-2 gpt-oss, seat-3 qwen)\n','seat lines to two: got '+JSON.stringify(a3.stdout));
check(a3.stdout.indexOf('seat-1')<0,'a seat the round does not go to must not be named');
var a4=node('announce.js',['--run',run,'--round','05-battle','--kind','seat','--to','seat-2']);
check(a4.status===0&&/^Round 05 forming: a seat line to 1 seat \(seat-2 gpt-oss\)\n$/.test(a4.stdout),'one seat line: got '+JSON.stringify(a4.stdout));
[['FQ','FQ'],['SN','SN'],['SFQ','SFQ'],['plain','the default prompt'],['cold','a cold read'],['debate','debate']].forEach(function(k){
  var r=node('announce.js',['--run',run,'--round','02-sparring','--kind',k[0],'--to','seat-1,seat-2,seat-3']);
  check(r.status===0&&r.stdout.indexOf('Round 02 forming: '+k[1]+' to 3 seats (')===0,'kind '+k[0]+' should read "'+k[1]+'", got '+JSON.stringify(r.stdout));
});
// The count (issue 99): round 02's last announcement above was debate, so an SFQ on round 07 is the
// first SFQ; one on round 08 is SFQ2; a seat line never counts.
var a6=node('announce.js',['--run',run,'--round','07-battle','--kind','sfq','--to','seat-1,seat-2,seat-3']);
check(a6.status===0&&a6.stdout.indexOf('Round 07 forming: SFQ to 3 seats (')===0,'first SFQ keeps its bare name: got '+JSON.stringify(a6.stdout));
var a7=node('announce.js',['--run',run,'--round','08-battle','--kind','SFQ','--to','seat-1,seat-2,seat-3']);
check(a7.status===0&&a7.stdout.indexOf('Round 08 forming: SFQ2 to 3 seats (')===0,'second SFQ forms as SFQ2: got '+JSON.stringify(a7.stdout));
var a8=node('announce.js',['--run',run,'--round','09-battle','--kind','seat','--to','seat-2']);
check(a8.status===0&&/forming: a seat line to 1 seat/.test(a8.stdout)&&!/seat line2/.test(a8.stdout),'seat lines carry no count: got '+JSON.stringify(a8.stdout));
var a5=node('announce.js',['--run',run,'--round','06-final','--kind','final','--to','seat-1,seat-2,seat-3','--rerate']);
check(a5.status===0&&a5.stdout==='Round 06 forming: the final reads to 3 seats (seat-1 Test Model, seat-2 gpt-oss, seat-3 qwen)\n','final reads never say rerate, got '+JSON.stringify(a5.stdout));
check(logOf(run).filter(function(e){return e.event==='round.announced';}).length===14,'every accepted announce logs one line');

// Refusals: exit 2, nothing logged.
var count=logOf(run).length;
[['bad kind',['--run',run,'--round','07-battle','--kind','rewrite','--to','seat-1']],
 ['unknown seat',['--run',run,'--round','07-battle','--kind','N','--to','seat-1,seat-9']],
 ['bad round',['--run',run,'--round','battle-7','--kind','N','--to','seat-1']],
 ['no --to',['--run',run,'--round','07-battle','--kind','N']],
 ['no --kind',['--run',run,'--round','07-battle','--to','seat-1']],
 ['no --round',['--run',run,'--kind','N','--to','seat-1']],
 ['no --run',['--round','07-battle','--kind','N','--to','seat-1']]].forEach(function(c){
  var r=node('announce.js',c[1]);
  check(r.status===2&&r.stdout===''&&/error:/.test(r.stderr),c[0]+': should exit 2 with a reason and print no line, got '+r.status+' '+JSON.stringify(r.stdout)+' '+r.stderr.slice(0,80));
});
check(logOf(run).length===count,'a refused announce logs nothing');
check(/seat-9/.test(node('announce.js',['--run',run,'--round','07-battle','--kind','N','--to','seat-9']).stderr),'the refusal names the unknown seat');

// The per-seat line: check-answer.js with --run leads with the seat and the round.
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify({seats:sj.seats.slice(0,1)},null,2)+'\n');
var pk=node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-1']);
check(pk.status===0,'packet.js failed: '+pk.stderr);
var ans=path.join(run,'rounds','01-sparring','seat-1.answer.md');
fs.writeFileSync(ans,'RATING: 8/10\nShips as is. The ask is in the first line.\n');
var c1=node('check-answer.js',[ans,'--run',run]);
check(c1.status===0&&c1.stdout.split('\n')[0]==='seat-1 Test Model finished round 01-sparring: OK rating 8/10, 12 words','per-seat line with --run: got '+JSON.stringify(c1.stdout.split('\n')[0]));
fs.writeFileSync(ans,'RATING: 7/10\nHedging.\n');
var c2=node('check-answer.js',[ans,'--run',run]);
check(c2.status===1&&/^seat-1 Test Model finished round 01-sparring: FAIL /.test(c2.stdout),'per-seat line on FAIL: got '+JSON.stringify(c2.stdout.split('\n')[0]));
var c3=node('check-answer.js',[ans]);
check(c3.status===1&&/^FAIL /.test(c3.stdout),'without --run the line is FAIL alone, got '+JSON.stringify(c3.stdout.split('\n')[0]));

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'announce_check: '+failures.length+' failure(s), ':'announce_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
