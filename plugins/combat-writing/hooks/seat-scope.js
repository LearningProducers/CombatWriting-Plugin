// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// seat-scope.js: the seat's reach. A PreToolUse hook on four tools, the two a seat holds (Read
// and Write, the tools agents/seat.md declares; the host gives a seat no other) and the two names
// of the tool that starts an agent (hooks.json's matcher, issue 255). A fresh
// reader (the `seat` agent, agent_type `cw:seat`) uses Read and Write only, reads two files, its
// own packet and its own answer file, and writes that answer file alone, each judged on the
// resolved path; any other tool, any other file and any path the hook cannot place is denied.
// Every other caller, the host and any other agent, is left alone but for one call, the one that
// starts a seat (below): the hook prints nothing and exits 0, in about 20 ms.
//
// The two files, and why no more: the packet carries the draft, the brief, the reader and the
// other seats' answers of the round before, written into it by packet.js, and names no file by
// path, so a path inside it is the draft's own words and never a grant. Everything else in the
// run folder (the draft and the brief as files, seats.json, the log, another seat's packet, and
// another seat's answer to the round in progress) stays closed to a seat the hook has placed, so
// that no seat reads another's new answer before giving its own is held here from that moment
// and not by the seat's instructions alone; what the hook trusts until then is said below. The
// answer file is open to a read because the Write tool refuses to replace a file its caller has
// not read, and a seat sent back once rewrites its answer.
//
// How the hook places the seat: by a record of its own, never by a transcript. The host starts a
// seat with a task of two lines, `Packet: <path>` and `Answer file: <path>` (the sparring and
// battle skills), and this hook judges that start call (below). When it allows the start it
// writes one small file in the plugin's data folder, the folder the host names in
// CLAUDE_PLUGIN_DATA: <data>/seat-scope/<session_id>/start-<time>-<pid>.json, holding the seat's
// id, the run folder, the packet and the answer file, each as a resolved path, and the time. No
// text of the task, the draft or the brief is in it but what those paths carry: the task's two
// paths, resolved, and in them the run folder's own name, which the commands make from the
// first words of the draft, or of the brief when a run starts from the brief alone (the script,
// handed no name, uses the draft's file name, or the brief's when no draft is given). A seat's
// own calls carry its agent id and
// no task (measured on the Claude Code version in PROVED_ON below, the one constant the reason
// and the tests read; the live proof is tests/seat_scope_live.js), so the seat is bound to its
// record by its first call that names one of its two files: a seat with no record of its own
// that reads the packet, or reads or writes the answer file, of a start still waiting in its
// session takes that start, which becomes its record, agent-<agent_id>.json, and every later
// call of that seat is judged by it. One rename takes the start, so two seats never take one;
// the seat's record is then created and never replaced, so a seat that has a record never takes
// another. What the first call is trusted on: a seat with no record takes whichever waiting
// start of its session its call names, so until it is placed the hook trusts the seat to name
// its own. Until a seat has been allowed a call it has read no packet: it has read the plugin's
// agent file, the host's task and what the host hands every agent it starts. The task is the
// host's writing: a seat sent back is started with the checker's reason in its task, and a
// reason is the checker's own words and the numbers it measured, with no word of the answer
// that failed (checkAnswer in scripts/lib.js). And one seat with no record has read a packet: a
// seat whose record is gone, removed after its 30 days or left under a session id the host no
// longer uses. It is refused every call but a read of the packet, or a read or write of the
// answer file, of a start then waiting in its session, which it would take as any seat with no
// record does; the skills start a fresh seat for every read and message none. No data folder, no record, a record the hook cannot read, a symlink to another file, a path that does not exist, malformed input: denied,
// with the reason, so a seat the hook cannot place does nothing rather than anything.
//
// When the records end: a session's folder of records is removed by a later start of a seat,
// in any session, once 30 days have passed since the last start or first call in it, at most 20
// folders at one start: 30 days is the least a record stays, and with no later start it stays. The hook removes its own record
// files there and the folder when nothing else is in it. A link is never a folder of the hook's:
// one standing where the folder of records or a session's folder should be is not written
// through, read through or entered, and a record that is a link is left where it is.
//
// When the hook itself fails: hooks.json sets onFailure "block" on this hook's entry, so the
// host stops the call when the hook cannot start, exits with an error or runs past its timeout,
// where without the field it would let the call through (the field is read by Claude Code
// 2.1.295 and later; an earlier host ignores it and lets the call through, as before). The host
// cannot tell a seat from any other caller there, so a hook that starts and fails stops every
// call the entry is matched to, the person's own Read, Write and agent starts among them, and no
// other tool. A machine with no Node on the PATH is not such a failure (issue 255): the command
// in hooks.json asks first whether node runs (`node --version`, so a node on the PATH that cannot
// run counts as none), and when it does not it refuses a call only when the
// hook input names the plugin's reader (its start, or a call of its own) and lets every other
// call through with no word, so the person's own work is not stopped and no reader runs unheld.
// Where the host runs a hook's command in no POSIX shell (by the host's documentation, Windows
// with no Git Bash; not measured here), the command cannot run at all and the matched calls are
// stopped.
// A fault inside this file's own code is therefore never left to the host: it is caught
// below and answered here, a refusal for a seat's call and for the start of a seat, silence and
// exit 0 for every other caller.
//
// How a seat starts: the one judgment on a caller that is not a seat. The call that starts a
// fresh reader is the Agent tool (Task, its earlier name, is judged the same way) with
// subagent_type `cw:seat` (or `seat`), its prompt opening
// with the same two lines, and a model choice only when one is passed (the shape read from a
// real session's hook input on the Claude Code version in START_READ_ON below). The hook resolves the packet to its run folder, takes the seat id from the
// packet's file name, reads that seat's record in the run's seats.json and holds the call to
// the record's `start` (the rule of lib.seatStart in scripts/lib.js, mirrored here so the hook
// requires nothing but fs and path; tests/seat_scope_check.js keeps the two equal): a record
// that says `session` is started with no model choice, so the agent file's model: inherit
// leaves the seat on the session's own model; a record that says `named` is started with one.
// The model passed is not compared to the record's name: the host records the name it reports
// and passes the tool's own choice string, and the two differ by design. A start the hook
// cannot place (no task lines, a packet outside a run's rounds folder, an answer file outside
// the run, no seats.json, no record for the seat) and the start of an outside seat, which goes
// through the add-on and never the agent tool, are denied with the reason, and so is a start
// whose record the hook cannot keep (no data folder named, or one it cannot write in): a seat
// whose start is not on record could not be placed by it, so it is not started. Any other call of
// those two tools, and every other tool from a caller that is not a seat, is untouched.
//
// Output on deny: one JSON line, hookSpecificOutput.permissionDecision "deny" with the reason,
// exit 0 (the documented form). On allow: nothing, exit 0, so the session's own permission
// rules still apply. The hook reads the hook input, its own records and the file system, and
// opens no transcript; it writes its records in the plugin's data folder and nowhere else, calls
// nothing, reads one environment variable, CLAUDE_PLUGIN_DATA, and never prints a path from
// inside the draft.
// Input that does not parse is denied when it names a seat agent type and ignored otherwise.
// A fault in the hook's own code is answered by who the input says is calling, the parsed input
// when the fault falls after it was read and the raw input before: refused for a seat and for
// the start of a seat, silence and exit 0 for every other caller.

