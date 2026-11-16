// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// session_start_live.js: the live proof that a real session start hands the session-start hook
// its data folder through the environment. Not part of CI: it needs a running Claude Code on this
// machine (the `claude` binary, or CLAUDE_BIN) and spends two short model calls. Run it after a
// Claude Code update; it prints the version it passed on, and the PROVED_ON constant below is
// the one home of that number: move it after a pass.
//
// Why it exists: hooks.json names ${CLAUDE_PLUGIN_ROOT} and no other variable, so the hook learns
// its data folder from CLAUDE_PLUGIN_DATA in its environment alone. The harness
// (tests/session_start_check.js) proves the script given that variable; only a real session start
// proves the host gives it.
//
// What it does: a throwaway plugin in a temporary folder carries the repository's SessionStart
// entry from hooks.json word for word, the repository's hooks/session-start.js and scripts/lib.js,
// and one dump hook beside it that records what a SessionStart hook is handed (its arguments and
// its CLAUDE_PLUGIN_DATA). A child `claude -p --plugin-dir` session starts twice in a scratch
// project, with a fixed prompt and no MCP server loaded (--strict-mcp-config): the child reads
// nothing and calls no tool.
//
// What it asserts: the repository's command names no ${CLAUDE_PLUGIN_DATA} (else nothing is
// proved); the hook fired at each start; it was handed no argument; its environment named an
// absolute data folder; after the first start that folder holds the `first-session` sentinel with
// what was measured; after the second start the sentinel's bytes are the same (measured once).
// The scratch folder and the throwaway plugin's data folder are deleted after, pass or fail.
//
// Run it from a plain terminal, never from a sandboxed shell: the host makes the plugin's data
// folder under its own settings folder before it runs a plugin hook, and when a sandbox refuses
// that write the host fails the hook before it starts, so nothing fires and nothing is proved.
//
// Run from the repo root:   node tests/session_start_live.js      (CLAUDE_BIN=<path> to pick a binary)
// Exit 0 on pass; exit 1 on any failure; exit 2 when Claude Code cannot be run.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var repo=path.join(__dirname,'..');
var pluginSrc=path.join(repo,'plugins','combat-writing');
var claude=process.env.CLAUDE_BIN||'claude';
var NAME='cw-session-start-live';
// The Claude Code version this proof last passed on, the one home of that number.
var PROVED_ON='2.1.325';
var failures=[], passes=0, facts=[];
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function tilde(p){ var h=os.homedir(); return p&&p.indexOf(h)===0?'~'+p.slice(h.length):p; }

var entry=JSON.parse(fs.readFileSync(path.join(pluginSrc,'hooks','hooks.json'),'utf8')).hooks.SessionStart;
var command=entry[0].hooks[0].command;
if(/CLAUDE_PLUGIN_DATA/.test(command)){ console.log('FAIL the SessionStart command in hooks.json names CLAUDE_PLUGIN_DATA, so a pass would prove nothing about the environment: '+command); process.exit(1); }

var ver=cp.spawnSync(claude,['--version'],{encoding:'utf8'});
if(ver.status!==0){ console.log('session_start_live: cannot run Claude Code ('+claude+'): '+(ver.stderr||ver.error)); process.exit(2); }
var version=(ver.stdout.match(/\d+\.\d+\.\d+/)||[ver.stdout.trim()])[0];

