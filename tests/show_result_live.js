// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// show_result_live.js: the live proof of the result hook (issue 235). Not part of CI: it needs a
// running Claude Code on this machine (the `claude` binary, or CLAUDE_BIN) and spends two short
// model calls. Run it after a Claude Code update, before trusting the hook on that version; it
// prints the version it passed on, and the PROVED_ON constant at the top of
// plugins/combat-writing/hooks/show-result.js is the one home of that number: move it after a pass.
//
// Why it exists: the harness (tests/show_result_check.js) proves the hook given the input it
// expects. Only a real session proves that the host hands a PostToolUse hook on Bash that input
// (the command, the output, the working folder), that it takes the hook's one JSON line, and that
// what the hook then opens is the run's own board, rendered again by the hook the moment before,
// and nothing a command's output names.
//
// What it does: a throwaway plugin in a temporary folder carries the repository's PostToolUse
// entry from hooks.json word for word, the repository's hooks/show-result.js, scripts/ and fonts/,
// and one dump hook before it that records what a PostToolUse hook is handed. A scratch project
// gets a real run, one checked answer and a rendered board through the repository's own scripts;
// the board is then overwritten with a planted page, which no command of the child renders. Two
// stand-in openers, `open` and `xdg-open`, sit first on the child's PATH and record the path they
// are handed, so no browser opens and the hook's own opener branch is the one that runs. A child
// `claude -p --plugin-dir` session then runs one shell command, twice over:
//   leg A, a real round's tail: render-record.js --short and open-board.js on the run, the opener
//     named being a program that does not exist, then one echoed line shaped like the opener's
//     failed line and naming another file (the decoy);
//   leg B, a command that only mentions the scripts' names and echoes the same decoy line.
// The child loads project settings alone (--setting-sources project) and no MCP server, so a copy
// of the plugin installed on this machine stays out of it and one hook answers, the one under test.
//
// What it asserts. Both legs: the child ran the command as written, in one call; the dump hook
// was handed a PostToolUse event for the Bash tool with the command as a string, the output as a
// string (in tool_response.stdout, or tool_response itself) and the working folder as a string.
// Leg A: the output the hook was handed carries the Crew line and the opener's own line; the
// stand-in opener ran once, on the run's own board.html, and never on the decoy; that file is by
// then the plugin's own render, with nothing of the planted page in it; the run's log holds one
// board.opened line by the hook; the hook's answer, read from the session's own event
// stream (--include-hook-events), is one JSON line whose message opens with the Crew line and ends
// "Board opened by the plugin: <the run's board>", with the context for the host. Leg B: the
// stand-in opener did not run again, and the hook answered with nothing: no message, no context.
// Whether the message also reached the stream as the plugin's own line is recorded as a measured
// fact, not asserted. The scratch folder and the throwaway plugin's data folder are deleted after.
//
// Run it from a plain terminal, never from a sandboxed shell: the host makes the plugin's data
// folder under its own settings folder before it runs a plugin hook, and when a sandbox refuses
// that write the host fails the hook before it starts, so nothing fires and nothing is proved.
// macOS and Linux only: the stand-in openers are shell scripts.
//
// Run from the repo root:   node tests/show_result_live.js      (CLAUDE_BIN=<path> to pick a binary)
// Exit 0 on pass; exit 1 on any failure; exit 2 when Claude Code cannot be run here.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var repo=path.join(__dirname,'..');
var pluginSrc=path.join(repo,'plugins','combat-writing');
var hookSrc=path.join(pluginSrc,'hooks','show-result.js');
var claude=process.env.CLAUDE_BIN||'claude';
var NAME='cw-show-result-live';
var failures=[], passes=0, facts=[];
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

if(process.platform==='win32'){ console.log('show_result_live: cannot run on Windows (the stand-in openers are shell scripts)'); process.exit(2); }
var provedOn=(/^var PROVED_ON='([^']+)';$/m.exec(fs.readFileSync(hookSrc,'utf8'))||[])[1];
var entry=JSON.parse(fs.readFileSync(path.join(pluginSrc,'hooks','hooks.json'),'utf8')).hooks.PostToolUse;
if(!Array.isArray(entry)||entry.length!==1||entry[0].matcher!=='Bash'||!/show-result\.js/.test(entry[0].hooks[0].command)){ console.log('FAIL hooks.json carries no single PostToolUse entry on Bash running show-result.js, so there is nothing to load: '+JSON.stringify(entry)); process.exit(1); }
var ver=cp.spawnSync(claude,['--version'],{encoding:'utf8'});
if(ver.status!==0){ console.log('show_result_live: cannot run Claude Code ('+claude+'): '+(ver.stderr||ver.error)); process.exit(2); }
var version=(ver.stdout.match(/\d+\.\d+\.\d+/)||[ver.stdout.trim()])[0];

