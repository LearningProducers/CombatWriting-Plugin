// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// rewrite_check.js: the Contract follows the prompt (issue 103, 2026-10-27). The founder's words: "it
// also ought to pay attention to what the prompt is saying. If it asks: Who was queen elizabeth? it
// ought to respond to the question and not begin with 'verdict', or 'not ready'"; and on a rewrite:
// "it should give the rewrite, a follow up rationale is fine and a response to the ai crew is good".
//
// What it pins, with the REAL scripts in a temporary run:
//   - packet.js: an N that asks for a rewrite carries REWRITE_LINE and no verdict sentence (prompted
//     and rewrite true on the packet.built line); a sharing SFQ with a question carries the prompted
//     sections line and PROMPT_FIRST_LINE, never the verdict clause; the same with --rerate keeps the
//     verdict-first sections line and the verdict sentence, the rewrite line beside them; a plain
//     sharing round with no prompt keeps the verdict-first line and the critique sentence.
//   - lib: asksRewrite on the word list; rewriteOf cuts the fence; rewriteReasons names a missing
//     fence, an empty one and text before it (the rating and verdict lines allowed when rated);
//     verdictLine frames a rewrite by its opening with the greeting line skipped.
//   - check-answer.js: an answer with no fence on a rewrite round FAILs the first check and is noted
//     on the second; a fenced answer is OK with rewrite true on the log line.
//   - render-board.js: the Rewrite badge, the opening framed, the whole rewrite under the frame.
//   - The add-on: the two mirrored lines equal the plugin's; packetRules reads rewrite and
//     verdict_first; the server's system line says the fence.
//   - The text: the seat agent, the battle, rules and help skills, CLAUDE.md.
//
// Run from the repo root:   node tests/rewrite_check.js
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

var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-rewrite-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function packetLine(run,round,seat){ return logOf(run).filter(function(e){return e.event==='packet.built'&&e.round===round&&e.seat===seat;}).pop(); }
function contractOf(packetPath){ var t=read(packetPath); return t.slice(t.indexOf('## Contract'),t.indexOf('## The draft')>0?t.indexOf('## The draft'):undefined); }
function write(p,t){ fs.writeFileSync(p,t); }

fs.writeFileSync(path.join(proj,'draft.md'),'Jeff,\n\nBuy the company before the quarter closes.\n');
var mk=node('new-run.js',['--draft','draft.md','--name','rewrite','--stage','battle','--no-brief','--model','Test Model']);
check(mk.status===0,'new-run: '+mk.stderr);
var run=mk.stdout.trim();
var sj=JSON.parse(read(path.join(run,'seats.json')));
sj.seats.push({id:'seat-2',model:'openai/gpt-oss-120b',company:'OpenAI',served_by:'Groq',provider:'groq',slot:'groq-a',source:'test fixture'});
sj.seats.push({id:'seat-3',model:'qwen/qwen3.8-27b',company:'Alibaba',served_by:'Groq',provider:'groq',slot:'groq-b',source:'test fixture'});
write(path.join(run,'seats.json'),JSON.stringify(sj,null,2)+'\n');

// 1. The word list.
check(lib.asksRewrite('Rewrite my most recent revision applying your critique to make it ready to send.')&&lib.asksRewrite('redraft the close')&&lib.asksRewrite('Please re-write it')&&lib.asksRewrite('write it tighter')&&lib.asksRewrite('Revise the ask.'),'asksRewrite: the rewrite words');
check(!lib.asksRewrite('Who was Queen Elizabeth?')&&!lib.asksRewrite('Is this ready to send?')&&!lib.asksRewrite("the writer's voice is off")&&!lib.asksRewrite(''),'asksRewrite: a question, a judgment and a near word are not a rewrite');