var fs=require('fs'), path=require('path');

// The Claude Code version the live proof last ran on (tests/seat_scope_live.js). One copy.
var PROVED_ON='2.1.330';
// The Claude Code version the start call's shape was read on, from a real session's hook input. One copy.
var START_READ_ON='2.1.331';
var START_TOOLS=['Agent','Task'];
var SEAT_TYPES=['cw:seat','seat'];
var SEAT_TOOLS=['Read','Write'];
var ISSUES='github.com/LearningProducers/CombatWriting-Plugin/issues';
// The hook's own records: where, how long, and the only names it writes or removes there.
var DATA=process.env.CLAUDE_PLUGIN_DATA||'';
var KEPT_IN='seat-scope';
var KEPT_DAYS=30;
var SWEPT_AT_ONCE=20;
// A call's wait for another call of the same seat that is taking a start at that moment: a look
// every WAIT_MS until WAIT_FOR ms have passed since the first, then one more.
var WAIT_MS=10, WAIT_FOR=500;
var ID=/^[A-Za-z0-9_-]{1,128}$/;
var START_FILE=/^start-[0-9a-z]+-\d+\.json$/;
var RECORD_FILE=/^(?:start|agent|claim)-[A-Za-z0-9_-]+\.json$/;
var SEAT_PACKET=/^(seat-\d+)\.(?:[a-z0-9-]+\.)?packet\.md$/;