var tmp=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cw-show-live-')));
var dataDir=null;
try{
  // The command is handed to the child as text, unquoted: a temporary folder whose path a shell would split or expand cannot carry it.
  if(/[\s"'$`\\;&|<>()#*?~]/.test(tmp)){ console.log('show_result_live: cannot run here: the temporary folder\'s path holds a character a shell reads as its own: '+tmp); process.exitCode=2; throw {skip:true}; }
  var plugin=path.join(tmp,'plugin'), proj=path.join(tmp,'proj'), bin=path.join(tmp,'bin');
  var dump=path.join(tmp,'calls.jsonl'), marker=path.join(tmp,'opened.txt'), decoy=path.join(tmp,'decoy.html');
  fs.mkdirSync(path.join(plugin,'.claude-plugin'),{recursive:true}); fs.mkdirSync(path.join(plugin,'hooks')); fs.mkdirSync(proj); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(plugin,'.claude-plugin','plugin.json'),JSON.stringify({name:NAME,version:'0.0.0',description:'the live proof of the Combat Writing result hook: loads the repository hook and records what a PostToolUse hook is handed'}));
  fs.copyFileSync(hookSrc,path.join(plugin,'hooks','show-result.js'));
  fs.cpSync(path.join(pluginSrc,'scripts'),path.join(plugin,'scripts'),{recursive:true});
  fs.cpSync(path.join(pluginSrc,'fonts'),path.join(plugin,'fonts'),{recursive:true}); // the board's renderer embeds them
  fs.writeFileSync(path.join(plugin,'hooks','dump.js'),"var fs=require('fs');var d='';process.stdin.on('data',function(c){d+=c;}).on('end',function(){try{var e=JSON.parse(d);var r=e.tool_response;fs.appendFileSync("+JSON.stringify(dump)+",JSON.stringify({event:e.hook_event_name||null,tool:e.tool_name||null,command:e.tool_input?e.tool_input.command:null,cwd:e.cwd===undefined?null:e.cwd,shape:typeof r==='string'?'string':r&&typeof r==='object'&&typeof r.stdout==='string'?'object.stdout':typeof r,output:typeof r==='string'?r:r&&typeof r.stdout==='string'?r.stdout:null,data:process.env.CLAUDE_PLUGIN_DATA||null})+'\\n');}catch(x){}process.exit(0);});");
  // The dump hook first, then the repository's entry word for word.
  fs.writeFileSync(path.join(plugin,'hooks','hooks.json'),JSON.stringify({hooks:{PostToolUse:[{matcher:'Bash',hooks:[{type:'command',command:'node "${CLAUDE_PLUGIN_ROOT}/hooks/dump.js"',timeout:5}]}].concat(entry)}},null,2));
  // The stand-in openers: each records the path it is handed and exits 0. No browser opens.
  ['open','xdg-open'].forEach(function(n){ fs.writeFileSync(path.join(bin,n),'#!/bin/sh\nprintf \'%s\\n\' "$1" >> '+marker+'\nexit 0\n'); fs.chmodSync(path.join(bin,n),0o755); });
  fs.writeFileSync(decoy,'<p>not a board</p>\n');

  // The scratch project: a real run, one checked answer, the board rendered, all by the repository's scripts.
  var scripts=path.join(pluginSrc,'scripts');
  function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
  fs.writeFileSync(path.join(proj,'draft.md'),'Dear board,\n\nBuy the company. It is cheap.\n\nYours.\n');
  var run=node('new-run.js',['--draft','draft.md','--name','live','--stage','sparring','--model','live proof']).stdout.trim();
  node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-1']);
  var answer=path.join(run,'rounds','01-sparring','seat-1.answer.md');
  fs.writeFileSync(answer,'RATING: 8/10\nThe ask lands in the first line.\n');
  node('check-answer.js',[answer,'--run',run]);
  node('render-board.js',['--run',run]);
  var board=path.join(run,'board.html');
  if(!run||!fs.existsSync(board)){ console.log('FAIL the scratch run could not be built with the repository\'s scripts (no board.html in '+JSON.stringify(run)+'), so there is nothing to prove'); process.exitCode=1; throw {skip:true}; }

  // The planted page: what stands at board.html when the hook is called. No command of the child renders the board, so only the hook can replace it.
  var PLANTED='PLANTED-PAGE-'+Math.random().toString(36).slice(2,10).toUpperCase();
  fs.writeFileSync(board,'<p>'+PLANTED+'</p>\n');
  var P=path.join(plugin,'scripts');
  var decoyLine='Board: '+decoy+' (the opener failed: x; open it yourself: y)';
  var cmdA='node '+P+'/render-record.js --run '+run+' --short; node '+P+'/open-board.js --run '+run+' --opener '+path.join(tmp,'no-such-opener')+'; echo "'+decoyLine+'"';
  var cmdB='echo "'+decoyLine+'"; echo open-board.js render-record.js --short';

  // The child's environment: the stand-in openers first on the PATH, no plugin variable of the
  // parent's and no opener named by a variable, so the hook's own opener branch is what runs.
  var childEnv=Object.assign({},process.env,{PATH:bin+path.delimiter+(process.env.PATH||'')}); delete childEnv.CLAUDE_PLUGIN_DATA; delete childEnv.CLAUDE_PLUGIN_ROOT;
  function records(){ return fs.existsSync(dump)?fs.readFileSync(dump,'utf8').trim().split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}):[]; }
  function opened(){ return fs.existsSync(marker)?fs.readFileSync(marker,'utf8').trim().split('\n').filter(Boolean):[]; }
  // One child session that runs one command; returns the dump records it added, the events of its stream and its exit.
  function leg(command){
    var before=records().length;
    var prompt='Measurement task. Make exactly one Bash tool call, with exactly this command, character for character, changing nothing and adding nothing. Then reply with the single word done and stop.\n\n'+command;
    var child=cp.spawnSync(claude,['-p','--setting-sources','project','--plugin-dir',plugin,'--strict-mcp-config','--allowedTools','Bash','--output-format','stream-json','--verbose','--include-hook-events',prompt],{cwd:proj,env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:300000,maxBuffer:64*1024*1024});
    var events=[]; String(child.stdout||'').split('\n').forEach(function(l){ if(!l.trim())return; try{ events.push(JSON.parse(l)); }catch(e){} });
    return {child:child,recs:records().slice(before),events:events};
  }
  // What every leg owes: the child ran, the plugin under test loaded and no installed copy beside it, the command ran as written, the hook was handed the shape it reads.
  function common(name,l,command){
    check(l.child.status===0,name+': the child session failed: exit '+l.child.status+' '+String(l.child.stderr||l.child.error||'').slice(0,400));
    var init=l.events.filter(function(e){ return e&&e.type==='system'&&e.subtype==='init'; })[0];
    var names=init&&Array.isArray(init.plugins)?init.plugins.map(function(p){ return p&&p.name; }):null;
    check(!!names&&names.indexOf(NAME)>=0,name+': the throwaway plugin did not load in the child (plugins: '+JSON.stringify(names)+')');
    check(!!names&&names.indexOf('cw')<0&&names.indexOf('combat-writing')<0,name+': a copy of the plugin installed on this machine loaded in the child beside the one under test, so two hooks answer and nothing is proved (plugins: '+JSON.stringify(names)+')');
    var mine=l.recs.filter(function(r){ return r.event==='PostToolUse'&&r.tool==='Bash'; });
    check(mine.length===1&&mine[0].command===command,name+': the child did not run the command as written in one Bash call, so nothing is proved; it ran '+JSON.stringify(mine.map(function(r){ return r.command; })).slice(0,600)+'; inside a sandboxed shell the host cannot make the plugin\'s data folder and fails the hook before it runs (run this from a plain terminal)');
    var rec=mine.length===1&&mine[0].command===command?mine[0]:null;
    check(!!rec&&typeof rec.command==='string'&&typeof rec.output==='string'&&typeof rec.cwd==='string',name+': the hook was not handed the command, the output and the working folder as strings: '+JSON.stringify(rec&&{shape:rec.shape,cwd:typeof rec.cwd}));
    if(rec&&rec.data&&path.isAbsolute(rec.data))dataDir=rec.data;
    return rec;
  }
  // The answers of PostToolUse hooks in a leg's stream that are not empty: the dump hook prints nothing, so these are the hook's under test.
  function answers(l){ return l.events.filter(function(e){ return e&&e.type==='system'&&e.subtype==='hook_response'&&e.hook_event==='PostToolUse'&&typeof e.stdout==='string'&&e.stdout.trim(); }).map(function(e){ return e.stdout.trim(); }); }
  function responses(l){ return l.events.filter(function(e){ return e&&e.type==='system'&&e.subtype==='hook_response'&&e.hook_event==='PostToolUse'; }).length; }

  // Leg A: a real round's tail, with a line in its output that names another file.
  var a=leg(cmdA), recA=common('leg A',a,cmdA);
  if(recA){
    facts.push('the output reaches a PostToolUse hook on Bash as '+(recA.shape==='string'?'tool_response itself, a string':'tool_response.stdout'));
    check(/^\*\*Crew:\*\*/m.test(recA.output)&&/^Board: .* \(no browser opener here: /m.test(recA.output)&&recA.output.indexOf(decoyLine)>=0,'leg A: the output the hook was handed does not carry the Crew line, the opener\'s own line and the decoy line: '+JSON.stringify(recA.output.slice(0,400)));
    check(opened().length===1&&opened()[0]===board,'leg A: the stand-in opener must have run once, on the run\'s own board ('+board+'), and never on the decoy; it was handed '+JSON.stringify(opened()));
    var page=fs.readFileSync(board,'utf8');
    check(page.indexOf(PLANTED)<0&&/<header class="strip">/.test(page)&&page.indexOf('Buy the company. It is cheap.')>0,'leg A: the board the hook opened must be the plugin\'s own render of the run, made by the hook, with nothing of the planted page; it opens '+JSON.stringify(page.slice(0,120)));
    var byHook=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){ try{ return JSON.parse(l); }catch(e){ return {}; } }).filter(function(e){ return e.event==='board.opened'&&e.by==='hook'; });
    check(byHook.length===1&&byHook[0].ok===true&&byHook[0].file==='board.html','leg A: the run\'s log must hold one board.opened line by the hook, ok true; got '+JSON.stringify(byHook));
    var outA=answers(a), jA=null; try{ jA=outA.length===1?JSON.parse(outA[0]):null; }catch(e){}
    check(responses(a)>=2,'leg A: the session\'s event stream carries '+responses(a)+' PostToolUse hook answer(s), expected the dump hook\'s and the hook\'s under test; on this version --include-hook-events may no longer show them');
    var tail='Board opened by the plugin: '+board;
    check(!!jA&&typeof jA.systemMessage==='string'&&jA.systemMessage.indexOf('**Crew:**')===0&&jA.systemMessage.slice(-tail.length)===tail,'leg A: the hook\'s answer must be one JSON line whose message opens with the Crew line and ends "'+tail+'"; got '+JSON.stringify(outA).slice(0,600));
    var ctxA=jA&&jA.hookSpecificOutput?String(jA.hookSpecificOutput.additionalContext||''):'';
    check(/on the person's screen already/.test(ctxA)&&/then open the Next picker\.$/.test(ctxA),'leg A: the hook must hand the host its context for a real run folder; got '+JSON.stringify(ctxA.slice(0,200)));
    facts.push('the message reached the stream as the plugin\'s own line: '+(a.events.some(function(e){ return e&&e.type==='system'&&typeof e.content==='string'&&e.content.indexOf(tail)>=0; })?'yes':'not seen'));
  }

  // Leg B: a command that only mentions the scripts' names, with the same decoy line in its output.
  var b=leg(cmdB), recB=common('leg B',b,cmdB);
  if(recB){
    check(recB.output.indexOf(decoyLine)>=0,'leg B: the output the hook was handed does not carry the decoy line: '+JSON.stringify(recB.output.slice(0,300)));
    check(opened().length===(recA?1:0)&&opened().indexOf(decoy)<0,'leg B: a command that only mentions the scripts must open nothing; the stand-in opener was handed '+JSON.stringify(opened()));
    check(responses(b)>=2,'leg B: the session\'s event stream carries '+responses(b)+' PostToolUse hook answer(s), expected the dump hook\'s and the hook\'s under test');
    check(answers(b).length===0,'leg B: the hook must answer with nothing, no message and no context, after a command that only mentions the scripts; got '+JSON.stringify(answers(b)).slice(0,400));
  }
}catch(e){
  if(!e||!e.skip)failures.push('the proof stopped on an error of its own: '+(e&&e.stack||e));
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
  // The throwaway plugin's own data folder, and nothing else: the name is checked before the delete.
  if(dataDir&&path.basename(dataDir).indexOf(NAME)===0)fs.rmSync(dataDir,{recursive:true,force:true});
}
if(process.exitCode===2)process.exit(2);
failures.forEach(function(f){console.log('FAIL '+f);});
facts.forEach(function(f){console.log('measured: '+f);});
console.log((failures.length?'show_result_live: '+failures.length+' failure(s), ':'show_result_live: passed, ')+passes+' checks, on Claude Code '+version+' (PROVED_ON in the hook: '+provedOn+(failures.length||provedOn===version?'':'; move the constant to '+version)+')');
process.exit(failures.length||process.exitCode===1?1:0);
