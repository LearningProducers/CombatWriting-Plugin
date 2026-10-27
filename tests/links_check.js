// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// links_check.js: links are unread (issue 90, 2026-10-27). The founder's words, after a seat described a
// post it never opened and charged him with misreading it: "Are you guys actually able to even pull and
// read the millionaire warehouse post I alluded to? Be honest if not."
//
// What it pins, with the REAL scripts in a temporary run:
//   - lib.hasLink: an https address, an http address, a www address, inside a sentence or alone; no
//     address, empty and null are false.
//   - packet.js: a packet whose brief, draft or prompt carries an address puts LINKS_UNREAD_LINE in its
//     Contract and logs links_unread true: a first-round SN (the brief holds the address), the second
//     pass, a sharing round, a sparring round, a cold read with the address in the draft, an FQ with
//     the address in the question alone, a seat line with it alone; a packet with no address anywhere
//     carries no such line and logs false, a final read and a cold read among them when the draft
//     holds none (both drop the brief).
//   - The add-on: crew-lib.LINKS_UNREAD_LINE equals the plugin's; packetRules reads links.
//   - The text: the seat agent, the battle, sparring, rules and help skills, the plugin README, CLAUDE.md.
//   The server's system line is pinned in crew_check.js, through its fake provider.
//
// Run from the repo root:   node tests/links_check.js
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

var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-links-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function packetLine(run,round,seat,pass){ return logOf(run).filter(function(e){return e.event==='packet.built'&&e.round===round&&e.seat===seat&&(pass?e.pass==='crew':e.pass!=='crew');}).pop(); }
function contractOf(packetPath){ var t=read(packetPath); var a=t.indexOf('## Contract'), b=t.indexOf('## Context brief'); if(b<0)b=t.indexOf('## The draft'); return t.slice(a,b); }
function carries(packetPath){ return contractOf(packetPath).indexOf(lib.LINKS_UNREAD_LINE)>=0; }

// 1. hasLink.
check(lib.hasLink('read https://blog.example.com/post/ first')&&lib.hasLink('http://example.com')&&lib.hasLink('see www.example.com today')&&lib.hasLink('https://example.com/x\n'),'hasLink: an https, http or www address, inside a sentence or alone');
check(!lib.hasLink('no address here, only words')&&!lib.hasLink('')&&!lib.hasLink(null)&&!lib.hasLink('a colon: and a slash / and dots.'),'hasLink: no address is false');

// 2. A run whose brief carries the address and whose draft does not.
fs.writeFileSync(path.join(proj,'draft.md'),'Jeff,\n\nYour post routes machines through five paths. Want to battle-test one?\n');
fs.writeFileSync(path.join(proj,'brief.md'),'Founder, cold email. The prospect\'s post is the reference: https://blog.example.com/the-warehouse/\n');
fs.writeFileSync(path.join(proj,'sn.md'),'is this ready to send?\n');
fs.writeFileSync(path.join(proj,'fq-link.md'),'does the ask match https://example.com/page ?\n');
fs.writeFileSync(path.join(proj,'fq-plain.md'),'does the ask match the post?\n');
fs.writeFileSync(path.join(proj,'q-link.md'),'you cited www.example.com; which line?\n');
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','battle','--name','links','--model','Test Model']).stdout.trim();
check(/combat-writing\/runs\//.test(run),'new-run.js made a run, got '+run);
var seats=JSON.parse(read(path.join(run,'seats.json')));
seats.seats.push({id:'seat-2',model:'Model Two',company:'Two Inc.',provider:'test-fixture',source:'test fixture: an outside seat'});
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(seats,null,2)+'\n');

['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-battle','--seat',s,'--sn','sn.md']); });
var p1=path.join(run,'rounds','01-battle','seat-1.packet.md');
check(carries(p1)&&packetLine(run,'01-battle','seat-1').links_unread===true,'first-round SN with the address in the brief: the line in the Contract, links_unread true');
var t1=read(p1);
check(t1.indexOf(lib.LINKS_UNREAD_LINE)<t1.indexOf(lib.SIGNAL_LINE)&&t1.indexOf(lib.NO_RATING_LINE)<t1.indexOf(lib.LINKS_UNREAD_LINE),'the line sits in the Contract after the contract line and before the signal line');
['seat-1','seat-2'].forEach(function(s){ fs.writeFileSync(path.join(run,'rounds','01-battle',s+'.answer.md'),'Not ready: the post is unread here, so the first sentence is your claim.\n'); node('check-answer.js',[path.join(run,'rounds','01-battle',s+'.answer.md'),'--run',run]); });
// The second pass.
node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--crew']);
var pc=path.join(run,'rounds','01-battle','seat-1.crew.packet.md');
check(carries(pc)&&packetLine(run,'01-battle','seat-1',true).links_unread===true,'the second pass carries the line');
// A sharing round, a sparring round, a final read.
node('packet.js',['--run',run,'--round','02-battle','--seat','seat-1','--sn','sn.md']);
check(carries(path.join(run,'rounds','02-battle','seat-1.packet.md')),'a sharing round carries the line');
node('packet.js',['--run',run,'--round','03-sparring','--seat','seat-1']);
check(carries(path.join(run,'rounds','03-sparring','seat-1.packet.md'))&&packetLine(run,'03-sparring','seat-1').links_unread===true,'a sparring round carries the line');
// A final read is the draft alone, no brief: with no address in the draft, no line.
node('packet.js',['--run',run,'--round','04-final','--seat','seat-1','--final','sn']);
var p4=path.join(run,'rounds','04-final','seat-1.sn.packet.md');
check(!carries(p4)&&read(p4).indexOf(lib.LINKS_UNREAD_LINE)<0&&logOf(run).filter(function(e){return e.event==='packet.built'&&e.round==='04-final';}).pop().links_unread===false,'a final read drops the brief: no address left, no line, links_unread false');
// A cold read drops the brief: no address left, no line.
node('packet.js',['--run',run,'--round','05-sparring','--seat','seat-1','--cold']);
var p5=path.join(run,'rounds','05-sparring','seat-1.packet.md');
check(!carries(p5)&&read(p5).indexOf(lib.LINKS_UNREAD_LINE)<0&&packetLine(run,'05-sparring','seat-1').links_unread===false,'a cold read with no address in the draft carries no line, links_unread false');

