// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// state_check.js: render-state.js prints the run as one JSON object (Part 43, 2026-10-21), the
// one source every presentation reads, built by lib.runState from the same functions the
// record and the board use.
//
// Runs the REAL new-run.js, packet.js, check-answer.js, check-flip.js, add-draft.js,
// champion.js, render-board.js and render-state.js from plugins/combat-writing/scripts as
// child processes in a temporary project (never a re-implementation), on the fixture
// board_check.js builds: three seats, a sparring round, two rerate battle rounds with a valid
// and an invalid flip, a critique round, a revised draft, a final round, and a shipped canon.
//
// What it pins:
//   - Exit 0, valid JSON, schema 1, plugin_version equal to the manifest's; the credit line
//     nowhere in the output (ruled 2026-10-12); no averaging word and no fractional rating.
//   - Without --write nothing in the run folder changes: no file, no log line. With --write,
//     state.json is written, state.rendered is logged, the path is printed, and the file holds
//     the same state.
//   - The crew line equals the record's; the seats carry id, model, company, short name and
//     fresh_reader; the seat key equals lib.seatKey.
//   - Every round in order with its kind, task line and rating line, who it was put to and who
//     answered, the packets built; a final round is marked final with S/N and red-flag cells.
//   - The cells: a sound rating, a missing seat, a valid flip with the earlier number and the
//     cited seat, an invalid flip, Stand, a critique, a failed read with its reasons, a 7
//     rendered as a failed read with rating null (never a rating anywhere), a not-asked seat.
//   - latest is each seat's own newest sound rating; the band is BACK TO THE DRAWING BOARD
//     naming the low seat, its why-line equal to the board's, its numbers every rated seat's
//     own; SEND on a fixture with every seat at 8 or more; FINAL READS over the two numbers on
//     a run with final reads and no rating; no band on a run with no number.
//   - The verdict line of a cell is lib.verdictLine; the draft's text and counts are present;
//     the canon names the draft it froze; the champion's shipped line is lib.shippedLine.
//   - A run with no round: rounds empty, band null, next_line the no-rounds line.
//   - A folder with no seats.json exits 2; a 7 in an answer is never a rating.
//
// Run from the repo root:   node tests/state_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var scripts=path.join(__dirname,'..','plugins','combat-writing','scripts');
var lib=require(path.join(scripts,'lib.js'));
var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-state-'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function write(p,t){ fs.writeFileSync(p,t); }
function seatMore(run,n,model,company){ var f=path.join(run,'seats.json'); var sj=JSON.parse(fs.readFileSync(f,'utf8')); for(var i=sj.seats.length+1;i<=n;i++)sj.seats.push({id:'seat-'+i,model:model,company:company||'Anthropic',provider:'test-fixture',source:'test fixture: an outside seat as the add-on would register it'}); fs.writeFileSync(f,JSON.stringify(sj,null,2)+'\n'); return run; }
function listing(dir){ return fs.readdirSync(dir).sort().map(function(n){ var p=path.join(dir,n); var st=fs.statSync(p); return n+':'+(st.isDirectory()?'d':st.size); }).join(','); }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
var run=seatMore(node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','board','--stage','sparring','--model','Test Model']).stdout.trim(),3,'Test Model');
var S2LINE='The board will ask for numbers and find none.';
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
var r1=path.join(run,'rounds','01-sparring');
write(path.join(r1,'seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
write(path.join(r1,'seat-2.answer.md'),'RATING: 4/10\n'+S2LINE+'\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(r1,s+'.answer.md'),'--run',run]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','02-battle','--seat',s,'--rerate']); });
var r2=path.join(run,'rounds','02-battle');
write(path.join(r2,'seat-1.answer.md'),'RATING: 6/10\nseat-2 wrote "'+S2LINE+'" and that moved me.\n');
write(path.join(r2,'seat-2.answer.md'),'RATING: 4/10\nStand. Nothing new.\n');
write(path.join(r2,'seat-3.answer.md'),'RATING: 7/10\nHedging on purpose.\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('check-answer.js',[path.join(r2,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','02-battle','--seat',s]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','03-battle','--seat',s,'--rerate']); });
var r3=path.join(run,'rounds','03-battle');
write(path.join(r3,'seat-1.answer.md'),'RATING: 8/10\nseat-2 wrote "the numbers are all there" so I moved back up.\n');
write(path.join(r3,'seat-2.answer.md'),'RATING: 4/10\nStand.\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(r3,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','03-battle','--seat',s]); });
// 04-battle without --rerate: a critique round; seat-3 alone gets a seat line.
write(path.join(proj,'q3.md'),'Is the close too soft?\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','04-battle','--seat',s].concat(s==='seat-3'?['--question','q3.md']:[])); });
var rc=path.join(run,'rounds','04-battle');
write(path.join(rc,'seat-1.answer.md'),'The close is the problem, as seat-2 said.\n');
write(path.join(rc,'seat-3.answer.md'),'RATING: 8/10\nRating anyway.\n');
['seat-1','seat-3'].forEach(function(s){ node('check-answer.js',[path.join(rc,s+'.answer.md'),'--run',run]); });
node('add-draft.js',['--run',run,'--file','draft.md']);
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','05-final','--seat',s,'--final','sn']); node('packet.js',['--run',run,'--round','05-final','--seat',s,'--final','redflag']); });
var r4=path.join(run,'rounds','05-final');
write(path.join(r4,'seat-1.sn.answer.md'),'S/N RATIO: 70%\nSignal.\n');
write(path.join(r4,'seat-1.redflag.answer.md'),'RED FLAGS FOUND: 1\nOne.\n');
write(path.join(r4,'seat-2.sn.answer.md'),'S/N RATIO: 55%\nHalf.\n');
write(path.join(r4,'seat-2.redflag.answer.md'),'NO RED FLAGS\nNone.\n');
['seat-1.sn','seat-1.redflag','seat-2.sn','seat-2.redflag'].forEach(function(f){ node('check-answer.js',[path.join(r4,f+'.answer.md'),'--run',run]); });
// Shipped by email: a canon, with the time fixed.
write(path.join(proj,'shipped.md'),'email to the board\n');
var ch=node('champion.js',['--run',run,'--kind','shipped','--file','shipped.md','--at','2026-10-21T12:00:00Z']);
check(ch.status===0,'champion shipped: exit '+ch.status+' '+ch.stderr);
node('render-record.js',['--run',run]);
node('render-board.js',['--run',run]);

