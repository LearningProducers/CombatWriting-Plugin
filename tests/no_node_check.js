// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// no_node_check.js: what the plugin's hooks do on a machine with no Node on the PATH (issue 255).
// The plugin's hooks are Node scripts. Before this test's rule, the seat fence ran before every
// tool call and stopped the call when it could not run, so with no Node every tool call of the
// person's session was refused. The rule now: with no Node nothing of the person's own work is
// stopped; only the plugin's own reader is, at its start and at each of its calls; and the
// session start says in plain words that Node is missing.
//
// Runs every command of hooks/hooks.json the way the host does on macOS and Linux, `sh -c`, with
// ${CLAUDE_PLUGIN_ROOT} put in, three times: on a PATH that holds `grep` and `cat` and no `node`,
// on a PATH whose `node` cannot run (a version manager's shim with no version set, exit 126:
// found by the second fresh read of issue 255), and on the PATH this test runs on. The hook inputs are the shapes read from a real session.
//
// What it pins:
//   - hooks.json: the fence's entry is matched to `Read|Write|Agent|Task`, the two tools the seat
//     agent declares (agents/seat.md, `tools: Read, Write`) and the two names of the tool that
//     starts an agent (START_TOOLS in hooks/seat-scope.js); it keeps onFailure "block". No
//     command holds a substitution, a variable other than ${CLAUDE_PLUGIN_ROOT} (the shell's own
//     `$?` among them), a wildcard character or a bracket, a pipe to a shell, or a program other
//     than node, grep and cat: the directory's checklist stops a hook command that holds another
//     variable, a substitution, a wildcard or an inline program.
//   - With no Node, the session start: exit 0, one JSON object, the same bytes as
//     hooks/no-node.json: a systemMessage for the person that names Node, and the same fact as
//     context for the host.
//   - With no Node, the fence: the person's own Read, Write and agent start pass (exit 0, no
//     word), also a Write whose text holds the reader's name; the reader's start, by either name
//     and with a space after the colon, and the reader's own Read and Write are refused (exit 2,
//     a line on stderr that names Node). With no grep either, the call is refused: what cannot be
//     judged does not pass.
//   - With no Node, the two result hooks: exit 0, no word, so no error line follows a command.
//   - With Node, each command runs its script: the session start hands the ready line, the fence
//     refuses a reader's Grep in the script's own words and passes the person's Read, the result
//     hook is silent on a command that ran no script.
//
// macOS and Linux; on Windows the host runs a hook's command in Git Bash, and this test skips.
// Run from the repo root:   node tests/no_node_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..'), plugin=path.join(root,'plugins','combat-writing');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
if(process.platform==='win32'){ console.log('no_node_check: skipped on Windows (the commands are run through sh)'); process.exit(0); }

var hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks','hooks.json'),'utf8')).hooks;
function entries(ev){ return hooks[ev]||[]; }
function commandOf(ev,re){ var hit=null; entries(ev).forEach(function(en){ (en.hooks||[]).forEach(function(h){ if(re.test(String(h.command))&&hit===null)hit={entry:en,hook:h}; }); }); return hit; }
var start=commandOf('SessionStart',/session-start\.js/), fence=commandOf('PreToolUse',/seat-scope\.js/);
var results=[]; entries('PostToolUse').forEach(function(en){ (en.hooks||[]).forEach(function(h){ results.push({entry:en,hook:h}); }); });
check(!!start&&!!fence&&results.length>=1,'hooks.json: expected a SessionStart command on session-start.js, a PreToolUse command on seat-scope.js and at least one PostToolUse command');