// 2. An N that asks for a rewrite: the rewrite line, no verdict sentence, no sections (a first round).
write(path.join(proj,'n.md'),'Rewrite the close so it asks for the vote.\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ var r=node('packet.js',['--run',run,'--round','01-battle','--seat',s,'--n','n.md']); check(r.status===0,'01-battle packet '+s+': '+r.stderr); });
var p1=contractOf(path.join(run,'rounds','01-battle','seat-1.packet.md'));
var l1=packetLine(run,'01-battle','seat-1');
check(p1.indexOf(lib.REWRITE_LINE+' Under 500 words.')>=0&&p1.indexOf(lib.NO_RATING_LINE)>=0&&!/your verdict on the draft/.test(p1)&&p1.indexOf(lib.PROMPT_FIRST_LINE)<0&&p1.indexOf(lib.SECTIONS_LINE)<0,'rewrite N: the rewrite line in the Contract, no verdict sentence, no sections; got '+p1.slice(0,300));
check(l1.prompted===true&&l1.rewrite===true&&l1.sections===false,'rewrite N: prompted and rewrite true on the packet line: '+JSON.stringify({prompted:l1.prompted,rewrite:l1.rewrite,sections:l1.sections}));
check(lib.rewriteSent(run,'01-battle',path.join(run,'rounds','01-battle','seat-1.answer.md'))===true,'rewriteSent reads the packet line');

// 3. The fence: rewriteOf, rewriteReasons, verdictLine.
var fenced='=== REWRITE BEGIN ===\nJeff,\n\nVote yes before Friday: the deal dies at the quarter close.\n\nThe rest holds.\n=== REWRITE END ===\n\nThe old close never asked for the vote; this one does in its first line.\n';
var rw=lib.rewriteOf(fenced);
check(!!rw&&rw.text==='Jeff,\n\nVote yes before Friday: the deal dies at the quarter close.\n\nThe rest holds.'&&rw.begin_at===0&&rw.end_at===6,'rewriteOf cuts the fence: '+JSON.stringify(rw));
check(lib.rewriteOf('No fence here.\n')===null&&!!lib.rewriteOf('**=== REWRITE BEGIN ===**\nx\n`=== REWRITE END ===`\n'),'rewriteOf: none without the fence; markdown marks around a fence line are dropped');
check(lib.rewriteReasons(fenced,'critique').length===0,'rewriteReasons: a fenced answer has none');
check(/^no rewrite: the task asked for one/.test(lib.rewriteReasons('Not ready. Here is my view.\n','critique')[0]),'rewriteReasons: no fence');
check(lib.rewriteReasons('=== REWRITE BEGIN ===\n\n=== REWRITE END ===\nwhy\n','critique')[0]==='the rewrite fence is empty','rewriteReasons: empty fence');
check(lib.rewriteReasons('Not ready as written.\n\n'+fenced,'critique')[0]==='text before the rewrite: nothing goes before it; the rewrite opens the answer','rewriteReasons: a verdict before the fence on an unrated round');
check(lib.rewriteReasons('RATING: 8/10\nShips with this.\n'+fenced,'rating').length===0&&lib.rewriteReasons('RATING: 8/10\nShips with this.\nAnd more.\n'+fenced,'rating')[0]==='text before the rewrite: only the rating line and the verdict line go before it','rewriteReasons: the rating and verdict lines allowed when rated, nothing more');
check(lib.rewriteReasons('RATING: 8/10\nAnswer\nShips with this.\n'+fenced+'To the crew\nx\n','rating').length===0,'rewriteReasons: with the labels, the verdict line after the Answer label is allowed');
check(lib.verdictLine(fenced,'critique')==='Vote yes before Friday: the deal dies at the quarter close.','verdictLine frames the rewrite by its opening, the greeting skipped; got '+JSON.stringify(lib.verdictLine(fenced,'critique')));

// 4. The checker: no fence fails once, noted on the second check; a fenced answer is OK.
var f1=path.join(run,'rounds','01-battle','seat-1.answer.md');
write(f1,'Not ready as written. The close pleads instead of asking.\n');
var k1=node('check-answer.js',[f1,'--run',run]);
check(k1.status===1&&/FAIL no rewrite: the task asked for one/.test(k1.stdout),'first check without the fence fails with the reason; got '+k1.stdout.split('\n')[0]);
var k2=node('check-answer.js',[f1,'--run',run]);
var c2=logOf(run).filter(function(e){return e.event==='answer.checked'&&e.round==='01-battle'&&e.seat==='seat-1';}).pop();
check(k2.status===0&&c2.ok===true&&c2.rewrite===false&&c2.section_notes.length===1&&/^no rewrite/.test(c2.section_notes[0]),'second check accepts and notes the missing fence; got '+JSON.stringify({status:k2.status,ok:c2.ok,rewrite:c2.rewrite,notes:c2.section_notes}));
var f2=path.join(run,'rounds','01-battle','seat-2.answer.md');
write(f2,fenced);
var k3=node('check-answer.js',[f2,'--run',run]);
var c3=logOf(run).filter(function(e){return e.event==='answer.checked'&&e.round==='01-battle'&&e.seat==='seat-2';}).pop();
check(k3.status===0&&c3.ok===true&&c3.rewrite===true&&c3.section_notes.length===0,'a fenced answer is OK with rewrite true; got '+JSON.stringify({status:k3.status,rewrite:c3.rewrite,notes:c3.section_notes}));
var k4=node('check-answer.js',[path.join(proj,'loose.md'),'--contract','critique','--rewrite']);
check(k4.status===2||k4.status===1,'--rewrite without a run holds the fence (a missing file or a missing fence fails): status '+k4.status);

// 5. The board: the badge, the framed opening, the whole rewrite under the frame.
var rb=node('render-board.js',['--run',run]);
check(rb.status===0,'render-board: '+rb.stderr);
var html=read(path.join(run,'board.html'));
var fr2=/<figure class="frame[^"]*" data-seat="seat-2">([^]*?)<\/figure>/.exec(html);
check(!!fr2&&/<span class="badge critique">Rewrite · no rating asked<\/span>/.test(fr2[1]),'board: seat-2 carries the Rewrite badge; got '+(fr2?fr2[1].slice(0,200):'no frame'));
check(!!fr2&&/<blockquote>Vote yes before Friday: the deal dies at the quarter close\.<\/blockquote>/.test(fr2[1]),'board: the frame quotes the rewrite\'s opening');
check(!!fr2&&/<div class="read rewrite"><p class="meta">The rewrite, in full:<\/p>[^]*?Vote yes before Friday[^]*?The rest holds\.[^]*?<\/div>/.test(fr2[1]),'board: the whole rewrite sits under the frame');
var fr1=/<figure class="frame[^"]*" data-seat="seat-1">([^]*?)<\/figure>/.exec(html);
check(!!fr1&&/Critique · no rating asked/.test(fr1[1])&&fr1[1].indexOf('read rewrite')<0,'board: a seat that gave no rewrite keeps the critique badge and no rewrite block');