// 1. Stdout mode: valid JSON, nothing touched.
var before=listing(run), logBefore=fs.readFileSync(path.join(run,'log.jsonl'),'utf8');
var rs=node('render-state.js',['--run',run]);
check(rs.status===0,'render-state: exit '+rs.status+' '+rs.stderr);
var st=null; try{ st=JSON.parse(rs.stdout); }catch(e){ st=null; }
check(!!st,'render-state: stdout is not valid JSON');
check(listing(run)===before&&fs.readFileSync(path.join(run,'log.jsonl'),'utf8')===logBefore,'render-state without --write changed the run folder or the log');
if(!st){ st={rounds:[],seats:[],drafts:[],canons:[],latest:{},band:{},champion:{shipped:[],results:[],insights:[]}}; }
check(rs.stdout.indexOf(CREDIT)<0,'state: carries the credit line');
check(!/\b(average|averaged|mean|overall rating|consensus|total)\b/i.test(rs.stdout.replace(/Nothing (here )?is averaged|never averaged|averaged, summed or ranked/g,'')),'state: an averaging word appears');
check(!/"rating":\s*\d+\.\d+/.test(rs.stdout),'state: a fractional rating appears');
var manifest=JSON.parse(fs.readFileSync(path.join(scripts,'..','.claude-plugin','plugin.json'),'utf8'));
check(st.schema===1&&st.plugin_version===manifest.version,'state: schema '+st.schema+' version '+st.plugin_version+', expected 1 and '+manifest.version);

