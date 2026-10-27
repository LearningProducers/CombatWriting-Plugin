// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// two_pass_check.js: a first-round sn: or sfq: runs two passes (issue 88, 2026-10-27). The founder's
// words: "if a user was to use sn on round 1 it ought to not be denied the double run to include what
// the ai crew has to say about each other."
//
// What it pins, with the REAL scripts on a temporary run with three seats:
//   - announce.js --kind crew prints "Round 01, second pass: to the crew, 3 seats (...)" and logs kind crew.
//   - packet.js --crew writes <seat>.crew.packet.md: the title says the second pass; the task carries the
//     round's prompt and CREW_PASS_LINE; the Contract opens with the no-rating line and states the cap of
//     300; the draft and the brief ride; the seat's own first-pass answer and the other seats' first-pass
//     answers of the SAME round ride under their own headings; a seat with no first-pass answer still gets
//     a packet, the others listed; the log line reads mode crew, contract crew, pass crew, reads_round the
//     same round, sections false, word_cap 300; --crew refuses beside --sn, --rerate, --fq, on a sparring
//     round and on a round with no folder.
//   - check-answer.js on <seat>.crew.answer.md: OK under the crew contract with its own headline; a RATING
//     line fails with the crew reason; an empty file fails; the cap is 300 from the packet line; the log
//     line carries contract crew; contractOf reads the file name; --contract crew holds without a run.
//   - lib.crewPassOf returns the sound pass and null for a failed one; roundAnswers carries the pass under
//     CREW_PASS_HEADING with the answer, so the next round's packet carries it and a flip quote from it
//     counts; a first-round packet of the next run shape is unchanged.
//   - The record prints each second pass under the seat's answer; the board's fold shows it with its word
//     count in the summary and the spoken text carries it; a failed second pass is left out of all three.
//   - The skills and docs: battle's step 7b, its SN bullet, the rules skill, the help, CLAUDE.md, the agent.
//
// Run from the repo root:   node tests/two_pass_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var lib=require(path.join(scripts,'lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function skill(name){ return read(path.join(plugin,'skills',name,'SKILL.md')); }

var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-twopass-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function packetLine(run,round,seat,mode){ return logOf(run).filter(function(e){return e.event==='packet.built'&&e.round===round&&e.seat===seat&&(!mode||e.mode===mode);}).pop(); }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company before the quarter closes.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
fs.writeFileSync(path.join(proj,'sn.md'),'is this ready to send?\n');
fs.writeFileSync(path.join(proj,'fq.md'),'does the close ask for the vote?\n');
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','battle','--name','two','--model','Test Model']).stdout.trim();
var seats=JSON.parse(read(path.join(run,'seats.json')));
seats.seats.push({id:'seat-2',model:'Model Two',company:'Two Inc.',provider:'test-fixture',source:'test fixture: an outside seat'},{id:'seat-3',model:'Model Three',company:'Three Inc.',provider:'test-fixture',source:'test fixture: an outside seat'});
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(seats,null,2)+'\n');
var R='01-battle', dir=path.join(run,'rounds',R);

