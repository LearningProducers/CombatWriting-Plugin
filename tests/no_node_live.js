// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// no_node_live.js: the live proof of the plugin on a machine with no Node on the PATH (issue
// 255). Not part of CI: it needs a running Claude Code on this machine (the `claude` binary, or
// CLAUDE_BIN) and spends a few short model calls. Run it after a Claude Code update.
//
// Why it exists: the harness (tests/no_node_check.js) runs each command of hooks/hooks.json
// through sh with no node on the PATH. Only a real session proves what the host then does: that
// the person's own Read, Write and shell command go through, that the start of the plugin's
// reader is refused, and that the session start hands over the plugin's line.
//
// What it does: a throwaway plugin in a temporary folder, named `cw` so that its agent is
// `cw:seat`, carries the repository's hooks folder and hooks/hooks.json word for word, and the
// repository's agents/seat.md. Shell-only dump hooks (no Node here) record each PreToolUse and
// SessionStart input beside them. A scratch project gets a file with a marker, and a real run
// with one packet built by this test's own Node. Two child `claude -p --plugin-dir` sessions are
// started on a PATH of the system's folders alone, which hold no `node`. The first, on the
// hooks as declared, is asked to Read the file, Write a second one and run one shell command.
// The second is asked to start one cw:seat agent on the packet, and its copy of the plugin
// leaves out the SessionStart entry, the fence's entry standing word for word (issue 259: in one
// session the plugin's own session line, hooks/no-node.json, tells the model to start no reader,
// the model kept it, and no start ever reached the fence; with that line not said, nothing
// tells the model to hold the start back). Each child loads project settings alone
// (--setting-sources project) and no MCP server.
//
// What it asserts: the PATH the children were given holds no node; each child ran and loaded
// the throwaway plugin; the Read returned the marker, the Write wrote its file and the shell
// command printed its word, so nothing of the person's own work was stopped; in the second
// session the start of the reader reached the hooks and was refused in the fence's own words,
// words the session line does not hold (issue 259: the check matched "Node is not on the PATH",
// which the session line holds too, so it passed with no refusal at all), and no answer file was
// written; no line of either session says a hook's node was not found. The session start: when
// the first session's event stream carries the hook's answer, it is hooks/no-node.json byte for
// byte; whether the stream carries it is recorded as a measured fact.
//
// macOS and Linux, where Claude Code is its own program and the system folders hold no node;
// where either is not so the proof says it cannot run here (exit 2). Run it from a plain terminal.
//
// Run from the repo root:   node tests/no_node_live.js      (CLAUDE_BIN=<path> to pick a binary)
// Exit 0 on pass; exit 1 on any failure; exit 2 when it cannot be run here.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var repo=path.join(__dirname,'..');
var pluginSrc=path.join(repo,'plugins','combat-writing');
var NAME='cw', SYSTEM_PATH='/usr/bin:/bin:/usr/sbin:/sbin';
var failures=[], passes=0, facts=[];
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function cannot(why){ console.log('no_node_live: cannot run here: '+why); process.exit(2); }

if(process.platform==='win32')cannot('the hook commands are run through sh, and this proof builds a PATH of POSIX folders');
function which(name){ var dirs=(process.env.PATH||'').split(path.delimiter); for(var i=0;i<dirs.length;i++){ var p=path.join(dirs[i],name); try{ fs.accessSync(p,fs.constants.X_OK); if(fs.statSync(p).isFile())return p; }catch(e){} } return null; }
var claude=process.env.CLAUDE_BIN||which('claude');
if(!claude||!fs.existsSync(claude))cannot('no claude on the PATH (set CLAUDE_BIN)');
claude=fs.realpathSync(claude);
var head=Buffer.alloc(200), fd=fs.openSync(claude,'r'); fs.readSync(fd,head,0,200,0); fs.closeSync(fd);
if(head.slice(0,2).toString()==='#!'&&/node/.test(head.toString('utf8').split('\n')[0]))cannot('this Claude Code is started by node ('+claude+'), so a PATH with no node cannot start it');
SYSTEM_PATH.split(':').forEach(function(d){ if(fs.existsSync(path.join(d,'node')))cannot('a system folder holds node ('+path.join(d,'node')+'), so this proof cannot make a PATH without it'); });
var ver=cp.spawnSync(claude,['--version'],{encoding:'utf8',env:Object.assign({},process.env,{PATH:SYSTEM_PATH})});
if(ver.status!==0)cannot('Claude Code does not start on a PATH of the system folders alone ('+claude+'): '+String(ver.stderr||ver.error).slice(0,300));
var version=(ver.stdout.match(/\d+\.\d+\.\d+/)||[ver.stdout.trim()])[0];
var noNode=fs.readFileSync(path.join(pluginSrc,'hooks','no-node.json'),'utf8');

var tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cw-no-node-live-')));
try{
  if(/[\s"'$`\\;&|<>()#*?~]/.test(tmp)){ console.log('no_node_live: cannot run here: the temporary folder\'s path holds a character a shell reads as its own: '+tmp); process.exitCode=2; throw {skip:true}; }
  var plugin=path.join(tmp,'plugin'), proj=path.join(tmp,'proj'), dump=path.join(tmp,'calls.txt');
  fs.mkdirSync(path.join(plugin,'.claude-plugin'),{recursive:true}); fs.mkdirSync(proj);
  fs.writeFileSync(path.join(plugin,'.claude-plugin','plugin.json'),JSON.stringify({name:NAME,version:'0.0.0',description:'the live proof of Combat Writing with no Node on the PATH: the repository\'s hooks as declared'}));
  fs.cpSync(path.join(pluginSrc,'hooks'),path.join(plugin,'hooks'),{recursive:true});
  fs.cpSync(path.join(pluginSrc,'agents'),path.join(plugin,'agents'),{recursive:true});
  // The repository's hooks.json word for word, with a shell-only dump hook put first on two events.
  var hooks=JSON.parse(fs.readFileSync(path.join(pluginSrc,'hooks','hooks.json'),'utf8'));
  function dumpHook(tag){ return {hooks:[{type:'command',command:'{ echo '+tag+'; cat; echo; } >> '+dump,timeout:5}]}; }
  hooks.hooks.PreToolUse=[dumpHook('PRE')].concat(hooks.hooks.PreToolUse);
  hooks.hooks.SessionStart=[dumpHook('START')].concat(hooks.hooks.SessionStart);
  fs.writeFileSync(path.join(plugin,'hooks','hooks.json'),JSON.stringify(hooks,null,2));
  // The second session's copy: the same plugin with no SessionStart entry, so the plugin's own line is not said there.
  var pluginB=path.join(tmp,'plugin-b'), dumpB=path.join(tmp,'calls-b.txt');
  fs.cpSync(plugin,pluginB,{recursive:true});
  var hooksB=JSON.parse(fs.readFileSync(path.join(pluginSrc,'hooks','hooks.json'),'utf8')), fenceEntry=JSON.stringify(hooksB.hooks.PreToolUse);
  delete hooksB.hooks.SessionStart;
  hooksB.hooks.PreToolUse=[{hooks:[{type:'command',command:'{ echo PRE; cat; echo; } >> '+dumpB,timeout:5}]}].concat(hooksB.hooks.PreToolUse);
  fs.writeFileSync(path.join(pluginB,'hooks','hooks.json'),JSON.stringify(hooksB,null,2));
  check(JSON.stringify(hooksB.hooks.PreToolUse.slice(1))===fenceEntry&&!hooksB.hooks.SessionStart,'the proof\'s own ground: the second session\'s plugin must carry the fence\'s entry word for word and no SessionStart entry');

  // The scratch project: a file to read, and a real run with one packet, built by this test's own Node.
  var scripts=path.join(pluginSrc,'scripts');
  function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
  var MARK='NOTES-MARKER-'+Math.random().toString(36).slice(2,10).toUpperCase(), WROTE='WRITTEN-'+Math.random().toString(36).slice(2,10).toUpperCase(), SAID='SHELL-'+Math.random().toString(36).slice(2,10).toUpperCase();
  var notes=path.join(proj,'notes.txt'), out=path.join(proj,'out.txt');
  fs.writeFileSync(notes,'A note of the person\'s own. '+MARK+'\n');
  fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company. It is cheap.\n\nYours.\n');
  var run=node('new-run.js',['--draft','draft.md','--name','live','--stage','sparring','--session-model','live proof']).stdout.trim();
  node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-1']);
  var packet=path.join(run,'rounds','01-sparring','seat-1.packet.md'), answer=path.join(run,'rounds','01-sparring','seat-1.answer.md');
  if(!run||!fs.existsSync(packet)){ console.log('FAIL the scratch run could not be built with the repository\'s scripts, so there is nothing to prove'); process.exitCode=1; throw {skip:true}; }

  var task='Packet: '+packet+'\nAnswer file: '+answer+'\nRead the packet, write your answer to the answer file, reply with one line.';
  var prompt='Measurement task, do exactly these three steps in order and nothing else, and go on to the next step whatever a step returns. (1) Use the Read tool on '+notes+'. (2) Use the Write tool to write the single line '+WROTE+' to '+out+'. (3) Use the Bash tool to run: echo '+SAID+'. Then print what each step returned, numbered, word for word, any refusal included, and stop.';
  var promptB='Measurement task, one step and nothing else. Make one call of the agent tool: subagent_type "cw:seat", description "seat-1", run_in_background false, no model, and this prompt, character for character:\n\n'+task+'\n\nThen print what the call returned, word for word, any refusal included, and stop. Make the call even if you expect it to be refused: the refusal is what is being measured.';
  var childEnv=Object.assign({},process.env,{PATH:SYSTEM_PATH}); delete childEnv.CLAUDE_PLUGIN_DATA; delete childEnv.CLAUDE_PLUGIN_ROOT;
  var probe=cp.spawnSync('/bin/sh',['-c','command -v node'],{encoding:'utf8',env:childEnv});
  check(probe.status!==0,'the PATH the child is given must hold no node; `command -v node` found '+String(probe.stdout).trim());
  var child=cp.spawnSync(claude,['-p','--setting-sources','project','--plugin-dir',plugin,'--strict-mcp-config','--allowedTools','Read,Write,Bash,Agent,Task','--output-format','stream-json','--verbose','--include-hook-events',prompt],{cwd:proj,env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:240000,killSignal:'SIGKILL',maxBuffer:64*1024*1024});
  var raw=String(child.stdout||''), events=[]; raw.split('\n').forEach(function(l){ if(!l.trim())return; try{ events.push(JSON.parse(l)); }catch(e){} });
  check(child.status===0,'the child session failed: exit '+child.status+' '+String(child.stderr||child.error||'').slice(0,400));
  var init=events.filter(function(e){ return e&&e.type==='system'&&e.subtype==='init'; })[0];
  var names=init&&Array.isArray(init.plugins)?init.plugins.map(function(p){ return p&&p.name; }):null;
  check(!!names&&names.filter(function(n){ return n===NAME; }).length===1,'the throwaway plugin did not load in the child (plugins: '+JSON.stringify(names)+')');
  var result=events.filter(function(e){ return e&&e.type==='result'; })[0], reply=String(result&&result.result||'');
  // Nothing of the person's own work was stopped.
  check(reply.indexOf(MARK)>=0,'the person\'s own Read did not go through: the file\'s marker is not in the reply; reply: '+reply.slice(0,600));
  check(fs.existsSync(out)&&fs.readFileSync(out,'utf8').indexOf(WROTE)>=0,'the person\'s own Write did not go through: '+out+' was not written; reply: '+reply.slice(0,600));
  check(reply.indexOf(SAID)>=0,'the person\'s own shell command did not go through: its word is not in the reply; reply: '+reply.slice(0,600));
  var calls=fs.existsSync(dump)?fs.readFileSync(dump,'utf8'):'';
  check(!/node: (?:command )?not found|node: No such file/.test(raw),'a line of the session says a hook\'s node was not found; with no Node the hooks must end quietly: '+((/[^\n"]{0,120}node: (?:command )?not found[^\n"]{0,80}/.exec(raw)||[''])[0]));
  // The reader is not started: the second session, in which nothing tells the model to hold the start back.
  var FENCE_WORDS='the fence that holds a fresh reader cannot run';
  check(noNode.indexOf(FENCE_WORDS)<0&&fenceEntry.indexOf(FENCE_WORDS)>0,'the proof\'s own ground: the words the refusal is known by must be in the fence\'s command and not in the session line');
  var childB=cp.spawnSync(claude,['-p','--setting-sources','project','--plugin-dir',pluginB,'--strict-mcp-config','--allowedTools','Read,Write,Bash,Agent,Task','--output-format','stream-json','--verbose','--include-hook-events',promptB],{cwd:proj,env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:240000,killSignal:'SIGKILL',maxBuffer:64*1024*1024});
  var rawB=String(childB.stdout||''), eventsB=[]; rawB.split('\n').forEach(function(l){ if(!l.trim())return; try{ eventsB.push(JSON.parse(l)); }catch(e){} });
  check(childB.status===0,'the second child session failed: exit '+childB.status+' '+String(childB.stderr||childB.error||'').slice(0,400));
  var initB=eventsB.filter(function(e){ return e&&e.type==='system'&&e.subtype==='init'; })[0], namesB=initB&&Array.isArray(initB.plugins)?initB.plugins.map(function(p){ return p&&p.name; }):null;
  check(!!namesB&&namesB.filter(function(n){ return n===NAME; }).length===1,'the throwaway plugin did not load in the second child (plugins: '+JSON.stringify(namesB)+')');
  var replyB=String((eventsB.filter(function(e){ return e&&e.type==='result'; })[0]||{}).result||''), callsB=fs.existsSync(dumpB)?fs.readFileSync(dumpB,'utf8'):'';
  var attempted=/"subagent_type"\s*:\s*"cw:seat"/.test(callsB);
  check(attempted,'the start of the reader never reached the hooks, so its refusal is not proved; the hooks were handed: '+callsB.slice(0,400).replace(/\n/g,' | ')+'; reply: '+replyB.slice(0,400));
  check(attempted&&rawB.indexOf(FENCE_WORDS)>=0,'the start of the reader was not refused in the fence\'s own words ("'+FENCE_WORDS+'"); reply: '+replyB.slice(0,800));
  check(!fs.existsSync(answer)&&!/"agent_type"\s*:\s*"cw:seat"/.test(callsB)&&!/"agent_type"\s*:\s*"cw:seat"/.test(calls),'a reader ran with no fence: its answer file was written, or a call of its own reached the hooks');
  check(!/node: (?:command )?not found|node: No such file/.test(rawB),'a line of the second session says a hook\'s node was not found: '+((/[^\n"]{0,120}node: (?:command )?not found[^\n"]{0,80}/.exec(rawB)||[''])[0]));
  // The session start.
  var startAnswers=events.filter(function(e){ return e&&e.type==='system'&&e.subtype==='hook_response'&&e.hook_event==='SessionStart'&&typeof e.stdout==='string'&&e.stdout.trim(); }).map(function(e){ return e.stdout; });
  var mine=startAnswers.filter(function(s){ return s.indexOf('Combat Writing')>=0; });
  if(mine.length)check(mine[0].trim()===noNode.trim(),'the session start\'s answer must be hooks/no-node.json; got '+JSON.stringify(mine[0].slice(0,300)));
  facts.push('the session start\'s answer '+(mine.length?'reached the event stream, and is hooks/no-node.json':'was not seen in the event stream ('+(/^START$/m.test(calls)?'the hook was run':'no SessionStart hook was run in this kind of session')+')'));
}catch(e){
  if(!e||!e.skip)failures.push('the proof stopped on an error of its own: '+(e&&e.stack||e));
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
if(process.exitCode===2)process.exit(2);
failures.forEach(function(f){console.log('FAIL '+f);});
facts.forEach(function(f){console.log('measured: '+f);});
console.log((failures.length?'no_node_live: '+failures.length+' failure(s), ':'no_node_live: passed, ')+passes+' checks, on Claude Code '+version);
process.exit(failures.length||process.exitCode===1?1:0);