// 2. The run, the seats, the crew line, the drafts, the brief, the canon.
check(st.run&&st.run.id===path.basename(run)&&st.run.dir===run&&st.run.stage_started==='sparring'&&st.run.first_round==='01-sparring'&&/^sparring: the run was made from a pasted draft/.test(st.run.started_line),'state: run block wrong: '+JSON.stringify(st.run));
var record=fs.readFileSync(path.join(run,'record.md'),'utf8');
var recCrew=(record.split('\n').filter(function(l){return l.indexOf('**Crew:** ')===0;})[0]||'').replace('**Crew:** ','');
check(st.crew_line===recCrew&&recCrew.length>0,'state: the crew line differs from the record\'s: '+st.crew_line);
check(st.seats.length===3&&st.seats[0].id==='seat-1'&&st.seats[0].short==='Test Model'&&st.seats[0].fresh_reader===true&&st.seats[1].fresh_reader===false&&st.seats[1].provider==='test-fixture'&&st.seats[2].label==='Test Model (Anthropic), seat-3','state: seats wrong: '+JSON.stringify(st.seats));
check(st.seat_key===lib.seatKey(JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8')).seats),'state: the seat key differs from lib.seatKey');
check(st.drafts.length===2&&st.drafts[0].file==='draft.md'&&st.drafts[1].file==='draft-2.md'&&st.drafts[1].newest===true&&st.drafts[1].facts.words===5&&st.drafts[1].text==='Dear board, buy the company.\n'&&st.newest_draft==='draft-2.md'&&/^5 words/.test(st.drafts[1].facts_line),'state: drafts wrong: '+JSON.stringify(st.drafts.map(function(d){return [d.file,d.newest,d.facts&&d.facts.words];})));
check(st.brief.present===true&&st.brief.text==='CEO. Get a yes.','state: brief wrong');
check(st.canons.length===1&&st.canons[0].file==='canon.md'&&st.canons[0].froze_draft==='draft-2.md'&&st.canons[0].current===true&&st.newest_canon==='canon.md','state: canons wrong: '+JSON.stringify(st.canons.map(function(c){return [c.file,c.froze_draft,c.current];})));
check(st.champion.shipped.length===1&&st.champion.shipped[0].line==='Shipped 2026-10-21 12:00 UTC · email to the board · canon.md froze draft-2.md · no page to check'&&st.champion.shipped[0].url===null&&st.champion.results.length===0&&st.champion.insights.length===0,'state: champion wrong: '+JSON.stringify(st.champion));

// 3. The rounds.
check(st.rounds.map(function(r){return r.round;}).join(',')==='01-sparring,02-battle,03-battle,04-battle,05-final','state: rounds are '+st.rounds.map(function(r){return r.round;}).join(','));
var R={}; st.rounds.forEach(function(r){R[r.round]=r;});
check(R['01-sparring']&&R['01-sparring'].kind==='sparring'&&R['01-sparring'].n===1&&R['01-sparring'].final===false&&R['01-sparring'].rating_line==='a rating asked'&&R['01-sparring'].put_to.length===3&&R['01-sparring'].answered.join(',')==='seat-1,seat-2'&&R['01-sparring'].packets.length===3&&R['01-sparring'].packets[0].contract==='rating','state: 01-sparring wrong: '+JSON.stringify(R['01-sparring']&&{kind:R['01-sparring'].kind,rating_line:R['01-sparring'].rating_line,answered:R['01-sparring'].answered}));
check(R['02-battle']&&/^the default prompt: “Read the other seats' latest answers/.test(R['02-battle'].task_line)&&R['02-battle'].rating_line==='a new rating asked'&&R['02-battle'].task.rerate===true,'state: 02-battle task wrong: '+(R['02-battle']&&R['02-battle'].task_line));
check(R['04-battle']&&R['04-battle'].rating_line==='no rating asked'&&R['04-battle'].answered.join(',')==='seat-1,seat-3'&&R['04-battle'].put_to.length===3&&R['04-battle'].cells['seat-3'].note==='Is the close too soft?'&&R['04-battle'].cells['seat-1'].note===null,'state: 04-battle wrong');
check(R['05-final']&&R['05-final'].final===true&&R['05-final'].kind==='final'&&R['05-final'].task_line==='final reads: S/N ratio and red flags'&&R['05-final'].rating_line===''&&R['05-final'].answered.join(',')==='seat-1,seat-2','state: 05-final wrong');
check(R['02-battle']&&R['02-battle'].announced===null,'state: no announce.js ran, so announced must be null');

// 4. The cells.
var c=function(r,s){ return (R[r]&&R[r].cells&&R[r].cells[s])||{}; };
check(c('01-sparring','seat-1').kind==='first'&&c('01-sparring','seat-1').rating===8&&c('01-sparring','seat-1').text==='8/10'&&c('01-sparring','seat-1').verdict_line==='The ask lands in the first line.'&&c('01-sparring','seat-1').words===9&&c('01-sparring','seat-1').file===path.join('rounds','01-sparring','seat-1.answer.md')&&c('01-sparring','seat-1').answer.indexOf('RATING: 8/10')===0,'state: 01-sparring seat-1 cell wrong: '+JSON.stringify(c('01-sparring','seat-1')));
check(c('01-sparring','seat-3').kind==='missing'&&c('01-sparring','seat-3').text==='missing'&&c('01-sparring','seat-3').rating===null,'state: 01-sparring seat-3 should be missing');
check(c('02-battle','seat-1').kind==='flip-valid'&&c('02-battle','seat-1').rating===6&&c('02-battle','seat-1').from===8&&c('02-battle','seat-1').cited==='seat-2'&&c('02-battle','seat-1').mark==='flip from 8, valid'&&c('02-battle','seat-1').title==='quoted seat-2','state: 02-battle seat-1 should be a valid flip from 8: '+JSON.stringify(c('02-battle','seat-1')));
check(c('02-battle','seat-2').kind==='stand'&&c('02-battle','seat-2').rating===4&&c('02-battle','seat-2').mark==='Stand','state: 02-battle seat-2 should Stand');
var seven=c('02-battle','seat-3');
check(seven.kind==='failed'&&seven.rating===null&&seven.text==='failed read'&&seven.wrote===7&&/7 is forbidden/.test(seven.title)&&seven.reasons.length>=1,'state: the 7/10 answer must be a failed read with rating null: '+JSON.stringify(seven));
check(c('03-battle','seat-1').kind==='flip-invalid'&&c('03-battle','seat-1').rating===8&&c('03-battle','seat-1').from===6&&c('03-battle','seat-1').mark==='flip from 6, INVALID','state: 03-battle seat-1 should be an invalid flip from 6');
check(c('03-battle','seat-3').kind==='missing','state: 03-battle seat-3 should be missing');
check(c('04-battle','seat-1').kind==='critique'&&c('04-battle','seat-1').rating===null&&c('04-battle','seat-1').contract==='critique'&&c('04-battle','seat-1').verdict_line==='The close is the problem, as seat-2 said.','state: 04-battle seat-1 should be a critique with its verdict line');
check(c('04-battle','seat-3').kind==='failed'&&/asked for no rating/.test(c('04-battle','seat-3').title),'state: a RATING line in a no-rating round should be a failed read');
var f1=c('05-final','seat-1'), f3=c('05-final','seat-3');
check(f1.sn&&f1.sn.ok===true&&f1.sn.value===70&&f1.redflag.ok===true&&f1.redflag.value===1&&f1.text==='S/N 70% · 1 red flag'&&f1.sn.answer.indexOf('S/N RATIO: 70%')===0,'state: 05-final seat-1 cell wrong: '+JSON.stringify(f1));
check(c('05-final','seat-2').text==='S/N 55% · no red flags'&&f3.sn&&f3.sn.missing===true&&f3.text==='S/N missing · red flags missing','state: 05-final seat-2 or seat-3 cell wrong');
var anySeven=false; st.rounds.forEach(function(r){ Object.keys(r.cells).forEach(function(s){ if(r.cells[s].rating===7)anySeven=true; }); });
check(!anySeven,'state: a 7 appears as a rating');

// 5. latest, latest_turn, the band, equal to the board's words.
check(st.latest['seat-1']&&st.latest['seat-1'].round==='03-battle'&&st.latest['seat-1'].rating===8&&st.latest['seat-2'].round==='03-battle'&&st.latest['seat-2'].rating===4&&st.latest['seat-3']===null,'state: latest wrong: '+JSON.stringify(st.latest));
check(st.latest_turn['seat-1']&&st.latest_turn['seat-1'].round==='04-battle'&&st.latest_turn['seat-1'].kind==='critique'&&st.latest_turn['seat-2'].kind==='missing'&&st.latest_turn['seat-3'].kind==='failed','state: latest_turn wrong: '+JSON.stringify(st.latest_turn));
check(st.band.verdict==='BACK TO THE DRAWING BOARD'&&st.band.low.join(',')==='seat-2'&&st.band.numbers.length===2&&st.band.numbers[0].rating===8&&st.band.numbers[1].rating===4&&st.band.final_round==='05-final','state: band wrong: '+JSON.stringify(st.band));
var html=fs.readFileSync(path.join(run,'board.html'),'utf8');
var why=(/<p class="why">([^<]*)<\/p>/.exec(html)||['',''])[1].replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
check(why.length>0&&st.band.why===why,'state: the band\'s why-line differs from the board\'s: '+st.band.why+' | '+why);
check(st.next_line===lib.nextLine(st.seats)&&/^Next: \/cw:battle fq:/.test(st.next_line),'state: next_line wrong');
check(st.legend===lib.SCOREBOARD_LEGEND&&st.board_file==='board.html'&&st.record_file==='record.md'&&st.board_present===true&&st.record_present===true&&st.briefing===null,'state: the tail fields are wrong');

// 6. --write: the file, the log line, the path.
var rw=node('render-state.js',['--run',run,'--write']);
check(rw.status===0&&rw.stdout.trim()===path.join(run,'state.json'),'render-state --write: exit '+rw.status+' '+rw.stdout+rw.stderr);
var fileState=JSON.parse(fs.readFileSync(path.join(run,'state.json'),'utf8'));
check(fileState.schema===1&&fileState.band.verdict===st.band.verdict&&fileState.rounds.length===5,'render-state --write: state.json differs');
var logLines=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){return JSON.parse(l);});
var sr=logLines[logLines.length-1];
check(sr.event==='state.rendered'&&sr.file==='state.json'&&sr.rounds===5,'render-state --write: state.rendered not logged last: '+JSON.stringify(sr));

// 7. SEND on a fixture where every rated seat is at 8 or more; FINAL READS with no rating; no band with no number; a run with no round.
var send=seatMore(node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','send','--model','Test Model']).stdout.trim(),2,'Test Model');
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',send,'--round','01-sparring','--seat',s]); });
write(path.join(send,'rounds','01-sparring','seat-1.answer.md'),'RATING: 9/10\nShips as is.\n');
write(path.join(send,'rounds','01-sparring','seat-2.answer.md'),'RATING: 8/10\nReady to send.\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(send,'rounds','01-sparring',s+'.answer.md'),'--run',send]); });
var ss=JSON.parse(node('render-state.js',['--run',send]).stdout);
check(ss.band.verdict==='SEND'&&ss.band.low.length===0&&ss.band.numbers.map(function(n){return n.rating;}).join(',')==='9,8'&&/^Every rated seat put it at 8 or more/.test(ss.band.why),'state (send): band wrong: '+JSON.stringify(ss.band));
var nr=seatMore(node('new-run.js',['--draft','draft.md','--name','norating','--stage','battle','--no-brief','--model','Test Model']).stdout.trim(),2,'Test Model');
write(path.join(proj,'sn.md'),'Is this ready to go to the board?\n');
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',nr,'--round','01-battle','--seat',s,'--sn','sn.md']); });
write(path.join(nr,'rounds','01-battle','seat-1.answer.md'),'Not ready: the ask is buried.\n');
node('check-answer.js',[path.join(nr,'rounds','01-battle','seat-1.answer.md'),'--run',nr]);
var ns=JSON.parse(node('render-state.js',['--run',nr]).stdout);
check(ns.band.verdict===null&&ns.rounds[0].task.kind==='SN'&&ns.rounds[0].task_line==='SN: “Is this ready to go to the board?”'&&ns.rounds[0].cells['seat-1'].kind==='critique'&&ns.rounds[0].task.first_round===true&&ns.run.stage_started==='battle'&&ns.brief.present===false,'state (no rating): wrong: '+JSON.stringify({band:ns.band,task:ns.rounds[0]&&ns.rounds[0].task_line}));
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',nr,'--round','02-final','--seat',s,'--final','sn']); node('packet.js',['--run',nr,'--round','02-final','--seat',s,'--final','redflag']); });
write(path.join(nr,'rounds','02-final','seat-1.sn.answer.md'),'S/N RATIO: 60%\nSome.\n');
write(path.join(nr,'rounds','02-final','seat-1.redflag.answer.md'),'NO RED FLAGS\nNone.\n');
['seat-1.sn','seat-1.redflag'].forEach(function(f){ node('check-answer.js',[path.join(nr,'rounds','02-final',f+'.answer.md'),'--run',nr]); });
var nf=JSON.parse(node('render-state.js',['--run',nr]).stdout);
check(nf.band.verdict==='FINAL READS'&&nf.band.final_round==='02-final'&&nf.band.numbers.length===2&&nf.band.numbers[0].text==='S/N 60% · no red flags'&&nf.band.numbers[1].text==='S/N missing · red flags missing'&&nf.band.why==='No seat has rated this draft. These are the final reads of round 02-final, each seat\'s own S/N ratio and red-flag count. Nothing is averaged.','state (final reads): band wrong: '+JSON.stringify(nf.band));
var fresh=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','fresh','--stage','strategy','--model','Test Model']).stdout.trim();
var fsz=JSON.parse(node('render-state.js',['--run',fresh]).stdout);
check(fsz.rounds.length===0&&fsz.band.verdict===null&&fsz.run.first_round===null&&fsz.next_line===fsz.no_rounds_line&&/^No rounds yet\. The draft and the brief are stored/.test(fsz.next_line)&&fsz.run.stage_started==='strategy'&&fsz.board_present===false,'state (no rounds): wrong: '+JSON.stringify({rounds:fsz.rounds.length,band:fsz.band,next:fsz.next_line}));
check(Object.keys(fsz.latest).length===1&&fsz.latest['seat-1']===null&&fsz.latest_turn['seat-1']===null,'state (no rounds): latest should be null per seat');

// 8. Refusals.
var bad=node('render-state.js',['--run',proj]);
check(bad.status===2&&/no seats\.json/.test(bad.stderr),'render-state on a folder with no seats.json should exit 2');
var none=node('render-state.js',[]);
check(none.status===2&&/--run is required/.test(none.stderr),'render-state with no --run should exit 2');

fs.rmSync(proj,{recursive:true,force:true});
if(failures.length){ failures.forEach(function(f){ console.log('FAIL: '+f); }); console.log('state_check: '+failures.length+' failed, '+passes+' passed'); process.exit(1); }
console.log('state_check: all passed, '+passes+' checks');
