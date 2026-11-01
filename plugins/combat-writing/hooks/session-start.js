// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// session-start.js: the line the plugin prints when it loads (ruled 2026-10-09), and, on the
// first session only, what one install still lacks (Part 83, 2026-10-31).
//
// Run by the SessionStart hook in hooks.json at session start and resume. Every start prints the
// ready line. The FIRST start (no `first-session` file in the plugin's data folder, the folder
// Claude Code keeps across updates and removes on uninstall) also measures two things and prints
// one line per lack, nothing when there is no lack, then writes the sentinel so no later start
// repeats it; /cw:help crew and /cw:help voices carry the same lines for later:
//   - The crew add-on: `claude plugin list` (the documented signal, read with a 5 s budget) names
//     combat-writing-crew; when the command cannot run, the plugin cache is read instead
//     (~/.claude/plugins/cache/<marketplace>/<plugin>/, the layout the security page documents).
//     Lacking: the install line, what it seats, where the key goes.
//   - The voices, on macOS alone: `say -v ?` filtered as speak.js filters (Premium or Enhanced,
//     the page's language), fewer than three named with the download path. No program downloads
//     Apple's voices; the line says where they are.
// The hook installs nothing, downloads nothing, writes only the sentinel (what it measured, dated),
// and reads one environment variable, CW_SESSION_PROBE, the tests' fake commands. The data folder
// comes as the second argument (hooks.json passes "${CLAUDE_PLUGIN_DATA}", which creates it), else
// from CLAUDE_PLUGIN_DATA, else nothing is measured and the ready line stands alone.
// The founder's words: "whatever is best practice and more transparent"; the security page asks for
// review before an install, so the hook never runs one.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var lib=require('../scripts/lib.js');
var LINE='Combat Writing ready. /cw:help for the guide.';
var SENTINEL='first-session';
var VOICES_WANTED=3;
var BUDGET_MS=5000;
var dataDir=process.argv[2]&&process.argv[2]!=='${CLAUDE_PLUGIN_DATA}'?process.argv[2]:(process.env.CLAUDE_PLUGIN_DATA||null);
// The tests' fakes: CW_SESSION_PROBE=<dir> names a folder whose `claude` and `say` stand in for the real ones.
var probe=process.env.CW_SESSION_PROBE||null;
function cmd(name){ return probe?path.join(probe,name):name; }
function run(name,args){ try{ return cp.spawnSync(cmd(name),args,{encoding:'utf8',timeout:BUDGET_MS}); }catch(e){ return {error:e}; } }

function addonInstalled(){
  var r=run('claude',['plugin','list']);
  if(r&&!r.error&&r.status===0&&typeof r.stdout==='string')return {present:/combat-writing-crew@/.test(r.stdout),by:'claude plugin list'};
  var home=process.env.HOME||'';
  var cache=path.join(home,'.claude','plugins','cache');
  try{
    var hit=fs.readdirSync(cache).some(function(m){ return fs.existsSync(path.join(cache,m,'combat-writing-crew')); });
    return {present:hit,by:'plugin cache'};
  }catch(e){ return {present:null,by:'unmeasured'}; }
}
function qualityVoices(){
  if(process.platform!=='darwin'&&!probe)return null;
  var r=run('say',['-v','?']);
  if(!r||r.error||r.status!==0||typeof r.stdout!=='string')return null;
  var lang='en';
  var names=[];
  r.stdout.split('\n').forEach(function(l){
    var m=/^(.*?)\s{2,}([A-Za-z]{2})[_-][A-Za-z]{2}\s/.exec(l)||/^(.*?)\s{2,}([A-Za-z]{2})\s/.exec(l);
    if(!m)return;
    if(lib.voiceTier(m[1])>0&&m[2].toLowerCase()===lang)names.push(m[1].trim());
  });
  return names;
}
function addonLine(){ return 'The crew add-on is not installed: the crew is one seat. '+lib.ADDON_INSTALL+' seats two more models on a free Groq key, your key going only to Groq. /cw:help crew for the three states.'; }
function voicesLine(names){ return 'This Mac has '+names.length+' premium or enhanced '+(names.length===1?'voice':'voices')+(names.length?' ('+names.join(', ')+')':'')+'. The board reads each seat in its own voice when three are installed: System Settings, Accessibility, Read & Speak (Spoken Content before macOS 26), the ⓘ beside System voice, then the arrow beside Ava (Premium), Nathan (Enhanced) and Allison (Enhanced), or any Premium or Enhanced voice. /cw:help voices.'; }

var lines=[LINE];
var measured=null;
if(dataDir){
  var sentinel=path.join(dataDir,SENTINEL);
  var first=false;
  try{ fs.mkdirSync(dataDir,{recursive:true}); first=!fs.existsSync(sentinel); }catch(e){ first=false; }
  if(first){
    var addon=addonInstalled();
    var voices=qualityVoices();
    measured={at:new Date().toISOString(),addon:addon,voices:voices};
    if(addon.present===false)lines.push(addonLine());
    if(voices&&voices.length<VOICES_WANTED)lines.push(voicesLine(voices));
    try{ fs.writeFileSync(sentinel,JSON.stringify(measured)+'\n'); }catch(e){}
  }
}
var text=lines.join('\n');
process.stdout.write(JSON.stringify({
  systemMessage:text,
  hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:text}
})+'\n');
