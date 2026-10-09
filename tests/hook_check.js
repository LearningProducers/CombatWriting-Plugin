// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// hook_check.js: the listed plugin's only hook is the session-start line (ruled 2026-10-09),
// and it reads, writes and calls nothing.
//
// What it pins:
//   - plugins/combat-writing/hooks/ holds exactly hooks.json and session-start.js.
//   - hooks.json has the top-level `hooks` wrapper, one event, SessionStart, with one entry
//     whose one command hook runs node on a file inside the plugin, named through
//     ${CLAUDE_PLUGIN_ROOT}, with no other variable, substitution, shell operator or launcher.
//   - Run with node, session-start.js exits 0 and prints one JSON object whose systemMessage
//     is exactly "Combat Writing ready. /combat-writing:help for the guide." and whose
//     hookSpecificOutput carries the same line as additionalContext for SessionStart.
//   - The script requires no module at all and holds no URL: it prints and stops.
//
// Run from the repo root:   node tests/hook_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var root=path.join(__dirname,'..');
var LINE='Combat Writing ready. /combat-writing:help for the guide.';
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(rel){ return fs.readFileSync(path.join(root,rel),'utf8'); }

var dir='plugins/combat-writing/hooks';
var files=fs.existsSync(path.join(root,dir))?fs.readdirSync(path.join(root,dir)).sort():[];
check(files.join(',')==='hooks.json,session-start.js','hooks/: expected exactly hooks.json and session-start.js, found '+files.join(','));

var hooks=null;
try{hooks=JSON.parse(read(dir+'/hooks.json'));}catch(e){failures.push('hooks.json: '+e.message);}
if(hooks){
  check(hooks.hooks&&typeof hooks.hooks==='object'&&Object.keys(hooks).join(',')==='hooks','hooks.json: must hold the top-level hooks wrapper and nothing else');
  var events=Object.keys(hooks.hooks||{});
  check(events.join(',')==='SessionStart','hooks.json: the only event must be SessionStart, found '+events.join(','));
  var entries=(hooks.hooks||{}).SessionStart||[];
  check(entries.length===1&&Array.isArray(entries[0].hooks)&&entries[0].hooks.length===1,'hooks.json: SessionStart must hold one entry with one hook');
  var h=(entries[0]&&entries[0].hooks&&entries[0].hooks[0])||{};
  check(h.type==='command','hooks.json: the hook type must be command');
  check(h.command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js"','hooks.json: the command must be node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js", got '+JSON.stringify(h.command));
  check(!/[;&|<>`$]/.test(String(h.command).replace('${CLAUDE_PLUGIN_ROOT}','')),'hooks.json: the command holds a shell operator or another substitution');
  check(typeof h.timeout==='number'&&h.timeout<=10,'hooks.json: the hook should carry a short timeout');
}

var script=read(dir+'/session-start.js');
check(script.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','session-start.js: no Shield header on line 1');
check(!/require\(/.test(script)&&!/\bfetch\(/.test(script)&&!/https?:\/\//.test(script.replace(/\/\/[^\n]*/g,'')),'session-start.js: must require nothing, fetch nothing and hold no URL');
check(!/process\.env|readFileSync|writeFileSync|process\.argv/.test(script),'session-start.js: must read no environment, file or argument');

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