function deny(reason){
  process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'Combat Writing seat scope: '+reason}})+'\n');
  process.exit(0);
}
function allow(){ process.exit(0); }
function samePath(a,b){ return process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b; }
function inside(p,dir){ var rel=path.relative(dir,p); return rel!==''&&!rel.startsWith('..')&&!path.isAbsolute(rel); }

// The resolved path of a file that must exist (a Read): realpath, or null.
function placeExisting(p,cwd){
  try{ return fs.realpathSync(path.resolve(cwd,p)); }catch(e){ return null; }
}
// The resolved path of a file that may not exist yet (a Write): its folder's realpath plus its
// name, so a symlinked folder resolves and a dangling name cannot be used as a door.
function placeTarget(p,cwd){
  var abs=path.resolve(cwd,p);
  try{ if(fs.lstatSync(abs).isSymbolicLink())return null; }catch(e){}
  try{ return path.join(fs.realpathSync(path.dirname(abs)),path.basename(abs)); }catch(e){ return null; }
}

// The folder of this session's records, or why there is none.
function recordsOf(input){
  if(!DATA||!path.isAbsolute(DATA))return {why:'the host named no data folder for the plugin'};
  var sid=input.session_id;
  if(typeof sid!=='string'||!ID.test(sid))return {why:'no session id the hook will use in a path'};
  return {dir:path.join(DATA,KEPT_IN,sid)};
}
// A folder of the hook's own, there as a plain folder: a link standing in its place is not it.
function plainDir(dir){ try{ return fs.lstatSync(dir).isDirectory(); }catch(e){ return false; } }
function pause(ms){ try{ Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,ms); }catch(e){ var until=Date.now()+ms; while(Date.now()<until){} } }
// One record, read back: a plain file of the hook's own shape, a seat's packet inside the rounds
// folder of a run (a folder that holds a seats.json, a plain file) and an answer file inside
// that run, or null. A link, a file of another shape and a record that names anything else is
// no record.
function readRecord(file){
  try{
    var st=fs.lstatSync(file);
    if(!st.isFile()||st.size>65536)return null;
    var r=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!r||r.v!==1||typeof r.at!=='number'||typeof r.run!=='string'||typeof r.packet!=='string'||typeof r.answer!=='string')return null;
    if(!path.isAbsolute(r.run)||!path.isAbsolute(r.packet)||!path.isAbsolute(r.answer))return null;
    if(!SEAT_PACKET.test(path.basename(r.packet))||!samePath(path.dirname(path.dirname(r.packet)),path.join(r.run,'rounds'))||!inside(r.answer,r.run))return null;
    if(!fs.lstatSync(path.join(r.run,'seats.json')).isFile())return null;
    return {v:1,at:r.at,seat:typeof r.seat==='string'?r.seat:'',run:r.run,packet:r.packet,answer:r.answer};
  }catch(e){ return null; }
}
// Folders of records no seat has started in or first called from for KEPT_DAYS: the hook's own
// record files are removed and the folder when it is then empty. Never this session's, never
// through a link, a few at a time, and a failure here never stops a start.
function sweep(base,mine){
  try{
    var cut=Date.now()-KEPT_DAYS*86400000, done=0;
    fs.readdirSync(base).some(function(name){
      if(name===mine||!ID.test(name))return false;
      var dir=path.join(base,name);
      try{
        var st=fs.lstatSync(dir);
        if(!st.isDirectory()||st.mtimeMs>cut)return false;
        fs.readdirSync(dir).forEach(function(f){
          var file=path.join(dir,f);
          if(RECORD_FILE.test(f)&&fs.lstatSync(file).isFile())fs.unlinkSync(file);
        });
        fs.rmdirSync(dir);
      }catch(e){}
      return ++done>=SWEPT_AT_ONCE;
    });
  }catch(e){}
}
// The start the hook allowed, put on record. True, or why it could not be kept.
function keep(input,rec){
  var where=recordsOf(input);
  if(!where.dir)return where.why;
  try{
    var base=path.dirname(where.dir), link='where its folder of records should be, a link or a file stands, and the hook writes through neither, in the plugin\'s data folder';
    fs.mkdirSync(base,{recursive:true,mode:0o700});
    if(!plainDir(base))return link;
    try{ fs.mkdirSync(where.dir,{mode:0o700}); }catch(e){ if(!e||e.code!=='EEXIST')throw e; }
    if(!plainDir(where.dir))return link;
    fs.writeFileSync(path.join(where.dir,'start-'+rec.at.toString(36)+'-'+process.pid+'.json'),JSON.stringify(rec)+'\n',{flag:'wx',mode:0o600});
  }catch(e){ return (e&&e.code?String(e.code):'an error')+' writing in the plugin\'s data folder'; }
  sweep(path.dirname(where.dir),path.basename(where.dir));
  return true;
}
// A seat with no record of its own, on a call that names a file: the newest start still waiting
// in its session whose packet (a Read) or answer file (a Read or a Write) is that file becomes
// the seat's record. Three steps, each one that can fail safely: the start is renamed to a name
// only this call uses, so no other seat can take it (a start already gone was taken by another
// call, and the next is tried; a rename refused for any other cause is a fault, answered as one);
// the seat's record is created, never
// replaced, so a seat that a call of its own placed a moment ago keeps that one and the start is
// given back; the spare name is removed. A hook stopped between the rename and the record leaves
// the seat with no record, judged from then on as any seat with no record is; one stopped after
// the record is written leaves the record, and beside it the spare name, which the sweep removes
// with the session's folder. A call that took nothing may have landed with another call
// of the same seat that is taking a start at that moment (a seat reading its packet and its
// answer file in one turn): the spare name carries the seat's id and stands until the seat's
// record is written, so the call waits for that record, looking every 10 ms until half a second
// has passed, then once more, and is judged by it. It waits on no other seat's spare name. A
// record that cannot be written for any cause but that it is already there is a fault: the
// start is given back and the hook answers as it answers any fault of its own. Returns the
// record, or {waiting: how many starts wait}.
function take(dir,aid,tool,placed){
  var names; try{ names=fs.readdirSync(dir); }catch(e){ return {waiting:0}; }
  var waiting=[];
  names.forEach(function(n){ if(START_FILE.test(n)){ var r=readRecord(path.join(dir,n)); if(r)waiting.push({name:n,rec:r}); } });
  var mine=path.join(dir,'agent-'+aid+'.json');
  var fits=!placed?[]:waiting.filter(function(w){ return (tool==='Read'&&samePath(placed,w.rec.packet))||samePath(placed,w.rec.answer); });
  fits.sort(function(a,b){ return b.rec.at-a.rec.at||(a.name<b.name?1:-1); });
  for(var i=0;i<fits.length;i++){
    var from=path.join(dir,fits[i].name), spare=path.join(dir,'claim-'+aid+'-'+fits[i].name.slice(6));
    try{ fs.renameSync(from,spare); }catch(e){ if(e&&e.code==='ENOENT')continue; throw e; }
    try{ fs.writeFileSync(mine,JSON.stringify(fits[i].rec)+'\n',{flag:'wx',mode:0o600}); }
    catch(e){
      var there=!!e&&e.code==='EEXIST';
      if(!there){ try{ fs.unlinkSync(mine); }catch(e2){} }
      try{ fs.renameSync(spare,from); }catch(e2){}
      if(!there)throw e;
      break;
    }
    try{ fs.unlinkSync(spare); }catch(e){}
    return fits[i].rec;
  }
  var own='claim-'+aid+'-', until=Date.now()+WAIT_FOR;
  for(;;){
    var now=readRecord(mine);
    if(now)return now;
    var taking=false;
    try{ taking=fs.readdirSync(dir).some(function(n){ return n.indexOf(own)===0&&START_FILE.test('start-'+n.slice(own.length)); }); }catch(e){}
    if(!taking||Date.now()>=until)break;
    pause(WAIT_MS);
  }
  return readRecord(mine)||{waiting:waiting.length};
}
function pathsOf(task){
  var packet=/^Packet:[ \t]*(.+?)[ \t]*$/m.exec(task), answer=/^Answer file:[ \t]*(.+?)[ \t]*$/m.exec(task);
  return packet&&answer?{packet:packet[1],answer:answer[1]}:null;
}

