// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// fallback_check.js: a fresh reader's start that fell to another model is recorded, and every
// result says when (issue 194, the founder's rule of 2026-11-10: when a limit is hit the seat
// goes to the fallback and the run records when, so the work after that point can be reviewed).
// Before it, a start the host's tool refused left no trace in the run's log.
//
// Runs the REAL new-run.js, packet.js, seat-fallback.js, render-record.js, render-board.js and
// render-state.js from plugins/combat-writing/scripts, and the REAL hooks/seat-scope.js, in a
// throwaway project under the OS temp folder. Invented model names only. Pins:
//   - seat-fallback.js --to "<model>": one seat.fallback line on the log (seat, round, from, to,
//     start named, the reason on one line, the line's own ts), the seat's record rewritten
//     (model, start named, a source note that opens with the fallback and carries new-run.js's
//     named wording, which lib.seatStart reads as named even without the start field), one
//     printed line naming the fallback, its time and how to start the seat now.
//   - seat-fallback.js --to session: to is the run's session_model, start session, the record's
//     source note carries the session wording and never "model named at start"; --to naming the
//     session's own model in any case is --to session; a run that recorded no session model
//     logs to null, the record reads model unreported, the line says "the session's own model".
//   - Refused with exit 2, nothing appended and seats.json untouched: a seat the run does not
//     hold, an outside seat, a missing --to, --reason, --seat or --run, an unquoted model name,
//     a round that is no round folder name or that the run does not hold, a fallback to the
//     session's own model for a seat already on it, a fallback to the model the record names.
//   - lib.modelsLine: after the not-on-the-session's-model sentence, one sentence per fresh
//     reader that fell back, its latest fallback, "<seat> fell back from <from> to <to> at
//     <YYYY-MM-DD HH:MM UTC>: <reason>."; printed also when every fresh reader is now on the
//     session's model; an earlier fallback of the same seat is not repeated; a seat id an
//     outside seat now holds is skipped; a reason ending in a period gets one; a reason past
//     lib.FALLBACK_REASON_SHOWN characters is cut at a word with an ellipsis while the log line
//     keeps it whole. Null with no fallback and every reader on the session's model.
//   - The four surfaces carry the line: the short form, record.md, the board's strip and Run
//     details, the state's models_line.
//   - The hook allows the new start: after a fallback to the session's own model, the start
//     call with no model passes and one with a model is denied; after a fallback to a named
//     model, the start call with a model passes and one with none is denied.
//   - The script carries the Shield header, requires fs, path and lib.js alone, names no model;
//     the sparring and battle skills carry the fallback sentence and the command; the rules
//     skill's script table has its row.
// Run from the repository root:   node tests/fallback_check.js
// Exit 0 on pass, 1 on any failure, one line per failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var hook=path.join(plugin,'hooks','seat-scope.js');
var lib=require(path.join(scripts,'lib.js'));
var failures=[], checks=0;
function check(ok,msg){ checks+=1; if(!ok)failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-fallback-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function seatsOf(run){ return JSON.parse(read(path.join(run,'seats.json'))).seats; }
function fallbacks(run){ return logOf(run).filter(function(e){return e.event==='seat.fallback';}); }
function fb(run,args){ return node('seat-fallback.js',['--run',run].concat(args)); }
var have=fs.existsSync(path.join(scripts,'seat-fallback.js'));
check(have,'scripts/seat-fallback.js: the script is missing');
// lib's parts for the fallback: a lib without them fails here by name, and every check below still runs.
check(typeof lib.seatFallbacks==='function'&&typeof lib.fallbackWords==='function'&&typeof lib.SOURCE_NAMED==='string'&&typeof lib.SOURCE_SESSION==='string'&&lib.FALLBACK_REASON_SHOWN>0,'lib.js: seatFallbacks, fallbackWords, SOURCE_NAMED, SOURCE_SESSION and FALLBACK_REASON_SHOWN should be exported');
var seatFallbacks=typeof lib.seatFallbacks==='function'?lib.seatFallbacks:function(){ return []; };
var fallbackWords=typeof lib.fallbackWords==='function'?lib.fallbackWords:function(){ return ''; };
function src(seat){ return String((seat||{}).source||''); }
fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company. The ask lands in the first line.\n');
var SM='Test Session Model';
function newRun(name,extra){ return node('new-run.js',['--draft','draft.md','--no-brief','--stage','sparring','--name',name].concat(extra||['--session-model',SM,'--model-2','Test Model B'])).stdout.trim(); }

// The run: seat-1 on the session's model, seat-2 named. One round, both packets built.
var run=newRun('fall');
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
check(lib.modelsLine(seatsOf(run),logOf(run))==='Not on this session\'s model ('+SM+'): seat-2 on Test Model B.','before any fallback: the Models line names seat-2 alone, got '+lib.modelsLine(seatsOf(run),logOf(run)));

// The start call the host makes, fed to the real hook.
function startCall(seatId,model){
  var pk=path.join(run,'rounds','01-sparring',seatId+'.packet.md'), an=path.join(run,'rounds','01-sparring',seatId+'.answer.md');
  var ti={description:'a seat reads',prompt:'Packet: '+pk+'\nAnswer file: '+an+'\nRead the packet, write your answer to the answer file, reply with one line.',subagent_type:'cw:seat'};
  if(model!==undefined)ti.model=model;
  var r=cp.spawnSync(process.execPath,[hook],{input:JSON.stringify({session_id:'s',transcript_path:path.join(proj,'s.jsonl'),cwd:proj,hook_event_name:'PreToolUse',tool_name:'Agent',tool_input:ti}),encoding:'utf8',cwd:proj});
  var reason=''; try{ reason=JSON.parse(r.stdout).hookSpecificOutput.permissionDecisionReason; }catch(e){}
  return {status:r.status,out:r.stdout.trim(),reason:reason};
}
function passes(name,r){ check(r.status===0&&r.out==='',name+': the hook should allow the start with no output, got '+JSON.stringify(r.out)); }
function refuses(name,r,re){ check(r.status===0&&re.test(r.reason),name+': the hook should deny the start, got '+JSON.stringify(r.out)); }
passes('before any fallback, seat-2 with a model',startCall('seat-2','a-choice-string'));
refuses('before any fallback, seat-2 with no model',startCall('seat-2'),/seat-2's record names Test Model B; start seat-2 again and pass that model/);

// A fallback to a named model.
var REASON1='the tool does not offer Test Model B.';
var f1=fb(run,['--seat','seat-2','--to','Test Model C','--reason','  the tool does not\noffer Test Model B. ','--round','01-sparring']);
check(f1.status===0&&f1.stderr==='','--to a model: exit '+f1.status+' '+f1.stderr.slice(0,160));
var l1=fallbacks(run), e1=l1[0]||{};
check(l1.length===1&&e1.seat==='seat-2'&&e1.round==='01-sparring'&&e1.from==='Test Model B'&&e1.to==='Test Model C'&&e1.start==='named'&&e1.reason===REASON1&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(e1.ts||''),'--to a model: one seat.fallback line with seat, round, from, to, start named, the reason on one line and the ts, got '+JSON.stringify(l1));
check(JSON.stringify(Object.keys(e1))==='["ts","event","seat","round","from","to","start","reason"]','--to a model: the log line\'s fields, got '+JSON.stringify(Object.keys(e1)));
var s1=seatsOf(run);
check(s1.length===2&&s1[1].id==='seat-2'&&s1[1].model==='Test Model C'&&s1[1].start==='named'&&s1[1].company==='Anthropic'&&/^fell back from Test Model B \(seat-fallback\.js; the log's seat\.fallback line holds when and why\); /.test(src(s1[1]))&&src(s1[1]).indexOf(String(lib.SOURCE_NAMED))>0,'--to a model: the record is rewritten (model, start named, the source note), got '+JSON.stringify(s1[1]));
check(JSON.stringify(s1[0])===JSON.stringify(seatsOf(newRun('same'))[0]),'--to a model: seat-1\'s record is untouched, got '+JSON.stringify(s1[0]));
check(lib.seatStart(s1[1])==='named'&&lib.seatStart({id:'seat-2',model:s1[1].model,source:src(s1[1])})==='named','--to a model: lib.seatStart reads the record as named, with and without the start field');
var when1=lib.whenUtc(e1.ts||new Date().toISOString());
check(/^\d{4}-\d\d-\d\d \d\d:\d\d UTC$/.test(when1),'the when is UTC to the minute, got '+when1);
var W1='seat-2 fell back from Test Model B to Test Model C at '+when1+': the tool does not offer Test Model B.';
check(f1.stdout==='Fallback recorded: '+W1+' Start seat-2 again and pass Test Model C as the agent tool\'s model choice.\n','--to a model: the printed line, got '+JSON.stringify(f1.stdout));
var ML1='Not on this session\'s model ('+SM+'): seat-2 on Test Model C. '+W1;
check(lib.modelsLine(s1,logOf(run))===ML1,'modelsLine after a fallback to a model: both sentences, got '+lib.modelsLine(s1,logOf(run)));
passes('after a fallback to a model, the start with a model',startCall('seat-2','another-choice-string'));
refuses('after a fallback to a model, the start with no model',startCall('seat-2'),/seat-2's record names Test Model C; start seat-2 again and pass that model/);

// A fallback to the session's own model: the line still prints with every reader on the session's model.
var f2=fb(run,['--seat','seat-2','--to','session','--reason','a usage limit was hit']);
check(f2.status===0&&f2.stderr==='','--to session: exit '+f2.status+' '+f2.stderr.slice(0,160));
var l2=fallbacks(run), e2=l2[1]||{};
check(l2.length===2&&e2.seat==='seat-2'&&e2.round===null&&e2.from==='Test Model C'&&e2.to===SM&&e2.start==='session'&&e2.reason==='a usage limit was hit','--to session: the log line (round null, from the model the record named, to the session\'s model, start session), got '+JSON.stringify(e2));
var s2=seatsOf(run);
check(s2[1].model===SM&&s2[1].start==='session'&&/^fell back from Test Model C /.test(src(s2[1]))&&src(s2[1]).indexOf(String(lib.SOURCE_SESSION))>0&&!/model named at start/.test(src(s2[1])),'--to session: the record is rewritten (the session\'s model, start session, the session wording), got '+JSON.stringify(s2[1]));
check(lib.seatStart({id:'seat-2',model:SM,source:src(s2[1])})==='session','--to session: lib.seatStart reads the source note as session without the start field');
var W2='seat-2 fell back from Test Model C to '+SM+' at '+lib.whenUtc(e2.ts||new Date().toISOString())+': a usage limit was hit.';
check(f2.stdout==='Fallback recorded: '+W2+' Start seat-2 again with no model choice.\n','--to session: the printed line, got '+JSON.stringify(f2.stdout));
check(lib.modelsLine(s2,logOf(run))===W2,'modelsLine: a fallback is named when every fresh reader is on the session\'s model, the latest alone, got '+lib.modelsLine(s2,logOf(run)));
passes('after a fallback to the session\'s model, the start with no model',startCall('seat-2'));
refuses('after a fallback to the session\'s model, the start with a model',startCall('seat-2','a-choice-string'),/seat-2's record says it runs on the session's own model; start seat-2 again with no model choice/);

// The four surfaces.
var short=node('render-record.js',['--run',run,'--short']).stdout.split('\n');
var iCrew=short.findIndex(function(l){return l.indexOf('**Crew:**')===0;}), iMod=short.indexOf('**Models:** '+W2), iKey=short.findIndex(function(l){return l.indexOf('Seat key:')===0;});
check(iCrew===0&&iMod>iCrew&&iMod<iKey,'short form: the Models line carries the fallback between the crew line and the seat key, got '+JSON.stringify({crew:iCrew,models:iMod,key:iKey}));
check(read(path.join(run,'record.md')).indexOf('**Models:** '+W2)>=0,'record: carries the fallback on the Models line');
node('render-board.js',['--run',run]);
var board=read(path.join(run,'board.html'));
check(board.indexOf('<p class="round models"><b>Models</b> · '+lib.escapeHtml(W2)+'</p>')>=0&&board.indexOf('<strong>Models:</strong> '+lib.escapeHtml(W2))>=0,'board: the strip and Run details carry the fallback');
var st=JSON.parse(node('render-state.js',['--run',run]).stdout);
check(st.models_line===W2&&st.seats[1].start==='session','state: models_line carries the fallback and seat-2 starts session, got '+JSON.stringify(st.models_line));

// --to naming the session's own model is --to session; seat-1 falls to a named model.
var runN=newRun('named');
var f3=fb(runN,['--seat','seat-2','--to','test session MODEL','--reason','not offered']);
var e3=fallbacks(runN)[0]||{};
check(f3.status===0&&e3.to===SM&&e3.start==='session'&&seatsOf(runN)[1].start==='session'&&seatsOf(runN)[1].model===SM&&/with no model choice\.$/.test(f3.stdout.trim()),'--to the session\'s model by name: read as session, got '+JSON.stringify(e3)+' '+f3.stderr);
var f4=fb(runN,['--seat','seat-1','--to','Test Model D','--reason','a limit on the session model']);
var sN=seatsOf(runN);
check(f4.status===0&&sN[0].model==='Test Model D'&&sN[0].start==='named'&&(fallbacks(runN)[1]||{}).from===SM,'seat-1 falls to a named model, got '+JSON.stringify(sN[0])+' '+f4.stderr);
var mlN=lib.modelsLine(sN,logOf(runN))||'';
check(mlN.indexOf('Not on this session\'s model ('+SM+'): seat-1 on Test Model D. seat-1 fell back from '+SM+' to Test Model D at ')===0&&/ seat-2 fell back from Test Model B to Test Session Model at [^:]+:\d\d UTC: not offered\.$/.test(mlN),'modelsLine: one sentence per seat that fell back, in seat order, got '+mlN);

// A run that recorded no session model.
var runL=newRun('legacy',['--model','Test Model A','--model-2','Test Model B']);
var f5=fb(runL,['--seat','seat-2','--to','session','--reason','not offered']);
var e5=fallbacks(runL)[0]||{};
check(f5.status===0&&e5.to===null&&e5.start==='session'&&seatsOf(runL)[1].model===lib.MODEL_UNREPORTED&&/^Fallback recorded: seat-2 fell back from Test Model B to the session's own model at /.test(f5.stdout),'no session model on the run: to is null and the line says the session\'s own model, got '+JSON.stringify(e5)+' '+f5.stdout+f5.stderr);

// Refusals: exit 2, nothing appended, seats.json untouched.
var runR=newRun('refuse');
node('packet.js',['--run',runR,'--round','01-sparring','--seat','seat-1']);
var sj=JSON.parse(read(path.join(runR,'seats.json')));
sj.seats.push({id:'seat-3',model:'Outside Model',company:'Example',provider:'example',served_by:'Example',source:'test fixture: an outside seat as the add-on would register it'});
fs.writeFileSync(path.join(runR,'seats.json'),JSON.stringify(sj,null,2)+'\n');
var before={log:read(path.join(runR,'log.jsonl')),seats:read(path.join(runR,'seats.json'))};
function refused(name,args,re){
  var r=fb(runR,args);
  check(r.status===2&&r.stdout===''&&re.test(r.stderr),name+': should be refused with exit 2, got exit '+r.status+' '+(r.stderr||r.stdout).slice(0,160));
  check(read(path.join(runR,'log.jsonl'))===before.log&&read(path.join(runR,'seats.json'))===before.seats,name+': a refusal writes nothing');
}
refused('a seat the run does not hold',['--seat','seat-9','--to','session','--reason','x'],/no seat-9 in this run \(it seats seat-1, seat-2, seat-3\)/);
refused('an outside seat',['--seat','seat-3','--to','session','--reason','x'],/seat-3 is an outside seat: the add-on starts it, and an outside seat that fails is shown as missing; only a fresh reader falls back/);
refused('no --to',['--seat','seat-2','--reason','x'],/usage: seat-fallback\.js --run <run folder> --seat <seat-1\|seat-2> --to session\|"<model name>" --reason "<one line>" \[--round <nn-kind>\]/);
refused('no --reason',['--seat','seat-2','--to','session'],/usage: seat-fallback\.js/);
refused('no --seat',['--to','session','--reason','x'],/usage: seat-fallback\.js/);
refused('an unquoted model name',['--seat','seat-2','--to','Test','Model','C','--reason','x'],/a word outside the flags: Model C; quote a model name or a reason of more than one word/);
refused('a round that is no round name',['--seat','seat-2','--to','session','--reason','x','--round','../x'],/--round takes a round folder name/);
fs.mkdirSync(path.join(runR,'rounds','02-battle-2'),{recursive:true});
before={log:read(path.join(runR,'log.jsonl')),seats:read(path.join(runR,'seats.json'))};
fs.chmodSync(path.join(runR,'seats.json'),0o444);
refused('a seats.json that cannot be written',['--seat','seat-2','--to','session','--reason','x','--round','02-battle-2'],/the run's seats\.json cannot be written \(.*seats\.json\); nothing is recorded/);
fs.chmodSync(path.join(runR,'seats.json'),0o644);
var badTs=lib.fallbackWords({seat:'seat-2',from:'Test Model B',to:'Test Model C',ts:'not a date',reason:'x'});
check(badTs==='seat-2 fell back from Test Model B to Test Model C: x.','fallbackWords: a line whose time is no date is said without a time, never a throw, got '+badTs);
refused('a round the run does not hold',['--seat','seat-2','--to','session','--reason','x','--round','09-battle'],/no round 09-battle in this run/);
refused('the session\'s model for a seat already on it',['--seat','seat-1','--to','session','--reason','x'],/seat-1 already starts on the session's own model; there is no model under it to fall to/);
refused('the model the record already names',['--seat','seat-2','--to','test model b','--reason','x'],/seat-2 already starts on Test Model B; name the model it falls to, or session/);
var noRun=node('seat-fallback.js',['--seat','seat-2','--to','session','--reason','x']);
check(noRun.status===2&&/usage: seat-fallback\.js/.test(noRun.stderr),'no --run: refused with the usage');
var notRun=node('seat-fallback.js',['--run',path.join(proj,'nowhere'),'--seat','seat-2','--to','session','--reason','x']);
check(notRun.status===2&&/no seats\.json in /.test(notRun.stderr),'a folder with no seats.json: refused');
check(fb(runR,['--seat','seat-2','--to','session','--reason','x','--round','01-sparring']).status===0&&(fallbacks(runR)[0]||{}).round==='01-sparring','a round the run holds is accepted and logged');

// lib.modelsLine and its parts, on records and log lines written here.
var T='2026-11-10T14:05:59.000Z';
var seatsU=[{id:'seat-1',model:SM,company:'Anthropic',start:'session'},{id:'seat-2',model:SM,company:'Anthropic',start:'session'},{id:'seat-3',model:'Outside Model',company:'Example',provider:'example'}];
var created={event:'run.created',session_model:SM};
check(lib.modelsLine(seatsU,[created])===null,'modelsLine: null with no fallback and every reader on the session\'s model');
var logU=[created,
  {ts:'2026-11-10T13:00:00.000Z',event:'seat.fallback',seat:'seat-2',round:null,from:'Test Model B',to:'Test Model C',start:'named',reason:'first'},
  {ts:T,event:'seat.fallback',seat:'seat-2',round:'02-battle',from:'Test Model C',to:SM,start:'session',reason:'second.'},
  {ts:T,event:'seat.fallback',seat:'seat-3',round:null,from:'x',to:'y',start:'named',reason:'an outside seat\'s id'}];
check(lib.modelsLine(seatsU,logU)==='seat-2 fell back from Test Model C to '+SM+' at 2026-11-10 14:05 UTC: second.','modelsLine: the latest fallback per seat, UTC to the minute, one period, an outside seat\'s id skipped, got '+lib.modelsLine(seatsU,logU));
check(typeof lib.seatFallbacks==='function'&&seatFallbacks(seatsU,logU).length===1&&seatFallbacks(seatsU,[created]).length===0&&seatFallbacks(null,null).length===0,'lib.seatFallbacks: the latest per fresh reader, none with no line');
var long='the tool refused the start '+new Array(40).join('again and ')+'again';
var cut=fallbackWords({ts:T,seat:'seat-2',from:'A Model',to:null,reason:long});
check(long.length>lib.FALLBACK_REASON_SHOWN&&cut.indexOf('seat-2 fell back from A Model to the session\'s own model at 2026-11-10 14:05 UTC: the tool refused the start again and')===0&&/ (?:again|and)…$/.test(cut)&&cut.length<lib.FALLBACK_REASON_SHOWN+110,'lib.fallbackWords: a long reason is cut at a word with an ellipsis, a null to is the session\'s own model, got '+cut);
var runC=newRun('longreason');
check(fb(runC,['--seat','seat-2','--to','session','--reason',long]).status===0&&(fallbacks(runC)[0]||{}).reason===long,'the log line keeps a long reason whole');

// The script itself; the skills.
if(have){
  var src=read(path.join(scripts,'seat-fallback.js'));
  check(src.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','seat-fallback.js: no Shield header on line 1');
  var code=src.replace(/\/\/.*$/gm,'');
  var reqs=(code.match(/require\(['"][^'"]+['"]\)/g)||[]).map(function(r){return r.replace(/require\(['"]|['"]\)/g,'');}).sort();
  check(reqs.join()==='./lib.js,fs,path'&&!/child_process|\bfetch\(|https?:\/\/|process\.env/.test(code),'seat-fallback.js: requires fs, path and lib.js alone, spawns nothing, fetches nothing, reads no environment: '+reqs.join());
  check(!/claude-(?!plugin)|\b(opus|sonnet|haiku|fable)\b/i.test(code),'seat-fallback.js: no model name in the code');
}
['battle','sparring'].forEach(function(s){
  var skill=read(path.join(plugin,'skills',s,'SKILL.md'));
  check(/A start your agent tool refuses or does not offer \(the model is not offered, a usage limit is hit\) falls to the next most capable model it offers, else to this session's own: run `node \$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/seat-fallback\.js --run <run folder> --seat <seat> --to "<that model>" --reason "<one line, in plain words>" --round <round>` \(`--to session` for this session's own model\) before you start the seat again/.test(skill),s+': the fallback sentence and the command');
  check(/The plugin's hook holds each start to the seat's record/.test(skill),s+': the hook holds each start');
});
var rules=read(path.join(plugin,'skills','combat-writing','SKILL.md'));
check(/\| `\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/seat-fallback\.js --run <folder> --seat seat-1\\\|seat-2 --to session\\\|"<model>" --reason "<one line>" \[--round <nn-kind>\]` \| Records that a fresh reader's start fell to another model\./.test(rules),'rules skill: the seat-fallback.js row');

fs.rmSync(proj,{recursive:true,force:true});
if(failures.length){ failures.forEach(function(f){console.log('FAIL '+f);}); console.log('fallback_check: '+failures.length+' failure(s), '+checks+' checks'); process.exit(1); }
console.log('fallback_check: all passed ('+checks+' checks)');