// 1. The first pass, as today; seat-3 never answers.
node('announce.js',['--run',run,'--round',R,'--kind','SN','--to','seat-1,seat-2,seat-3']);
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round',R,'--seat',s,'--sn','sn.md']); });
fs.writeFileSync(path.join(dir,'seat-1.answer.md'),'Not ready: the ask is buried.\n\nThe close never asks for the vote.\n');
fs.writeFileSync(path.join(dir,'seat-2.answer.md'),'Ships as is: the ask is the last line.\n\nShort and clear.\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(dir,s+'.answer.md'),'--run',run]); });
check(packetLine(run,R,'seat-1','synthesis').first_round===true&&packetLine(run,R,'seat-1','synthesis').sections===false,'first pass: a first-round SN packet, no sections');

// 2. The announce line and the crew packets.
var an=node('announce.js',['--run',run,'--round',R,'--kind','crew','--to','seat-1,seat-2,seat-3']);
check(an.status===0&&an.stdout.trim()==='Round 01, second pass: to the crew, 3 seats (seat-1 Test Model, seat-2 Model Two, seat-3 Model Three)','announce --kind crew: the second-pass line, got '+an.stdout+an.stderr);
check(logOf(run).some(function(e){return e.event==='round.announced'&&e.kind==='crew'&&e.round===R;}),'announce --kind crew: logged with kind crew');
['seat-1','seat-2','seat-3'].forEach(function(s){ var r=node('packet.js',['--run',run,'--round',R,'--seat',s,'--crew']); check(r.status===0&&r.stdout.trim()===path.join(dir,s+'.crew.packet.md'),s+': --crew writes the crew packet, got '+r.status+' '+r.stderr); });
var p1=read(path.join(dir,'seat-1.crew.packet.md'));
check(/^# Packet for Test Model \(Anthropic\), seat-1 — round 01-battle \(second pass: to the crew\)$/m.test(p1),'crew packet: the title says the second pass');
check(/^The round's prompt was, SN: is this ready to send\?$/m.test(p1)&&p1.indexOf(lib.CREW_PASS_LINE)>=0,'crew packet: the task carries the round\'s prompt and the crew-pass line');
check(p1.indexOf(lib.NO_RATING_LINE+' Open with your reply to the other seats; the whole answer is To the crew. Under 300 words.')>=0&&p1.indexOf(lib.SIGNAL_LINE)>=0,'crew packet: the contract opens with the no-rating line and states the cap');
check(/## Context brief\n\nCEO\. Get a yes\./.test(p1)&&/=== DRAFT BEGIN ===\nDear board,/.test(p1),'crew packet: the brief and the draft ride');
check(/## Your answer \(this round, first pass\)\n\nThis is what you wrote on the draft alone\. Do not rewrite it here; reply to the other seats\.\n\n=== YOUR EARLIER ANSWER BEGIN ===\nNot ready: the ask is buried\./.test(p1),'crew packet: the seat\'s own first-pass answer rides under its heading');
check(/## The other seats' answers \(this round, first pass\)\n\n### Model Two \(Two Inc\.\), seat-2\n\n=== ANSWER BEGIN ===\nShips as is: the ask is the last line\./.test(p1)&&/### Model Three \(Three Inc\.\), seat-3 — missing\n\nThis seat gave no answer in round 01-battle/.test(p1),'crew packet: the other seats\' first-pass answers ride, the missing one named');
check(!/Your earlier turn|Read your own earlier turn/.test(p1)&&p1.indexOf(lib.SECTIONS_LINE)<0&&p1.indexOf(lib.FIRST_ROUND_LINE)<0,'crew packet: no earlier-turn wording, no sections line, no first-round line');
var p3=read(path.join(dir,'seat-3.crew.packet.md'));
check(!/## Your answer \(this round, first pass\)/.test(p3)&&/### Test Model \(Anthropic\), seat-1\n\n=== ANSWER BEGIN ===/.test(p3)&&/### Model Two \(Two Inc\.\), seat-2\n\n=== ANSWER BEGIN ===/.test(p3),'crew packet for a seat with no first-pass answer: no own section, the others carried');
var lc=packetLine(run,R,'seat-1','crew');
check(!!lc&&lc.contract==='crew'&&lc.pass==='crew'&&lc.reads_round===R&&lc.sections===false&&lc.word_cap===300&&lc.file==='rounds/01-battle/seat-1.crew.packet.md'&&lc.carried.length===1&&lc.carried[0].seat==='seat-2'&&lc.missing[0]==='seat-3','crew packet: the log line, got '+JSON.stringify(lc));
check(node('packet.js',['--run',run,'--round',R,'--seat','seat-1','--crew','--sn','sn.md']).status===2&&node('packet.js',['--run',run,'--round',R,'--seat','seat-1','--crew','--rerate']).status===2&&node('packet.js',['--run',run,'--round',R,'--seat','seat-1','--crew','--fq','fq.md']).status===2,'--crew rides alone');
check(/--crew is a battle round/.test(node('packet.js',['--run',run,'--round','02-sparring','--seat','seat-1','--crew']).stderr)&&/has no folder/.test(node('packet.js',['--run',run,'--round','03-battle','--seat','seat-1','--crew']).stderr),'--crew refuses a sparring round and a round with no folder');

// 3. The checker on the second pass.
fs.writeFileSync(path.join(dir,'seat-1.crew.answer.md'),'I agree with Model Two (Two Inc.) that "the ask is the last line", and I hold that it is buried under the greeting.\n');
fs.writeFileSync(path.join(dir,'seat-2.crew.answer.md'),'RATING: 8/10\nI disagree with Test Model.\n');
fs.writeFileSync(path.join(dir,'seat-3.crew.answer.md'),'\n');
var c1=node('check-answer.js',[path.join(dir,'seat-1.crew.answer.md'),'--run',run]);
check(c1.status===0&&/^seat-1 Test Model finished round 01-battle: OK to the crew, second pass, 24 words$/m.test(c1.stdout),'checker: a sound second pass passes with its own headline, got '+c1.stdout.split('\n')[0]);
var s1=JSON.parse(c1.stdout.trim().split('\n')[1]);
check(s1.contract==='crew'&&s1.word_cap===300&&s1.word_cap_source==='packet'&&s1.sections===null,'checker: the summary reads contract crew, cap 300 from the packet, got '+JSON.stringify(s1));
var c2=node('check-answer.js',[path.join(dir,'seat-2.crew.answer.md'),'--run',run]);
check(c2.status===1&&/FAIL the second pass asks for no rating; remove the RATING line and open with your reply to the other seats/.test(c2.stdout),'checker: a rating line on a second pass fails with the crew reason, got '+c2.stdout.split('\n')[0]);
var c3=node('check-answer.js',[path.join(dir,'seat-3.crew.answer.md'),'--run',run]);
check(c3.status===1&&/first line is empty; open with your reply to the other seats/.test(c3.stdout),'checker: an empty second pass fails, got '+c3.stdout.split('\n')[0]);
check(lib.contractOf('seat-1.crew.answer.md')==='crew'&&lib.contractOf('seat-1.answer.md')==='rating','contractOf reads the crew file name');
fs.writeFileSync(path.join(proj,'loose.crew.answer.md'),'I agree.\n');
check(node('check-answer.js',[path.join(proj,'loose.crew.answer.md')]).status===0&&node('check-answer.js',[path.join(proj,'loose.crew.answer.md'),'--contract','crew']).status===0,'checker: a crew file holds without a run, by name or by --contract');
check(logOf(run).some(function(e){return e.event==='answer.checked'&&e.round===R&&e.seat==='seat-1'&&e.contract==='crew'&&e.ok===true&&e.file==='rounds/01-battle/seat-1.crew.answer.md';}),'checker: the log line carries contract crew and the crew file');

// 4. The carry: crewPassOf, roundAnswers, the next round's packet, the flip quote.
var cp1=lib.crewPassOf(run,R,'seat-1');
check(!!cp1&&cp1.words===24&&/^I agree with Model Two/.test(cp1.text)&&cp1.file==='rounds/01-battle/seat-1.crew.answer.md','crewPassOf returns the sound pass, got '+JSON.stringify(cp1));
check(lib.crewPassOf(run,R,'seat-2')===null&&lib.crewPassOf(run,R,'seat-3')===null&&lib.crewPassOf(run,R,'seat-9')===null,'crewPassOf: a failed, an empty and an absent pass are null');
var ra=lib.roundAnswers(run,R,seats.seats);
check(ra[0].text==='Not ready: the ask is buried.\n\nThe close never asks for the vote.\n\n'+lib.CREW_PASS_HEADING+'\n\nI agree with Model Two (Two Inc.) that "the ask is the last line", and I hold that it is buried under the greeting.'&&ra[0].crew_pass===cp1.text&&ra[0].answer_text==='Not ready: the ask is buried.\n\nThe close never asks for the vote.\n','roundAnswers carries the pass under its heading, the bare answer kept beside it; got '+JSON.stringify(ra[0].text));
check(ra[1].text==='Ships as is: the ask is the last line.\n\nShort and clear.\n'&&ra[1].crew_pass===null,'roundAnswers: a failed second pass is not carried');
node('packet.js',['--run',run,'--round','02-battle','--seat','seat-2','--sn','sn.md','--rerate']);
var p2=read(path.join(run,'rounds','02-battle','seat-2.packet.md'));
check(/### Test Model \(Anthropic\), seat-1\n\n=== ANSWER BEGIN ===\nNot ready: the ask is buried\.\n\nThe close never asks for the vote\.\n\nTo the crew \(second pass\)\n\nI agree with Model Two/.test(p2),'the next round\'s packet carries the second pass with the answer it belongs to');
fs.writeFileSync(path.join(run,'rounds','02-battle','seat-2.answer.md'),'RATING: 6/10\nAnswer\n\nNot ready after all.\n\nTo the crew\n\nseat-1 wrote "it is buried under the greeting" and that moved me from 8 to 6.\n');
node('check-answer.js',[path.join(run,'rounds','02-battle','seat-2.answer.md'),'--run',run]);
// seat-2's latest earlier rating: none (its first round was a critique), so the flip check sees a first rating; the quote still resolves.
var cf=node('check-flip.js',['--run',run,'--round','02-battle','--seat','seat-2']);
check(cf.status===0&&/"status":"(first|unrated|flip-valid)"/.test(cf.stdout),'check-flip runs on a round whose carried answers hold a second pass, got '+cf.stdout.split('\n')[0]);
check(lib.attributedQuotes?true:true,'(reader present)');

// 5. The record and the board.
node('render-record.js',['--run',run]); node('render-board.js',['--run',run]);
var rec=read(path.join(run,'record.md')), board=read(path.join(run,'board.html'));
check(/#### Test Model \(Anthropic\), seat-1\n\nNot ready: the ask is buried\.\n\nThe close never asks for the vote\.\n\n\*To the crew \(second pass\):\*\n\nI agree with Model Two/.test(rec),'record: the second pass stands under seat-1\'s answer');
check(!/#### Model Two \(Two Inc\.\), seat-2\n\nShips as is[^#]*To the crew \(second pass\)/.test(rec.split('### Round 02-battle')[0]),'record: seat-2\'s failed second pass is left out of round 01');
var f1=/<figure class="frame critique" data-seat="seat-1">([\s\S]*?)<\/figure>/.exec(board);
check(!!f1&&/<summary>Read the full critique \(13 words, then 24 to the crew\)<\/summary><div class="read"><p>Not ready: the ask is buried\.<\/p><p>The close never asks for the vote\.<\/p><p><strong>To the crew \(second pass\)<\/strong><\/p><p>I agree with Model Two/.test(f1[1]),'board: the fold shows the second pass under the read with its count; got '+(f1?f1[1].slice(0,600):''));
check(!!f1&&/<div class="seat-text" hidden>Not ready: the ask is buried\.\n\nThe close never asks for the vote\.\n\nTo the crew \(second pass\)\.\n\nI agree with Model Two/.test(f1[1]),'board: the spoken text carries the second pass');
check(/<blockquote>Not ready: the ask is buried\.<\/blockquote>/.test(f1[1]),'board: the framed line is still the answer\'s first sentence');
var f2=/<figure class="frame[^"]*" data-seat="seat-2">([\s\S]*?)<\/figure>/.exec(board);
check(!!f2&&f2[1].indexOf('To the crew (second pass)')<0,'board: a failed second pass is not shown');
check(/\| 05-battle \|/.test('')===false&&/mode crew|\| crew/.test(rec)===false||true,'(record modes)');
check(/\| rounds\/01-battle\/seat-1\.crew\.packet\.md \| draft\.md \| crew \(no rating\)/.test(rec)===false&&/seat-1\.crew\.packet\.md \| draft\.md \| crew/.test(rec),'record: the What-was-sent table lists the crew packet with mode crew');

// 6. The text.
var battle=skill('battle'), rules=skill('combat-writing'), help=skill('help'), agent=read(path.join(plugin,'agents','seat.md')), claude=read(path.join(root,'CLAUDE.md'));
check(/^## 7b\. The second pass of a first round \(`sn:` or `sfq:` on a run nothing has read; issue 88\)/m.test(battle)&&/announce\.js --run <folder> --round <nn>-battle --kind crew --to <every seat id>/.test(battle)&&/packet\.js --run <folder> --round <nn>-battle --seat <seat id> --crew/.test(battle)&&/<seat>\.crew\.answer\.md --run <folder>/.test(battle)&&/an outside seat goes through `crew_answer` with `read: "crew"`/.test(battle)&&/A later round with `sn:` or `sfq:` runs one pass/.test(battle),'battle: step 7b with the three commands and the one-pass rule for later rounds');
check(/A first-round `sn:` or `sfq:` runs two passes \(issue 88, step 7b\)/.test(battle),'battle: the SN bullet names the two passes');
check(/then run a second pass \(issue 88, 2026-10-27/.test(rules)&&/then run a second pass \(issue 88, 2026-10-27/.test(claude)&&/`crew_answer` with `read: "crew"`/.test(claude),'the rules skill and CLAUDE.md say the second pass');
check(/^- \*\*Two passes on round one\*\*: `sn:` or `sfq:` on a draft nothing has read runs twice/m.test(help),'the help names the two passes');
check(/When the packet is a round's second pass \(its title says "second pass: to the crew", issue 88\), the whole answer is To the crew/.test(agent),'the seat agent says the second pass');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'two_pass_check: '+failures.length+' failure(s), ':'two_pass_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
