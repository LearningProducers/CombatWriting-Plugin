// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// budget_check.js: the price of a round, printed before the seats run (issue 95, 2026-10-27). The
// founder's words: "we want the user to eventually run as many synthesis rounds as it wants without
// feeling like its taxing the models cap limits."
//
// What it pins, with the REAL scripts in a temporary project:
//   - packet.js logs `size` on every packet.built line: chars equal to the packet file's length,
//     tokens at four characters each (lib.estimateTokens, equal to the add-on's), and the parts
//     (head, task, contract, brief, draft; own and carried when the packet carries them) whose
//     characters add up to the whole.
//   - budget.js prints one line from those lines and seats.json: the largest packet's tokens and
//     its parts in words; with outside seats carrying a budget, the provider's wall, the floor, the
//     seats and the room left; a packet over the room names the seat, the overrun in tokens and
//     characters and that the add-on will refuse it; with no outside seat, that the fresh reader
//     has no wall; the second pass and a final round have their own openings; logs budget.printed
//     with the line and the numbers; writes nothing else; refuses a missing --round (exit 2) and a
//     round with no sized packet (exit 1).
//   - The text: the battle, sparring, rules and help skills, CLAUDE.md, the add-on README.
//
// Run from the repo root:   node tests/budget_check.js
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
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-budget-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function built(run,round,seat,pass){ return logOf(run).filter(function(e){return e.event==='packet.built'&&e.round===round&&e.seat===seat&&(pass?e.pass==='crew':e.pass!=='crew');}).pop(); }
var BUDGET={per_minute:8000,reply_floor:1200,reply_ceiling:2800};

// 1. The token rule is the add-on's, word for word.
check(lib.estimateTokens.toString()===crewLib.estimateTokens.toString()&&lib.estimateTokens('abcd')===1&&lib.estimateTokens('abcde')===2&&lib.estimateTokens('')===0&&lib.estimateTokens(null)===0,'estimateTokens: must equal the add-on\'s and count four characters a token');

// 2. A run with two outside seats carrying a budget.
fs.writeFileSync(path.join(proj,'draft.md'),'Jeff,\n\nYour post routes machines through five paths. Want to battle-test one?\n');
fs.writeFileSync(path.join(proj,'brief.md'),'Founder, cold email. The brief sets the rules the seats judge by.\n');
fs.writeFileSync(path.join(proj,'sn.md'),'is this ready to send?\n');
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','battle','--name','budget','--model','Test Model']).stdout.trim();
check(/combat-writing\/runs\//.test(run),'new-run.js made a run, got '+run);
var seats=JSON.parse(read(path.join(run,'seats.json')));
seats.seats.push({id:'seat-2',model:'Model Two',company:'Two Inc.',served_by:'Groq',provider:'groq',slot:'groq-b',source:'test fixture',budget:BUDGET});
seats.seats.push({id:'seat-3',model:'Model Three',company:'Three Inc.',served_by:'Groq',provider:'groq',slot:'groq-a',source:'test fixture',budget:BUDGET});
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(seats,null,2)+'\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-battle','--seat',s,'--sn','sn.md']); });
var b1=built(run,'01-battle','seat-1');
var p1=read(path.join(run,'rounds','01-battle','seat-1.packet.md'));
check(!!b1&&b1.size&&b1.size.chars===p1.length&&b1.size.tokens===Math.ceil(p1.length/4),'packet.built: size.chars should be the file\'s length and tokens a quarter of it, got '+JSON.stringify(b1&&b1.size));
var parts=b1.size.parts;
check(['head','task','contract','brief','draft'].every(function(k){return parts[k]&&parts[k].chars>0;})&&!parts.own&&!parts.carried,'packet.built: a first-round packet has head, task, contract, brief and draft parts and no own or carried, got '+Object.keys(parts).join(','));
var sum=Object.keys(parts).reduce(function(a,k){return a+parts[k].chars;},0)+(Object.keys(parts).length-1);
check(sum===b1.size.chars,'packet.built: the parts\' characters plus the joins should add up to the whole, '+sum+' vs '+b1.size.chars);
check(parts.task.chars>=p1.indexOf('## Contract')-p1.indexOf('## Your task')-2&&parts.task.chars<=p1.indexOf('## Contract')-p1.indexOf('## Your task'),'packet.built: the task part should span the Your task section, got '+parts.task.chars);
// The budget line.
var r=node('budget.js',['--run',run,'--round','01-battle']);
var line=r.stdout.trim();
var largest=Math.max(b1.size.tokens,built(run,'01-battle','seat-2').size.tokens,built(run,'01-battle','seat-3').size.tokens);
var biggestOutside=Math.max(built(run,'01-battle','seat-2').size.tokens,built(run,'01-battle','seat-3').size.tokens);
var room=8000-1200-biggestOutside;
check(r.status===0&&line.indexOf('Round 01 packets: up to about '+largest+' tokens (seat-')===0,'budget.js: the line should open with the round and the largest packet, got '+line);
check(/\): the prompt \d+, the brief \d+, the draft \d+, the contract \d+\. /.test(line),'budget.js: the parts in words, prompt, brief, draft, contract, got '+line);
check(line.indexOf('Groq allows 8,000 a minute per model with 1,200 kept for the reply (seat-2, seat-3): about '+String(room).replace(/\B(?=(\d{3})+(?!\d))/g,',')+' of room left.')>0,'budget.js: the wall, the floor, the seats and the room, got '+line);
var bp=logOf(run).filter(function(e){return e.event==='budget.printed';}).pop();
check(!!bp&&bp.round==='01-battle'&&bp.pass===null&&bp.line===line&&bp.largest.tokens===largest&&bp.packets.length===3&&bp.walls.length===1&&bp.walls[0].room===room&&bp.walls[0].seats.join(',')==='seat-2,seat-3','budget.printed: the log line should carry the line and the numbers, got '+JSON.stringify(bp));
var before=fs.readdirSync(path.join(run,'rounds','01-battle')).length;
check(before===3&&!/budget/.test(fs.readdirSync(run).join(' ')),'budget.js: must write nothing but the log line');