// 6. A sharing SFQ with a question: the prompted sections line and the prompt-first line, no verdict clause.
write(path.join(run,'rounds','01-battle','seat-3.answer.md'),fenced);
write(path.join(proj,'q.md'),'Who was Queen Elizabeth?\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ var r=node('packet.js',['--run',run,'--round','02-battle','--seat',s,'--sfq','q.md']); check(r.status===0,'02-battle packet '+s+': '+r.stderr); });
var p2=contractOf(path.join(run,'rounds','02-battle','seat-1.packet.md')), l2=packetLine(run,'02-battle','seat-1');
check(p2.indexOf(lib.SECTIONS_LINE_PROMPTED+' '+lib.PROMPT_FIRST_LINE+' Under 600 words in all.')>=0&&p2.indexOf(lib.SECTIONS_LINE)<0&&!/verdict line first/.test(p2)&&!/your verdict on the draft/.test(p2)&&p2.indexOf(lib.REWRITE_LINE)<0,'question SFQ: the prompted sections line and the prompt-first line, no verdict; got '+p2.slice(0,400));
check(l2.prompted===true&&l2.rewrite===false&&l2.sections===true,'question SFQ: prompted, no rewrite, sections on the packet line');
// The person's prompt is the task (issue 106): no default critique ask under it; the read-and-quote line stays.
var t2=read(path.join(run,'rounds','02-battle','seat-1.packet.md')); t2=t2.slice(t2.indexOf('## Your task'),t2.indexOf('## Contract'));
check(t2.indexOf('Give a new critique')<0&&t2.indexOf('overlap and where do they diverge')<0&&t2.indexOf('Answer the synthesis focus question above on the draft below.')>=0&&/Read your own earlier turn and the other seats' answers below before you write\./.test(t2),'question SFQ: the task carries the prompt and no default critique ask; got '+t2.slice(0,400));
check(lib.sectionsSent(run,'02-battle',path.join(run,'rounds','02-battle','seat-1.answer.md'))===true,'sectionsSent reads the prompted form');
var a2=path.join(run,'rounds','02-battle','seat-1.answer.md');
write(a2,'Answer\n\nShe was the queen of England from 1558 to 1603, the last Tudor.\n\nTo the crew\n\nopenai/gpt-oss-120b wrote "Vote yes before Friday"; I agree the ask leads.\n');
var k5=node('check-answer.js',[a2,'--run',run]);
check(k5.status===0&&/OK critique/.test(k5.stdout)&&lib.verdictLine(read(a2),'critique')==='She was the queen of England from 1558 to 1603, the last Tudor.','question SFQ: the answer as asked passes and is framed; got '+k5.stdout.split('\n')[0]);

// 7. The same with --rerate and a rewrite word: the verdict-first sections line, the verdict sentence, the rewrite line beside them.
write(path.join(proj,'rw.md'),'Rewrite it so the ask leads.\n');
var r3=node('packet.js',['--run',run,'--round','03-battle','--seat','seat-1','--sfq','rw.md','--rerate']);
check(r3.status===0,'03-battle packet: '+r3.stderr);
var p3=contractOf(path.join(run,'rounds','03-battle','seat-1.packet.md')), l3=packetLine(run,'03-battle','seat-1');
check(p3.indexOf(lib.SECTIONS_LINE)>=0&&p3.indexOf(lib.SECTIONS_LINE_PROMPTED)<0&&p3.indexOf(lib.REWRITE_LINE)>=0&&/The number and the verdict must agree/.test(p3)&&p3.indexOf(lib.PROMPT_FIRST_LINE)<0,'rated rewrite SFQ: verdict first stays, the rewrite line rides; got '+p3.slice(0,400));
check(l3.prompted===true&&l3.rewrite===true&&l3.contract==='rating','rated rewrite SFQ: the packet line');
var a3=path.join(run,'rounds','03-battle','seat-1.answer.md');
write(a3,'RATING: 8/10\nAnswer\nShips with this rewrite.\n'+fenced+'\nTo the crew\n\nqwen/qwen3.8-27b wrote "The rest holds"; I agree.\n');
var k6=node('check-answer.js',[a3,'--run',run]);
check(k6.status===0&&/OK rating 8\/10/.test(k6.stdout),'rated rewrite: the rating line, the verdict line, the fence, the crew part pass; got '+k6.stdout.split('\n')[0]);

// 8. A plain sharing round with no prompt keeps the verdict-first line and the critique sentence.
var r4=node('packet.js',['--run',run,'--round','04-battle','--seat','seat-1']);
check(r4.status===0,'04-battle packet: '+r4.stderr);
var p4=contractOf(path.join(run,'rounds','04-battle','seat-1.packet.md')), l4=packetLine(run,'04-battle','seat-1');
check(p4.indexOf(lib.SECTIONS_LINE+' In the Answer, your critique of the structure and content of the draft, with specific evidence from it. Under 600 words in all.')>=0&&p4.indexOf(lib.PROMPT_FIRST_LINE)<0&&l4.prompted===false&&l4.rewrite===false,'plain sharing round: the verdict-first form stays; got '+p4.slice(0,300));
var t4=read(path.join(run,'rounds','04-battle','seat-1.packet.md')); t4=t4.slice(t4.indexOf('## Your task'),t4.indexOf('## Contract'));
check(t4.indexOf('Give a new critique of the structure and content of the draft.')>=0,'plain sharing round: the default ask stays when no prompt came');
var t3=read(path.join(run,'rounds','03-battle','seat-1.packet.md')); t3=t3.slice(t3.indexOf('## Your task'),t3.indexOf('## Contract'));
check(t3.indexOf('Give a new critique')<0&&t3.indexOf('Answer the synthesis focus question above on the draft below, then rate the draft.')>=0,'rated SFQ: the prompt then the rating, no default ask');

// 9. The add-on.
check(crewLib.SECTIONS_LINE_PROMPTED===lib.SECTIONS_LINE_PROMPTED&&crewLib.REWRITE_LINE===lib.REWRITE_LINE,'the add-on\'s mirrored lines equal the plugin\'s');
var r1=crewLib.packetRules(read(path.join(run,'rounds','01-battle','seat-1.packet.md')));
var r2=crewLib.packetRules(read(path.join(run,'rounds','02-battle','seat-1.packet.md')));
var r3r=crewLib.packetRules(read(path.join(run,'rounds','03-battle','seat-1.packet.md')));
check(r1.rewrite===true&&r1.sections===false&&r2.sections===true&&r2.verdict_first===false&&r2.rewrite===false&&r3r.sections===true&&r3r.verdict_first===true&&r3r.rewrite===true,'packetRules reads rewrite and verdict_first: '+JSON.stringify([r1,r2,r3r]));
var server=read(path.join(root,'plugins','combat-writing-crew','server.js'));
check(/var rewrite=rules\.rewrite\?' The task asks for a rewrite: write it in full between a line holding only === REWRITE BEGIN === and a line holding only === REWRITE END ===, before anything else in your answer but the rating line and the verdict line when they are asked; then your rationale, under 120 words\.':'';/.test(server)&&/\(rules\.verdict_first\?' with the verdict line first':' as it asks'\)/.test(server),'the server\'s system line says the fence and drops the verdict clause when the packet does');

// 10. The text.
var agent=read(path.join(plugin,'agents','seat.md')), battle=skill('battle'), rules_=skill('combat-writing'), help=skill('help'), claude=read(path.join(root,'CLAUDE.md')), readme=read(path.join(plugin,'README.md'));
check(/On a round with the author's prompt and no rating \(issue 103\), open with the answer to the prompt as it asks/.test(agent)&&/A rewrite asked for goes first, in full, between the fence lines the Contract names/.test(agent),'seat.md says the prompt rules the shape');
check(/The Contract follows the prompt \(issue 103, 2026-10-27/.test(battle)&&/The Contract follows the prompt \(issue 103, 2026-10-27, the founder's words/.test(rules_)&&/\*\*Your prompt rules the shape\*\*/.test(help)&&/The Contract follows the prompt \(issue 103/.test(claude)&&/a prompt that asks for a rewrite gets the rewrite first, in full, framed on the board under a Rewrite badge/.test(readme),'the skills, CLAUDE.md and the README say it');

fs.rmSync(proj,{recursive:true,force:true});
if(failures.length){ console.log('rewrite_check: '+failures.length+' failure(s), '+(passes+failures.length)+' checks'); failures.forEach(function(f){console.log('FAIL '+f);}); process.exit(1); }
console.log('rewrite_check: all passed, '+passes+' checks');