// How the record says a seat starts: the rule of lib.seatStart (scripts/lib.js), kept equal by the test.
function startOf(seat){
  if(seat.provider)return 'outside';
  if(seat.start==='session'||seat.start==='named')return seat.start;
  return /model named at start/.test(seat.source||'')?'named':'session';
}
// The call that starts a seat, from a caller that is not one: held to the seat record's start.
function judgeStart(input){
  var ti=input.tool_input;
  var cwd=typeof input.cwd==='string'&&input.cwd?input.cwd:process.cwd();
  var paths=pathsOf(typeof ti.prompt==='string'?ti.prompt:'');
  if(!paths)return deny('the call that starts a seat names no packet or answer file (its task opens with the two lines `Packet: <path>` and `Answer file: <path>`, the start call as Claude Code '+START_READ_ON+' writes it); the seat is not started');
  var packet=placeExisting(paths.packet,cwd);
  if(!packet)return deny('the packet named in the seat\'s task cannot be placed; the seat is not started');
  var runDir=path.dirname(path.dirname(packet)), m=SEAT_PACKET.exec(path.basename(packet));
  if(path.basename(runDir)!=='rounds'||!m)return deny('the packet named in the seat\'s task is not a seat\'s packet inside a run\'s rounds folder; the seat is not started');
  runDir=path.dirname(runDir);
  var answer=placeTarget(paths.answer,cwd);
  if(!answer||!inside(answer,runDir))return deny('the answer file named in the seat\'s task is not inside the run folder; the seat is not started');
  var seats=null;
  try{ seats=JSON.parse(fs.readFileSync(path.join(runDir,'seats.json'),'utf8')).seats; }catch(e){}
  if(!Array.isArray(seats))return deny('the run folder holds no seats.json the hook can read, so the seat\'s record cannot be placed; the seat is not started');
  var id=m[1], seat=seats.filter(function(s){ return s&&s.id===id; })[0];
  if(!seat)return deny(id+' has no record in the run\'s seats.json; the seat is not started');
  var start=startOf(seat);
  if(start==='outside')return deny(id+' is an outside seat (its record carries a provider) and is never started through the agent tool; call the add-on\'s crew_answer with the run, the round and the seat');
  var passed=typeof ti.model==='string'&&ti.model.trim()!=='';
  if(start==='session'&&passed)return deny(id+'\'s record says it runs on the session\'s own model; start '+id+' again with no model choice');
  if(start==='named'&&!passed)return deny(id+'\'s record names '+(typeof seat.model==='string'&&seat.model?seat.model:'a model')+'; start '+id+' again and pass that model as the agent tool\'s model choice');
  var kept=keep(input,{v:1,at:Date.now(),seat:id,run:runDir,packet:packet,answer:answer});
  if(kept!==true)return deny('the hook cannot keep the record of this start ('+kept+'), and a seat whose start is not on record cannot be placed by it; the seat is not started. No fresh reader can start in this session; outside seats through the add-on are not affected');
  return allow();
}