// 3. The second pass: packets carry the seat's own first pass and the others', and the line says so.
['seat-1','seat-2','seat-3'].forEach(function(s){ fs.writeFileSync(path.join(run,'rounds','01-battle',s+'.answer.md'),'Not ready: the ask is punctuated as both a question and a colon. Pick one and the skeleton holds.\n'); node('check-answer.js',[path.join(run,'rounds','01-battle',s+'.answer.md'),'--run',run]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-battle','--seat',s,'--crew']); });
var bc=built(run,'01-battle','seat-1',true);
check(!!bc&&bc.size.parts.own&&bc.size.parts.carried&&bc.size.parts.task,'second pass: the packet has own, carried and task parts, got '+Object.keys(bc.size.parts).join(','));
var rc=node('budget.js',['--run',run,'--round','01-battle','--pass','crew']);
check(rc.status===0&&/^Round 01, second pass, packets: up to about \d+ tokens \(seat-\d\): the prompt \d+, the other seats' answers \d+, the seat's earlier turn \d+, the brief \d+, the draft \d+, the contract \d+\. Groq allows 8,000/.test(rc.stdout.trim()),'budget.js --pass crew: the second pass line, got '+rc.stdout.trim());
// The first pass's line is unchanged by the second pass's packets.
var r1b=node('budget.js',['--run',run,'--round','01-battle']);
check(r1b.stdout.trim()===line,'budget.js: the first pass line should not read the second pass\'s packets');

// 4. Over the room: a prompt so long the packet leaves less than the floor.
var big='The post, pasted in full. '+new Array(1400).join('One deliberate decision per machine, made on day one. ')+'\n';
fs.writeFileSync(path.join(proj,'big.md'),big);
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','02-battle','--seat',s,'--sfq','big.md']); });
var r2=node('budget.js',['--run',run,'--round','02-battle']);
var t2=built(run,'02-battle','seat-2').size.tokens, t3=built(run,'02-battle','seat-3').size.tokens;
var over2=t2-(8000-1200), over3=t3-(8000-1200);
check(over2>0&&over3>0,'fixture: the big prompt should put both outside packets over the room, got '+t2+' and '+t3);
var l2=r2.stdout.trim();
check(r2.status===0&&/^Round 02 packets: up to about [\d,]+ tokens \(seat-\d\): the prompt [\d,]+, the other seats' answers [\d,]+, the seat's earlier turn [\d,]+, the brief [\d,]+, the draft [\d,]+, the contract [\d,]+\. Groq allows 8,000 a minute per model with 1,200 kept for the reply \(seat-2, seat-3\): seat-2's packet, about [\d,]+, is over the room by about [\d,]+ tokens \([\d,]+ characters\); seat-3's packet, about [\d,]+, is over the room by about [\d,]+ tokens \([\d,]+ characters\); the add-on will refuse it before it is sent\. Cut that much from the prompt or the brief, or run the round with less carried\.$/.test(l2),'budget.js: the over-the-room line, got '+l2);
check(l2.indexOf('seat-2\'s packet, about '+String(t2).replace(/\B(?=(\d{3})+(?!\d))/g,',')+', is over the room by about '+String(over2).replace(/\B(?=(\d{3})+(?!\d))/g,',')+' tokens ('+String(over2*4).replace(/\B(?=(\d{3})+(?!\d))/g,',')+' characters)')>0,'budget.js: the overrun numbers should be the packet\'s, got '+l2);
var bp2=logOf(run).filter(function(e){return e.event==='budget.printed'&&e.round==='02-battle';}).pop();
check(!!bp2&&bp2.walls[0].over.length===2&&bp2.walls[0].over[0].over_by===over2,'budget.printed: the overrun in the log, got '+JSON.stringify(bp2&&bp2.walls));

// 5. A final round.
node('packet.js',['--run',run,'--round','03-final','--seat','seat-1','--final','sn']);
node('packet.js',['--run',run,'--round','03-final','--seat','seat-1','--final','redflag']);
var r3=node('budget.js',['--run',run,'--round','03-final']);
check(r3.status===0&&/^Round 03 final-read packets: up to about \d+ tokens \(seat-1\): the prompt \d+, the draft \d+, the contract \d+\. Groq allows 8,000 a minute per model with 1,200 kept for the reply \(seat-2, seat-3\): about 6,800 of room left\.$/.test(r3.stdout.trim()),'budget.js: a final round with packets for the fresh reader alone, the outside seats\' room whole, got '+r3.stdout.trim());

// 6. A run with the fresh reader alone.
var run2=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','sparring','--name','alone','--model','Test Model']).stdout.trim();
node('packet.js',['--run',run2,'--round','01-sparring','--seat','seat-1']);
var r4=node('budget.js',['--run',run2,'--round','01-sparring']);
check(r4.status===0&&/^Round 01 packets: up to about \d+ tokens \(seat-1\): the prompt \d+, the brief \d+, the draft \d+, the contract \d+\. The fresh reader has no per-minute wall\.$/.test(r4.stdout.trim()),'budget.js: with no outside seat, the sizes and no wall, got '+r4.stdout.trim());

// 7. Misuse.
check(node('budget.js',['--run',run]).status===2,'budget.js: a missing --round should exit 2');
check(node('budget.js',['--run',run,'--round','09-battle']).status===1,'budget.js: a round with no packet should exit 1');
check(node('budget.js',['--run',run,'--round','01-battle','--pass','x']).status===2,'budget.js: --pass other than crew should exit 2');

// 8. The text.
var battle=skill('battle'), sparring=skill('sparring'), rules=skill('combat-writing'), help=skill('help');
check(/scripts\/budget\.js --run <folder> --round <nn>-battle\b/.test(battle)&&/budget\.js --run <folder> --round <nn>-battle --pass crew/.test(battle),'battle skill: must run budget.js after the packets and on the second pass');
check(/scripts\/budget\.js --run <folder> --round <round>/.test(sparring),'sparring skill: must run budget.js after the packets');
check(/budget\.js --run <folder> --round <nn-kind> \[--pass crew\]/.test(rules)&&/three kinds of line/.test(rules),'rules skill: the table row and the three kinds of line');
check(/packets: up to about/.test(help),'help: must show the budget line');
var claude=read(path.join(root,'CLAUDE.md'));
check(/`budget\.js` \(which writes only a log line/.test(claude)&&/three kinds of line/.test(claude)&&/budget\.js/.test(claude.split('## Layout')[1]||''),'CLAUDE.md: the writer, the three kinds of line, the layout');
check(/per_minute, reply_floor, reply_ceiling/.test(read(path.join(root,'plugins','combat-writing-crew','README.md'))),'add-on README: crew_register records the wall');

if(failures.length){ failures.forEach(function(f){console.log('FAIL '+f);}); console.log('budget_check: '+failures.length+' failure(s), '+(passes+failures.length)+' checks'); process.exit(1); }
console.log('budget_check: all passed, '+passes+' checks');
