// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// order_check.js: any stage may be skipped (2026-10-14): the order of strategy, sparring and
// battle is the person's choice, battle may be a run's first round, strategy keeps a run made
// from a brief alone, the record and the board say which stage the run started at, and every
// sparring and battle result ends with the Next picker while the text Next line stays in record.md.
//
// Runs the REAL new-run.js, add-draft.js, packet.js, check-answer.js, render-record.js and
// render-board.js from plugins/combat-writing/scripts as child processes in a temporary project
// (never a re-implementation).
//
// What it pins, running the scripts:
//   - new-run.js --brief alone creates a run with brief.md, no draft.md and an empty rounds/,
//     logs stage: strategy, and refuses a call with neither --draft nor --brief, and a --stage
//     that is not strategy, sparring or battle.
//   - On that run the short form, record.md and board.html say the brief is stored and there is
//     no draft yet, name /cw:sparring and /cw:battle with the draft pasted, and say the run
//     started at strategy with the brief alone; packet.js refuses to build with no draft and
//     names add-draft.js.
//   - add-draft.js on that run writes draft.md (not draft-2.md), logs first: true with the stage
//     given, and a second call then writes draft-2.md as before.
//   - A first round that is a battle round, 01-battle, on a run nothing has read: an --sn packet
//     carries the SN text, the first-round line (no seat has read the draft, no other seat's
//     answer carried), no ANSWER fence, no earlier turn, the no-rating contract at the 500 cap,
//     and asks the seat to answer the synthesis navigation on the draft alone; its log line says
//     mode synthesis, shares false, first_round true, reads_round null. An --sfq packet does the
//     same for its term. A plain 01-battle packet asks for a first critique with no rating and
//     with --rerate asks for the first rating with the step-4 prompt. An --fq and an --n packet
//     carry their lines as in any round. The old fall-through (a rating prompt under a no-rating
//     contract) is gone.
//   - After a critique answer in 01-battle, a 02-sparring packet is a read alone: the draft, the
//     brief, the seat's own earlier turn, a rating asked, no other seat's answer; a 02-debate
//     packet shares.
//   - record.md says "Started at: strategy ... First round: 01-battle (battle before sparring)",
//     and so do board.html and the short form; a run made by new-run.js --stage battle says it
//     started at battle from a pasted draft; a run with no stage logged says so without failing.
//   - record.md carries the text Next line (**Next:** with fq:, n:, sn:, sfq:, seat-2:, rerate,
//     draft:, final and debate) once there is a round; the short form prints it before the
//     record's path and still ends with the seat key; a one-seat crew's line says SN, SFQ and
//     debate have no other seat.
//
// What it pins, on the text:
//   - battle's SKILL.md says a run with no round runs 01-battle and never points at sparring for
//     it; it starts a run from a draft with new-run.js --stage battle; sn: and sfq: on a first
//     round carry no other seat's answer and the packet says so.
//   - sparring's SKILL.md starts a run from a pasted draft with --stage sparring and says a
//     pasted draft joins a brief-only run.
//   - strategy's SKILL.md keeps a run made from a brief alone.
//   - The four command skills, the rules skill, the help and the method's departures say the
//     order of the stages is the person's choice; the help has an order section and a picker
//     section; the method has departure 14 and its docs/ mirror matches (license_check pins the
//     bytes; this pins the departure).
//   - The Next picker: sparring and battle close with it; the rules skill lays out screen one
//     (Battle: everyone / Battle: one seat / Debate: seats re-read and rerate / More), the four
//     round labels with the founder's descriptions in order, the More screen (Final reads / Help
//     / Done for now), the text line, the rerate yes/no, and Done for now printing the text Next
//     line and nothing else; strategy keeps its single Next line and no picker.
//   - One eval case starts a run at battle.
//
// Run from the repo root:   node tests/order_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function skill(name){ return read(path.join(plugin,'skills',name,'SKILL.md')); }

