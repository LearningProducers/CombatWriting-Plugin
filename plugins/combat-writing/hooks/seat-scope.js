// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// seat-scope.js: the seat's reach (ruled 2026-10-16). A PreToolUse hook on Read and Write.
// A fresh reader (the `seat` agent, agent_type `cw:seat`) reads only inside its run folder and
// writes only its own answer file, both judged on the resolved path; a path the hook cannot
// place is denied. Every other caller, the host and any other agent, is left alone: the hook
// prints nothing and exits 0.
//
// How the hook places the seat: the host starts a seat with a task of two lines, `Packet:
// <path>` and `Answer file: <path>` (the sparring and battle skills). That task is the first
// record of the seat's own transcript, which Claude Code keeps beside the session's transcript
// as <session dir>/<session_id>/subagents/agent-<agent_id>.jsonl (measured on 2.1.301). The
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

var fs=require('fs'), path=require('path');

var SEAT_TYPES=['cw:seat','seat'];
var MAX_INPUT=1<<20;

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

// The seat's task: the first user record of the seat's own transcript.
function taskOf(input){
  var tp=input.transcript_path, sid=input.session_id, aid=input.agent_id;
  if(typeof tp!=='string'||typeof sid!=='string'||typeof aid!=='string')return null;
  if(!/^[A-Za-z0-9_-]+$/.test(sid)||!/^[A-Za-z0-9_-]+$/.test(aid))return null;
  var file=path.join(path.dirname(tp),sid,'subagents','agent-'+aid+'.jsonl');
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
process.stdin.on('data',function(c){ raw+=c; if(raw.length>MAX_INPUT){raw=raw.slice(0,MAX_INPUT);} });
process.stdin.on('end',function(){
  var input;
  try{ input=JSON.parse(raw); }catch(e){ return allow(); }   // not a hook call we can read: not ours to judge
  if(!input||input.hook_event_name!=='PreToolUse')return allow();
  if(SEAT_TYPES.indexOf(input.agent_type)<0)return allow();  // the host or another agent: untouched
  // From here on the caller is a seat: anything the hook cannot place is denied.
  var tool=input.tool_name;
  if(tool!=='Read'&&tool!=='Write')return deny('a seat uses Read and Write only; '+tool+' is not open to it');
  var cwd=typeof input.cwd==='string'&&input.cwd?input.cwd:process.cwd();
  var task=taskOf(input);
  if(!task)return deny('the seat\'s task could not be read, so no run folder can be placed; nothing is read or written');
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
