// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// readers_check.js: two fresh readers by default, the second chair the add-on's, the person's
// pick (Part 87, ruled 2026-11-02, reversing the one-reader rule of 2026-10-09). The founder's
// words: "a new user downloading the plugin for the first time would have two defaults for cw
// ... most capable and second most capable. Then once a groq key is inserted or any other key
// for that matter, the second seat is replaced"; "if someone wants to change seats manually they
// can do that"; "if it's xAI it would be grok if its google it would be gemini and so forth,
// that has to be clear too".
//
// Runs the REAL new-run.js, seats.js, packet.js, crew-state.js, render-record.js, render-board.js
// and render-state.js from plugins/combat-writing/scripts in a throwaway project under the OS
// temp folder. Pins:
//   - new-run.js seats seat-1 and seat-2 as fresh readers (no provider field) from --model and
//     --model-2, with the same source note; --readers 1 seats one; --readers 3, --seats and
//     --model-2 with --readers 1 are refused with the rule; run.created carries readers and a
//     crew_note naming two fresh readers and the second chair; no model name in the scripts.
//   - packet.js builds a packet for both readers (seat-2's carries no other seat's answer in a
//     first round) and refuses a third fresh reader with "past the second".
//   - The crew line names both readers, "One company's models"; the Seats line (crew-state.js
//     absent and down, lib.crewStateLines) says "the two fresh readers (one company's models)"
//     on a two-reader run and "one seat" on a one-reader run; the seat key lists both; the
//     board and state.json carry both with fresh_reader true.
//   - seats.js: bare prints the no-pick line; --set seat-2 "<model>" writes
//     combat-writing/seats.json as {"readers": {"seat-2": "<model>"}} and prints the kept line;
//     bare then lists it; --clear drops it; --set seat-3 and --set with no model are refused;
//     lib.readReaderPicks reads it and returns {} for a missing or broken file; nothing logged.
//   - The help's table of keys and seats names every keyed provider in the add-on's
//     providers.json by key field and provider name, and the Ollama model field, so a provider
//     added later cannot be left out; the skills' new-run lines carry --model-2 and --readers 1;
//     the rules skill, the battle and sparring skills say the second chair and the pick.
//   - Docs: CLAUDE.md, both READMEs, the add-on README and the method text say two fresh readers
//     and the second chair; no "one fresh reader plus one seat" sentence survives in them.
// Run from the repository root:   node tests/readers_check.js
// Exit 0 on pass, 1 on any failure, one line per failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var lib=require(path.join(scripts,'lib.js'));
var failures=[], checks=0;
function check(ok,msg){ checks+=1; if(!ok)failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-readers-'));
function node(script,args,cwd){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:cwd||proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company. The ask lands in the first line.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'A board letter. No flattery.\n');

// Two fresh readers by default.
var r=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','battle','--name','two','--model','Test Model A','--model-2','Test Model B']);
check(r.status===0,'new-run: exit '+r.status+' '+r.stderr.slice(0,120));
var run=r.stdout.trim();
var seats=JSON.parse(read(path.join(run,'seats.json'))).seats;
check(seats.length===2&&seats[0].id==='seat-1'&&seats[1].id==='seat-2','two readers: expected seat-1 and seat-2, got '+JSON.stringify(seats.map(function(s){return s.id;})));
check(!seats[0].provider&&!seats[1].provider&&seats[0].model==='Test Model A'&&seats[1].model==='Test Model B'&&seats[0].company==='Anthropic'&&seats[1].company==='Anthropic','two readers: both fresh, named from --model and --model-2, got '+JSON.stringify(seats));
check(seats[0].source===seats[1].source&&/model named at start/.test(seats[1].source)&&/agent tool offers|the list its agent tool offers/.test(seats[1].source),'two readers: the source note should say the model named at start wins over inherit, got '+seats[1].source);
check(lib.freshReaders(seats).length===2&&lib.isFreshReader(seats[1])&&!lib.isPaddedSeat(seats,seats[1]),'lib: seat-2 is a fresh reader and not padded');
var created=logOf(run)[0];
check(created.event==='run.created'&&created.readers===2&&created.seats.length===2,'run.created: readers 2 and two seats, got '+JSON.stringify({readers:created.readers,seats:created.seats}));
check(/two fresh readers, seat-1 and seat-2/.test(created.crew_note)&&/second chair/.test(created.crew_note)&&/never fakes a seat/.test(created.crew_note),'run.created: crew_note should name two fresh readers and the second chair, got '+created.crew_note);
// Unreported second model.
var ru=node('new-run.js',['--draft','draft.md','--stage','battle','--name','unreported','--model','Test Model A']);
var su=JSON.parse(read(path.join(ru.stdout.trim(),'seats.json'))).seats;
check(ru.status===0&&su.length===2&&su[1].model===lib.MODEL_UNREPORTED,'two readers: seat-2 with no --model-2 is model unreported, got '+JSON.stringify(su.map(function(s){return s.model;})));

// One reader on a host that offers one model.
var r1=node('new-run.js',['--draft','draft.md','--stage','battle','--name','one','--model','Test Model A','--readers','1']);
check(r1.status===0,'--readers 1: exit '+r1.status+' '+r1.stderr.slice(0,120));
var run1=r1.stdout.trim();
var seats1=JSON.parse(read(path.join(run1,'seats.json'))).seats;
check(seats1.length===1&&seats1[0].id==='seat-1','--readers 1: expected seat-1 alone, got '+JSON.stringify(seats1.map(function(s){return s.id;})));
var created1=logOf(run1)[0];
check(created1.readers===1&&/one fresh reader, seat-1: the host's agent tool offers one model/.test(created1.crew_note),'--readers 1: run.created should say one reader and why, got '+created1.crew_note);

// Refusals.
var bad=node('new-run.js',['--draft','draft.md','--stage','battle','--name','bad','--readers','3']);
check(bad.status===2&&/--readers takes 1 or 2/.test(bad.stderr),'--readers 3: should be refused, got exit '+bad.status+' '+bad.stderr.slice(0,80));
var bad2=node('new-run.js',['--draft','draft.md','--stage','battle','--name','bad2','--readers','1','--model-2','B']);
check(bad2.status===2&&/--model-2 names the second fresh reader/.test(bad2.stderr),'--model-2 with --readers 1: should be refused, got exit '+bad2.status+' '+bad2.stderr.slice(0,80));
var bad3=node('new-run.js',['--draft','draft.md','--stage','battle','--name','bad3','--seats','2']);
check(bad3.status===2&&/two fresh readers/.test(bad3.stderr)&&/never padded/.test(bad3.stderr)&&/Part 87/.test(bad3.stderr),'--seats: should be refused with the Part 87 rule, got exit '+bad3.status+' '+bad3.stderr.slice(0,120));

// No model name in the scripts (the list is the host's).
['new-run.js','seats.js','lib.js','packet.js','crew-state.js'].forEach(function(f){
  var src=read(path.join(scripts,f));
  check(!/claude-(?!plugin)|\b(opus|sonnet|haiku|fable)\b/i.test(src.replace(/\/\/.*$/gm,'')),f+': no model name in the code');
});

// Packets for both readers; a third fresh reader refused.
var p1=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1']);
var p2=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-2']);
check(p1.status===0&&p2.status===0,'packet: both readers should build, exit '+p1.status+' '+p2.status+' '+p2.stderr.slice(0,120));
var pk2=read(path.join(run,'rounds','01-battle','seat-2.packet.md'));
check(/Test Model B \(Anthropic\), seat-2/.test(pk2)&&!/Test Model A \(Anthropic\), seat-1/.test(pk2.split('## The draft')[1]||''),'packet: seat-2 is named in its packet and carries no other seat on a first round');
var sj=JSON.parse(read(path.join(run,'seats.json')));
sj.seats.push({id:'seat-3',model:'Test Model C',company:'Anthropic',source:'test fixture: a third fresh reader'});
fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(sj,null,2)+'\n');
var p3=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-3']);
check(p3.status===2&&/past the second/.test(p3.stderr)&&/seat-1, seat-2/.test(p3.stderr)&&!fs.existsSync(path.join(run,'rounds','01-battle','seat-3.packet.md')),'packet: a third fresh reader should be refused with no packet, got exit '+p3.status+' '+p3.stderr.slice(0,120));
sj.seats.pop(); fs.writeFileSync(path.join(run,'seats.json'),JSON.stringify(sj,null,2)+'\n');

// The crew line, the Seats line, the seat key, the board, the state.
var absent=node('crew-state.js',['--run',run,'--state','absent']);
check(absent.status===0&&absent.stdout.trim()===lib.addonStateLine('absent',sj.seats)&&/so the crew is the two fresh readers \(one company's models\)\. Next: /.test(absent.stdout),'crew-state absent: should name the two fresh readers, got '+absent.stdout.slice(0,140));
var down1=node('crew-state.js',['--run',run1,'--state','down']);
check(down1.status===0&&/so the crew is one seat\. Next: \/mcp/.test(down1.stdout),'crew-state down on one reader: should say one seat, got '+down1.stdout.slice(0,140));
check(lib.crewAloneWords(sj.seats)==='the two fresh readers (one company\'s models)'&&lib.crewAloneWords(seats1)==='one seat'&&lib.crewAloneWords([])==='one seat','lib.crewAloneWords');
var short=node('render-record.js',['--run',run,'--short']).stdout;
var crewLine=(short.split('\n').filter(function(l){return /^\*\*Crew:\*\*/.test(l);})[0]||'');
check(/Test Model A \(Anthropic\), seat-1; Test Model B \(Anthropic\), seat-2\. One company's models \(Anthropic\)\. Seat names come from the agent configuration/.test(crewLine),'short form: crew line should name both readers, got '+crewLine);
check(/\*\*Seats:\*\* The crew add-on is not installed, so the crew is the two fresh readers \(one company's models\)/.test(short),'short form: the Seats line should name the two fresh readers');
check(/^Seat key: seat-1 Test Model A · seat-2 Test Model B$/m.test(short),'short form: the seat key should list both readers, got '+(short.split('\n').filter(function(l){return /^Seat key/.test(l);})[0]||'none'));
node('render-board.js',['--run',run]);
var board=read(path.join(run,'board.html'));
check(/seat-2/.test(board)&&/Test Model B \(Anthropic\)/.test(board)&&/so the crew is the two fresh readers/.test(board),'board: both readers and the Seats line');
var st=JSON.parse(node('render-state.js',['--run',run]).stdout);
check(st.seats.length===2&&st.seats[1].fresh_reader===true&&st.seats[1].provider===null&&st.seats[1].short==='Test Model B','state: seat-2 is a fresh reader, got '+JSON.stringify(st.seats[1]));
check(/so the crew is the two fresh readers/.test(st.seats_lines.join('\n')),'state: seats_lines name the two fresh readers');

// seats.js: the person's pick.
var picksFile=path.join(proj,'combat-writing','seats.json');
var s0=node('seats.js',['--root',proj]);
check(s0.status===0&&/^No reader picked: seat-1 and seat-2 start on the first and the second model the host lists\. Pick one with seats\.js --set seat-2 "<model>"\.$/m.test(s0.stdout)&&!fs.existsSync(picksFile),'seats.js bare with no file: the no-pick line, nothing written; got '+s0.stdout);
check(JSON.stringify(lib.readReaderPicks(proj))==='{}','lib.readReaderPicks: {} with no file');
var s1=node('seats.js',['--root',proj,'--set','seat-2','Test Model Z']);
check(s1.status===0&&/^Reader kept: seat-2 starts on Test Model Z from the next run when the host offers it \(combat-writing\/seats\.json\); --clear seat-2 returns it to the host's list\.$/m.test(s1.stdout),'seats.js --set: the kept line, got '+s1.stdout+s1.stderr);
check(fs.existsSync(picksFile)&&JSON.stringify(JSON.parse(read(picksFile)))==='{"readers":{"seat-2":"Test Model Z"}}','seats.js --set: the file shape, got '+(fs.existsSync(picksFile)?read(picksFile):'no file'));
check(lib.readReaderPicks(proj)['seat-2']==='Test Model Z'&&lib.readersPicksPath(proj)===picksFile,'lib.readReaderPicks reads the pick');
var s2=node('seats.js',['--root',proj]);
check(s2.status===0&&s2.stdout.trim()==='seat-2: Test Model Z (picked; combat-writing/seats.json)','seats.js bare: lists the pick, got '+s2.stdout);
var s3=node('seats.js',['--root',proj,'--set','seat-1','Test Model Y']);
check(s3.status===0&&lib.readReaderPicks(proj)['seat-1']==='Test Model Y'&&lib.readReaderPicks(proj)['seat-2']==='Test Model Z','seats.js --set seat-1 keeps seat-2\'s pick');
var s4=node('seats.js',['--root',proj,'--clear','seat-2']);
check(s4.status===0&&/^Reader cleared: seat-2 starts on the host's list from the next run \(combat-writing\/seats\.json\)\.$/m.test(s4.stdout)&&!('seat-2' in lib.readReaderPicks(proj))&&lib.readReaderPicks(proj)['seat-1']==='Test Model Y','seats.js --clear: drops one pick and keeps the other, got '+s4.stdout);
var s5=node('seats.js',['--root',proj,'--clear','seat-2']);
check(s5.status===0&&s5.stdout.trim()==='No pick kept for seat-2.','seats.js --clear twice: says no pick, got '+s5.stdout);
check(node('seats.js',['--root',proj,'--set','seat-3','X']).status===2,'seats.js --set seat-3: refused');
check(node('seats.js',['--root',proj,'--set','seat-2']).status===2,'seats.js --set with no model: refused');
check(node('seats.js',['--root',proj,'--clear','seat-9']).status===2,'seats.js --clear seat-9: refused');
fs.writeFileSync(picksFile,'{not json');
check(JSON.stringify(lib.readReaderPicks(proj))==='{}','lib.readReaderPicks: {} on a broken file');
check(node('seats.js',['--root',proj]).status===2,'seats.js: a broken file is named, exit 2');
fs.unlinkSync(picksFile);
check(!fs.existsSync(path.join(proj,'combat-writing','runs','log.jsonl')),'seats.js: writes no log');

// The help's table of keys and seats, against the add-on's providers.json.
var help=read(path.join(plugin,'skills','help','SKILL.md'));
var table=(help.split('| Key field | Provider | The seat it gives |')[1]||'').split('\n\n')[0];
check(table.length>0,'help: the key table is missing');
var providers=JSON.parse(read(path.join(root,'plugins','combat-writing-crew','providers.json'))).providers;
var manifest=JSON.parse(read(path.join(root,'plugins','combat-writing-crew','.claude-plugin','plugin.json')));
var fields=Object.keys(manifest.userConfig||{});
fields.forEach(function(f){ check(table.indexOf('`'+f+'`')>=0,'help table: the key field '+f+' is missing'); });
var rowOrder=table.split('\n').filter(function(l){return /^\| `/.test(l);}).map(function(l){return l.split('|')[2].trim();});
var fileOrder=providers.filter(function(p){return p.seats&&p.seats.length;}).map(function(p){return p.name;});
check(rowOrder.join(',')===fileOrder.join(','),'help table: the rows should follow providers.json, the order the seats number in; got '+rowOrder.join(', ')+' vs '+fileOrder.join(', '));
providers.forEach(function(p){
  if(!p.seats||!p.seats.length)return;
  check(table.indexOf('| '+p.name+' |')>=0,'help table: the provider '+p.name+' is missing');
  p.seats.forEach(function(s){ var fam=s.family.replace(/^the local model.*$/,'the local model'); check(table.indexOf(fam.split(' line')[0])>=0||/local model/.test(fam),'help table: the seat "'+s.family+'" of '+p.name+' is missing'); });
});
check(/with no add-on the crew is the two fresh readers, one company's models; with one free Groq key it is seat-1, Qwen as seat-2 and gpt-oss as seat-3/.test(help),'help: the crew bullet should say two fresh readers and the second chair');
check(/seats\.js --set/.test(help)&&/"seat-2 on <model>"/.test(help),'help: the pick is explained');
check(/The crew is the two fresh readers\. Next:/.test(help),'help: the not-installed state names the two fresh readers');

// The skills.
['battle','sparring','strategy'].forEach(function(s){
  var skill=read(path.join(plugin,'skills',s,'SKILL.md'));
  check(/new-run\.js [^\n]*--model "<the first model your agent tool lists, or the pick for seat-1>" --model-2 "<the second, or the pick for seat-2>" \[--readers 1\]/.test(skill),s+': the new-run line should carry --model, --model-2 and --readers 1');
});
['battle','sparring'].forEach(function(s){
  var skill=read(path.join(plugin,'skills',s,'SKILL.md'));
  check(/Two fresh readers by default \(Part 87\)/.test(skill)&&/seats\.js --root <project>/.test(skill)&&/--readers 1/.test(skill),s+': the two readers and the pick are explained');
  check(/on the model its seat record names \(passed as the agent tool's model choice; the agent file's `model: inherit` yields to the model named at start\)/.test(skill),s+': each reader starts on the model its seat record names');
});
var rules=read(path.join(plugin,'skills','combat-writing','SKILL.md'));
check(/- The crew \(Part 87\) is two fresh readers by default/.test(rules)&&/seats\.js \[--root <project>\] \[--set seat-1\\\|seat-2 "<model>"\] \[--clear <seat>\]/.test(rules)&&/--model-2 "<name>"\] \[--readers 1\]/.test(rules),'rules skill: the crew rule, the seats.js row and the new-run row');
check(/and pass the names to `new-run\.js --model` and `--model-2`/.test(rules),'rules skill: naming the seats passes both models');

// Docs.
var docs={'CLAUDE.md':read(path.join(root,'CLAUDE.md')),'README.md':read(path.join(root,'README.md')),'plugin README':read(path.join(plugin,'README.md')),'add-on README':read(path.join(root,'plugins','combat-writing-crew','README.md')),'method':read(path.join(plugin,'method','combat-writing.md')),'docs mirror':read(path.join(root,'docs','combat-writing.md'))};
Object.keys(docs).forEach(function(k){
  check(/two fresh readers/.test(docs[k])&&/second chair/.test(docs[k]),k+': should say two fresh readers and the second chair');
  check(!/one fresh reader plus/.test(docs[k]),k+': the one-reader sentence survives');
});
check(/reversing the one-reader ruling of 2026-10-09/.test(docs['CLAUDE.md'])&&/seventh write location/.test(docs['CLAUDE.md'])&&/scripts\/seats\.js --set/.test(docs['CLAUDE.md']),'CLAUDE.md: the ruling, the seventh write location and seats.js');
check(/seats\.js/.test(docs['CLAUDE.md'].split('## Layout')[1]||''),'CLAUDE.md: seats.js in the layout');
check(docs.method.split('## Where the plugin departs')[1]===docs['docs mirror'].split('## Where the plugin departs')[1],'method: the departures match the docs mirror');

if(failures.length){ failures.forEach(function(f){console.log('FAIL '+f);}); console.log('readers_check: '+failures.length+' failure(s), '+checks+' checks'); process.exit(1); }
console.log('readers_check: all passed ('+checks+' checks)');