var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-order-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).split('\n').filter(Boolean).map(JSON.parse); }
var draftText='Dear board,\n\nPlease approve the letter of intent this week.\n\nDana\n';
var briefText='I am the CEO. Purpose: a yes on the LOI this week. Stakes: the deal.\n';
var draft2Text='Dear board,\n\nI ask for your vote on the letter of intent by Friday.\n\nDana\n';
fs.writeFileSync(path.join(proj,'draft.md'),draftText);
fs.writeFileSync(path.join(proj,'draft2.md'),draft2Text);
fs.writeFileSync(path.join(proj,'brief.md'),briefText);
fs.writeFileSync(path.join(proj,'sn.md'),'Everyone: is the close weak?\n');
fs.writeFileSync(path.join(proj,'sfq.md'),'Does the ask land in the first line?\n');
fs.writeFileSync(path.join(proj,'fq.md'),'Which line carries the ask?\n');
fs.writeFileSync(path.join(proj,'n.md'),'Read it as a board member with two minutes.\n');

// Refusals.
var r0=node('new-run.js',['--name','nothing','--model','Test Model 1.0']);
check(r0.status===2&&/--draft <file> or --brief <file> is required/.test(r0.stderr),'new-run with neither draft nor brief: must refuse naming both; got '+r0.status+' '+r0.stderr);
var r1=node('new-run.js',['--draft','draft.md','--stage','champion','--model','Test Model 1.0']);
check(r1.status===2&&/--stage must be strategy, sparring or battle/.test(r1.stderr),'new-run --stage champion: must refuse; got '+r1.stderr);

// Strategy from a brief alone.
var r=node('new-run.js',['--brief','brief.md','--stage','strategy','--name','board letter','--model','Test Model 1.0']);
check(r.status===0,'new-run --brief alone: exit '+r.status+' '+r.stderr);
var run=r.stdout.trim();
check(fs.existsSync(path.join(run,'brief.md'))&&!fs.existsSync(path.join(run,'draft.md'))&&fs.readdirSync(path.join(run,'rounds')).length===0,'brief-only run: expected brief.md, no draft.md, empty rounds/');
var created=logOf(run)[0];
check(created.event==='run.created'&&created.stage==='strategy'&&created.draft===null&&created.brief&&created.brief.file==='brief.md','brief-only run: run.created must log stage strategy, no draft, the brief; got '+JSON.stringify(created));
var s0=node('render-record.js',['--run',run,'--short']);
check(s0.status===0,'render-record --short on a brief-only run: exit '+s0.status+' '+s0.stderr);
check(/^No rounds yet\. The brief is stored; there is no draft yet\. Next: \/cw:sparring or \/cw:battle with the draft pasted; it joins this run\.$/m.test(s0.stdout),'brief-only short form: must say the brief is stored and no draft yet, naming both commands; got '+s0.stdout);
check(/^Started at: strategy: the brief stored first, the draft brought later by sparring or battle\. No round yet\.$/m.test(s0.stdout),'brief-only short form: the Started-at line; got '+s0.stdout);
var rec0=read(path.join(run,'record.md'));
check(/\*\*Drafts:\*\* none yet; the brief is stored and the draft joins the run when sparring or battle brings it\./.test(rec0),'brief-only record: the Drafts line must say none yet');
var b0=node('render-board.js',['--run',run]);
check(b0.status===0&&/No rounds yet\. The brief is stored; there is no draft yet\./.test(read(path.join(run,'board.html'))),'brief-only board: must render and carry the no-draft line');
var p0=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--sn','sn.md']);
check(p0.status===2&&/no draft in/.test(p0.stderr)&&/add-draft\.js/.test(p0.stderr),'packet on a brief-only run: must refuse and name add-draft.js; got '+p0.stderr);

// The draft joins the run from battle.
var a=node('add-draft.js',['--run',run,'--file','draft.md','--stage','battle']);
check(a.status===0&&a.stdout.trim()==='draft.md','add-draft on a brief-only run: must write draft.md; got '+a.stdout+' '+a.stderr);
check(read(path.join(run,'draft.md'))===draftText,'add-draft: draft.md not byte-identical');
var added=logOf(run).filter(function(e){return e.event==='draft.added';})[0];
check(added&&added.file==='draft.md'&&added.first===true&&added.stage==='battle','add-draft: draft.added must log file draft.md, first true, stage battle; got '+JSON.stringify(added));

