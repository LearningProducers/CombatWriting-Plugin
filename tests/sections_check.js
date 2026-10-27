// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// sections_check.js: a battle answer in two sections when the round shares (issue 80, 2026-10-26).
// The founder's words: "For battle the first section is open ended response by the LLM responding
// directly to the prompt. Then a response to the AI crew or question to the ai crew if there was an
// sn command or sfq command."
//
// What it pins, with the REAL scripts in a temporary run:
//   - packet.js: a first-round battle packet, an FQ, an N, a seat-line and a sparring packet ask for
//     no sections (no SECTIONS_LINE, sections false on the packet.built line); a second-round SN,
//     SFQ and plain battle packet ask for them (the line in the Contract, sections true), under the
//     critique contract and under --rerate; capSent still reads "Under 600 words in all."
//   - lib: sectionLabelOf reads the label bare, bold, as a heading, with a colon, in any case, and
//     nothing else; answerSections cuts the two parts; sectionReasons names a missing Answer, a
//     missing To the crew, the crew part first, text before the label (the rating line allowed under
//     the rating contract), an empty part; verdictLine frames the Answer's first sentence.
//   - check-answer.js: an unlabeled answer in a sharing round FAILs the first check with the two
//     reasons; the same file on the second check is OK with section_notes carrying them and the log
//     line the same; a labeled answer is OK with sections true; --sections holds without a run; an
//     answer in a non-sharing round is never held to the labels.
//   - The add-on: crew-lib.SECTIONS_LINE equals the plugin's; packetRules reads sections and the
//     "in all" cap; the server's system line names the two sections when the packet asks.
//   - The text: the seat agent, the battle, rules and help skills, CLAUDE.md.
//
// Run from the repo root:   node tests/sections_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var lib=require(path.join(scripts,'lib.js'));
var crewLib=require(path.join(root,'plugins','combat-writing-crew','crew-lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function skill(name){ return read(path.join(plugin,'skills',name,'SKILL.md')); }

var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-sections-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function packetLine(run,round,seat){ return logOf(run).filter(function(e){return e.event==='packet.built'&&e.round===round&&e.seat===seat;}).pop(); }
function contractOf(packetPath){ var t=read(packetPath); return t.slice(t.indexOf('## Contract'),t.indexOf('## Context brief')); }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company before the quarter closes.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
fs.writeFileSync(path.join(proj,'sn.md'),'is this ready to send?\n');
fs.writeFileSync(path.join(proj,'sfq.md'),'which line carries the ask?\n');
fs.writeFileSync(path.join(proj,'fq.md'),'does the close ask for the vote?\n');
fs.writeFileSync(path.join(proj,'n.md'),'read it as a board member with two minutes.\n');
fs.writeFileSync(path.join(proj,'q2.md'),'you called the ask vague; which line?\n');
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','battle','--name','sections','--model','Test Model']).stdout.trim();
// Three seats, as the crew add-on would register them.
var seats=JSON.parse(read(path.join(run,'seats.json')));
seats.seats.push({id:'seat-2',model:'Model Two',company:'Two Inc.',provider:'test-fixture',source:'test fixture: an outside seat'},{id:'seat-3',model:'Model Three',company:'Three Inc.',provider:'test-fixture',source:'test fixture: an outside seat'});
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(seats,null,2)+'\n');

// 1. The first round: no sections.
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-battle','--seat',s,'--sn','sn.md']); });
var p1=contractOf(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(p1.indexOf(lib.SECTIONS_LINE)<0&&packetLine(run,'01-battle','seat-1').sections===false&&/Under 600 words\./.test(p1)===false&&/Under 500 words\./.test(p1),'first round: no sections line, sections false, the 500-word cap in the old form; got '+p1.slice(0,200));
['seat-1','seat-2','seat-3'].forEach(function(s,i){ fs.writeFileSync(path.join(run,'rounds','01-battle',s+'.answer.md'),'Not ready: the ask is buried, says seat '+(i+1)+'.\n\nThe close never asks for the vote.\n'); node('check-answer.js',[path.join(run,'rounds','01-battle',s+'.answer.md'),'--run',run]); });
var c1=logOf(run).filter(function(e){return e.event==='answer.checked'&&e.round==='01-battle';});
check(c1.length===3&&c1.every(function(e){return e.ok&&e.sections===null&&e.section_notes.length===0;}),'first round: three unlabeled answers pass, sections null, no notes');

// 2. The second round shares: SN, SFQ and a plain round ask for the sections; FQ, N and a seat line do not; sparring does not.
node('packet.js',['--run',run,'--round','02-battle','--seat','seat-1','--sn','sn.md']);
var p2=contractOf(path.join(run,'rounds','02-battle','seat-1.packet.md'));
check(p2.indexOf(lib.SECTIONS_LINE)>=0&&packetLine(run,'02-battle','seat-1').sections===true&&/In the Answer, your critique of the structure and content of the draft, with specific evidence from it\. Under 600 words in all\./.test(p2)&&p2.indexOf(lib.NO_RATING_LINE)>=0,'SN second round: the sections line in the Contract, sections true, the cap in all; got '+p2.slice(0,300));
check(lib.capSent(run,'02-battle',path.join(run,'rounds','02-battle','seat-1.answer.md'))===600,'capSent reads 600 from the packet line');
fs.writeFileSync(path.join(run,'log.jsonl'),logOf(run).filter(function(e){return !(e.event==='packet.built'&&e.round==='02-battle');}).map(JSON.stringify).join('\n')+'\n');
check(lib.capSent(run,'02-battle',path.join(run,'rounds','02-battle','seat-1.answer.md'))===600&&lib.sectionsSent(run,'02-battle',path.join(run,'rounds','02-battle','seat-1.answer.md'))===true,'capSent and sectionsSent fall back to the packet text ("Under 600 words in all.", the sections line) with no log line');
node('packet.js',['--run',run,'--round','02-battle','--seat','seat-1','--sn','sn.md']);
node('packet.js',['--run',run,'--round','02-battle','--seat','seat-2','--sfq','sfq.md','--rerate']);
var p2b=contractOf(path.join(run,'rounds','02-battle','seat-2.packet.md'));
check(p2b.indexOf(lib.SECTIONS_LINE)>=0&&/^Your first line must be exactly `RATING: X\/10`/m.test(p2b)&&/In the Answer, your reasoning with specific evidence from the draft\. Under 600 words in all\./.test(p2b)&&packetLine(run,'02-battle','seat-2').sections===true,'SFQ with rerate: the rating line first, then the sections line, the cap in all');
node('packet.js',['--run',run,'--round','02-battle','--seat','seat-3']);
check(packetLine(run,'02-battle','seat-3').sections===true&&contractOf(path.join(run,'rounds','02-battle','seat-3.packet.md')).indexOf(lib.SECTIONS_LINE)>=0,'a plain second battle round shares and asks for the sections');
node('packet.js',['--run',run,'--round','03-battle','--seat','seat-1','--fq','fq.md']);
node('packet.js',['--run',run,'--round','03-battle','--seat','seat-2','--n','n.md']);
node('packet.js',['--run',run,'--round','03-battle','--seat','seat-3','--question','q2.md']);
['seat-1','seat-2','seat-3'].forEach(function(s){ check(packetLine(run,'03-battle',s).sections===false&&contractOf(path.join(run,'rounds','03-battle',s+'.packet.md')).indexOf(lib.SECTIONS_LINE)<0,s+' in an FQ, N or seat-line round: no sections'); });
node('packet.js',['--run',run,'--round','04-sparring','--seat','seat-1']);
node('packet.js',['--run',run,'--round','05-debate','--seat','seat-1']);
check(packetLine(run,'04-sparring','seat-1').sections===false&&packetLine(run,'05-debate','seat-1').sections===false,'sparring and debate: no sections');

// 3. The reader.
check(lib.sectionLabelOf('Answer')==='answer'&&lib.sectionLabelOf('**Answer**')==='answer'&&lib.sectionLabelOf('## Answer:')==='answer'&&lib.sectionLabelOf('ANSWER')==='answer'&&lib.sectionLabelOf('To the crew')==='crew'&&lib.sectionLabelOf('**To the crew:**')==='crew'&&lib.sectionLabelOf('### To The Crew')==='crew'&&lib.sectionLabelOf('- To the crew')==='crew','sectionLabelOf: the labels bare, bold, as headings, with a colon, in any case');
check(lib.sectionLabelOf('Answer the question')===null&&lib.sectionLabelOf('The answer is no.')===null&&lib.sectionLabelOf('To the crew: I disagree.')===null&&lib.sectionLabelOf('')===null,'sectionLabelOf: a line with more than the label is no label');
var good='Answer\n\nNot ready: the ask is buried.\n\nThe close never asks.\n\nTo the crew\n\nseat-2 wrote "the ask is vague"; I agree.\n';
var sec=lib.answerSections(good);
check(sec.labeled&&sec.answer==='Not ready: the ask is buried.\n\nThe close never asks.'&&sec.crew==='seat-2 wrote "the ask is vague"; I agree.'&&sec.answer_at===0&&sec.crew_at===6,'answerSections cuts the two parts, got '+JSON.stringify(sec));
check(lib.sectionReasons(good,'critique').length===0&&lib.sectionReasons('RATING: 8/10\n'+good,'rating').length===0,'sectionReasons: a labeled answer has none, the rating line allowed before the label');
check(JSON.stringify(lib.sectionReasons('Not ready.\n\nseat-2 said "x".\n','critique'))===JSON.stringify(['no Answer section: open with a line holding only "Answer", then your reply to the task, the verdict line first','no To the crew section: after your answer, a line holding only "To the crew", then where you agree or disagree with the other seats by name, quoted, or your question to them']),'sectionReasons: both labels missing, two reasons in order');
check(/^no Answer section: open with a line holding only "Answer" after the rating line/.test(lib.sectionReasons('RATING: 8/10\nNot ready.\n','rating')[0]),'sectionReasons under the rating contract names the rating line');
check(lib.sectionReasons('To the crew\n\nx\n\nAnswer\n\ny\n','critique')[0]==='the To the crew section comes before the Answer section; the Answer comes first','sectionReasons: the crew part first');
check(lib.sectionReasons('A preface.\n\nAnswer\n\ny\n\nTo the crew\n\nz\n','critique')[0]==='text before the Answer label: nothing goes before it'&&lib.sectionReasons('RATING: 8/10\nA preface.\n\nAnswer\n\ny\n\nTo the crew\n\nz\n','rating')[0]==='text before the Answer label: only the rating line goes before it','sectionReasons: text before the label');
check(lib.sectionReasons('Answer\n\nTo the crew\n\nz\n','critique')[0]==='the Answer section is empty'&&lib.sectionReasons('Answer\n\ny\n\nTo the crew\n','critique')[0]==='the To the crew section is empty','sectionReasons: an empty part');
check(lib.verdictLine(good,'critique')==='Not ready: the ask is buried.'&&lib.verdictLine('RATING: 8/10\n'+good,'rating')==='Not ready: the ask is buried.'&&lib.verdictLine('**Answer**\n\nShips as is.\n\n**To the crew**\n\nStand.\n','critique')==='Ships as is.','verdictLine frames the Answer section, bold labels too');
check(lib.verdictLine('Not ready: the ask is buried.\n\nMore.\n','critique')==='Not ready: the ask is buried.','verdictLine on an unlabeled answer is unchanged');
var r=lib.checkAnswer('Not ready.\n\nseat-2 said "x".\n',600,'critique',{sections:true});
check(!r.ok&&r.section_reasons.length===2&&r.reasons.length===2&&r.sections===false,'checkAnswer with sections: the two reasons, sections false');
var r2=lib.checkAnswer('Not ready.\n\nseat-2 said "x".\n',600,'critique');
check(r2.ok&&r2.sections===null&&r2.section_reasons.length===0,'checkAnswer without sections asked: unchanged');
var r3=lib.checkAnswer('RATING: 8/10\n'+good,600,'rating',{sections:true});
check(r3.ok&&r3.rating===8&&r3.sections===true,'checkAnswer: a labeled rated answer passes with sections true');

// 4. The checker script: the first check fails, the second notes and accepts; a labeled answer passes.
var f=path.join(run,'rounds','02-battle','seat-1.answer.md');
fs.writeFileSync(f,'Still not ready: the ask is buried.\n\nseat-2 wrote "the ask is vague"; I agree.\n');
var k1=node('check-answer.js',[f,'--run',run]);
check(k1.status===1&&/^seat-1 Test Model finished round 02-battle: FAIL no Answer section: open with a line holding only "Answer", then your reply to the task, the verdict line first; no To the crew section/.test(k1.stdout),'first check of an unlabeled answer in a sharing round fails with the reasons; got '+k1.stdout.split('\n')[0]);
var k2=node('check-answer.js',[f,'--run',run]);
var s2=JSON.parse(k2.stdout.trim().split('\n')[1]);
check(k2.status===0&&/^seat-1 Test Model finished round 02-battle: OK critique, no rating this round, 15 words, accepted without its two sections on the second check \(no Answer section/.test(k2.stdout)&&s2.ok===true&&s2.sections===false&&s2.section_notes.length===2&&s2.reasons.length===0,'second check: accepted, the faults as notes; got '+k2.stdout.split('\n')[0]);
var l2=logOf(run).filter(function(e){return e.event==='answer.checked'&&e.round==='02-battle'&&e.seat==='seat-1';});
check(l2.length===2&&l2[0].ok===false&&l2[0].reasons.length===2&&l2[1].ok===true&&l2[1].section_notes.length===2&&l2[1].sections===false,'the log carries the failed first check and the accepted second with its notes');
fs.writeFileSync(f,good);
var k3=node('check-answer.js',[f,'--run',run]);
check(k3.status===0&&JSON.parse(k3.stdout.trim().split('\n')[1]).sections===true&&!/accepted without/.test(k3.stdout),'a labeled answer passes with sections true and no note');
var g=path.join(proj,'loose.answer.md'); fs.writeFileSync(g,'Not ready.\n\nmore\n');
check(node('check-answer.js',[g,'--contract','critique']).status===0&&node('check-answer.js',[g,'--contract','critique','--sections']).status===1,'--sections holds the labels without a run; without it nothing is held');
// The board frames the Answer (seat-1's latest turn is 02-battle until the FQ answer below lands).
fs.rmSync(path.join(run,'rounds','03-battle'),{recursive:true,force:true}); fs.rmSync(path.join(run,'rounds','04-sparring'),{recursive:true,force:true}); fs.rmSync(path.join(run,'rounds','05-debate'),{recursive:true,force:true});
node('render-record.js',['--run',run]); node('render-board.js',['--run',run]);
var board=read(path.join(run,'board.html'));
check(/<blockquote>Not ready: the ask is buried\.<\/blockquote>/.test(board),'the board frames the Answer section\'s first sentence');
node('packet.js',['--run',run,'--round','03-battle','--seat','seat-1','--fq','fq.md']);
var f3=path.join(run,'rounds','03-battle','seat-1.answer.md'); fs.writeFileSync(f3,'Yes: the close asks for the vote in its last line.\n');
check(node('check-answer.js',[f3,'--run',run]).status===0,'an FQ-round answer is never held to the labels');

// 5. The add-on.
check(crewLib.SECTIONS_LINE===lib.SECTIONS_LINE,'the add-on\'s sections line must equal the listed plugin\'s');
var rules=crewLib.packetRules(read(path.join(run,'rounds','02-battle','seat-1.packet.md')));
check(rules.cap===600&&rules.contract==='critique'&&rules.sections===true,'packetRules reads the cap in all, the critique contract and sections; got '+JSON.stringify(rules));
check(crewLib.packetRules(read(path.join(run,'rounds','01-battle','seat-1.packet.md'))).sections===false,'packetRules: no sections on a first-round packet');
var server=read(path.join(root,'plugins','combat-writing-crew','server.js'));
check(/var sections=rules\.sections\?' Two sections, each opened by a line holding only its label: Answer, your reply to the task with the verdict line first; then To the crew, where you agree or disagree with the other seats by name, quoted word for word, or put a question to them\.':'';/.test(server),'the server\'s system line names the two sections when the packet asks');

// 6. The text.
var agent=read(path.join(plugin,'agents','seat.md')), battle=skill('battle'), rules_=skill('combat-writing'), help=skill('help'), claude=read(path.join(root,'CLAUDE.md'));
check(/When the packet's Contract asks for two sections \(a battle round that carries the other seats' answers, issue 80\), write them, each opened by a line holding only its label: `Answer`, your reply to the task, the verdict line first \(after the rating line when one is asked\); then `To the crew`/.test(agent)&&/a second answer without it is accepted with the fault noted/.test(agent),'the seat agent says the two sections and the retry rule');
check(/A round that shares the other seats' answers \(`sn:`, `sfq:`, or a plain round after a first one\) asks every seat for two sections \(issue 80\)/.test(battle)&&/the two sections in a round that carries the other seats' answers \(issue 80: `Answer`/.test(battle)&&/a missing label failing the first check and, on the second, noted and accepted so no read is lost/.test(battle),'the battle skill says the sections and how the checker holds them');
check(/A battle round that carries the other seats' answers asks for two sections \(issue 80\): `Answer`/.test(rules_),'the rules skill says the sections');
check(/^- \*\*Two sections\*\* in a round that shares \(SN, SFQ, or a plain round after the first\): each seat writes \*\*Answer\*\*/m.test(help),'the help names the two sections among the rounds');
check(/Two sections \(issue 80, 2026-10-26, the founder's words:/.test(claude)&&/`lib\.SECTIONS_LINE` in the Contract, mirrored in the add-on's `crew-lib\.js`; `sections: true` on the packet\.built line/.test(claude)&&/or of the Answer section when the answer carries the two labels/.test(claude),'CLAUDE.md says the sections, the mirror and the verdict');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'sections_check: '+failures.length+' failure(s), ':'sections_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