var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-start-live-'));
var dataDir=null;
try{
  var plugin=path.join(tmp,'plugin'), proj=path.join(tmp,'proj'), dump=path.join(tmp,'starts.jsonl');
  fs.mkdirSync(path.join(plugin,'.claude-plugin'),{recursive:true}); fs.mkdirSync(path.join(plugin,'hooks')); fs.mkdirSync(path.join(plugin,'scripts')); fs.mkdirSync(proj);
  fs.writeFileSync(path.join(plugin,'.claude-plugin','plugin.json'),JSON.stringify({name:NAME,version:'0.0.0',description:'the live proof of the Combat Writing session-start hook: loads the repository hook and records what a SessionStart hook is handed'}));
  fs.copyFileSync(path.join(pluginSrc,'hooks','session-start.js'),path.join(plugin,'hooks','session-start.js'));
  fs.copyFileSync(path.join(pluginSrc,'scripts','lib.js'),path.join(plugin,'scripts','lib.js'));
  fs.writeFileSync(path.join(plugin,'hooks','dump.js'),"var fs=require('fs');fs.appendFileSync("+JSON.stringify(dump)+",JSON.stringify({args:process.argv.slice(2),data:process.env.CLAUDE_PLUGIN_DATA||null})+'\\n');");
  // The dump hook first, then the repository's entry word for word.
  var hooks={hooks:{SessionStart:[{matcher:entry[0].matcher,hooks:[{type:'command',command:'node "${CLAUDE_PLUGIN_ROOT}/hooks/dump.js"',timeout:5}]}].concat(entry)}};
  fs.writeFileSync(path.join(plugin,'hooks','hooks.json'),JSON.stringify(hooks,null,2));

  // The child's environment carries no plugin variable of the parent's, so what the dump records
  // can only be what the host handed this plugin's hook.
  var childEnv=Object.assign({},process.env); delete childEnv.CLAUDE_PLUGIN_DATA; delete childEnv.CLAUDE_PLUGIN_ROOT;
  function start(){
    var child=cp.spawnSync(claude,['-p','--plugin-dir',plugin,'--strict-mcp-config','--output-format','text','Reply with the single word ok and stop.'],{cwd:proj,env:childEnv,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:240000,maxBuffer:16*1024*1024});
    var recs=fs.existsSync(dump)?fs.readFileSync(dump,'utf8').trim().split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}):[];
    return {child:child,recs:recs};
  }

  // First start.
  var one=start();
  check(one.child.status===0,'the first child session failed: exit '+one.child.status+' '+String(one.child.stderr||one.child.error||'').slice(0,400));
  check(one.recs.length===1,'the first start: the SessionStart hook fired '+one.recs.length+' time(s), expected once; inside a sandboxed shell the host cannot make the plugin\'s data folder and fails the hook before it runs (run this from a plain terminal), else on this version a plugin SessionStart hook does not run in a `claude -p` session, or the plugin did not load');
  // Nothing fired: one line says so, and nothing after it can be measured.
  if(one.recs.length===1){
    var rec=one.recs[0]||{args:null,data:null};
    check(Array.isArray(rec.args)&&rec.args.length===0,'the hook was handed an argument: '+JSON.stringify(rec.args));
    check(typeof rec.data==='string'&&path.isAbsolute(rec.data),'the hook\'s environment carried no CLAUDE_PLUGIN_DATA (got '+JSON.stringify(rec.data)+'): on this version the first-session check has no data folder');
    dataDir=typeof rec.data==='string'&&path.isAbsolute(rec.data)?rec.data:null;
    facts.push('CLAUDE_PLUGIN_DATA in a SessionStart hook\'s environment: '+(dataDir?tilde(dataDir):'absent'));
    var sentinel=dataDir?path.join(dataDir,'first-session'):null;
    var bytes=sentinel&&fs.existsSync(sentinel)?fs.readFileSync(sentinel,'utf8'):null;
    check(bytes!==null,'the first start wrote no first-session sentinel in the data folder '+tilde(dataDir||'(none)'));
    var s=null; try{ s=JSON.parse(bytes); }catch(x){}
    check(s&&/^\d{4}-\d\d-\d\dT/.test(s.at)&&s.addon&&['claude plugin list','plugin cache','unmeasured'].indexOf(s.addon.by)>=0&&(s.voices===null||Array.isArray(s.voices)),'the sentinel does not record what was measured: '+bytes);
    if(s&&s.addon)facts.push('the first start measured the add-on by '+s.addon.by+' ('+(s.addon.present===null?'unmeasured':s.addon.present?'present':'absent')+') and '+(s.voices?s.voices.length+' quality voice(s)':'no voice list'));
    check(s&&s.at&&Date.now()-Date.parse(s.at)<10*60*1000,'the sentinel is older than this run, left by an earlier one; it is removed now, rerun the proof: '+bytes);

    // Second start: the sentinel is the memory, so nothing is measured again.
    var two=start();
    check(two.child.status===0,'the second child session failed: exit '+two.child.status+' '+String(two.child.stderr||two.child.error||'').slice(0,400));
    check(two.recs.length===2,'the second start: the hook has fired '+two.recs.length+' time(s) in all, expected twice');
    check(two.recs.length===2&&two.recs[1].data===rec.data,'the second start named another data folder: '+JSON.stringify(two.recs[1]&&two.recs[1].data));
    check(bytes!==null&&sentinel&&fs.existsSync(sentinel)&&fs.readFileSync(sentinel,'utf8')===bytes,'the second start rewrote the sentinel: the first-session check ran twice');
    if(bytes!==null)facts.push('the second start left the sentinel\'s bytes as the first wrote them');
  }
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
  // The throwaway plugin's own data folder, and nothing else: the name is checked before the delete.
  if(dataDir&&path.basename(dataDir).indexOf(NAME)===0)fs.rmSync(dataDir,{recursive:true,force:true});
}
failures.forEach(function(f){console.log('FAIL '+f);});
facts.forEach(function(f){console.log('measured: '+f);});
console.log((failures.length?'session_start_live: '+failures.length+' failure(s), ':'session_start_live: passed, ')+passes+' checks, on Claude Code '+version+' (PROVED_ON: '+(PROVED_ON||'none yet')+(failures.length||PROVED_ON===version?'':'; move the constant to '+version)+')');
process.exit(failures.length?1:0);
