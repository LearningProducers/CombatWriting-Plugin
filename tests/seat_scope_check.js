// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// seat_scope_check.js: the seat's reach (ruled 2026-10-16). hooks/seat-scope.js is a PreToolUse
// hook on every tool: a seat (agent_type cw:seat) uses Read and Write only, reads only its own
// packet and its own answer file and writes only that answer file, judged on the resolved path
// (issue 239; it read anything inside its run folder until then); any other tool and
// any path the hook cannot place is denied; every other caller is left alone but for one call,
// the one that starts a seat (issue 194): the Agent tool, or Task, its earlier name, with subagent_type cw:seat is held to
// the seat record's start. The live proof, which needs a running Claude Code, is
// tests/seat_scope_live.js, not part of CI; it covers the seat's own calls, not the start call,
// whose shape was read from transcripts (the hook's START_READ_ON constant).
//
// Runs the REAL hook as a child process with a hook input on stdin, against a real run made by
// new-run.js and packet.js in a temporary project, with a temporary folder named in
// CLAUDE_PLUGIN_DATA as the plugin's data folder. A seat is placed the way the host places one:
// the start call first, which the hook puts on record, then the seat's own calls under an agent
// id. No transcript is written anywhere but for the one check that plants one to show the hook
// does not read it. Never starts an agent; calls nothing.
//
// What it pins:
//   - The host (no agent_type) and another agent: no output, exit 0, whatever the path or tool,
//     and whatever the size of the input (2 MB), the start of a seat excepted.
//   - The start of a seat (tool Agent, tool_input.subagent_type cw:seat or seat, the prompt
//     opening with the two task lines), from the host or another agent: a record that says
//     session with a model passed is denied, telling the host to start the seat again with no
//     model choice; with no model (or an empty one) allowed; a record that says named with a
//     model passed is allowed, whatever the string (the two are never compared); with none,
//     denied, naming the record's model; a start with no task lines, a packet that does not
//     exist, a packet outside a rounds folder, an answer file outside the run, a run with no
//     seats.json or a broken one, a seat id with no record: denied with the reason; an outside
//     seat: denied, pointing at crew_answer; the crew-pass and final packets name their seat; a
//     relative packet path resolves against cwd. An Agent call with any other subagent_type, and
//     a host call of a tool other than Agent or Task that carries the same input: no output. The hook's reading
//     of a record's start equals lib.seatStart over records with and without the field.
//   - A seat calling Grep, Glob, Bash, WebFetch, Edit or Agent: denied, naming the tool; a seat's
//     Write of 2 MB outside the run: denied; input that does not parse but names a seat: denied.
//   - A seat reading its own packet, by an absolute or a relative path: allowed (no output, exit
//     0); its own answer file once it is on disk: allowed (the Write tool asks for that read
//     before a rewrite).
//   - A seat reading anything else in its own run: the draft, the brief, seats.json, the log, a
//     file in a subfolder, another seat's packet or answer in the same round, the round folder,
//     the run folder, a link beside its packet that points at another seat's answer: denied,
//     the reason naming the two files a seat reads.
//   - A seat reading a file outside the run (the project's own file, a file elsewhere on disk,
//     the parent folder, the home folder), through a symlink or a dotted path: denied; a file
//     that does not exist: denied.
//   - A seat writing its own answer file: allowed; the same file by a relative path: allowed;
//     writing another seat's answer file, the packet, the draft, a file outside: denied; a dangling
//     symlink or a symlinked folder as a door: denied.
//   - THE RECORD (issue 241). The hook opens no transcript: a seat whose start is on record is
//     allowed its packet with no transcript anywhere, and a seat with a transcript that names
//     its task and no start on record is refused; the hook's code names no transcript. An
//     allowed start writes one record in <data>/seat-scope/<session>/, the seat's id, the run,
//     the packet, the answer file and the time and nothing else, readable by its owner alone; a
//     refused start writes none. A seat with no record of its own is refused every file but the
//     packet or the answer file of a start still waiting in its session, and its first call
//     that names one of those (a Read of the packet, a Read or a Write of the answer file)
//     binds it; a refused call binds nothing. One start places one seat: a second seat asking
//     for the same packet is refused, eight at once leave one placed, and a seat that has a
//     record never takes a second, two calls of its own at once included (real processes
//     side by side, at the end of this file). A start in one
//     session places no seat of another. A start sent again for the same packet places the
//     next seat. A seat that reads its packet and its answer file in the same moment is allowed
//     both: the call that did not take the start waits for the seat's record. A record written
//     by another hand that names a file outside a rounds folder, an answer outside its run or
//     a folder that is no run, one that is not JSON and one that is a link are no record; a
//     damaged record of a seat's own takes no start; a taking cut short leaves the seat
//     refused; a link standing where a folder of the hook's should be is never written or read
//     through.
//   - No data folder named, a relative one, or one the hook cannot write in: the start of a
//     seat is refused with the reason and a seat is refused every call; every other caller is
//     untouched. A session or agent id that is no plain name is never used in a path.
//   - The records end: a session's folder 30 days past its last start is removed at a later
//     start, the hook's own record files alone, a folder holding anything else left standing
//     with that file in it, a session's folder that is a link not entered, a younger folder
//     untouched.
//   - A tool other than Read or Write, no file_path, malformed JSON for a seat: denied (fail
//     closed); malformed JSON with no agent_type readable: nothing (not ours to judge). The
//     no-record reason names the Claude Code version from the hook's one PROVED_ON constant,
//     the folder looked in, the `claude --version` step and the issues address; the source
//     holds that version once.
//   - The deny output is one JSON line in the documented shape, exit 0; the hook writes nothing
//     in the run or the project, and in the data folder its records alone; it reads one
//     environment variable, CLAUDE_PLUGIN_DATA; hooks.json carries the PreToolUse entry with no matcher (every tool) and a short timeout.
//   - The fence fails closed (issue 239): the entry carries onFailure "block", so the host stops
//     the call when the hook cannot start, exits with an error or times out; a fault inside the
//     hook's own code is a refusal for a seat's call and for the start of a seat, and silence,
//     exit 0, for every other caller; a fault before the hook has read who is calling is
//     answered the same, from the raw input, and each such run is shown to have faulted.
//   - The live proof's fixture (issue 237): the run tests/seat_scope_live.js builds, read from its
//     own source and built here, is one whose seat-1 the hook starts with no model choice.
//
// Run from the repo root:   node tests/seat_scope_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var plugin=path.join(__dirname,'..','plugins','combat-writing');
var hook=path.join(plugin,'hooks','seat-scope.js');
var scripts=path.join(plugin,'scripts');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-scope-'));
var proj=path.join(tmp,'proj'); fs.mkdirSync(proj);
var elsewhere=path.join(tmp,'elsewhere'); fs.mkdirSync(elsewhere);
fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
fs.writeFileSync(path.join(proj,'secret.txt'),'a file in the project, outside the run\n');
fs.writeFileSync(path.join(elsewhere,'outside.txt'),'a file elsewhere on disk\n');
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','scope','--model','Test Model']).stdout.trim();
node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-1']);
var packet=path.join(run,'rounds','01-sparring','seat-1.packet.md');
var answer=path.join(run,'rounds','01-sparring','seat-1.answer.md');
fs.mkdirSync(path.join(run,'extra')); fs.writeFileSync(path.join(run,'extra','note.md'),'inside\n');
fs.symlinkSync(path.join(elsewhere,'outside.txt'),path.join(run,'link-out.txt'));
fs.symlinkSync(elsewhere,path.join(run,'dir-out'));
fs.symlinkSync(path.join(run,'missing.md'),path.join(run,'dangling.md'));

