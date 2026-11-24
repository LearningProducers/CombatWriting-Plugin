// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// start_model_live.js: the live proof of the measured model (issue 255). Not part of CI: it needs
// a running Claude Code on this machine (the `claude` binary, or CLAUDE_BIN) and spends two short
// model calls. Run it after a Claude Code update, before trusting the measurement on that
// version; it prints the version it passed on, and the STARTED_READ_ON constant at the top of
// plugins/combat-writing/hooks/show-result.js is the one home of that number: move it after a pass.
//
// Why it exists: the harness (tests/show_result_check.js) proves the hook given the input it
// expects. Only a real session proves that the host hands a PostToolUse hook the start of an
// agent with the model it resolved for it (tool_response.resolvedModel), which is all the hook
// has: it opens no transcript.
//
// What it does: a throwaway plugin in a temporary folder, named `cw` so that its agent is
// `cw:seat`, carries the repository's agents/seat.md, the repository's hooks/show-result.js under
// the repository's own PostToolUse entry on the tool that starts an agent, word for word, and
// one dump hook before it that records what such a hook is handed. A scratch project gets a
// real run and one packet through the repository's own scripts. A child `claude -p --plugin-dir`
// session starts one cw:seat agent in the background on that packet, as the skills do. The
// child loads project settings alone (--setting-sources project) and no MCP server, so a copy
// of the plugin installed on this machine stays out of it and one hook answers, the one under
// test. No fence is loaded: the reader's reach is tests/seat_scope_live.js's proof.
//
// What it asserts: the child ran; the throwaway plugin loaded and no second plugin named cw
// beside it; the dump hook was handed a PostToolUse event for the tool that starts an agent,
// the reader's type `cw:seat`, the task as a string that opens with the Packet line, and a
// resolved model that is a model id; the run's log holds exactly one seat.model line, for
// seat-1 and the round, marked at start and by hook, its model the very id the host handed,
// and nothing passed. The scratch folder is deleted after; the plugin's data folder is the
// host's and is left as it is.
//
// Run it from a plain terminal; inside a sandboxed shell the host may be unable to make the
// plugin's data folder and then fails the hook before it starts.
//
// Run from the repo root:   node tests/start_model_live.js      (CLAUDE_BIN=<path> to pick a binary)
// Exit 0 on pass; exit 1 on any failure; exit 2 when Claude Code cannot be run here.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var repo=path.join(__dirname,'..');
var pluginSrc=path.join(repo,'plugins','combat-writing');
var hookSrc=path.join(pluginSrc,'hooks','show-result.js');
var claude=process.env.CLAUDE_BIN||'claude';
var NAME='cw';
var failures=[], passes=0, facts=[];
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

var readOn=(/^var STARTED_READ_ON='([^']+)';$/m.exec(fs.readFileSync(hookSrc,'utf8'))||[])[1];
var idRe=new RegExp(((/^var MODEL_ID_RE=\/(.*)\/;$/m.exec(fs.readFileSync(hookSrc,'utf8'))||[])[1])||'$^');
var entry=(JSON.parse(fs.readFileSync(path.join(pluginSrc,'hooks','hooks.json'),'utf8')).hooks.PostToolUse||[]).filter(function(e){ return e.matcher==='Agent|Task'; });
if(entry.length!==1||!/show-result\.js/.test(entry[0].hooks[0].command)){ console.log('FAIL hooks.json carries no single PostToolUse entry on Agent|Task running show-result.js, so there is nothing to load: '+JSON.stringify(entry)); process.exit(1); }
var ver=cp.spawnSync(claude,['--version'],{encoding:'utf8'});
if(ver.status!==0){ console.log('start_model_live: cannot run Claude Code ('+claude+'): '+(ver.stderr||ver.error)); process.exit(2); }
var version=(ver.stdout.match(/\d+\.\d+\.\d+/)||[ver.stdout.trim()])[0];

var tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cw-start-model-live-')));
try{
  var plugin=path.join(tmp,'plugin'), proj=path.join(tmp,'proj'), dump=path.join(tmp,'starts.jsonl');
  fs.mkdirSync(path.join(plugin,'.claude-plugin'),{recursive:true}); fs.mkdirSync(path.join(plugin,'hooks')); fs.mkdirSync(path.join(plugin,'agents')); fs.mkdirSync(proj);
  fs.writeFileSync(path.join(plugin,'.claude-plugin','plugin.json'),JSON.stringify({name:NAME,version:'0.0.0',description:'the live proof of the Combat Writing measured model: loads the repository hook and records what a PostToolUse hook is handed after an agent starts'}));
  fs.copyFileSync(hookSrc,path.join(plugin,'hooks','show-result.js'));
  fs.copyFileSync(path.join(pluginSrc,'agents','seat.md'),path.join(plugin,'agents','seat.md'));
  // The dump keeps the fields the proof compares and no text of a reply.
  fs.writeFileSync(path.join(plugin,'hooks','dump.js'),"var fs=require('fs');var d='';process.stdin.on('data',function(c){d+=c;}).on('end',function(){try{var e=JSON.parse(d),ti=e.tool_input||{},tr=e.tool_response;fs.appendFileSync("+JSON.stringify(dump)+",JSON.stringify({event:e.hook_event_name,tool:e.tool_name,type:ti.subagent_type===undefined?null:ti.subagent_type,prompt:typeof ti.prompt==='string'?ti.prompt.slice(0,2000):null,passed:ti.model===undefined?null:ti.model,background:ti.run_in_background===true,response:tr&&typeof tr==='object'?Object.keys(tr):typeof tr,resolved:tr&&typeof tr==='object'?tr.resolvedModel:undefined,cwd:typeof e.cwd})+'\\n');}catch(x){}process.exit(0);});");
  // The dump hook first, then the repository's entry word for word.
  fs.writeFileSync(path.join(plugin,'hooks','hooks.json'),JSON.stringify({hooks:{PostToolUse:[{matcher:entry[0].matcher,hooks:[{type:'command',command:'node "${CLAUDE_PLUGIN_ROOT}/hooks/dump.js"',timeout:5}]}].concat(entry)}},null,2));

  // The scratch project: a real run and one packet, by the repository's scripts.
  var scripts=path.join(pluginSrc,'scripts');
  function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
  fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company. It is cheap.\n\nYours.\n');
  var run=node('new-run.js',['--draft','draft.md','--name','live','--stage','sparring','--session-model','live proof']).stdout.trim();
  node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-1']);
  var packet=path.join(run,'rounds','01-sparring','seat-1.packet.md'), answer=path.join(run,'rounds','01-sparring','seat-1.answer.md');
  if(!run||!fs.existsSync(packet)){ console.log('FAIL the scratch run could not be built with the repository\'s scripts (no packet in '+JSON.stringify(run)+'), so there is nothing to prove'); process.exitCode=1; throw {skip:true}; }

  var task='Packet: '+packet+'\nAnswer file: '+answer+'\nRead the packet, write your answer to the answer file, reply with one line.';
  var prompt='Measurement task, do exactly this and nothing else. Make one call of the agent tool: subagent_type "cw:seat", description "seat-1", run_in_background true, no model, and this prompt, character for character:\n\n'+task+'\n\nWhen you are told the agent has finished, reply with the single word done and stop. Make no other tool call.';
  var childEnv=Object.assign({},process.env); delete childEnv.CLAUDE_PLUGIN_DATA; delete childEnv.CLAUDE_PLUGIN_ROOT;
  var child=cp.spawnSync(claude,['-p','--setting-sources','project','--plugin-dir',plugin,'--strict-mcp-config','--allowedTools','Agent,Task,Read,Write','--output-format','stream-json','--verbose','--include-hook-events',prompt],{cwd:proj,env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:240000,killSignal:'SIGKILL',maxBuffer:64*1024*1024});
  var events=[]; String(child.stdout||'').split('\n').forEach(function(l){ if(!l.trim())return; try{ events.push(JSON.parse(l)); }catch(e){} });
  check(child.status===0,'the child session failed: exit '+child.status+' '+String(child.stderr||child.error||'').slice(0,400));
  var init=events.filter(function(e){ return e&&e.type==='system'&&e.subtype==='init'; })[0];
  var names=init&&Array.isArray(init.plugins)?init.plugins.map(function(p){ return p&&p.name; }):null;
  check(!!names&&names.filter(function(n){ return n===NAME; }).length===1&&names.indexOf('combat-writing')<0,'the throwaway plugin must load in the child, and no copy of the plugin installed on this machine beside it (plugins: '+JSON.stringify(names)+')');
  var recs=fs.existsSync(dump)?fs.readFileSync(dump,'utf8').trim().split('\n').filter(Boolean).map(function(l){ return JSON.parse(l); }):[];
  var starts=recs.filter(function(r){ return r.event==='PostToolUse'&&(r.tool==='Agent'||r.tool==='Task')&&r.type==='cw:seat'; });
  check(starts.length===1,'the hook was not handed one PostToolUse event for the start of a cw:seat agent; it was handed '+JSON.stringify(recs.map(function(r){ return [r.event,r.tool,r.type]; })).slice(0,400)+'; inside a sandboxed shell the host may fail a plugin hook before it starts');
  var st=starts[0]||{};
  check(typeof st.prompt==='string'&&st.prompt.indexOf('Packet: '+packet)===0,'the start call\'s task is not a string that opens with the Packet line: '+JSON.stringify(String(st.prompt).slice(0,160)));
  check(typeof st.resolved==='string'&&idRe.test(st.resolved),'the start call returned no resolved model that is a model id (tool_response.resolvedModel): '+JSON.stringify(st.resolved)+', the fields returned: '+JSON.stringify(st.response));
  check(st.passed===null,'the child passed a model at the start, where it was asked to pass none: '+JSON.stringify(st.passed));
  facts.push('after a '+(st.background?'background':'foreground')+' start the host handed the hook the resolved model '+JSON.stringify(st.resolved)+' (the fields returned: '+(Array.isArray(st.response)?st.response.join(', '):st.response)+')');
  var lines=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){ try{ return JSON.parse(l); }catch(e){ return {}; } }).filter(function(e){ return e.event==='seat.model'; });
  check(lines.length===1,'the run\'s log must hold exactly one seat.model line, written by the hook at the start; it holds '+JSON.stringify(lines));
  var l=lines[0]||{};
  check(l.seat==='seat-1'&&l.round==='01-sparring'&&l.at==='start'&&l.by==='hook'&&l.passed===null&&l.model===st.resolved&&Object.keys(l).sort().join(',')==='at,by,event,model,passed,round,seat,ts','the line must name seat-1, the round, at start, by hook, nothing passed, the very id the host handed, and no other field; got '+JSON.stringify(l));
  facts.push('the reader\'s answer file was '+(fs.existsSync(answer)?'written':'not written by the time the child ended'));
}catch(e){
  if(!e||!e.skip)failures.push('the proof stopped on an error of its own: '+(e&&e.stack||e));
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
if(process.exitCode===2)process.exit(2);
failures.forEach(function(f){console.log('FAIL '+f);});
facts.forEach(function(f){console.log('measured: '+f);});
console.log((failures.length?'start_model_live: '+failures.length+' failure(s), ':'start_model_live: passed, ')+passes+' checks, on Claude Code '+version+' (STARTED_READ_ON in the hook: '+readOn+(failures.length||readOn===version?'':'; move the constant to '+version)+')');
process.exit(failures.length||process.exitCode===1?1:0);
