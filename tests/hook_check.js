// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// hook_check.js: the listed plugin's session-start hook (ruled 2026-10-09; since 2026-10-31 it also
// prints the first-session line once, Part 83, pinned by tests/session_start_check.js; since 2026-10-16 the
// seat-scope hook sits beside it in hooks.json, pinned by tests/seat_scope_check.js; since
// 2026-10-26 the show-result hook too, issue 70, pinned by tests/show_result_check.js),
// and on every start but the first it measures nothing and starts no command (the first start measures the
// add-on and the voices and writes the sentinel, Part 83; a host that names no data folder, or
// one the hook cannot make, read or write, gets the measurement at every start, Part 128; the
// sentinel is written only when both measurements came back, so a start where one did not is
// followed by a start that measures again, Part 129; all pinned by tests/session_start_check.js).
//
// What it pins:
//   - plugins/combat-writing/hooks/ holds exactly hooks.json, no-node.json, seat-scope.js,
//     session-start.js and show-result.js.
//   - hooks.json has the top-level `hooks` wrapper, three events, SessionStart, PreToolUse and
//     PostToolUse, SessionStart with one entry
//     whose one command hook runs node on a file inside the plugin, named through
//     ${CLAUDE_PLUGIN_ROOT}, with no argument (Part 128: the data folder reaches the script in its
//     environment), no other variable, substitution or launcher.
//   - Every command in hooks.json opens the same way (issue 255): it asks the shell whether node
//     is on the PATH and, when it is, runs node on one file under ${CLAUDE_PLUGIN_ROOT}/hooks/ with
//     no argument. What follows for a machine with no Node is pinned by tests/no_node_check.js:
//     the session start prints hooks/no-node.json, the fence refuses the plugin's reader alone,
//     the result hook does nothing. No command names a variable but ${CLAUDE_PLUGIN_ROOT}.
//   - Run with node on a start after the first (a data folder that holds the sentinel, named in
//     CLAUDE_PLUGIN_DATA), session-start.js exits 0 and prints one JSON object whose
//     hookSpecificOutput carries exactly "Combat Writing ready. /cw:help for the guide." as
//     additionalContext for SessionStart, the context the host reads, and nothing else: no
//     systemMessage key, the field the terminal shows the person (issue 165, 2026-11-04: nothing
//     prints on the screen at session start, ever).
//   - The script requires fs, path, child_process and the plugin's lib.js and nothing else, holds
//     no URL, never installs, reads no argument, and reads two environment variables:
//     CLAUDE_PLUGIN_DATA (its data folder) and HOME (the cache fallback); no switch of the
//     tests' (issue 239).
//
// Run from the repo root:   node tests/hook_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var LINE='Combat Writing ready. /cw:help for the guide.';
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }

var dir='plugins/combat-writing/hooks';
var files=fs.existsSync(path.join(root,dir))?fs.readdirSync(path.join(root,dir)).sort():[];
check(files.join(',')==='hooks.json,no-node.json,seat-scope.js,session-start.js,show-result.js','hooks/: expected exactly hooks.json, no-node.json, seat-scope.js, session-start.js and show-result.js, found '+files.join(','));

var hooks=null;
try{hooks=JSON.parse(read(dir+'/hooks.json'));}catch(e){failures.push('hooks.json: '+e.message);}
if(hooks){
  check(hooks.hooks&&typeof hooks.hooks==='object'&&Object.keys(hooks).join(',')==='hooks','hooks.json: must hold the top-level hooks wrapper and nothing else');
  var events=Object.keys(hooks.hooks||{});
  check(events.sort().join(',')==='PostToolUse,PreToolUse,SessionStart','hooks.json: the events must be SessionStart, PreToolUse (the seat scope, ruled 2026-10-16, pinned by tests/seat_scope_check.js) and PostToolUse (the result shown, issue 70, pinned by tests/show_result_check.js), found '+events.join(','));
  var entries=(hooks.hooks||{}).SessionStart||[];
  check(entries.length===1&&Array.isArray(entries[0].hooks)&&entries[0].hooks.length===1,'hooks.json: SessionStart must hold one entry with one hook');
  var h=(entries[0]&&entries[0].hooks&&entries[0].hooks[0])||{};
  check(h.type==='command','hooks.json: the hook type must be command');
  var START='if command -v node >/dev/null 2>&1; then node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js"; else cat "${CLAUDE_PLUGIN_ROOT}/hooks/no-node.json"; fi';
  check(h.command===START,'hooks.json: the SessionStart command must be '+START+', got '+JSON.stringify(h.command));
  check(!/[`]|\$\(|\$\{/.test(String(h.command).split('${CLAUDE_PLUGIN_ROOT}').join('')),'hooks.json: the command holds a substitution or another variable');
  check(typeof h.timeout==='number'&&h.timeout>=12&&h.timeout<=15,'hooks.json: the hook timeout covers the two 5 s measurement budgets and no more (Part 83)');
  // Every hook command of the plugin: node on one file under ${CLAUDE_PLUGIN_ROOT}/hooks/, nothing after it.
  var commands=[];
  Object.keys(hooks.hooks||{}).forEach(function(ev){ (hooks.hooks[ev]||[]).forEach(function(en){ (en.hooks||[]).forEach(function(x){ commands.push({event:ev,hook:x}); }); }); });
  check(commands.length===4,'hooks.json: expected four hook commands (the session start, the fence, and the result hook on Bash and on the tool that starts an agent), found '+commands.length);
  commands.forEach(function(c){
    var cmd=String(c.hook.command), rest=cmd.split('${CLAUDE_PLUGIN_ROOT}').join('');
    check(c.hook.type==='command'&&/^if command -v node >\/dev\/null 2>&1; then node "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/[a-z-]+\.js"; (?:fi|else .+; fi)$/.test(cmd)&&(cmd.match(/\bnode "/g)||[]).length===1&&!/[`]|\$\(|\$\{|\$[A-Za-z_]/.test(rest)&&c.hook.args===undefined,'hooks.json: the '+c.event+' command must ask for node, then run node "${CLAUDE_PLUGIN_ROOT}/hooks/<file>.js" once with no argument, and name no other variable, got '+JSON.stringify(c.hook.command)+(c.hook.args!==undefined?' args '+JSON.stringify(c.hook.args):''));
  });
  check(!/CLAUDE_PLUGIN_DATA/.test(read(dir+'/hooks.json')),'hooks.json names CLAUDE_PLUGIN_DATA: no hook command carries a variable but ${CLAUDE_PLUGIN_ROOT}');
}