// The plugin's data folder: the hook makes it. The host still sends a transcript_path with every
// call; nothing is at it, and the hook never opens it.
var data=path.join(tmp,'data');
var sdir=path.join(tmp,'sessions'); var sid='sess-1', aid='agent1';
var transcript=path.join(sdir,sid+'.jsonl');
function hookEnv(over){ var e=Object.assign({},process.env); delete e.CLAUDE_PLUGIN_DATA; return Object.assign(e,over===undefined?{CLAUDE_PLUGIN_DATA:data}:over); }
function shaped(r){
  var out=(r.stdout||'').trim(), json=null; try{json=out?JSON.parse(out):null;}catch(e){}
  return {status:r.status,out:out,json:json,stderr:r.stderr,reason:json&&json.hookSpecificOutput?json.hookSpecificOutput.permissionDecisionReason:''};
}
function call(tool,filePath,extra,env){
  var input=typeof extra==='string'?extra:Object.assign({session_id:sid,transcript_path:transcript,cwd:proj,hook_event_name:'PreToolUse',tool_name:tool,tool_input:{file_path:filePath},agent_id:aid,agent_type:'cw:seat'},extra||{});
  var raw=typeof input==='string'?input:JSON.stringify(input);
  return shaped(cp.spawnSync(process.execPath,[hook],{input:raw,encoding:'utf8',cwd:proj,env:hookEnv(env)}));
}
function allowed(name,r){ check(r.status===0&&r.out===''&&r.stderr==='',name+': expected silence and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out)+' err '+r.stderr); }
function denied(name,r,re){ check(r.status===0&&!!r.json&&r.json.hookSpecificOutput&&r.json.hookSpecificOutput.hookEventName==='PreToolUse'&&r.json.hookSpecificOutput.permissionDecision==='deny'&&Object.keys(r.json).join(',')==='hookSpecificOutput'&&r.stderr==='',name+': expected a deny line and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out)+' err '+r.stderr); if(re)check(re.test(r.reason),name+': reason "'+r.reason+'" does not match '+re); }
// The start call the host makes. Its own session unless one is named, so the starts judged
// further down leave no start waiting in a session a seat of this test calls from.
function taskText(pk,an){ return 'Packet: '+pk+'\nAnswer file: '+an+'\nRead the packet, write your answer to the answer file, reply with one line.'; }
function start(prompt,model,extra,env){
  var ti={description:'a seat reads',prompt:prompt,subagent_type:'cw:seat'};
  if(model!==undefined)ti.model=model;
  return call('Agent','',Object.assign({session_id:'sess-starts',agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:ti},extra||{}),env);
}
// The hook's records for a session: the starts still waiting, the seats placed, anything else.
function kept(session,re){ try{ return fs.readdirSync(path.join(data,'seat-scope',session)).filter(function(n){ return re.test(n); }).sort(); }catch(e){ return []; } }
function waiting(session){ return kept(session,/^start-/); }
function placedSeats(session){ return kept(session,/^agent-/); }
function strays(session){ return kept(session,/^(?!start-|agent-)/); }
// A seat of another session and agent id, as a function that makes its calls.
function as(session,agent){ return function(tool,filePath,extra){ return call(tool,filePath,Object.assign({session_id:session,agent_id:agent},extra||{})); }; }
// The run's records: seat-1 named (a pick), seat-2 on the session's own model.
var recs=JSON.parse(fs.readFileSync(path.join(run,'seats.json'),'utf8')).seats;
check(recs[0].start==='named'&&recs[0].model==='Test Model'&&recs[1].start==='session','the run should seat seat-1 named and seat-2 on the session\'s model, got '+JSON.stringify(recs.map(function(r){return r.start;})));
node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-2']);
var packet2=path.join(run,'rounds','01-sparring','seat-2.packet.md'), answer2=path.join(run,'rounds','01-sparring','seat-2.answer.md');

// Not a seat: untouched.
allowed('host reads outside',call('Read',path.join(proj,'secret.txt'),{agent_type:undefined,agent_id:undefined}));
allowed('host writes outside',call('Write',path.join(elsewhere,'x.md'),{agent_type:undefined,agent_id:undefined}));
allowed('another agent reads outside',call('Read',path.join(proj,'secret.txt'),{agent_type:'Explore'}));
allowed('another event',call('Read',path.join(proj,'secret.txt'),{hook_event_name:'PostToolUse'}));
allowed('malformed input with nothing readable',call('Read','',"{not json"));
allowed('host runs Bash',call('Bash','',{agent_type:undefined,agent_id:undefined,tool_name:'Bash',tool_input:{command:'ls'}}));
allowed('host runs Grep',call('Grep','',{agent_type:undefined,agent_id:undefined,tool_name:'Grep',tool_input:{pattern:'x'}}));
allowed('host writes 2 MB',call('Write',path.join(elsewhere,'big.md'),{agent_type:undefined,agent_id:undefined,tool_input:{file_path:path.join(elsewhere,'big.md'),content:new Array(2000001).join('x')}}));

// A seat reads two files: its own packet, and its own answer file once it is there (issue 239).
// Everything else in its own run folder is refused: the draft and the brief are in the packet, and
// another seat's packet or answer, seats.json and the log are not the seat's to read.
// THE RECORD (issue 241). The start goes on record; until the seat names one of its two files it
// has no record of its own, is refused, and the start waits; its read of the packet binds it.
denied('a refused start (a named record, no model) is not put on record',start(taskText(packet,answer),undefined,{session_id:sid}),/seat-1's record names Test Model/);
check(waiting(sid).length===0&&!fs.existsSync(data),'a refused start wrote in the data folder: '+JSON.stringify(waiting(sid)));
denied('a seat with no start on record at all',call('Read',packet),/^Combat Writing seat scope: no start of this seat is on the hook's record \(it looked in /);
allowed('the start of seat-1 goes on record',start(taskText(packet,answer),'a-choice-string',{session_id:sid}));
check(waiting(sid).length===1&&placedSeats(sid).length===0,'an allowed start must leave one start waiting in its session, got '+JSON.stringify(kept(sid,/./)));
var startFile=path.join(data,'seat-scope',sid,waiting(sid)[0]||'no-start-on-record');
var startRec=null; try{ startRec=JSON.parse(fs.readFileSync(startFile,'utf8')); }catch(e){}
check(!!startRec&&Object.keys(startRec).sort().join(',')==='answer,at,packet,run,seat,v'&&startRec.v===1&&startRec.seat==='seat-1'&&startRec.packet===fs.realpathSync(packet)&&startRec.run===fs.realpathSync(run)&&path.basename(startRec.answer)==='seat-1.answer.md'&&typeof startRec.at==='number','the record must hold the seat, the run, the packet, the answer file and the time, resolved, and nothing else: '+JSON.stringify(startRec));
check(!/Read the packet|reply with one line|Dear board/.test(JSON.stringify(startRec)),'the record must hold no word of the task or the draft: '+JSON.stringify(startRec));
if(process.platform!=='win32'){
  check(fs.existsSync(startFile)&&(fs.statSync(startFile).mode&0o777)===0o600,'the record must be readable by its owner alone');
  check(fs.existsSync(startFile)&&(fs.statSync(path.dirname(startFile)).mode&0o077)===0,'the session\'s folder of records must be open to its owner alone');
}
var OWN=/^Combat Writing seat scope: a seat reads only its own packet and its own answer file; this file is neither$/;
denied('a seat not yet placed reads the draft',call('Read',path.join(run,'draft.md')),OWN);
denied('a seat not yet placed reads another seat\'s packet',call('Read',packet2),OWN);
denied('a seat not yet placed writes outside',call('Write',path.join(elsewhere,'x.md')),/^Combat Writing seat scope: a seat writes only its own answer file$/);
denied('a seat not yet placed reads a missing file',call('Read',path.join(run,'nothing.md')),/cannot be placed/);
check(waiting(sid).length===1&&placedSeats(sid).length===0,'a refused call must bind nothing and leave the start waiting, got '+JSON.stringify(kept(sid,/./)));
check(!fs.existsSync(path.join(sdir,sid)),'the test planted no transcript for this seat, so what follows is the hook placing it by its record alone');
allowed('seat reads the packet, with a start on record and no transcript anywhere',call('Read',packet));
check(waiting(sid).length===0&&placedSeats(sid).join(',')==='agent-'+aid+'.json'&&strays(sid).length===0,'the seat\'s first read of its packet must turn the waiting start into its record, got '+JSON.stringify(kept(sid,/./)));
allowed('seat reads the packet by a relative path',call('Read',path.relative(proj,packet)));
// A transcript that names the task, where the hook once looked, and no start on record: refused.
fs.mkdirSync(path.join(sdir,'sess-ghost','subagents'),{recursive:true});
fs.writeFileSync(path.join(sdir,'sess-ghost','subagents','agent-ghost.jsonl'),JSON.stringify({type:'user',message:{role:'user',content:taskText(packet,answer)}})+'\n');
denied('a seat with a transcript naming its task and no start on record is refused',call('Read',packet,{session_id:'sess-ghost',agent_id:'ghost',transcript_path:path.join(sdir,'sess-ghost.jsonl')}),/no start of this seat is on the hook's record/);
check(!/transcript/i.test(fs.readFileSync(hook,'utf8').replace(/\/\/[^\n]*/g,'')),'seat-scope.js: the code must name no transcript (the hook input\'s transcript_path is never read)');
denied('seat reads its answer file before it exists',call('Read',answer),/cannot be placed/);
denied('seat reads the draft in its run',call('Read',path.join(run,'draft.md')),OWN);
denied('seat reads the brief in its run',call('Read',path.join(run,'brief.md')),OWN);
denied('seat reads a subfolder file of its run',call('Read',path.join(run,'extra','note.md')),OWN);
denied('seat reads seats.json',call('Read',path.join(run,'seats.json')),OWN);
denied('seat reads the log',call('Read',path.join(run,'log.jsonl')),OWN);
fs.writeFileSync(answer2,'RATING: 4/10\nThe other seat\'s read.\n');
denied('seat reads another seat\'s packet in its round',call('Read',packet2),OWN);
denied('seat reads another seat\'s answer in its round',call('Read',answer2),OWN);
denied('seat reads the round folder',call('Read',path.dirname(packet)),OWN);
denied('seat reads the run folder itself',call('Read',run),OWN);
fs.symlinkSync(answer2,path.join(run,'rounds','01-sparring','link-to-seat-2.md'));
denied('seat reads another seat\'s answer through a link beside its packet',call('Read',path.join(run,'rounds','01-sparring','link-to-seat-2.md')),OWN);
fs.unlinkSync(path.join(run,'rounds','01-sparring','link-to-seat-2.md')); fs.unlinkSync(answer2);

// A seat reading outside.
denied('seat reads the project file',call('Read',path.join(proj,'secret.txt')),OWN);
denied('seat reads elsewhere on disk',call('Read',path.join(elsewhere,'outside.txt')),OWN);
denied('seat reads the runs parent',call('Read',path.dirname(run)),OWN);
denied('seat reads the home folder',call('Read',os.homedir()),OWN);
denied('seat reads through a symlink out',call('Read',path.join(run,'link-out.txt')),OWN);
denied('seat reads through a symlinked folder',call('Read',path.join(run,'dir-out','outside.txt')),OWN);
denied('seat reads a missing file',call('Read',path.join(run,'nothing.md')),/cannot be placed/);
denied('seat reads a dangling symlink',call('Read',path.join(run,'dangling.md')),/cannot be placed/);
denied('seat reads with a dotted escape',call('Read',path.join(run,'..','..','..','secret.txt')),OWN);

// A seat writing.
allowed('seat writes its answer file',call('Write',answer));
allowed('seat writes its answer file by a relative path',call('Write',path.relative(proj,answer)));
fs.writeFileSync(answer,'RATING: 8/10\nFirst.\n');
allowed('seat rewrites its answer file (the retry)',call('Write',answer));
allowed('seat reads its own answer file back (the Write tool asks for it before a rewrite)',call('Read',answer));
allowed('seat reads its own answer file by a relative path',call('Read',path.relative(proj,answer)));
denied('seat writes another seat\'s answer',call('Write',path.join(run,'rounds','01-sparring','seat-2.answer.md')),/writes only its own answer file/);
denied('seat writes the packet',call('Write',packet),/writes only its own answer file/);
denied('seat writes the draft',call('Write',path.join(run,'draft.md')),/writes only its own answer file/);
denied('seat writes outside',call('Write',path.join(proj,'secret.txt')),/writes only its own answer file/);
denied('seat writes a new file outside',call('Write',path.join(elsewhere,'new.md')),/writes only its own answer file/);
denied('seat writes through a symlinked folder',call('Write',path.join(run,'dir-out','seat-1.answer.md')),/writes only its own answer file/);
denied('seat writes a dangling symlink',call('Write',path.join(run,'dangling.md')),/cannot be placed|writes only its own answer file/);

// Fail closed.
var provedOn=(/^var PROVED_ON='([^']+)';$/m.exec(fs.readFileSync(hook,'utf8'))||[])[1];
check(typeof provedOn==='string'&&/^\d+\.\d+\.\d+$/.test(provedOn),'seat-scope.js: PROVED_ON must be one version constant on its own line, got '+provedOn);
check(fs.readFileSync(hook,'utf8').split(provedOn).length===2,'seat-scope.js: the version must appear once, in PROVED_ON');
function rx(t){ return t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
var noRec=call('Read',packet,{session_id:'sess-empty',agent_id:'nobody'});
denied('seat with no start on record',noRec,new RegExp("^Combat Writing seat scope: no start of this seat is on the hook's record \\(it looked in "+rx(path.join(data,'seat-scope','sess-empty'))+"\\), so no packet can be placed and nothing is read or written\\. The hook records a seat when the agent tool starts it, and was last proved on Claude Code "+rx(provedOn)+": if the agent tool started this seat, run `claude --version` and open an issue at github\\.com/LearningProducers/CombatWriting-Plugin/issues naming the version\\. Outside seats through the add-on are not affected$"));
check(!fs.existsSync(path.join(data,'seat-scope','sess-empty')),'a seat\'s refused call must write nothing in the data folder');
denied('seat using another tool',call('Bash',packet,{tool_name:'Bash'}),/a seat uses Read and Write only; Bash is not open to it/);
['Grep','Glob','WebFetch','Edit','Agent','mcp__combat-writing-crew__crew_answer'].forEach(function(t){ denied('seat using '+t,call(t,packet,{tool_name:t,tool_input:{pattern:'x',command:'x',url:'x',file_path:packet}}),new RegExp('a seat uses Read and Write only; '+t.replace(/[^A-Za-z0-9_]/g,'.')+' is not open to it')); });
denied('seat writes 2 MB outside',call('Write',path.join(elsewhere,'big.md'),{tool_input:{file_path:path.join(elsewhere,'big.md'),content:new Array(2000001).join('x')}}),/writes only its own answer file/);
allowed('seat writes 2 MB to its answer file',call('Write',answer,{tool_input:{file_path:answer,content:new Array(2000001).join('x')}}));
denied('seat with input that does not parse',call('Read','','{"hook_event_name":"PreToolUse","tool_name":"Write","agent_type":"cw:seat"'),/hook input could not be read/);
denied('seat call with no file_path',call('Read',undefined),/names no file/);
denied('seat with a hostile agent id',call('Read',packet,{agent_id:'../../x'}),/the call carries no agent id the hook will use in a path/);
denied('seat with no agent id',call('Read',packet,{agent_id:undefined}),/the call carries no agent id the hook will use in a path/);
denied('seat with a hostile session id',call('Read',packet,{session_id:'../sess-1'}),/no start of this seat is on the hook's record \(no session id the hook will use in a path\)/);
denied('start with a hostile session id',start(taskText(packet2,answer2),undefined,{session_id:'../../x'}),/^Combat Writing seat scope: the hook cannot keep the record of this start \(no session id the hook will use in a path\), and a seat with no record reads and writes nothing; the seat is not started\./);
check(fs.readdirSync(tmp).sort().join(',')==='data,elsewhere,proj,sessions'&&fs.existsSync(data)&&fs.readdirSync(data).join(',')==='seat-scope','an id that is no plain name was used in a path, or no record was kept at all: '+fs.readdirSync(tmp).join(','));

// ONE START PLACES ONE SEAT. Two starts in one session, two seats: each takes its own, neither
// reads or writes the other's, and a seat that has a record never takes a second.
var two='sess-two', A=as(two,'seatA'), B=as(two,'seatB'), C=as(two,'seatC');
allowed('two seats: the start of seat-1',start(taskText(packet,answer),'m',{session_id:two}));
allowed('two seats: the start of seat-2',start(taskText(packet2,answer2),undefined,{session_id:two}));
check(waiting(two).length===2,'two starts must wait in the session, got '+JSON.stringify(kept(two,/./)));
allowed('two seats: A reads seat-1\'s packet and is placed',A('Read',packet));
denied('two seats: A, placed, asks for seat-2\'s packet while that start still waits',A('Read',packet2),OWN);
denied('two seats: A, placed, writes seat-2\'s answer while that start still waits',A('Write',answer2),/writes only its own answer file, /);
check(waiting(two).length===1&&placedSeats(two).join(',')==='agent-seatA.json','a placed seat must never take a second start, got '+JSON.stringify(kept(two,/./)));
allowed('two seats: B writes seat-2\'s answer file as its first call and is placed by it',B('Write',answer2));
allowed('two seats: B reads seat-2\'s packet',B('Read',packet2));
denied('two seats: B asks for seat-1\'s packet',B('Read',packet),OWN);
denied('two seats: B writes seat-1\'s answer',B('Write',answer),/writes only its own answer file, /);
denied('two seats: a third seat asks for a packet whose start is taken',C('Read',packet),/no start of this seat is on the hook's record/);
check(waiting(two).length===0&&placedSeats(two).join(',')==='agent-seatA.json,agent-seatB.json'&&strays(two).length===0,'two starts, two seats placed and nothing else, got '+JSON.stringify(kept(two,/./)));
// A start sent again for the same packet (a seat sent back once) places the next seat, and that
// seat may read the answer file first, the read the Write tool asks for before a rewrite.
allowed('sent back: seat-1 is started again',start(taskText(packet,answer),'m',{session_id:two}));
allowed('sent back: the new seat reads the answer file first and is placed by it',C('Read',answer));
allowed('sent back: the new seat rewrites the answer file',C('Write',answer));
allowed('sent back: the new seat reads the packet',C('Read',packet));
allowed('sent back: the first seat keeps its record',A('Read',packet));
// A start in one session places no seat of another.
allowed('another session: a start waits in its own session',start(taskText(packet2,answer2),undefined,{session_id:'sess-here'}));
denied('another session: a seat of another session asks for that packet',as('sess-there','x')('Read',packet2),/no start of this seat is on the hook's record/);
check(waiting('sess-here').length===1,'a seat of another session took a start: '+JSON.stringify(kept('sess-here',/./)));
// Records by another hand: a file of the hook's name that is not the hook's shape places no seat.
var planted=path.join(data,'seat-scope','sess-planted'); fs.mkdirSync(planted,{recursive:true});
var P=as('sess-planted','p');
function gone(file){ try{ fs.unlinkSync(file); }catch(e){} }
function plant(name,rec){ kept('sess-planted',/./).forEach(function(n){ gone(path.join(planted,n)); }); fs.writeFileSync(path.join(planted,name),typeof rec==='string'?rec:JSON.stringify(rec)+'\n'); }
var realRun=fs.realpathSync(run), realPacket=fs.realpathSync(packet), realAnswer=path.join(realRun,'rounds','01-sparring','seat-1.answer.md');
plant('start-a1-1.json',{v:1,at:1,seat:'seat-1',run:realRun,packet:path.join(realRun,'draft.md'),answer:realAnswer});
denied('a planted record whose packet is the draft opens no draft',P('Read',path.join(run,'draft.md')),/no start of this seat is on the hook's record/);
plant('start-a1-1.json',{v:1,at:1,seat:'seat-1',run:realRun,packet:fs.realpathSync(path.join(proj,'secret.txt')),answer:realAnswer});
denied('a planted record whose packet is a file outside any run opens nothing',P('Read',path.join(proj,'secret.txt')),/no start of this seat is on the hook's record/);
plant('start-a1-1.json',{v:1,at:1,seat:'seat-1',run:realRun,packet:realPacket,answer:path.join(fs.realpathSync(elsewhere),'seat-1.answer.md')});
denied('a planted record whose answer file is outside its run places no seat',P('Read',packet),/no start of this seat is on the hook's record/);
denied('a planted record whose answer file is outside its run opens no write there',P('Write',path.join(elsewhere,'seat-1.answer.md')),/no start of this seat is on the hook's record/);
plant('start-a1-1.json',{v:1,at:1,seat:'seat-1',run:fs.realpathSync(elsewhere),packet:realPacket,answer:path.join(fs.realpathSync(elsewhere),'seat-1.answer.md')});
denied('a planted record whose run is not the packet\'s run places no seat',P('Read',packet),/no start of this seat is on the hook's record/);
plant('start-a1-1.json','{not json');
denied('a planted record that is not JSON places no seat',P('Read',packet),/no start of this seat is on the hook's record/);
kept('sess-planted',/./).forEach(function(n){ gone(path.join(planted,n)); });
var good=path.join(tmp,'elsewhere','good-record.json'); fs.writeFileSync(good,JSON.stringify({v:1,at:1,seat:'seat-1',run:realRun,packet:realPacket,answer:realAnswer})+'\n');
fs.symlinkSync(good,path.join(planted,'start-a1-1.json'));
denied('a planted record that is a link places no seat',P('Read',packet),/no start of this seat is on the hook's record/);
kept('sess-planted',/./).forEach(function(n){ gone(path.join(planted,n)); });
fs.symlinkSync(good,path.join(planted,'agent-p.json'));
denied('a seat\'s own record that is a link is no record',P('Read',packet),/no start of this seat is on the hook's record/);
gone(path.join(planted,'agent-p.json')); gone(good);
// Three paths that agree with each other, in a folder that is no run (it holds no seats.json).
var norun=path.join(fs.realpathSync(elsewhere),'norun'); fs.mkdirSync(path.join(norun,'rounds','01-sparring'),{recursive:true});
fs.writeFileSync(path.join(norun,'rounds','01-sparring','seat-1.packet.md'),'not a packet of any run\n');
plant('start-a1-1.json',{v:1,at:1,seat:'seat-1',run:norun,packet:path.join(norun,'rounds','01-sparring','seat-1.packet.md'),answer:path.join(norun,'rounds','01-sparring','seat-1.answer.md')});
denied('a planted record whose folder is no run (no seats.json) places no seat',P('Read',path.join(norun,'rounds','01-sparring','seat-1.packet.md')),/no start of this seat is on the hook's record/);
denied('a planted record whose folder is no run opens no write there',P('Write',path.join(norun,'rounds','01-sparring','seat-1.answer.md')),/no start of this seat is on the hook's record/);
kept('sess-planted',/./).forEach(function(n){ gone(path.join(planted,n)); });
// A seat whose own record is damaged has a record that cannot be read: it is refused, and it
// takes no start that waits, its own file standing in the way.
allowed('a damaged record: a start waits in the session',start(taskText(packet2,answer2),undefined,{session_id:'sess-planted'}));
fs.writeFileSync(path.join(planted,'agent-p.json'),'{not json');
denied('a seat whose own record is damaged takes no waiting start',P('Read',packet2),OWN);
check(waiting('sess-planted').length===1&&fs.readFileSync(path.join(planted,'agent-p.json'),'utf8')==='{not json'&&strays('sess-planted').length===0,'a seat with a damaged record must leave the waiting start and its own file as they were, got '+JSON.stringify(kept('sess-planted',/./)));
gone(path.join(planted,'agent-p.json'));
// A hook stopped between its steps leaves a spare name carrying the seat's id and no record: that
// seat is refused, after the short wait for a record that never comes, and nothing is opened.
var stillWaiting=waiting('sess-planted')[0];
check(!!stillWaiting,'the start that waited for the damaged seat\'s session is gone, so the next check has nothing to cut short');
if(!stillWaiting){ kept('sess-planted',/./).forEach(function(n){ gone(path.join(planted,n)); }); start(taskText(packet2,answer2),undefined,{session_id:'sess-planted'}); stillWaiting=waiting('sess-planted')[0]||'start-none-0.json'; fs.writeFileSync(path.join(planted,stillWaiting),fs.existsSync(path.join(planted,stillWaiting))?fs.readFileSync(path.join(planted,stillWaiting)):'{}\n'); }
var spareName='claim-p-'+stillWaiting.slice(6);
fs.renameSync(path.join(planted,stillWaiting),path.join(planted,spareName));
var slow=Date.now(), stuck=P('Read',packet2); slow=Date.now()-slow;
denied('a seat whose taking was cut short is refused, never opened',stuck,/no start of this seat is on the hook's record/);
check(slow<3000,'a seat whose taking was cut short must be answered well inside the hook\'s five seconds, took '+slow+' ms');
check(kept('sess-planted',/./).join(',')===spareName,'the spare name of a taking cut short must be left as it was, got '+JSON.stringify(kept('sess-planted',/./)));
gone(path.join(planted,spareName));
// A link is never a folder of the hook's. A session's folder that is a link: no start is put on
// record through it and no seat is placed from it. The same for the folder of records itself.
var away=path.join(fs.realpathSync(elsewhere),'away'); fs.mkdirSync(away);
fs.writeFileSync(path.join(away,'start-zz-9.json'),JSON.stringify({v:1,at:9,seat:'seat-2',run:realRun,packet:fs.realpathSync(packet2),answer:path.join(realRun,'rounds','01-sparring','seat-2.answer.md')})+'\n');
fs.symlinkSync(away,path.join(data,'seat-scope','sess-linked'));
denied('a session\'s folder that is a link: the start of a seat is refused',start(taskText(packet2,answer2),undefined,{session_id:'sess-linked'}),/^Combat Writing seat scope: the hook cannot keep the record of this start \(the folder of its records is a link, which the hook will not write through, in the plugin's data folder\), and a seat with no record reads and writes nothing; the seat is not started\./);
denied('a session\'s folder that is a link: a record waiting behind it places no seat',as('sess-linked','q')('Read',packet2),/no start of this seat is on the hook's record/);
check(fs.readdirSync(away).join(',')==='start-zz-9.json','a session\'s folder that is a link was written through or changed: '+fs.readdirSync(away).join(','));
fs.unlinkSync(path.join(data,'seat-scope','sess-linked'));
var data2=path.join(fs.realpathSync(elsewhere),'data2'), away2=path.join(fs.realpathSync(elsewhere),'away2'); fs.mkdirSync(data2); fs.mkdirSync(away2);
fs.symlinkSync(away2,path.join(data2,'seat-scope'));
denied('the folder of records itself a link: the start of a seat is refused',start(taskText(packet2,answer2),undefined,{session_id:'sess-x'},{CLAUDE_PLUGIN_DATA:data2}),/the folder of its records is a link/);
denied('the folder of records itself a link: a seat is refused',call('Read',packet2,{session_id:'sess-x',agent_id:'q'},{CLAUDE_PLUGIN_DATA:data2}),/no start of this seat is on the hook's record/);
check(fs.readdirSync(away2).length===0,'the folder of records that is a link was written through: '+fs.readdirSync(away2).join(','));

// NO DATA FOLDER, or one the hook cannot write in: no record can be kept, so no seat is started
// and no seat's call is allowed; every other caller is untouched.
var NOKEEP=/^Combat Writing seat scope: the hook cannot keep the record of this start \(the host named no data folder for the plugin\), and a seat with no record reads and writes nothing; the seat is not started\. No fresh reader can start in this session; outside seats through the add-on are not affected$/;
denied('no data folder named: the start of a seat is refused',start(taskText(packet2,answer2),undefined,{},{}),NOKEEP);
denied('a relative data folder is none: the start of a seat is refused',start(taskText(packet2,answer2),undefined,{},{CLAUDE_PLUGIN_DATA:'data'}),NOKEEP);
check(!fs.existsSync(path.join(proj,'data')),'a relative data folder was written in');
denied('no data folder named: a seat\'s read of its packet is refused',call('Read',packet,{},{}),/^Combat Writing seat scope: no start of this seat is on the hook's record \(the host named no data folder for the plugin\), so no packet can be placed and nothing is read or written\./);
denied('no data folder named: a seat\'s write is refused',call('Write',answer,{},{}),/no start of this seat is on the hook's record/);
allowed('no data folder named: the host\'s own call is untouched',call('Bash','',{agent_type:undefined,agent_id:undefined,tool_name:'Bash',tool_input:{command:'ls'}},{}));
allowed('no data folder named: the start of another agent type is untouched',call('Agent','',{agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:{description:'d',prompt:'x',subagent_type:'Explore'}},{}));
var blocked=path.join(tmp,'elsewhere','a-file-not-a-folder'); fs.writeFileSync(blocked,'x\n');
denied('a data folder the hook cannot write in: the start of a seat is refused',start(taskText(packet2,answer2),undefined,{},{CLAUDE_PLUGIN_DATA:blocked}),/^Combat Writing seat scope: the hook cannot keep the record of this start \(E[A-Z]+ writing in the plugin's data folder\), and a seat with no record reads and writes nothing; the seat is not started\./);
check(fs.readFileSync(blocked,'utf8')==='x\n','the file standing where the data folder was named must be left as it was');
fs.unlinkSync(blocked);

// THE RECORDS END. A session's folder 30 days past its last start is removed at a later start:
// the hook's own files, and the folder when nothing else is in it. A session's folder that is a
// link is not entered.
var base=path.join(data,'seat-scope'), old=new Date(Date.now()-31*86400000), young=new Date(Date.now()-29*86400000);
function aged(name,files,when){ var d=path.join(base,name); fs.mkdirSync(d,{recursive:true}); files.forEach(function(f){ fs.writeFileSync(path.join(d,f),'{}\n'); }); fs.utimesSync(d,when,when); return d; }
var oldDir=aged('sess-old',['start-abc-12.json','agent-someone.json','claim-someone-abc-12.json'],old);
var mixedDir=aged('sess-mixed',['agent-someone.json','notes.txt'],old);
var youngDir=aged('sess-young',['agent-someone.json'],young);
var linkTarget=path.join(tmp,'elsewhere','linked'); fs.mkdirSync(linkTarget); fs.writeFileSync(path.join(linkTarget,'agent-someone.json'),'{}\n'); fs.utimesSync(linkTarget,old,old);
fs.symlinkSync(linkTarget,path.join(base,'sess-link'));
fs.writeFileSync(path.join(base,'a-file'),'x\n');
allowed('the records end: a later start of a seat, in another session',start(taskText(packet2,answer2),undefined,{session_id:'sess-sweeper'}));
check(!fs.existsSync(oldDir),'a session\'s records 31 days past its last start must be removed at a later start');
check(fs.existsSync(mixedDir)&&fs.readdirSync(mixedDir).join(',')==='notes.txt','in an old folder that holds a file that is not the hook\'s, the hook\'s records go and that file and the folder stay: '+(fs.existsSync(mixedDir)?fs.readdirSync(mixedDir).join(','):'folder gone'));
check(fs.existsSync(path.join(youngDir,'agent-someone.json')),'a session\'s records 29 days old must stay');
check(fs.existsSync(path.join(linkTarget,'agent-someone.json'))&&fs.lstatSync(path.join(base,'sess-link')).isSymbolicLink(),'a link in the records folder must never be followed or removed');
check(fs.readFileSync(path.join(base,'a-file'),'utf8')==='x\n','a file in the records folder that is no session\'s folder must be left alone');
check(placedSeats(sid).join(',')==='agent-'+aid+'.json'&&placedSeats(two).length===3,'the records of sessions in use must stay: '+JSON.stringify(placedSeats(sid))+' '+JSON.stringify(placedSeats(two)));
fs.unlinkSync(path.join(base,'sess-link')); fs.unlinkSync(path.join(base,'a-file'));

// The start of a seat (issue 194): the host's Agent call is held to the seat record's start.
denied('start: session record, a model passed',start(taskText(packet2,answer2),'a-choice-string'),/^Combat Writing seat scope: seat-2's record says it runs on the session's own model; start seat-2 again with no model choice$/);
allowed('start: session record, no model',start(taskText(packet2,answer2)));
allowed('start: session record, an empty model is no model',start(taskText(packet2,answer2),'  '));
allowed('start: named record, a model passed (never compared to the record)',start(taskText(packet,answer),'a-choice-string'));
denied('start: named record, no model',start(taskText(packet,answer)),/^Combat Writing seat scope: seat-1's record names Test Model; start seat-1 again and pass that model as the agent tool's model choice$/);
denied('start: named record, an empty model',start(taskText(packet,answer),''),/seat-1's record names Test Model/);
allowed('start: a relative packet path',start(taskText(path.relative(proj,packet2),path.relative(proj,answer2))));
allowed('start: the bare seat type',call('Agent','',{agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:{description:'d',prompt:taskText(packet2,answer2),subagent_type:'seat'}}));
denied('start: the bare seat type, a model on a session record',call('Agent','',{agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:{description:'d',prompt:taskText(packet2,answer2),subagent_type:'seat',model:'x'}}),/start seat-2 again with no model choice/);
denied('start: from another agent, a model on a session record',start(taskText(packet2,answer2),'x',{agent_type:'Explore',agent_id:'other'}),/start seat-2 again with no model choice/);
var readOn=(/^var START_READ_ON='([^']+)';$/m.exec(fs.readFileSync(hook,'utf8'))||[])[1];
check(typeof readOn==='string'&&/^\d+\.\d+\.\d+ to \d+\.\d+\.\d+$/.test(readOn)&&fs.readFileSync(hook,'utf8').split(readOn).length===2,'seat-scope.js: START_READ_ON must be one constant on its own line, the versions once, got '+readOn);
denied('start: no Packet line',start('Read the draft and rate it.'),new RegExp('^Combat Writing seat scope: the call that starts a seat names no packet or answer file \\(its task opens with the two lines `Packet: <path>` and `Answer file: <path>`, the start call as Claude Code '+String(readOn).replace(/\./g,'\\.')+' writes it\\); the seat is not started$'));
denied('start: no prompt at all',call('Agent','',{agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:{subagent_type:'cw:seat'}}),/names no packet or answer file/);
denied('start: a packet that does not exist',start(taskText(path.join(run,'rounds','01-sparring','seat-9.packet.md'),answer)),/packet named in the seat's task cannot be placed; the seat is not started/);
denied('start: a packet outside a rounds folder',start(taskText(path.join(run,'draft.md'),answer)),/not a seat's packet inside a run's rounds folder; the seat is not started/);
denied('start: an answer file outside the run',start(taskText(packet2,path.join(elsewhere,'seat-2.answer.md'))),/answer file named in the seat's task is not inside the run folder; the seat is not started/);
// A second run folder written by hand: no seats.json, then a broken one, then records of every kind.
var fake=path.join(tmp,'fake','combat-writing','runs','hand'), fround=path.join(fake,'rounds','02-battle');
fs.mkdirSync(fround,{recursive:true});
function fpk(name){ var f=path.join(fround,name); fs.writeFileSync(f,'a packet\n'); return f; }
function fstart(seatId,model,file){ return start(taskText(file||fpk(seatId+'.packet.md'),path.join(fround,seatId+'.answer.md')),model); }
denied('start: a run with no seats.json',fstart('seat-1'),/the run folder holds no seats\.json the hook can read, so the seat's record cannot be placed; the seat is not started/);
fs.writeFileSync(path.join(fake,'seats.json'),'{not json');
denied('start: a run with a broken seats.json',fstart('seat-1'),/holds no seats\.json the hook can read/);
var OLD87='agent configuration (model: inherit, the model named at start winning over it); the model name was supplied by the host';
var kinds=[
  {id:'seat-1',model:'Test Session Model',company:'Anthropic',start:'session',source:'x'},
  {id:'seat-2',model:'Test Model B',company:'Anthropic',start:'named',source:'x'},
  {id:'seat-3',model:'Outside Model',company:'Example',provider:'example',source:'the model field'},
  {id:'seat-4',model:'Old Model',company:'Anthropic',source:OLD87},
  {id:'seat-5',model:'Older Model',company:'Anthropic',source:'agent configuration, not an API field'},
  {id:'seat-6',model:'Odd Model',company:'Anthropic',start:'other',source:OLD87}
];
fs.writeFileSync(path.join(fake,'seats.json'),JSON.stringify({seats:kinds},null,2)+'\n');
var lib=require(path.join(scripts,'lib.js'));
kinds.forEach(function(k){
  var how=lib.seatStart(k), bare=fstart(k.id), named=fstart(k.id,'a-choice-string');
  var got=(bare.out===''?'allow':'deny')+'/'+(named.out===''?'allow':'deny');
  var want=how==='session'?'allow/deny':how==='named'?'deny/allow':'deny/deny';
  check(got===want,'start: '+k.id+' reads as '+how+' in lib.seatStart, so no model/model should be '+want+', got '+got);
});
denied('start: an outside seat',fstart('seat-3'),/^Combat Writing seat scope: seat-3 is an outside seat \(its record carries a provider\) and is never started through the agent tool; call the add-on's crew_answer with the run, the round and the seat$/);
denied('start: a seat id with no record',fstart('seat-9'),/^Combat Writing seat scope: seat-9 has no record in the run's seats\.json; the seat is not started$/);
allowed('start: the crew-pass packet names its seat',fstart('seat-1',undefined,fpk('seat-1.crew.packet.md')));
allowed('start: a packet kind with a digit and a dash names its seat',fstart('seat-1',undefined,fpk('seat-1.read-2.packet.md')));
denied('start: the tool under its earlier name, Task, is held the same way',call('Task','',{agent_type:undefined,agent_id:undefined,tool_name:'Task',tool_input:{description:'d',prompt:taskText(packet2,answer2),subagent_type:'cw:seat',model:'x'}}),/start seat-2 again with no model choice/);
allowed('start: the tool under its earlier name, a start that fits its record',call('Task','',{agent_type:undefined,agent_id:undefined,tool_name:'Task',tool_input:{description:'d',prompt:taskText(packet2,answer2),subagent_type:'cw:seat'}}));
denied('start: the final packet names its seat',fstart('seat-1','x',fpk('seat-1.sn.packet.md')),/start seat-1 again with no model choice/);
denied('start: a packet file that names no seat',fstart('seat-1',undefined,fpk('notes.packet.md')),/not a seat's packet inside a run's rounds folder/);
// Every other Agent call, and every other tool, from a caller that is not a seat: untouched.
allowed('host starts another agent type',call('Agent','',{agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:{description:'d',prompt:taskText(packet2,answer2),subagent_type:'Explore',model:'x'}}));
allowed('host starts an agent with no type',call('Agent','',{agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:{description:'d',prompt:'Read the draft.',model:'x'}}));
allowed('host calls another tool with the same input',call('Bash','',{agent_type:undefined,agent_id:undefined,tool_name:'Bash',tool_input:{command:'ls',prompt:taskText(packet2,answer2),subagent_type:'cw:seat',model:'x'}}));
allowed('host start call with no tool_input',call('Agent','',{agent_type:undefined,agent_id:undefined,tool_name:'Agent',tool_input:undefined}));

// The hook wrote nothing anywhere in the run or the project beyond what the test wrote.
var written=fs.readdirSync(run).sort().join(',');
check(written==='brief.md,dangling.md,dir-out,draft.md,extra,link-out.txt,log.jsonl,rounds,seats.json','run folder changed by the hook: '+written);
check(fs.readFileSync(answer,'utf8')==='RATING: 8/10\nFirst.\n','the hook must not touch the answer file');
check(fs.readdirSync(proj).sort().join(',')==='brief.md,combat-writing,draft.md,secret.txt','the project folder changed: '+fs.readdirSync(proj).sort().join(','));
// In the data folder: its one folder of records, a folder per session, and in each the hook's
// own three kinds of file and nothing else.
var foreign=[];
if(!fs.existsSync(path.join(data,'seat-scope')))fs.mkdirSync(path.join(data,'seat-scope'),{recursive:true}), foreign.push('(the hook kept no record at all)');
fs.readdirSync(data).forEach(function(n){ if(n!=='seat-scope')foreign.push(n); });
fs.readdirSync(path.join(data,'seat-scope')).forEach(function(sess){ if(sess==='sess-mixed')return; fs.readdirSync(path.join(data,'seat-scope',sess)).forEach(function(f){ if(!/^(?:start-[0-9a-z]+-\d+|agent-[A-Za-z0-9_-]+)\.json$/.test(f))foreign.push(sess+'/'+f); }); });
check(foreign.length===0,'the hook wrote something in the data folder that is not a record: '+foreign.join(', '));

// hooks.json carries the entry; the script is clean.
var hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks','hooks.json'),'utf8'));
var pre=(hooks.hooks.PreToolUse||[]).filter(function(e){return e.matcher===undefined;});  // the host-output entry (matcher AskUserQuestion, issue 60) sits beside it
check(pre.length===1&&pre[0].hooks.length===1&&pre[0].hooks[0].type==='command'&&pre[0].hooks[0].command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/seat-scope.js"'&&typeof pre[0].hooks[0].timeout==='number'&&pre[0].hooks[0].timeout<=10,'hooks.json: the one PreToolUse entry with no matcher must run seat-scope.js on every tool with a short timeout: '+JSON.stringify(pre));
// THE FENCE FAILS CLOSED (issue 239). A hook that cannot start, exits with an error or runs past
// its timeout must stop the call it was asked about, never let it through: the entry says so to
// the host. And an error inside the hook is never one of those failures for a caller that is not
// a seat: the hook answers it itself, a refusal for a seat and for the start of one, silence for
// every other caller, so the host's own calls are not stopped by a fault in the plugin's code.
check(pre.length===1&&pre[0].hooks[0].onFailure==='block','hooks.json: the seat hook\'s entry must carry onFailure "block", so a hook that fails stops the call: '+JSON.stringify(pre));
var breaker=path.join(tmp,'break-path.js');
fs.writeFileSync(breaker,'var p=require("path");["dirname","join"].forEach(function(k){ var real=p[k]; p[k]=function(){ if(process.env.BREAK_NOW)throw new Error("a fault inside the hook"); return real.apply(p,arguments); }; });\nprocess.stdin.on("end",function(){ process.env.BREAK_NOW="1"; });\n');
function broken(input){
  return shaped(cp.spawnSync(process.execPath,['-r',breaker,hook],{input:JSON.stringify(input),encoding:'utf8',cwd:proj,env:hookEnv()}));
}
var base={session_id:sid,transcript_path:transcript,cwd:proj,hook_event_name:'PreToolUse'};
denied('a fault inside the hook, a seat\'s read',broken(Object.assign({},base,{tool_name:'Read',tool_input:{file_path:packet},agent_id:aid,agent_type:'cw:seat'})),/^Combat Writing seat scope: the hook failed \(a fault inside the hook\); a seat does nothing the hook cannot judge$/);
denied('a fault inside the hook, the start of a seat',broken(Object.assign({},base,{tool_name:'Agent',tool_input:{description:'d',prompt:taskText(packet2,answer2),subagent_type:'cw:seat'}})),/^Combat Writing seat scope: the hook failed \(a fault inside the hook\); the seat is not started$/);
// A fault BEFORE the hook has read who is calling: the first thing it does with the parsed input
// is look the agent type up in its list of seat types, so a lookup that throws there faults every
// caller's run, the host's included. The breaker leaves a mark when it throws, so silence is
// proved to be the hook's answer to a fault that happened, and not a run in which nothing failed.
var earlyMark=path.join(tmp,'early-fault.txt');
var early=path.join(tmp,'break-early.js');
fs.writeFileSync(early,'var real=Array.prototype.indexOf,armed=false;\nArray.prototype.indexOf=function(x){ if(armed&&this.length===2&&this[0]==="cw:seat"&&this[1]==="seat"){ armed=false; require("fs").appendFileSync('+JSON.stringify(earlyMark)+',"threw\\n"); throw new Error("an early fault inside the hook"); } return real.apply(this,arguments); };\nprocess.stdin.on("end",function(){ armed=true; });\n');
function brokenEarly(input){
  try{ fs.unlinkSync(earlyMark); }catch(e){}
  var r=shaped(cp.spawnSync(process.execPath,['-r',early,hook],{input:JSON.stringify(input),encoding:'utf8',cwd:proj,env:hookEnv()}));
  r.threw=fs.existsSync(earlyMark);
  return r;
}
var eh=brokenEarly(Object.assign({},base,{tool_name:'Bash',tool_input:{command:'ls'}}));
check(eh.threw,'an early fault, the host\'s call: the breaker never threw, so nothing is proved');
allowed('an early fault never reaches the host\'s own call',eh);
var ea=brokenEarly(Object.assign({},base,{tool_name:'Read',tool_input:{file_path:packet},agent_id:'x',agent_type:'Explore'}));
check(ea.threw,'an early fault, another agent\'s call: the breaker never threw, so nothing is proved');
allowed('an early fault never reaches another agent\'s call',ea);
var es=brokenEarly(Object.assign({},base,{tool_name:'Read',tool_input:{file_path:packet},agent_id:aid,agent_type:'cw:seat'}));
check(es.threw,'an early fault, a seat\'s read: the breaker never threw, so nothing is proved');
denied('an early fault, before the hook has read who calls, still refuses a seat',es,/^Combat Writing seat scope: the hook failed \(an early fault inside the hook\); a seat does nothing the hook cannot judge$/);
var et=brokenEarly(Object.assign({},base,{tool_name:'Agent',tool_input:{description:'d',prompt:taskText(packet2,answer2),subagent_type:'cw:seat'}}));
check(et.threw,'an early fault, the start of a seat: the breaker never threw, so nothing is proved');
denied('an early fault, before the hook has read who calls, still refuses the start of a seat',et,/^Combat Writing seat scope: the hook failed \(an early fault inside the hook\); the seat is not started$/);
// THE LIVE PROOF'S FIXTURE (issue 237). tests/seat_scope_live.js is not run by CI, so nothing
// read the run it builds, and a rule the hook gained after the proof was written left the proof
// starting no seat, unseen. The arguments the live proof hands new-run.js are read from its own
// source and the same run is built here: the start the proof asks for, seat-1 with no model
// choice and the task the proof writes, must be one the hook allows. A later rule the fixture
// does not meet fails here.
var liveSrc=fs.readFileSync(path.join(__dirname,'seat_scope_live.js'),'utf8');
var liveArgsText=(/node\('new-run\.js',(\[[^\]]*\])\)/.exec(liveSrc)||[])[1], liveArgs=null;
try{ liveArgs=JSON.parse(String(liveArgsText).replace(/'/g,'"')); }catch(e){}
check(Array.isArray(liveArgs)&&liveArgs.indexOf('--draft')>=0,'the live proof\'s fixture: tests/seat_scope_live.js must hand new-run.js one literal list of arguments this check can read, got '+JSON.stringify(liveArgsText));
if(Array.isArray(liveArgs)){
  var liveProj=path.join(tmp,'live-proj'); fs.mkdirSync(liveProj);
  fs.writeFileSync(path.join(liveProj,'draft.md'),'Dear board,\n\nBuy the company. It is cheap.\n\nYours.\n');
  var liveRun=cp.spawnSync(process.execPath,[path.join(scripts,'new-run.js')].concat(liveArgs),{cwd:liveProj,encoding:'utf8'}).stdout.trim();
  cp.spawnSync(process.execPath,[path.join(scripts,'packet.js'),'--run',liveRun,'--round','01-sparring','--seat','seat-1'],{cwd:liveProj,encoding:'utf8'});
  var livePacket=path.join(liveRun,'rounds','01-sparring','seat-1.packet.md'), liveAnswer=path.join(liveRun,'rounds','01-sparring','seat-1.answer.md');
  check(!!liveRun&&fs.existsSync(livePacket),'the live proof\'s fixture: its arguments must build a run with seat-1\'s packet, got '+JSON.stringify(liveRun));
  var liveStart=start('Packet: '+livePacket+'\nAnswer file: '+liveAnswer+'\nThis is a measurement run.');
  check(liveStart.status===0&&liveStart.out===''&&liveStart.stderr==='','the live proof\'s fixture: the hook must allow the start the live proof asks for (seat-1, no model choice); it refused with: '+JSON.stringify(liveStart.reason||liveStart.out));
  check(/'Packet: '\+packet\+'\\nAnswer file: '\+answer\+'\\n/.test(liveSrc),'the live proof\'s fixture: the task the live proof writes must open with the Packet and Answer file lines the hook reads');
}

var src=fs.readFileSync(hook,'utf8'), code=src.replace(/\/\/[^\n]*/g,'');
check(src.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','seat-scope.js: no Shield header on line 1');
check(!/appendFileSync|child_process|\bfetch\(|https?:\/\/|process\.argv/.test(code),'seat-scope.js: must spawn nothing, fetch nothing and read no argument');
check((code.match(/process\.env\.?[A-Za-z_\[]*/g)||[]).join(',')==='process.env.CLAUDE_PLUGIN_DATA','seat-scope.js: reads one environment variable, CLAUDE_PLUGIN_DATA, once: '+(code.match(/process\.env\.?[A-Za-z_\[]*/g)||[]).join(','));
check((code.match(/require\('[^']+'\)/g)||[]).join(',')==="require('fs'),require('path')",'seat-scope.js: requires fs and path alone');

// AT ONCE. The claim is one rename, so calls that land together cannot share a start. Eight seats
// ask for one waiting packet in the same moment: one is placed. One seat makes two calls in the
// same moment, each naming the packet of a different waiting start: it is placed by one, and the
// other start still waits for its own seat. Run as real processes side by side.
function together(inputs){
  return Promise.all(inputs.map(function(input){ return new Promise(function(done){
    var c=cp.spawn(process.execPath,[hook],{cwd:proj,env:hookEnv()}), out='';
    c.stdout.on('data',function(d){ out+=d; }); c.on('close',function(status){ done({status:status,out:out.trim()}); });
    c.stdin.end(JSON.stringify(input));
  }); }));
}
function seatInput(session,agent,tool,file){ return {session_id:session,transcript_path:transcript,cwd:proj,hook_event_name:'PreToolUse',tool_name:tool,tool_input:{file_path:file},agent_id:agent,agent_type:'cw:seat'}; }
var rounds=[0,1,2,3,4];
allowed('at once: one start waits for eight seats',start(taskText(packet,answer),'m',{session_id:'sess-eight'}));
rounds.forEach(function(i){
  allowed('at once: seat-1\'s start, pair '+i,start(taskText(packet,answer),'m',{session_id:'sess-pair-'+i}));
  allowed('at once: seat-2\'s start, pair '+i,start(taskText(packet2,answer2),undefined,{session_id:'sess-pair-'+i}));
});
var boths=[0,1,2,3,4,5,6,7,8,9,10,11];
boths.forEach(function(i){ allowed('at once: seat-1\'s start, its own two files, pair '+i,start(taskText(packet,answer),'m',{session_id:'sess-both-'+i})); });
together([0,1,2,3,4,5,6,7].map(function(i){ return seatInput('sess-eight','racer'+i,'Read',packet); })).then(function(rs){
  var let_in=rs.filter(function(r){ return r.status===0&&r.out===''; }).length, refused=rs.filter(function(r){ return r.status===0&&/"permissionDecision":"deny"/.test(r.out); }).length;
  check(let_in===1&&refused===7,'at once: eight seats asked for one waiting packet; one must be placed and seven refused, got '+let_in+' placed and '+refused+' refused');
  check(waiting('sess-eight').length===0&&placedSeats('sess-eight').length===1&&strays('sess-eight').length===0,'at once: one record must stand for the one start, got '+JSON.stringify(kept('sess-eight',/./)));
  return rounds.reduce(function(chain,i){ return chain.then(function(){
    return together([seatInput('sess-pair-'+i,'twin','Read',packet),seatInput('sess-pair-'+i,'twin','Read',packet2)]).then(function(pair){
      var ok=pair.filter(function(r){ return r.status===0&&r.out===''; }).length;
      check(ok===1,'at once, pair '+i+': one seat asked for two waiting packets in the same moment; one call must be allowed, got '+ok);
      check(waiting('sess-pair-'+i).length===1&&placedSeats('sess-pair-'+i).join(',')==='agent-twin.json'&&strays('sess-pair-'+i).length===0,'at once, pair '+i+': the seat must hold one record and the other start must still wait, got '+JSON.stringify(kept('sess-pair-'+i,/./)));
      var left=null; try{ left=JSON.parse(fs.readFileSync(path.join(data,'seat-scope','sess-pair-'+i,waiting('sess-pair-'+i)[0]),'utf8')); }catch(e){}
      var mine=null; try{ mine=JSON.parse(fs.readFileSync(path.join(data,'seat-scope','sess-pair-'+i,'agent-twin.json'),'utf8')); }catch(e){}
      check(!!left&&!!mine&&left.packet!==mine.packet,'at once, pair '+i+': the start still waiting must be the one the seat did not take');
    });
  }); },Promise.resolve());
}).then(function(){
  // One seat, two calls in the same moment, each naming one of ITS OWN two files, the packet and
  // the answer file of one waiting start (a seat sent back opens that way: both files are on
  // disk). One call takes the start; the other must wait for the seat's record and be judged by
  // it, never refused a file that is the seat's own.
  return boths.reduce(function(chain,i){ return chain.then(function(){
    return together([seatInput('sess-both-'+i,'both','Read',packet),seatInput('sess-both-'+i,'both','Read',answer)]).then(function(pair){
      var ok=pair.filter(function(r){ return r.status===0&&r.out===''; }).length;
      check(ok===2,'at once, its own two files, pair '+i+': one seat read its packet and its answer file in the same moment; both are its own and both must be allowed, got '+ok+' allowed: '+pair.map(function(r){ return r.out.slice(0,200); }).join(' | '));
      check(waiting('sess-both-'+i).length===0&&placedSeats('sess-both-'+i).join(',')==='agent-both.json'&&strays('sess-both-'+i).length===0,'at once, its own two files, pair '+i+': the seat must hold the one record and nothing else must stand, got '+JSON.stringify(kept('sess-both-'+i,/./)));
    });
  }); },Promise.resolve());
}).then(function(){
  // The wait itself, with no luck in it. The state a call meets when another call of its seat is
  // taking a start is set by hand: the start under the seat's spare name, no record yet. The
  // hook is started on the seat's read of its packet; 150 ms later this test does what the other
  // call would, writes the seat's record and removes the spare name. The hook must have waited
  // and must allow the read. A second seat's read, with the taking never finished, is refused.
  var sess='sess-wait', dir=path.join(data,'seat-scope',sess);
  allowed('the wait: a start goes on record',start(taskText(packet,answer),'m',{session_id:sess}));
  var st=waiting(sess)[0]||'start-none-0.json', rec='{}';
  try{ rec=fs.readFileSync(path.join(dir,st),'utf8'); }catch(e){}
  var spare=path.join(dir,'claim-waiter-'+st.slice(6));
  try{ fs.renameSync(path.join(dir,st),spare); }catch(e){}
  var began=Date.now();
  setTimeout(function(){ try{ fs.writeFileSync(path.join(dir,'agent-waiter.json'),rec,{flag:'wx'}); fs.unlinkSync(spare); }catch(e){} },150);
  return together([seatInput(sess,'waiter','Read',packet)]).then(function(rs){
    var took=Date.now()-began;
    check(rs[0].status===0&&rs[0].out==='','the wait: a call that lands while its own seat\'s start is being taken must wait for the seat\'s record and be allowed, got '+rs[0].out.slice(0,220));
    check(took>=140,'the wait: the hook answered in '+took+' ms, before the record was written, so it did not wait');
  });
}).catch(function(e){ failures.push('at once: the check itself failed: '+(e&&e.stack||e)); }).then(function(){
  fs.rmSync(tmp,{recursive:true,force:true});
  failures.forEach(function(f){console.log('FAIL '+f);});
  console.log((failures.length?'seat_scope_check: '+failures.length+' failure(s), ':'seat_scope_check: all passed, ')+passes+' checks');
  process.exit(failures.length?1:0);
});
