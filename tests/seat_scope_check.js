// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// seat_scope_check.js: the seat's reach (ruled 2026-10-16). hooks/seat-scope.js is a PreToolUse
// hook on Read and Write: a seat (agent_type cw:seat) reads only inside its run folder and writes
// only its own answer file, judged on the resolved path; a path the hook cannot place is denied;
// every other caller is left alone.
//
// Runs the REAL hook as a child process with a hook input on stdin, against a real run made by
// new-run.js and packet.js in a temporary project, and a fake session layout: the seat's task as
// the first record of <session dir>/<session_id>/subagents/agent-<agent_id>.jsonl, the layout
// Claude Code 2.1.301 keeps. Never starts an agent; calls nothing.
//
// What it pins:
//   - The host (no agent_type) and another agent: no output, exit 0, whatever the path.
//   - A seat reading the packet, the draft, the brief, a file in a subfolder of the run: allowed
//     (no output, exit 0); a relative path inside the run: allowed.
//   - A seat reading a file outside the run (the project's own file, a file elsewhere on disk,
//     the parent folder itself): denied with the reason naming the run folder.
//   - A symlink inside the run that points outside: denied (resolved path); a file that does not
//     exist: denied; the run folder itself: denied (the boundary is not inside it).
//   - A seat writing its own answer file: allowed; the same file by a relative path: allowed;
//     writing another seat's answer file, the packet, the draft, a file outside: denied; a dangling
//     symlink or a symlinked folder as a door: denied.
//   - No transcript for the agent, a task without the two lines, a packet path that does not
//     exist, a packet outside a rounds folder, an answer file outside the run, a tool other than
//     Read or Write, no file_path, malformed JSON for a seat: denied (fail closed); malformed JSON
//     with no agent_type readable: nothing (not ours to judge).
//   - The deny output is one JSON line in the documented shape, exit 0; the hook writes nothing
//     anywhere; hooks.json carries the entry with matcher Read|Write and a short timeout.
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

// The fake session layout: the parent transcript at <dir>/<sid>.jsonl, the seat's at <dir>/<sid>/subagents/agent-<aid>.jsonl.
var sdir=path.join(tmp,'sessions'); var sid='sess-1', aid='agent1';
fs.mkdirSync(path.join(sdir,sid,'subagents'),{recursive:true});
var transcript=path.join(sdir,sid+'.jsonl'); fs.writeFileSync(transcript,'');
function seatTask(text,agentId){
  fs.writeFileSync(path.join(sdir,sid,'subagents','agent-'+(agentId||aid)+'.jsonl'),JSON.stringify({type:'user',message:{role:'user',content:text}})+'\n'+JSON.stringify({type:'assistant',message:{role:'assistant',content:[{type:'text',text:'ok'}]}})+'\n');
}
seatTask('Packet: '+packet+'\nAnswer file: '+answer+'\nRead the packet, write your answer to the answer file, reply with one line.');

