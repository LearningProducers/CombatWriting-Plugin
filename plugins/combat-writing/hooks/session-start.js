// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// session-start.js: the line the plugin hands the host when it loads, and, on the
// first session only, what one install still lacks (Part 83).
//
// Run by the SessionStart hook in hooks.json at session start and resume. Every start writes one
// JSON object whose hookSpecificOutput.additionalContext carries the ready line, context the host
// reads that never appears as a message (the hooks reference's definition); nothing prints on the
// screen at session start, so the object never carries a systemMessage key, the field the terminal
// shows the person. (On a machine with no Node this script never starts: the command in hooks.json
// prints hooks/no-node.json in its place, which does carry that field, the one line the person
// has to see: that Node is missing, and that nothing of their own work is stopped.) The host says nothing about a lack unless asked; a missing seat is still named
// in every result's Seats line. The FIRST start (no `first-session` file in the plugin's data folder, the folder
// Claude Code keeps across updates and removes on uninstall) also measures two things and adds
// one line per lack after the ready line, nothing when there is no lack, then, when both came back, writes the
// sentinel so no later start repeats it. The check is skipped in that one state only, the sentinel seen: a host that names
// no data folder, or one the hook cannot make, read or write, gives no proof of an earlier start,
// so there every start measures: the lines are never lost, only repeated as context.
// The sentinel is the proof the check ran, so it is written only when every measurement the start
// owed came back (Part 129): the add-on read by the plugin list or the cache, and on a Mac the
// voice list read. A start where one did not come back adds no line for that part, still gives
// the line for a lack it did measure, writes nothing, and the next start measures again. Off a
// Mac no voice measurement is owed, so the add-on alone decides.
// /cw:help crew and /cw:help voices carry the same lines for later:
//   - The crew add-on: `claude plugin list` (the documented signal, read with a 5 s budget) names
//     combat-writing-crew; when the command cannot run, the plugin cache is read instead
//     (~/.claude/plugins/cache/<marketplace>/<plugin>/, the layout the security page documents).
//     Lacking: the install line, what it seats, where the key goes.
//   - The voices, on macOS alone: `say -v ?` filtered as speak.js filters (Premium or Enhanced,
//     the page's language), fewer than three named with the download path. No program downloads
//     Apple's voices; the line says where they are.
// The hook installs nothing, downloads nothing, writes only the sentinel (what it measured, dated),
// and reads two environment variables, CLAUDE_PLUGIN_DATA and HOME (for the cache). It reads no
// switch of the tests': `claude` and `say` are found the way any command is, and the tests put
// their fakes there. The data folder is
// read from the hook's environment alone, CLAUDE_PLUGIN_DATA, which the host exports to every
// plugin hook: the command in hooks.json names ${CLAUDE_PLUGIN_ROOT} and no other variable, and
// an argument is never read. The hook makes the folder itself when it is not there yet.
// tests/session_start_live.js is the live proof that a real session start hands the hook the
// folder this way; rerun it after a Claude Code update.
// The security page asks for review before an install, so the hook never runs one.

var fs=require('fs'), path=require('path'), cp=require('child_process');
var lib=require('../scripts/lib.js');
var LINE='Combat Writing ready. /cw:help for the guide.';
var SENTINEL='first-session';
var VOICES_WANTED=3;
var BUDGET_MS=5000;
var dataDir=process.env.CLAUDE_PLUGIN_DATA||null;
function run(name,args){ try{ return cp.spawnSync(name,args,{encoding:'utf8',timeout:BUDGET_MS}); }catch(e){ return {error:e}; } }

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
// owed: whether this machine has a voice list to read (a Mac alone). names: the quality voices
// read, or null when none were read: not owed, or owed and the list did not come back.
function qualityVoices(){
  if(process.platform!=='darwin')return {owed:false,names:null};
  var r=run('say',['-v','?']);
  if(!r||r.error||r.status!==0||typeof r.stdout!=='string')return {owed:true,names:null};
  var lang='en';
  var names=[];
  r.stdout.split('\n').forEach(function(l){
    var m=/^(.*?)\s{2,}([A-Za-z]{2})[_-][A-Za-z]{2}\s/.exec(l)||/^(.*?)\s{2,}([A-Za-z]{2})\s/.exec(l);
    if(!m)return;
    if(lib.voiceTier(m[1])>0&&m[2].toLowerCase()===lang)names.push(m[1].trim());
  });
  return {owed:true,names:names};
}
function addonLine(){ return 'The crew add-on is not installed: the crew is the two fresh readers, one company\'s models. '+lib.ADDON_INSTALL+' seats two more models on a free Groq key in the second chair, your key going only to Groq. /cw:help crew for the three states.'; }
function voicesLine(names){ return 'This Mac has '+names.length+' premium or enhanced '+(names.length===1?'voice':'voices')+(names.length?' ('+names.join(', ')+')':'')+'. The board reads each seat in its own voice when three are installed: System Settings, Accessibility, Read & Speak (Spoken Content before macOS 26), the ⓘ beside System voice, then the arrow beside Ava (Premium), Nathan (Enhanced) and Allison (Enhanced), or any Premium or Enhanced voice. /cw:help voices.'; }

var lines=[LINE];
// The check is skipped in one state only: the hook can see the sentinel, the proof it already ran.
// No data folder, or one that cannot be made, read or written, is no proof, so that start measures:
// a memory that fails costs a repeat, never silence.
var sentinel=dataDir?path.join(dataDir,SENTINEL):null;
var first=true;
if(sentinel){ try{ fs.mkdirSync(dataDir,{recursive:true}); }catch(e){} first=!fs.existsSync(sentinel); }
if(first){
  var addon=addonInstalled();
  var voices=qualityVoices();
  if(addon.present===false)lines.push(addonLine());
  if(voices.names&&voices.names.length<VOICES_WANTED)lines.push(voicesLine(voices.names));
  // The sentinel says the check ran, so it is written only when every measurement owed came back;
  // a start where one did not leaves no proof, and the next start measures again.
  var measured=addon.present!==null&&(!voices.owed||voices.names!==null);
  if(sentinel&&measured){ try{ fs.writeFileSync(sentinel,JSON.stringify({at:new Date().toISOString(),addon:addon,voices:voices.names})+'\n'); }catch(e){} }
}
var text=lines.join('\n');
process.stdout.write(JSON.stringify({
  hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:text}
})+'\n');