// The declaration: the matcher is the seat's two tools and the agent tool's two names; the failure rule stays.
var seatMd=fs.readFileSync(path.join(plugin,'agents','seat.md'),'utf8');
var seatTools=((/^tools:\s*(.+)$/m.exec(seatMd)||[])[1]||'').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
var scopeSrc=fs.readFileSync(path.join(plugin,'hooks','seat-scope.js'),'utf8');
var startTools=[]; try{ startTools=JSON.parse(((/^var START_TOOLS=(\[[^\]]*\]);$/m.exec(scopeSrc)||[])[1]||'[]').replace(/'/g,'"')); }catch(e){}
check(seatTools.join(',')==='Read,Write','agents/seat.md: the seat declares the tools Read and Write alone, the wall for every other tool; found '+JSON.stringify(seatTools));
check(startTools.length===2,'seat-scope.js: START_TOOLS names the two names of the tool that starts an agent; found '+JSON.stringify(startTools));
check(!!fence&&fence.entry.matcher===seatTools.concat(startTools).join('|'),'hooks.json: the fence\'s entry must be matched to the seat\'s two tools and the agent tool\'s two names, "'+seatTools.concat(startTools).join('|')+'", so it runs on no other call of the person\'s; got '+JSON.stringify(fence&&fence.entry.matcher));
check(!!fence&&fence.hook.onFailure==='block','hooks.json: the fence keeps onFailure "block": a fence that starts and fails still stops the call');
[start,fence].concat(results).filter(Boolean).forEach(function(c){
  var cmd=String(c.hook.command), bare=cmd.split('${CLAUDE_PLUGIN_ROOT}').join('');
  check(!/\$|`|[*?\[\]{}~]|\bcurl\b|\bwget\b|\beval\b|\b(?:sh|bash|python3?|node) -[ce]\b|\|\s*(sh|bash)\b|>\s*[^&\s\/]/.test(bare),'hooks.json: a hook command holds a variable other than ${CLAUDE_PLUGIN_ROOT}, a substitution, a wildcard character or a bracket, an inline program, a fetch, an eval, a pipe to a shell or a write to a file: '+cmd);
  var programs=bare.replace(/'[^']*'/g,' ').replace(/"[^"]*"/g,' ').split(/;|&&|\|\|/).map(function(st){ st=st.trim(); while(/^(?:if|then|else|!)\s+/.test(st))st=st.replace(/^(?:if|then|else|!)\s+/,''); return st.split(/\s+/)[0]; }).filter(Boolean);
  var allowed=['command','node','grep','cat','echo','exit','fi'];
  check(programs.every(function(p){ return allowed.indexOf(p)>=0; }),'hooks.json: a hook command starts something other than node, grep and cat (and the shell\'s own words): '+JSON.stringify(programs)+' in '+cmd);
});

// The two PATHs.
function which(name){ var dirs=(process.env.PATH||'').split(path.delimiter); for(var i=0;i<dirs.length;i++){ var p=path.join(dirs[i],name); try{ fs.accessSync(p,fs.constants.X_OK); if(fs.statSync(p).isFile())return p; }catch(e){} } return null; }
var sh=fs.existsSync('/bin/sh')?'/bin/sh':which('sh');
var tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cw-no-node-')));
try{
  var tools=path.join(tmp,'tools'), bare=path.join(tmp,'bare'); fs.mkdirSync(tools); fs.mkdirSync(bare);
  var grep=which('grep'), cat=which('cat');
  if(!sh||!grep||!cat){ failures.push('this machine has no sh, grep or cat on the PATH, so the commands cannot be run: sh '+sh+', grep '+grep+', cat '+cat); throw {skip:true}; }
  fs.symlinkSync(grep,path.join(tools,'grep')); fs.symlinkSync(cat,path.join(tools,'cat')); fs.symlinkSync(cat,path.join(bare,'cat'));
  var data=path.join(tmp,'data'); fs.mkdirSync(data); fs.writeFileSync(path.join(data,'first-session'),'{}\n');
  function runCmd(c,input,PATH){
    var cmd=String(c.hook.command).split('${CLAUDE_PLUGIN_ROOT}').join(plugin);
    var r=cp.spawnSync(sh,['-c',cmd],{input:typeof input==='string'?input:JSON.stringify(input),encoding:'utf8',cwd:tmp,timeout:30000,env:{PATH:PATH,HOME:tmp,CLAUDE_PLUGIN_ROOT:plugin,CLAUDE_PLUGIN_DATA:data}});
    return {status:r.status,out:String(r.stdout||''),err:String(r.stderr||'')};
  }
  var probe=cp.spawnSync(sh,['-c','command -v node'],{encoding:'utf8',env:{PATH:tools}});
  check(probe.status!==0,'the test\'s own ground: the tools folder must hold no node; `command -v node` found '+String(probe.stdout).trim());

  // The inputs, as a real session hands them (session 2026-11-24, the keys read from a dump).
  var base={session_id:'s',transcript_path:path.join(tmp,'t.jsonl'),cwd:tmp,permission_mode:'default',hook_event_name:'PreToolUse',tool_use_id:'toolu_x'};
  function pre(tool,toolInput,extra){ return Object.assign({},base,{tool_name:tool,tool_input:toolInput},extra||{}); }
  var mineRead=pre('Read',{file_path:path.join(tmp,'notes.md')});
  var mineWrite=pre('Write',{file_path:path.join(tmp,'notes.md'),content:'A note that says "agent_type":"cw:seat" and "subagent_type": "seat" in its own words.\n'});
  var mineStart=pre('Agent',{description:'look',prompt:'Find the file.',subagent_type:'Explore'});
  var seatStart=pre('Agent',{description:'seat-1',prompt:'Packet: /x/rounds/01-sparring/seat-1.packet.md\nAnswer file: /x/rounds/01-sparring/seat-1.answer.md',subagent_type:'cw:seat',run_in_background:true});
  var seatStartPlain=pre('Task',{description:'seat-1',prompt:'Packet: /x',subagent_type:'seat'});
  var seatRead=pre('Read',{file_path:'/x/rounds/01-sparring/seat-1.packet.md'},{agent_id:'a1',agent_type:'cw:seat'});
  var seatWrite=pre('Write',{file_path:'/x/rounds/01-sparring/seat-1.answer.md',content:'RATING: 8/10\n'},{agent_id:'a1',agent_type:'cw:seat'});
  var seatGrep=pre('Grep',{pattern:'x'},{agent_id:'a1',agent_type:'cw:seat'});
  var spaced=JSON.stringify(seatStart).replace('"subagent_type":"cw:seat"','"subagent_type" : "cw:seat"');

  // With no Node: the session start.
  var noNode=null; try{ noNode=fs.readFileSync(path.join(plugin,'hooks','no-node.json'),'utf8'); }catch(e){}
  check(noNode!==null,'hooks/no-node.json: the line the session start gives with no Node must be a file of the plugin');
  var s0=runCmd(start,{hook_event_name:'SessionStart',source:'startup'},tools), j0=null; try{ j0=JSON.parse(s0.out); }catch(e){}
  check(s0.status===0&&s0.err===''&&!!j0&&typeof j0.systemMessage==='string'&&/\bNode\b/.test(j0.systemMessage)&&/PATH/.test(j0.systemMessage),'no Node, the session start: exit 0 and one JSON object whose systemMessage tells the person Node is not on the PATH; got exit '+s0.status+' out '+JSON.stringify(s0.out.slice(0,200))+' err '+JSON.stringify(s0.err.slice(0,200)));
  check(!!j0&&!!j0.hookSpecificOutput&&j0.hookSpecificOutput.hookEventName==='SessionStart'&&/\bNode\b/.test(String(j0.hookSpecificOutput.additionalContext)),'no Node, the session start: the host is handed the same fact as context; got '+JSON.stringify(j0&&j0.hookSpecificOutput));
  check(noNode!==null&&s0.out===noNode,'no Node, the session start: the output must be hooks/no-node.json, byte for byte');
  check(!!j0&&/your own work is not stopped/i.test(j0.systemMessage)&&/named exactly seat/.test(j0.systemMessage)&&/no grep/.test(j0.systemMessage)&&/does not run/.test(j0.systemMessage)&&!/https?:\/\//.test(noNode||''),'hooks/no-node.json: the line says the person\'s own work is not stopped, names the two cases where a call of theirs is (an agent named exactly seat; a machine with no grep), covers a node that does not run, and holds no address; it reads: '+JSON.stringify(j0&&j0.systemMessage));

  // With no Node: the fence.
  function passes_(name,input){ var r=runCmd(fence,input,tools); check(r.status===0&&r.out===''&&r.err==='','no Node, the fence: '+name+' must pass with no word; got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,160))+' err '+JSON.stringify(r.err.slice(0,160))); }
  function refused(name,input,PATH){ var r=runCmd(fence,input,PATH||tools), last=r.err.trim().split('\n').pop(); check(r.status===2&&r.out===''&&/\bNode\b/.test(last)&&/^Combat Writing: /.test(last)&&r.err.trim().split('\n').length===1,'no Node, the fence: '+name+' must be refused, exit 2 and one line on stderr that names Node; got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,160))+' err '+JSON.stringify(r.err.slice(0,200))); }
  passes_('the person\'s own Read',mineRead);
  passes_('the person\'s own Write, its text holding the reader\'s name',mineWrite);
  passes_('the person\'s own start of another agent',mineStart);
  refused('the start of the plugin\'s reader',seatStart);
  refused('the start of the plugin\'s reader by its plain name, the tool named Task',seatStartPlain);
  refused('the start of the plugin\'s reader with a space after the colon',spaced);
  refused('the reader\'s own Read',seatRead);
  refused('the reader\'s own Write',seatWrite);
  refused('any call when there is no grep either: what cannot be judged does not pass',mineRead,bare);

  // With no Node: the result hooks say nothing, so no error line follows the person's command.
  var post={session_id:'s',transcript_path:path.join(tmp,'t.jsonl'),cwd:tmp,hook_event_name:'PostToolUse',tool_name:'Bash',tool_input:{command:'ls'},tool_response:{stdout:'x\n',stderr:''},tool_use_id:'toolu_x'};
  results.forEach(function(c){ var r=runCmd(c,post,tools); check(r.status===0&&r.out===''&&r.err==='','no Node, the result hook ('+c.entry.matcher+'): exit 0 and no word; got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,160))+' err '+JSON.stringify(r.err.slice(0,160))); });

  // A node that is on the PATH and cannot run: the same as none. The stand-in is what a version manager's shim does with no version set.
  var shim=path.join(tmp,'shim'); fs.mkdirSync(shim);
  fs.writeFileSync(path.join(shim,'node'),'#!/bin/sh\necho "No version is set for command node" >&2\nexit 126\n'); fs.chmodSync(path.join(shim,'node'),0o755);
  var broken=shim+path.delimiter+tools;
  var found=cp.spawnSync(sh,['-c','command -v node'],{encoding:'utf8',env:{PATH:broken}});
  check(found.status===0,'the test\'s own ground: the stand-in node must be found on the PATH (it is the node that cannot run)');
  var b1=runCmd(fence,mineRead,broken);
  check(b1.status===0&&b1.out===''&&b1.err==='','a node that cannot run, the fence: the person\'s own Read must pass with no word; got exit '+b1.status+' out '+JSON.stringify(b1.out.slice(0,120))+' err '+JSON.stringify(b1.err.slice(0,160)));
  var b2=runCmd(fence,seatStart,broken);
  check(b2.status===2&&/^Combat Writing: /.test(b2.err.trim())&&b2.err.trim().split('\n').length===1,'a node that cannot run, the fence: the start of the plugin\'s reader must be refused, exit 2 and the one line; got exit '+b2.status+' err '+JSON.stringify(b2.err.slice(0,200)));
  var b3=runCmd(start,{hook_event_name:'SessionStart',source:'startup'},broken);
  check(b3.status===0&&b3.err===''&&noNode!==null&&b3.out===noNode,'a node that cannot run, the session start: hooks/no-node.json and nothing on stderr; got exit '+b3.status+' out '+JSON.stringify(b3.out.slice(0,120))+' err '+JSON.stringify(b3.err.slice(0,160)));
  results.forEach(function(c){ var r=runCmd(c,post,broken); check(r.status===0&&r.out===''&&r.err==='','a node that cannot run, the result hook ('+c.entry.matcher+'): exit 0 and no word; got exit '+r.status+' err '+JSON.stringify(r.err.slice(0,160))); });

  // With Node: each command runs its script.
  var full=path.dirname(process.execPath)+path.delimiter+tools;
  var s1=runCmd(start,{hook_event_name:'SessionStart',source:'startup'},full), j1=null; try{ j1=JSON.parse(s1.out); }catch(e){}
  check(s1.status===0&&!!j1&&!('systemMessage' in j1)&&j1.hookSpecificOutput&&/^Combat Writing ready\./.test(String(j1.hookSpecificOutput.additionalContext)),'with Node, the session start: the script\'s own ready line as context and no message on the screen; got exit '+s1.status+' out '+JSON.stringify(s1.out.slice(0,200))+' err '+JSON.stringify(s1.err.slice(0,200)));
  var f1=runCmd(fence,mineRead,full);
  check(f1.status===0&&f1.out===''&&f1.err==='','with Node, the fence: the person\'s own Read passes with no word; got exit '+f1.status+' '+JSON.stringify(f1.out.slice(0,160))+JSON.stringify(f1.err.slice(0,160)));
  var f2=runCmd(fence,seatGrep,full), j2=null; try{ j2=JSON.parse(f2.out); }catch(e){}
  check(f2.status===0&&!!j2&&j2.hookSpecificOutput&&j2.hookSpecificOutput.permissionDecision==='deny','with Node, the fence: the script judges, and a reader\'s Grep is refused in its own words; got exit '+f2.status+' out '+JSON.stringify(f2.out.slice(0,200))+' err '+JSON.stringify(f2.err.slice(0,160)));
  results.forEach(function(c){ var r=runCmd(c,post,full); check(r.status===0&&r.out===''&&r.err==='','with Node, the result hook ('+c.entry.matcher+'): silent on a command that ran no script; got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,160))+' err '+JSON.stringify(r.err.slice(0,160))); });
}catch(e){
  if(!e||!e.skip)failures.push('the test stopped on an error of its own: '+(e&&e.stack||e));
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'no_node_check: '+failures.length+' failure(s), ':'no_node_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