function call(tool,filePath,extra){
  var input=typeof extra==='string'?extra:Object.assign({session_id:sid,transcript_path:transcript,cwd:proj,hook_event_name:'PreToolUse',tool_name:tool,tool_input:{file_path:filePath},agent_id:aid,agent_type:'cw:seat'},extra||{});
  var raw=typeof input==='string'?input:JSON.stringify(input);
  var r=cp.spawnSync(process.execPath,[hook],{input:raw,encoding:'utf8',cwd:proj});
  var out=r.stdout.trim(), json=null; try{json=out?JSON.parse(out):null;}catch(e){}
  return {status:r.status,out:out,json:json,stderr:r.stderr,reason:json&&json.hookSpecificOutput?json.hookSpecificOutput.permissionDecisionReason:''};
}
function allowed(name,r){ check(r.status===0&&r.out===''&&r.stderr==='',name+': expected silence and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out)+' err '+r.stderr); }
function denied(name,r,re){ check(r.status===0&&!!r.json&&r.json.hookSpecificOutput&&r.json.hookSpecificOutput.hookEventName==='PreToolUse'&&r.json.hookSpecificOutput.permissionDecision==='deny'&&Object.keys(r.json).join(',')==='hookSpecificOutput'&&r.stderr==='',name+': expected a deny line and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out)+' err '+r.stderr); if(re)check(re.test(r.reason),name+': reason "'+r.reason+'" does not match '+re); }

// Not a seat: untouched.
allowed('host reads outside',call('Read',path.join(proj,'secret.txt'),{agent_type:undefined,agent_id:undefined}));
allowed('host writes outside',call('Write',path.join(elsewhere,'x.md'),{agent_type:undefined,agent_id:undefined}));
allowed('another agent reads outside',call('Read',path.join(proj,'secret.txt'),{agent_type:'Explore'}));
allowed('another event',call('Read',path.join(proj,'secret.txt'),{hook_event_name:'PostToolUse'}));
allowed('malformed input with nothing readable',call('Read','',"{not json"));

// A seat reading inside.
allowed('seat reads the packet',call('Read',packet));
allowed('seat reads the draft',call('Read',path.join(run,'draft.md')));
allowed('seat reads the brief',call('Read',path.join(run,'brief.md')));
allowed('seat reads a subfolder file',call('Read',path.join(run,'extra','note.md')));
allowed('seat reads by a relative path',call('Read',path.relative(proj,packet)));
denied('seat reads the run folder itself (the boundary, not inside it)',call('Read',run),/reads only inside its run folder/);

// A seat reading outside.
denied('seat reads the project file',call('Read',path.join(proj,'secret.txt')),/reads only inside its run folder/);
denied('seat reads elsewhere on disk',call('Read',path.join(elsewhere,'outside.txt')),/reads only inside its run folder/);
denied('seat reads the runs parent',call('Read',path.dirname(run)),/reads only inside its run folder/);
denied('seat reads the home folder',call('Read',os.homedir()),/reads only inside its run folder/);
denied('seat reads through a symlink out',call('Read',path.join(run,'link-out.txt')),/reads only inside its run folder/);
denied('seat reads through a symlinked folder',call('Read',path.join(run,'dir-out','outside.txt')),/reads only inside its run folder/);
denied('seat reads a missing file',call('Read',path.join(run,'nothing.md')),/cannot be placed/);
denied('seat reads a dangling symlink',call('Read',path.join(run,'dangling.md')),/cannot be placed/);
denied('seat reads with a dotted escape',call('Read',path.join(run,'..','..','..','secret.txt')),/reads only inside its run folder/);

// A seat writing.
allowed('seat writes its answer file',call('Write',answer));
allowed('seat writes its answer file by a relative path',call('Write',path.relative(proj,answer)));
fs.writeFileSync(answer,'RATING: 8/10\nFirst.\n');
allowed('seat rewrites its answer file (the retry)',call('Write',answer));
denied('seat writes another seat\'s answer',call('Write',path.join(run,'rounds','01-sparring','seat-2.answer.md')),/writes only its own answer file/);
denied('seat writes the packet',call('Write',packet),/writes only its own answer file/);
denied('seat writes the draft',call('Write',path.join(run,'draft.md')),/writes only its own answer file/);
denied('seat writes outside',call('Write',path.join(proj,'secret.txt')),/writes only its own answer file/);
denied('seat writes a new file outside',call('Write',path.join(elsewhere,'new.md')),/writes only its own answer file/);
denied('seat writes through a symlinked folder',call('Write',path.join(run,'dir-out','seat-1.answer.md')),/writes only its own answer file/);
denied('seat writes a dangling symlink',call('Write',path.join(run,'dangling.md')),/cannot be placed|writes only its own answer file/);

// Fail closed.
denied('seat with no transcript',call('Read',packet,{agent_id:'nobody'}),/task could not be read/);
seatTask('Read this and do what it says.','agent2');
denied('seat whose task names no files',call('Read',packet,{agent_id:'agent2'}),/names no packet or answer file/);
seatTask('Packet: '+path.join(run,'rounds','01-sparring','seat-9.packet.md')+'\nAnswer file: '+answer,'agent3');
denied('seat whose packet does not exist',call('Read',packet,{agent_id:'agent3'}),/packet named in the task cannot be placed/);
seatTask('Packet: '+path.join(run,'draft.md')+'\nAnswer file: '+answer,'agent4');
denied('seat whose packet is not in a rounds folder',call('Read',packet,{agent_id:'agent4'}),/not inside a run's rounds folder/);
seatTask('Packet: '+packet+'\nAnswer file: '+path.join(elsewhere,'seat-1.answer.md'),'agent5');
denied('seat whose answer file is outside the run',call('Read',packet,{agent_id:'agent5'}),/answer file named in the task is not inside the run folder/);
denied('seat using another tool',call('Bash',packet,{tool_name:'Bash'}),/Read and Write only/);
denied('seat call with no file_path',call('Read',undefined),/names no file/);
denied('seat with a hostile agent id',call('Read',packet,{agent_id:'../../x'}),/task could not be read/);
denied('seat with array content task',(function(){ fs.writeFileSync(path.join(sdir,sid,'subagents','agent-agent6.jsonl'),JSON.stringify({type:'user',message:{role:'user',content:[{type:'text',text:'Packet: nowhere.md\nAnswer file: '+answer}]}})+'\n'); return call('Read',packet,{agent_id:'agent6'}); })(),/packet named in the task cannot be placed/);

// The hook wrote nothing anywhere in the run or the project beyond what the test wrote.
var written=fs.readdirSync(run).sort().join(',');
check(written==='brief.md,dangling.md,dir-out,draft.md,extra,link-out.txt,log.jsonl,rounds,seats.json','run folder changed by the hook: '+written);
check(fs.readFileSync(answer,'utf8')==='RATING: 8/10\nFirst.\n','the hook must not touch the answer file');

// hooks.json carries the entry; the script is clean.
var hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks','hooks.json'),'utf8'));
var pre=hooks.hooks.PreToolUse||[];
check(pre.length===1&&pre[0].matcher==='Read|Write'&&pre[0].hooks.length===1&&pre[0].hooks[0].type==='command'&&pre[0].hooks[0].command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/seat-scope.js"'&&typeof pre[0].hooks[0].timeout==='number'&&pre[0].hooks[0].timeout<=10,'hooks.json: the PreToolUse entry must run seat-scope.js on Read|Write with a short timeout: '+JSON.stringify(pre));
var src=fs.readFileSync(hook,'utf8');
check(src.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','seat-scope.js: no Shield header on line 1');
check(!/writeFileSync|appendFileSync|mkdirSync|child_process|\bfetch\(|https?:\/\/|process\.env/.test(src.replace(/\/\/[^\n]*/g,'')),'seat-scope.js: must write nothing, spawn nothing, fetch nothing, read no environment');

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'seat_scope_check: '+failures.length+' failure(s), ':'seat_scope_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