// A fault in this file's own code is answered here and never left to the host, whose onFailure
// "block" would stop the call whoever made it: a refusal for a seat and for the start of one,
// silence for every other caller. `who` is set as soon as the input says who is calling; a
// fault before that is answered from the raw input, read the way input that does not parse is
// read, so a seat is refused however early the fault falls.
var who=null, raw='';
process.on('uncaughtException',function(e){
  var why='the hook failed ('+(e&&e.code?String(e.code):String(e&&e.message||e).split('\n')[0].slice(0,120))+')';
  var w=who||(/"agent_type"\s*:\s*"(?:cw:)?seat"/.test(raw)?'seat':/"subagent_type"\s*:\s*"(?:cw:)?seat"/.test(raw)?'start':null);
  if(w==='seat')return deny(why+'; a seat does nothing the hook cannot judge');
  if(w==='start')return deny(why+'; the seat is not started');
  process.exit(0);
});

process.stdin.setEncoding('utf8');
process.stdin.on('data',function(c){ raw+=c; });
process.stdin.on('end',function(){
  var input;
  try{ input=JSON.parse(raw); }catch(e){
    // Not readable: a seat's call is denied all the same; anything else is not ours to judge.
    if(/"agent_type"\s*:\s*"(?:cw:)?seat"/.test(raw))return deny('the hook input could not be read; a seat does nothing the hook cannot judge');
    return allow();
  }
  if(!input||input.hook_event_name!=='PreToolUse')return allow();
  if(SEAT_TYPES.indexOf(input.agent_type)<0){
    // The host or another agent: one judgment, the call that starts a seat; everything else untouched.
    var ti=input.tool_input;
    if(START_TOOLS.indexOf(input.tool_name)>=0&&ti&&typeof ti==='object'&&SEAT_TYPES.indexOf(ti.subagent_type)>=0){ who='start'; return judgeStart(input); }
    return allow();
  }
  // From here on the caller is a seat: anything the hook cannot place is denied.
  who='seat';
  var tool=input.tool_name;
  if(SEAT_TOOLS.indexOf(tool)<0)return deny('a seat uses '+SEAT_TOOLS.join(' and ')+' only; '+tool+' is not open to it');
  var cwd=typeof input.cwd==='string'&&input.cwd?input.cwd:process.cwd();
  var aid=input.agent_id, where=recordsOf(input);
  if(where.dir&&(typeof aid!=='string'||!ID.test(aid)))return deny('the call carries no agent id the hook will use in a path; nothing is read or written');
  var target=input.tool_input&&typeof input.tool_input.file_path==='string'?input.tool_input.file_path:null;
  if(where.dir&&!target)return deny('the call names no file; nothing is read or written');
  // The file the call names, resolved: a Read's must exist; a Write's may not yet. The resolved
  // path is what is compared, so a link beside the packet that points at another file is that
  // other file. The file asked for is never named in a reason: its path may be the draft's words.
  var placed=!target?null:tool==='Read'?placeExisting(target,cwd):placeTarget(target,cwd);
  var held=!!where.dir&&plainDir(path.dirname(where.dir))&&plainDir(where.dir);
  var rec=held?readRecord(path.join(where.dir,'agent-'+aid+'.json')):null;
  if(!rec&&held)rec=take(where.dir,aid,tool,placed);
  if(!rec||rec.waiting===0)return deny('no start of this seat is on the hook\'s record ('+(where.dir?'it looked in '+where.dir:where.why)+'), so no packet can be placed and nothing is read or written. The hook records a seat when the agent tool starts it, and was last proved on Claude Code '+PROVED_ON+': if the agent tool started this seat, run `claude --version` and open an issue at '+ISSUES+' naming the version. Outside seats through the add-on are not affected');
  var packet=rec.packet||null, answer=rec.answer||null;
  if(tool==='Read'){
    // Two files and no other: the packet, and the answer file once it is on disk.
    if(!placed)return deny('the file cannot be placed (it does not exist, or its path cannot be resolved); a seat reads only its own packet and its own answer file');
    if(packet&&(samePath(placed,packet)||samePath(placed,answer)))return allow();
    return deny('a seat reads only its own packet and its own answer file; this file is neither');
  }
  if(!placed)return deny('the file cannot be placed; a seat writes only its own answer file');
  if(!answer||!samePath(placed,answer))return deny('a seat writes only its own answer file'+(answer?', '+answer:''));
  return allow();
});
