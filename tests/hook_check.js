// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// hook_check.js: the listed plugin's session-start hook (ruled 2026-10-09; since 2026-10-31 it also
// prints the first-session line once, Part 83, pinned by tests/session_start_check.js; since 2026-10-16 the
// seat-scope hook sits beside it in hooks.json, pinned by tests/seat_scope_check.js; since
// 2026-10-26 the show-result hook too, issue 70, pinned by tests/show_result_check.js),
// and on every start but the first it reads, writes and calls nothing (the first start measures the
// add-on and the voices and writes the sentinel, Part 83).
//
// What it pins:
//   - plugins/combat-writing/hooks/ holds exactly hooks.json, seat-scope.js, session-start.js
//     and show-result.js.
//   - hooks.json has the top-level `hooks` wrapper, three events, SessionStart, PreToolUse and
//     PostToolUse, SessionStart with one entry
//     whose one command hook runs node on a file inside the plugin, named through
//     ${CLAUDE_PLUGIN_ROOT}, handed ${CLAUDE_PLUGIN_DATA} as its one argument (Part 83), with no
//     other variable, substitution, shell operator or launcher.
//   - Run with node and no data folder, session-start.js exits 0 and prints one JSON object whose
//     systemMessage is exactly "Combat Writing ready. /cw:help for the guide." and whose
//     hookSpecificOutput carries the same line as additionalContext for SessionStart.
//   - The script requires fs, path, child_process and the plugin's lib.js and nothing else, holds
//     no URL, never installs, and reads one environment variable, CW_SESSION_PROBE (the tests' fakes).
//
// Run from the repo root:   node tests/hook_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var root=path.join(__dirname,'..');
var LINE='Combat Writing ready. /cw:help for the guide.';
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }

var dir='plugins/combat-writing/hooks';
var files=fs.existsSync(path.join(root,dir))?fs.readdirSync(path.join(root,dir)).sort():[];
check(files.join(',')==='hooks.json,seat-scope.js,session-start.js,show-result.js','hooks/: expected exactly hooks.json, seat-scope.js, session-start.js and show-result.js, found '+files.join(','));

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
  check(h.command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js" "${CLAUDE_PLUGIN_DATA}"','hooks.json: the command must be node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js" "${CLAUDE_PLUGIN_DATA}", got '+JSON.stringify(h.command));
  check(!/[;&|<>`$]/.test(String(h.command).replace('${CLAUDE_PLUGIN_ROOT}','').replace('${CLAUDE_PLUGIN_DATA}','')),'hooks.json: the command holds a shell operator or another substitution');
  check(typeof h.timeout==='number'&&h.timeout>=12&&h.timeout<=15,'hooks.json: the hook timeout covers the two 5 s measurement budgets and no more (Part 83)');
}

var script=read(dir+'/session-start.js');
check(script.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','session-start.js: no Shield header on line 1');
var code=script.replace(/\/\/[^\n]*/g,'');
var reqs=(code.match(/require\(['"][^'"]+['"]\)/g)||[]).map(function(r){return r.replace(/require\(['"]|['"]\)/g,'');}).sort();
check(reqs.join()==='../scripts/lib.js,child_process,fs,path'&&!/\bfetch\(/.test(code)&&!/https?:\/\//.test(code),'session-start.js: requires fs, path, child_process and lib.js only, fetches nothing, holds no URL: '+reqs.join());
check((code.match(/process\.env\.([A-Z_]+)/g)||[]).filter(function(v,i,a){return a.indexOf(v)===i;}).sort().join()==='process.env.CLAUDE_PLUGIN_DATA,process.env.CW_SESSION_PROBE,process.env.HOME','session-start.js: reads only CLAUDE_PLUGIN_DATA, HOME (the cache fallback) and CW_SESSION_PROBE from the environment');
check(!/plugin install|plugin\s*,\s*['"]install/.test(code),'session-start.js: never installs');

var r=cp.spawnSync(process.execPath,[path.join(root,dir,'session-start.js')],{encoding:'utf8',cwd:root});
check(r.status===0,'session-start.js: exit '+r.status+' '+r.stderr);
check(r.stderr==='','session-start.js: wrote to stderr: '+r.stderr);
var lines=(r.stdout||'').split('\n').filter(Boolean);
check(lines.length===1,'session-start.js: expected one line on stdout, got '+lines.length);
var out=null; try{out=JSON.parse(lines[0]||'');}catch(e){failures.push('session-start.js: stdout is not JSON: '+lines[0]);}
if(out){
  check(out.systemMessage===LINE,'session-start.js: systemMessage is '+JSON.stringify(out.systemMessage));
  check(out.hookSpecificOutput&&out.hookSpecificOutput.hookEventName==='SessionStart'&&out.hookSpecificOutput.additionalContext===LINE,'session-start.js: hookSpecificOutput must carry the same line as additionalContext for SessionStart');
  check(Object.keys(out).sort().join(',')==='hookSpecificOutput,systemMessage','session-start.js: unexpected fields '+Object.keys(out).join(','));
}

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'hook_check: '+failures.length+' failure(s), ':'hook_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