// 3. A run with no address anywhere; then the address in the question alone.
fs.writeFileSync(path.join(proj,'draft-plain.md'),'Jeff,\n\nYour post routes machines through five paths. Want to battle-test one?\n');
fs.writeFileSync(path.join(proj,'brief-plain.md'),'Founder, cold email. The prospect wrote a post on his warehouse.\n');
var run2=node('new-run.js',['--draft','draft-plain.md','--brief','brief-plain.md','--stage','battle','--name','nolinks','--model','Test Model']).stdout.trim();
node('packet.js',['--run',run2,'--round','01-battle','--seat','seat-1','--fq','fq-plain.md']);
var q1=path.join(run2,'rounds','01-battle','seat-1.packet.md');
check(!carries(q1)&&read(q1).indexOf(lib.LINKS_UNREAD_LINE)<0&&packetLine(run2,'01-battle','seat-1').links_unread===false,'no address anywhere: no line, links_unread false');
node('packet.js',['--run',run2,'--round','02-battle','--seat','seat-1','--fq','fq-link.md']);
check(carries(path.join(run2,'rounds','02-battle','seat-1.packet.md'))&&packetLine(run2,'02-battle','seat-1').links_unread===true,'an FQ carrying the address alone: the line');
node('packet.js',['--run',run2,'--round','03-battle','--seat','seat-1','--question','q-link.md']);
check(carries(path.join(run2,'rounds','03-battle','seat-1.packet.md')),'a seat line carrying the address alone: the line');
// A cold read with the address in the draft.
fs.writeFileSync(path.join(proj,'draft-link.md'),'Jeff,\n\nWant to battle-test one path?\nhttps://combat.example.com\n');
var run3=node('new-run.js',['--draft','draft-link.md','--brief','brief-plain.md','--stage','sparring','--name','draftlink','--model','Test Model']).stdout.trim();
node('packet.js',['--run',run3,'--round','01-sparring','--seat','seat-1','--cold']);
check(carries(path.join(run3,'rounds','01-sparring','seat-1.packet.md')),'a cold read with the address in the draft carries the line');

// 4. The add-on's mirror.
check(crewLib.LINKS_UNREAD_LINE===lib.LINKS_UNREAD_LINE,'crew-lib.LINKS_UNREAD_LINE must equal the plugin\'s');
check(crewLib.packetRules(read(p1)).links===true&&crewLib.packetRules(read(q1)).links===false&&crewLib.packetRules('').links===false,'packetRules reads links from the packet text');

// 5. The text.
var agent=read(path.join(plugin,'agents','seat.md'));
check(/You cannot open a link, and no seat can \(issue 90\)/.test(agent)&&/say the page is unread and ask for its text/.test(agent),'the seat agent says a seat cannot open a link and what to do instead');
check(/No seat can open a link \(issue 90\)/.test(skill('battle'))&&/pasted into the brief, or into the round's prompt/.test(skill('battle')),'the battle skill says the seats cannot open a link and how a page reaches the crew');
check(/cannot open a link/.test(skill('sparring')),'the sparring skill says the seats cannot open a link');
check(/No seat can open a link/.test(skill('combat-writing')),'the rules skill says the seats cannot open a link');
check(/cannot open a link/.test(skill('help')),'the help says the seats cannot open a link');
check(/cannot open a link/.test(read(path.join(plugin,'README.md'))),'the plugin README says the seats cannot open a link');
check(/Links are unread \(issue 90/.test(read(path.join(root,'CLAUDE.md'))),'CLAUDE.md carries the rule');
check(/links are unread|cannot open a link/i.test(read(path.join(root,'plugins','combat-writing-crew','README.md'))),'the add-on README says the system line names unread links');

fs.rmSync(proj,{recursive:true,force:true});
if(failures.length){ failures.forEach(function(f){ console.log('FAIL: '+f); }); console.log(passes+' passed, '+failures.length+' failed'); process.exit(1); }
console.log('links_check: '+passes+' checks passed');