var script=read(dir+'/session-start.js');
check(script.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','session-start.js: no Shield header on line 1');
var code=script.replace(/\/\/[^\n]*/g,'');
var reqs=(code.match(/require\(['"][^'"]+['"]\)/g)||[]).map(function(r){return r.replace(/require\(['"]|['"]\)/g,'');}).sort();
check(reqs.join()==='../scripts/lib.js,child_process,fs,path'&&!/\bfetch\(/.test(code)&&!/https?:\/\//.test(code),'session-start.js: requires fs, path, child_process and lib.js only, fetches nothing, holds no URL: '+reqs.join());
check((code.match(/process\.env\.([A-Z_]+)/g)||[]).filter(function(v,i,a){return a.indexOf(v)===i;}).sort().join()==='process.env.CLAUDE_PLUGIN_DATA,process.env.HOME','session-start.js: reads only CLAUDE_PLUGIN_DATA and HOME (the cache fallback) from the environment');
check(!/plugin install|plugin\s*,\s*['"]install/.test(code),'session-start.js: never installs');
check(!/process\.argv/.test(code),'session-start.js: reads an argument; the data folder comes from the environment alone');

// A start after the first: the data folder holds the sentinel, so the hook measures nothing, starts no command and writes no file.
var data=fs.mkdtempSync(path.join(os.tmpdir(),'cw-hook-'));
fs.writeFileSync(path.join(data,'first-session'),'{}\n');
var env=Object.assign({},process.env,{CLAUDE_PLUGIN_DATA:data,PATH:path.join(data,'no-such-commands')});
var r=cp.spawnSync(process.execPath,[path.join(root,dir,'session-start.js')],{encoding:'utf8',cwd:root,env:env});
check(fs.readdirSync(data).join()==='first-session'&&fs.readFileSync(path.join(data,'first-session'),'utf8')==='{}\n','session-start.js: a later start wrote in the data folder: '+fs.readdirSync(data).join());
fs.rmSync(data,{recursive:true,force:true});
check(r.status===0,'session-start.js: exit '+r.status+' '+r.stderr);
check(r.stderr==='','session-start.js: wrote to stderr: '+r.stderr);
var lines=(r.stdout||'').split('\n').filter(Boolean);
check(lines.length===1,'session-start.js: expected one line on stdout, got '+lines.length);
var out=null; try{out=JSON.parse(lines[0]||'');}catch(e){failures.push('session-start.js: stdout is not JSON: '+lines[0]);}
if(out){
  check(!('systemMessage' in out),'session-start.js: carries a systemMessage key, which the terminal shows the person; nothing prints on the screen at session start (issue 165)');
  check(out.hookSpecificOutput&&out.hookSpecificOutput.hookEventName==='SessionStart'&&out.hookSpecificOutput.additionalContext===LINE,'session-start.js: hookSpecificOutput must carry the ready line as additionalContext for SessionStart');
  check(Object.keys(out).sort().join(',')==='hookSpecificOutput'&&Object.keys(out.hookSpecificOutput).sort().join(',')==='additionalContext,hookEventName','session-start.js: unexpected fields '+Object.keys(out).join(',')+' / '+Object.keys(out.hookSpecificOutput||{}).join(','));
}

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'hook_check: '+failures.length+' failure(s), ':'hook_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
