// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// seat-scope.js: the seat's reach (ruled 2026-10-16). A PreToolUse hook on every tool. A fresh
// reader (the `seat` agent, agent_type `cw:seat`) uses Read and Write only, reads only inside
// its run folder and writes only its own answer file, both judged on the resolved path; any
// other tool, and any path the hook cannot place, is denied. Every other caller, the host and
// any other agent, is left alone: the hook prints nothing and exits 0, in about 20 ms.
//
// How the hook places the seat: the host starts a seat with a task of two lines, `Packet:
// <path>` and `Answer file: <path>` (the sparring and battle skills). That task is the first
// record of the seat's own transcript, which Claude Code keeps beside the session's transcript
// as <session dir>/<session_id>/subagents/agent-<agent_id>.jsonl (measured on the Claude Code
// version in PROVED_ON below, the one constant the reason and the tests read; the live proof
// is tests/seat_scope_live.js). The
// hook reads that record, takes the two paths, resolves the packet to its run folder
// (rounds/<round>/<seat>.packet.md, two levels under the run), and judges every Read against
// the run folder and every Write against the answer path. No transcript, no task, no packet,
// no run folder, a symlink out, a path that does not exist, malformed input: denied, with
// the reason, so a seat the hook cannot place does nothing rather than anything.
//
// Output on deny: one JSON line, hookSpecificOutput.permissionDecision "deny" with the reason,
// exit 0 (the documented form). On allow: nothing, exit 0, so the session's own permission
// rules still apply. The hook reads the transcript record and the file system; it writes
// nothing, calls nothing, reads no environment, and never prints a path from inside the draft.
// Input that does not parse is denied when it names a seat agent type and ignored otherwise.

var fs=require('fs'), path=require('path');

// The Claude Code version the live proof last ran on (tests/seat_scope_live.js). One copy.
var PROVED_ON='2.1.301';
var SEAT_TYPES=['cw:seat','seat'];
var SEAT_TOOLS=['Read','Write'];
var ISSUES='github.com/LearningProducers/CombatWriting-Plugin/issues';

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

// Where the seat's own transcript should be, for the task and for the reason when it is not there.
function transcriptPathOf(input){
  var tp=input.transcript_path, sid=input.session_id, aid=input.agent_id;
  if(typeof tp!=='string'||typeof sid!=='string'||typeof aid!=='string')return 'no transcript_path, session_id or agent_id in the hook input';
  if(!/^[A-Za-z0-9_-]+$/.test(sid)||!/^[A-Za-z0-9_-]+$/.test(aid))return 'a session or agent id the hook will not use in a path';
  return path.join(path.dirname(tp),sid,'subagents','agent-'+aid+'.jsonl');
}
// The seat's task: the first user record of the seat's own transcript.
function taskOf(input){
  var file=transcriptPathOf(input);
  if(!path.isAbsolute(file))return null;
  var text;
  try{ text=fs.readFileSync(file,'utf8'); }catch(e){ return null; }
  var lines=text.split('\n');
  for(var i=0;i<lines.length;i++){
    if(!lines[i].trim())continue;
    var rec; try{ rec=JSON.parse(lines[i]); }catch(e){ return null; }
    if(rec&&rec.type==='user'&&rec.message){
      var c=rec.message.content;
      if(Array.isArray(c))c=c.map(function(x){return x&&typeof x.text==='string'?x.text:'';}).join('\n');
      return typeof c==='string'?c:null;
    }
  }
  return null;
}
function pathsOf(task){
  var packet=/^Packet:[ \t]*(.+?)[ \t]*$/m.exec(task), answer=/^Answer file:[ \t]*(.+?)[ \t]*$/m.exec(task);
  return packet&&answer?{packet:packet[1],answer:answer[1]}:null;
}

var raw='';
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
  if(SEAT_TYPES.indexOf(input.agent_type)<0)return allow();  // the host or another agent: untouched
  // From here on the caller is a seat: anything the hook cannot place is denied.
  var tool=input.tool_name;
  if(SEAT_TOOLS.indexOf(tool)<0)return deny('a seat uses '+SEAT_TOOLS.join(' and ')+' only; '+tool+' is not open to it');
  var cwd=typeof input.cwd==='string'&&input.cwd?input.cwd:process.cwd();
  var task=taskOf(input);
  if(!task)return deny('the seat\'s transcript is not where Claude Code '+PROVED_ON+' keeps it ('+transcriptPathOf(input)+'), so no run folder can be placed and nothing is read or written. A newer Claude Code has probably moved it: run `claude --version` and open an issue at '+ISSUES+' naming the version. Outside seats through the add-on are not affected');
  var paths=pathsOf(task);
  if(!paths)return deny('the seat\'s task names no packet or answer file; nothing is read or written');
  var packet=placeExisting(paths.packet,cwd);
  if(!packet)return deny('the packet named in the task cannot be placed; nothing is read or written');
  var roundDir=path.dirname(packet), runDir=path.dirname(roundDir);
  if(path.basename(runDir)!=='rounds'||!/\.packet\.md$/.test(path.basename(packet)))return deny('the packet named in the task is not inside a run\'s rounds folder; nothing is read or written');
  runDir=path.dirname(runDir);
  var answer=placeTarget(paths.answer,cwd);
  if(!answer||!inside(answer,runDir))return deny('the answer file named in the task is not inside the run folder; nothing is read or written');
  var target=input.tool_input&&typeof input.tool_input.file_path==='string'?input.tool_input.file_path:null;
  if(!target)return deny('the call names no file; nothing is read or written');
  if(tool==='Read'){
    var p=placeExisting(target,cwd);
    if(!p)return deny('the file cannot be placed (it does not exist, or its path cannot be resolved); a seat reads only inside its run folder');
    if(!inside(p,runDir))return deny('a seat reads only inside its run folder, '+runDir);
    return allow();
  }
  var w=placeTarget(target,cwd);
  if(!w)return deny('the file cannot be placed; a seat writes only its own answer file');
  if(!samePath(w,answer))return deny('a seat writes only its own answer file, '+answer);
  return allow();
});