// 01-battle with --sn: the first round of the run.
var p=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--sn','sn.md']);
check(p.status===0,'packet 01-battle --sn: exit '+p.status+' '+p.stderr);
var pk=read(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(/Synthesis navigation \(SN\): Everyone: is the close weak\?/.test(pk),'01-battle sn: the SN text must ride');
check(/This is the first round of the run: no seat has read the draft yet, so no other seat's answer is carried\. Answer on the draft alone\./.test(pk),'01-battle sn: the first-round line is missing');
check(/Answer the synthesis navigation above on the draft below\./.test(pk),'01-battle sn: must ask the seat to answer the SN on the draft alone');
check(pk.indexOf('ANSWER BEGIN')<0&&pk.indexOf('Your earlier turn')<0,'01-battle sn: must carry no other answer and no earlier turn');
check(/No rating this round: do not write a RATING line\./.test(pk)&&/Under 500 words\./.test(pk),'01-battle sn: the no-rating contract at the 500 cap');
check(!/Read this rough draft and rate it/.test(pk)&&!/Read the other seats' latest answers/.test(pk),'01-battle sn: the rating prompt or the synthesis prompt leaked into a first round');
check(pk.indexOf(briefText.trim())>=0&&pk.indexOf(draftText.trim())>=0,'01-battle sn: the brief and the draft must ride');
var pl=logOf(run).filter(function(e){return e.event==='packet.built';}).pop();
check(pl.mode==='synthesis'&&pl.shares===false&&pl.first_round===true&&pl.reads_round===null&&pl.contract==='critique'&&pl.word_cap===500&&pl.sn==='sn.md','01-battle sn: log line wrong: '+JSON.stringify(pl));
var p2=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--sfq','sfq.md']);
var pk2=read(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(p2.status===0&&/Synthesis focus question \(SFQ\): Does the ask land in the first line\?/.test(pk2)&&/Answer the synthesis focus question above on the draft below\./.test(pk2)&&/This is the first round of the run/.test(pk2),'01-battle sfq: must carry the SFQ, the first-round line and the answer-alone ask');
var p3=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1']);
var pk3=read(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(p3.status===0&&/Read this rough draft\. Give your critique of its structure and content, with specific evidence from it\./.test(pk3)&&/No rating this round/.test(pk3)&&/This is the first round of the run/.test(pk3),'01-battle plain: must ask for a first critique with no rating');
var p4=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--rerate']);
var pk4=read(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(p4.status===0&&/Read this rough draft and rate it on a scale from 1–10, you cannot use 7\./.test(pk4)&&/RATING: X\/10/.test(pk4)&&!/Your latest rating was/.test(pk4),'01-battle plain --rerate: must ask for the first rating with the step-4 prompt and name no earlier rating');
var p5=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--fq','fq.md']);
var pk5=read(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(p5.status===0&&/Focus question \(FQ\): Which line carries the ask\?/.test(pk5)&&/Answer the focus question above on the draft below\./.test(pk5),'01-battle fq: must work as in any round');
var p6=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--n','n.md']);
var pk6=read(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(p6.status===0&&/Navigation \(N\): Read it as a board member with two minutes\./.test(pk6)&&/Answer the navigation above on the draft below\./.test(pk6),'01-battle n: must work as in any round');
// Leave the round as the SN round it started as, with a critique answer.
node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--sn','sn.md']);
fs.writeFileSync(path.join(run,'rounds','01-battle','seat-1.answer.md'),'The close asks for approval but names no date, so a board member reads "this week" as a wish.\n');
var c=node('check-answer.js',[path.join(run,'rounds','01-battle','seat-1.answer.md'),'--run',run]);
check(c.status===0&&/no rating this round/.test(c.stdout),'check-answer on the first-round critique: must pass under the critique contract; got '+c.stdout+c.stderr);

// Sparring after battle reads alone; debate shares.
var q=node('packet.js',['--run',run,'--round','02-sparring','--seat','seat-1']);
var pq=read(path.join(run,'rounds','02-sparring','seat-1.packet.md'));
check(q.status===0&&/RATING: X\/10/.test(pq)&&/Your earlier turn \(round 01-battle\)/.test(pq)&&pq.indexOf('=== ANSWER BEGIN ===')<0&&/Read this rough draft and rate it/.test(pq)&&/against a fresh read of the draft/.test(pq),'02-sparring after battle: must be a read alone with a rating and the seat\'s own earlier turn');
var ql=logOf(run).filter(function(e){return e.event==='packet.built';}).pop();
check(ql.mode==='read'&&ql.shares===false&&ql.first_round===false&&ql.own_previous==='01-battle','02-sparring log line wrong: '+JSON.stringify(ql));
fs.rmSync(path.join(run,'rounds','02-sparring'),{recursive:true});
// A second seat, so debate has someone to share; written the way crew_register writes an outside seat.
var seatsFile=JSON.parse(read(path.join(run,'seats.json')));
seatsFile.seats.push({id:'seat-2',model:'maker/other-model-9b',company:'Other Maker',provider:'groq',served_by:'Groq',source:'the model field the provider returned'});
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(seatsFile,null,2)+'\n');
var d=node('packet.js',['--run',run,'--round','02-debate','--seat','seat-2']);
var pd=read(path.join(run,'rounds','02-debate','seat-2.packet.md'));
check(d.status===0&&/The other seats' answers \(round 01-battle\)/.test(pd)&&/=== ANSWER BEGIN ===/.test(pd)&&/Under 600 words/.test(pd),'02-debate after battle: must share the first round\'s answers at the 600 cap');
fs.rmSync(path.join(run,'rounds','02-debate'),{recursive:true});

// The record, the board and the short form say where the run started, and carry the Next line.
var s=node('render-record.js',['--run',run,'--short']);
check(s.status===0,'render-record --short after 01-battle: exit '+s.status+' '+s.stderr);
var rec=read(path.join(run,'record.md'));
check(/\*\*Started at:\*\* strategy: the brief stored first, the draft brought later by battle\. First round: 01-battle \(battle before sparring\)\./.test(rec),'record: the Started-at line after 01-battle; got '+(/\*\*Started at:\*\*[^\n]*/.exec(rec)||[''])[0]);
check(/\| Seat \| 01-battle \| Latest \|/.test(rec)&&/\| critique \|/.test(rec),'record: 01-battle must be the first column, marked critique');
var nextRe=/^\*\*Next:\*\* \/cw:battle fq: <question> \(FQ, [^\n]*n: <guidance> \(N, [^\n]*sn: <prompt> \(SN, [^\n]*sfq: <question> \(SFQ, [^\n]*seat-2: <note> \(one seat only\)[^\n]*rerate[^\n]*draft: <path>[^\n]*final[^\n]*\/cw:sparring debate[^\n]*$/m;
check(nextRe.test(rec),'record: the text Next line is missing or out of order');
check(/\*\*Started at:\*\*/.test(read(path.join(run,'record.md')))&&rec.indexOf('**Started at:**')<rec.indexOf('## Scoreboard'),'record: the Started-at line must sit above the scoreboard');
var shortLines=s.stdout.trim().split('\n');
// The short form after a round (2026-10-14: the terminal is short): no Started-at, Next or Record
// line; the Board line instead. --next prints the text Next line alone, for "Done for now".
check(!/^Started at:/m.test(s.stdout)&&!/^Next: /m.test(s.stdout)&&!/^Record: /m.test(s.stdout),'short form after a round: must carry no Started-at, Next or Record line');
check(shortLines.some(function(l){return l==='Board: '+path.join(run,'board.html');}),'short form after a round: must carry the Board line');
var nx=node('render-record.js',['--run',run,'--next']);
check(nx.status===0&&nx.stdout.trim().split('\n').length===1&&nx.stdout.indexOf('Next: /cw:battle fq:')===0,'--next: must print the text Next line alone; got '+JSON.stringify(nx.stdout));
check(/With one seat, SN, SFQ and debate have no other seat to share/.test(nx.stdout)===false,'--next: a two-seat crew must not carry the one-seat note');
check(shortLines[shortLines.length-1]==='Seat key: seat-1 Test Model · seat-2 other-model','short form: must still end with the seat key; got '+shortLines[shortLines.length-1]);
var b=node('render-board.js',['--run',run]);
var board=read(path.join(run,'board.html'));
check(b.status===0&&/<strong>Started at:<\/strong> strategy: the brief stored first, the draft brought later by battle\. First round: 01-battle \(battle before sparring\)\./.test(board),'board: the Started-at line');
check(!/https?:\/\//.test(board),'board: makes an outside request');
// A one-seat crew's Next line says what has no other seat.
seatsFile.seats.pop(); fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(seatsFile,null,2)+'\n');
var s1=node('render-record.js',['--run',run,'--next']);
check(/^Next: \/cw:battle fq:[^\n]*With one seat, SN, SFQ and debate have no other seat to share: use fq: or n:, or seat the add-on\.$/m.test(s1.stdout),'--next (one seat): the Next line must say SN, SFQ and debate have no other seat');
// A revision still lands as draft-2.md.
var a2=node('add-draft.js',['--run',run,'--file','draft2.md','--stage','battle']);
check(a2.status===0&&a2.stdout.trim()==='draft-2.md'&&read(path.join(run,'draft-2.md'))===draft2Text,'add-draft (second): must write draft-2.md; got '+a2.stdout+a2.stderr);

// A run battle made from a pasted draft, and a run with no stage logged.
var rb=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','battle','--name','from battle','--model','Test Model 1.0']);
check(rb.status===0,'new-run --stage battle: exit '+rb.status+' '+rb.stderr);
var runB=rb.stdout.trim();
var sb=node('render-record.js',['--run',runB,'--short']);
check(/^Started at: battle: the run was made from a pasted draft, with no strategy stage \(a brief came with it\)\. No round yet\.$/m.test(sb.stdout),'short form (started at battle): got '+sb.stdout);
var rn=node('new-run.js',['--draft','draft.md','--name','no stage','--model','Test Model 1.0']);
var runN=rn.stdout.trim();
var sn=node('render-record.js',['--run',runN,'--short']);
check(sn.status===0&&/^Started at: a stage not recorded \(the run was made before the stage was logged\)\. No round yet\.$/m.test(sn.stdout),'short form (no stage logged): must say so and not fail; got '+sn.stdout+sn.stderr);

// The text.
var battle=skill('battle'), sparring=skill('sparring'), strategy=skill('strategy'), help=skill('help'), rules=skill('combat-writing');
var method=read(path.join(plugin,'method','combat-writing.md'));
check(/A run with no round yet \(strategy made it, nothing has read it\) is discussed as it is: this round is `01-battle`/.test(battle),'battle: must run 01-battle on a run with no round');
check(!/has nothing to discuss/.test(battle)&&!/battle never starts a run/.test(battle),'battle: must not refuse a run with no round or refuse to start a run');
check(/new-run\.js --draft <draft file> \[--brief <brief file>\] --stage battle/.test(battle),'battle: must start a run with new-run.js --stage battle');
check(/add-draft\.js --run <folder> --file <draft file> --stage battle/.test(battle),'battle: must add the draft with --stage battle');
check(/`sn:` and `sfq:` carry no other seat's answer, the packet says so in one line/.test(battle),'battle: must say sn: and sfq: carry nothing on a first round and the packet says so');
check(/new-run\.js --draft <draft file> \[--brief <brief file>\] --stage sparring/.test(sparring),'sparring: must start a run with new-run.js --stage sparring');
check(/the pasted draft joins that run and carries its brief/.test(sparring),'sparring: a pasted draft must join a brief-only run');
check(/create the run from the brief alone at once/.test(strategy)&&/`new-run\.js --brief` with no `--draft`/.test(strategy),'strategy: must keep a run made from a brief alone');
[['battle',battle],['sparring',sparring],['strategy',strategy],['help',help],['combat-writing',rules]].forEach(function(p){
  check(/order of the stages is the person's choice|The order is yours|order is yours/.test(p[1]),p[0]+': must say the order of the stages is the person\'s choice');
});
check(/^## The order is yours$/m.test(help)&&/`help order` shows this section/.test(help),'help: needs the order section under the topic order');
check(/^## What comes next: the picker$/m.test(help)&&/`help next` shows this section/.test(help),'help: needs the picker section under the topic next');
check(/^14\. \*\*The order of the stages is the person's choice/m.test(method)&&/order of the stages is the person's choice/.test(method),'method: departure 14 on the order of the stages is missing');
// The Next picker.
var screenOne=/\*\*Battle: everyone\*\*[^\n]*\*\*Battle: one seat\*\*[^\n]*\*\*Debate: seats re-read and rerate\*\*[^\n]*\*\*More\*\*/;
check(screenOne.test(rules)&&screenOne.test(battle)&&screenOne.test(sparring),'the Next picker: screen one must be Battle: everyone / Battle: one seat / Debate: seats re-read and rerate / More in the rules skill, battle and sparring');
check(/\*\*FQ\*\*, "same question to every seat, nothing shared"; \*\*N\*\*, "same guidance to every seat, nothing shared"; \*\*SN\*\*, "everyone reads each other plus responds to your prompt"; \*\*SFQ\*\*, "everyone reads each other's response to this question plus responds to your question"/.test(rules),'the Next picker: the four round labels and descriptions, in order, in the rules skill');
check(/\*\*Final reads\*\*[^\n]*\*\*Help\*\*[^\n]*\*\*Done for now\*\*/.test(rules),'the Next picker: the More screen must be Final reads / Help / Done for now');
// Champion under More (ruled 2026-10-19): between Final reads and Help, with Shipped / Result /
// Insight on its second screen, in the rules skill, battle, sparring and the help.
var more=/\*\*Final reads\*\*[^\n]*\*\*Champion\*\*[^\n]*\*\*Help\*\*[^\n]*\*\*Done for now\*\*/;
var three=/\*\*Shipped\*\*[^\n]*\*\*Result\*\*[^\n]*\*\*Insight\*\*/;
[['combat-writing',rules],['battle',battle],['sparring',sparring],['help',help]].forEach(function(p){
  check(more.test(p[1]),p[0]+': the More screen must carry Champion between Final reads and Help');
  check(three.test(p[1]),p[0]+': Champion\'s second screen must be Shipped / Result / Insight');
});
check(/then `\/cw:champion` runs as if typed/.test(rules),'the Next picker: after Champion\'s text, /cw:champion runs as if typed');
check(/ask for the text in one line/.test(rules)&&/\*\*Rerate\*\*[^\n]*\*\*No rating\*\*/.test(rules),'the Next picker: the text line and the rerate yes/no');
check(/Done for now prints the text Next line, as `render-record\.js --run <folder> --next` prints it, and nothing else\./.test(rules),'the Next picker: Done for now must print the text Next line (--next) and nothing else');
check(/the seat list as the existing picker builds it/.test(rules),'the Next picker: the seat list is the existing picker\'s');
check(/Strategy's result keeps its single Next line/.test(rules)&&/End with one line, the Next line, and nothing after it/.test(strategy)&&!/Next picker/.test(strategy.replace(/not the picker/,'')),'strategy: must keep its single Next line and open no picker');
check(/Where you have no AskUserQuestion tool, print the text Next line instead of the picker\./.test(battle)&&/Where you have no AskUserQuestion tool, print the text Next line instead of the picker\./.test(sparring),'battle and sparring: the no-tool fallback is the text Next line');
// The eval case.
var evalDir=path.join(plugin,'evals','start-at-battle');
check(fs.existsSync(path.join(evalDir,'prompt.md'))&&fs.readdirSync(path.join(evalDir,'graders')).length>=2,'evals/start-at-battle: needs prompt.md and at least two graders');
if(fs.existsSync(path.join(evalDir,'prompt.md'))){var ev=read(path.join(evalDir,'prompt.md'));check(/\/cw:battle/.test(ev)&&!/\/cw:sparring/.test(ev.split('\n').slice(0,12).join('\n'))&&/sn:/.test(ev),'evals/start-at-battle: the prompt must open with /cw:battle sn: and no sparring first');}
check(/start-at-battle/.test(read(path.join(plugin,'evals','README.md'))),'evals/README.md: must list start-at-battle');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'order_check: '+failures.length+' failure(s), ':'order_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
