// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// session_start_check.js: the first-session line (Part 83, 2026-10-31). The founder's words: "how do
// we make it so when they install the plugin the ai crew add on is installed too or they are prompted
// after the cw installs to also install the add on ... and same for the voices ... (whatever is best
// practice and more transparent)". No hook event fires on install, so the first SessionStart is the
// moment, and a sentinel in the plugin's data folder makes it fire once.
//
// What it pins, with the REAL hook as a child process, fake `claude` and `say` commands in a folder
// named by CW_SESSION_PROBE, and a temporary data folder as the hook's argument:
//   - First start, the add-on absent and one quality voice: the ready line, then the add-on line
//     (lib.ADDON_INSTALL in it), then the voices line naming the count, the voice and the download
//     path; the sentinel `first-session` written with what was measured; the same text in
//     additionalContext.
//   - Second start on the same data folder: the ready line alone.
//   - First start with the add-on present and three English quality voices: the ready line alone;
//     the sentinel still written. A French premium voice and a stock voice are not counted.
//   - A `claude` that fails: the plugin cache is read instead (HOME pointed at a fake home with
//     cache/<marketplace>/combat-writing-crew/), present and absent.
//   - No data folder (no argument, no CLAUDE_PLUGIN_DATA): the ready line alone, nothing written.
//   - The hook writes nothing but the sentinel, installs nothing (the fake `claude` records every
//     call; only `plugin list` is ever run), and hooks.json passes "${CLAUDE_PLUGIN_DATA}" with a
//     timeout that covers the two 5 s budgets.
//   - The marketplace entry for cw declares the add-on as a dependency and plugin.json declares
//     none (a plugin.json dependency the directory cannot resolve makes the plugin fail to load
//     there, the dependencies page's words), and the README and the help say what one install brings.
//
// Run from the repo root:   node tests/session_start_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var hook=path.join(plugin,'hooks','session-start.js');
var lib=require(path.join(plugin,'scripts','lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
var LINE='Combat Writing ready. /cw:help for the guide.';
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-session-'));
function fakes(dir,claudeOut,sayOut,claudeExit){
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'claude'),'#!/bin/sh\necho "$@" >> "'+dir+'/calls"\n'+(claudeExit?'exit '+claudeExit+'\n':'')+'printf %s "'+claudeOut.replace(/"/g,'\\"')+'"\n');
  fs.writeFileSync(path.join(dir,'say'),'#!/bin/sh\necho "$@" >> "'+dir+'/calls"\nprintf %s "'+sayOut.replace(/"/g,'\\"')+'"\n');
  fs.chmodSync(path.join(dir,'claude'),493); fs.chmodSync(path.join(dir,'say'),493);
}
function run(fakeDir,dataDir,env){
  var e=Object.assign({},process.env,{CW_SESSION_PROBE:fakeDir},env||{});
  delete e.CLAUDE_PLUGIN_DATA; if(env&&env.CLAUDE_PLUGIN_DATA)e.CLAUDE_PLUGIN_DATA=env.CLAUDE_PLUGIN_DATA;
  var r=cp.spawnSync(process.execPath,[hook].concat(dataDir?[dataDir]:[]),{encoding:'utf8',env:e,cwd:tmp});
  var out=null; try{ out=JSON.parse((r.stdout||'').trim().split('\n')[0]); }catch(x){}
  return {r:r,out:out,lines:out?String(out.systemMessage).split('\n'):[]};
}
var LIST_ABSENT='Installed plugins:\n\n  cw@learning-producers\n    Version: 0.8.34\n';
var LIST_PRESENT='Installed plugins:\n\n  combat-writing-crew@learning-producers\n    Version: 0.5.12\n\n  cw@learning-producers\n';
var SAY_ONE='Ava (Premium)       en_US    # Hello! My name is Ava.\nAlbert              en_US    # Hello! My name is Albert.\nAmelie (Premium)    fr_CA    # Bonjour! Je m\'appelle Amelie.\n';
var SAY_THREE='Allison (Enhanced)  en_US    # Hello! My name is Allison.\nAva (Premium)       en_US    # Hello! My name is Ava.\nNathan (Enhanced)   en_US    # Hello! My name is Nathan.\nAlbert              en_US    # Hi.\n';

// 1. First start: absent add-on, one voice.
var f1=path.join(tmp,'f1'), d1=path.join(tmp,'d1');
fakes(f1,LIST_ABSENT,SAY_ONE);
var a=run(f1,d1);
check(a.r.status===0&&a.r.stderr===''&&a.out,'first start: exit '+a.r.status+' '+a.r.stderr);
check(a.lines.length===3&&a.lines[0]===LINE,'first start: three lines, the ready line first: '+JSON.stringify(a.lines));
check(a.lines[1]==='The crew add-on is not installed: the crew is one seat. '+lib.ADDON_INSTALL+' seats two more models on a free Groq key, your key going only to Groq. /cw:help crew for the three states.','first start: the add-on line: '+a.lines[1]);
check(/^This Mac has 1 premium or enhanced voice \(Ava \(Premium\)\)\. The board reads each seat in its own voice when three are installed: System Settings, Accessibility, Read & Speak \(Spoken Content before macOS 26\), the ⓘ beside System voice, then the arrow beside Ava \(Premium\), Nathan \(Enhanced\) and Allison \(Enhanced\), or any Premium or Enhanced voice\. \/cw:help voices\.$/.test(a.lines[2]),'first start: the voices line counts one and names the path: '+a.lines[2]);
check(a.out.hookSpecificOutput&&a.out.hookSpecificOutput.hookEventName==='SessionStart'&&a.out.hookSpecificOutput.additionalContext===a.out.systemMessage,'first start: additionalContext carries the same text');
var sent=path.join(d1,'first-session');
check(fs.existsSync(sent),'first start: the sentinel is written');
var sj=null; try{ sj=JSON.parse(read(sent)); }catch(x){}
check(sj&&sj.addon&&sj.addon.present===false&&sj.addon.by==='claude plugin list'&&Array.isArray(sj.voices)&&sj.voices.join()==='Ava (Premium)'&&/^\d{4}-/.test(sj.at),'first start: the sentinel records what was measured: '+read(sent));
check(fs.readdirSync(d1).join()==='first-session','first start: nothing but the sentinel in the data folder');
var calls=read(path.join(f1,'calls')).trim().split('\n');
check(calls.length===2&&calls[0]==='plugin list'&&calls[1]==='-v ?','first start: only plugin list and say -v ? are run (never an install): '+JSON.stringify(calls));
// 2. Second start: the ready line alone.
var b=run(f1,d1);
check(b.r.status===0&&b.lines.length===1&&b.lines[0]===LINE,'second start: the ready line alone: '+JSON.stringify(b.lines));
check(read(path.join(f1,'calls')).trim().split('\n').length===2,'second start: nothing measured again');
// 3. First start with everything there: the ready line alone, the sentinel written.
var f3=path.join(tmp,'f3'), d3=path.join(tmp,'d3');
fakes(f3,LIST_PRESENT,SAY_THREE);
var c=run(f3,d3);
check(c.r.status===0&&c.lines.length===1&&c.lines[0]===LINE,'all there: the ready line alone: '+JSON.stringify(c.lines));
var s3=JSON.parse(read(path.join(d3,'first-session')));
check(s3.addon.present===true&&s3.voices.join()==='Allison (Enhanced),Ava (Premium),Nathan (Enhanced)','all there: the sentinel names three English quality voices and the add-on present: '+JSON.stringify(s3));
// 4. Two voices: the line counts two.
var f4=path.join(tmp,'f4'), d4=path.join(tmp,'d4');
fakes(f4,LIST_PRESENT,'Ava (Premium)       en_US    # Hi.\nNathan (Enhanced)   en_US    # Hi.\n');
var d=run(f4,d4);
check(d.lines.length===2&&/^This Mac has 2 premium or enhanced voices \(Ava \(Premium\), Nathan \(Enhanced\)\)\./.test(d.lines[1]),'two voices: the line counts two and names both: '+JSON.stringify(d.lines));
// 5. claude fails: the plugin cache is read, present and absent.
var f5=path.join(tmp,'f5'), home5=path.join(tmp,'home5');
fakes(f5,'',SAY_THREE,1);
fs.mkdirSync(path.join(home5,'.claude','plugins','cache','learning-producers','combat-writing-crew','0.5.12'),{recursive:true});
var e5=run(f5,path.join(tmp,'d5'),{HOME:home5});
check(e5.lines.length===1&&JSON.parse(read(path.join(tmp,'d5','first-session'))).addon.by==='plugin cache'&&JSON.parse(read(path.join(tmp,'d5','first-session'))).addon.present===true,'claude fails, add-on in the cache: present by the cache: '+JSON.stringify(e5.lines));
var home6=path.join(tmp,'home6'); fs.mkdirSync(path.join(home6,'.claude','plugins','cache','learning-producers','cw'),{recursive:true});
var e6=run(f5,path.join(tmp,'d6'),{HOME:home6});
check(e6.lines.length===2&&/^The crew add-on is not installed/.test(e6.lines[1])&&JSON.parse(read(path.join(tmp,'d6','first-session'))).addon.by==='plugin cache','claude fails, add-on not in the cache: the add-on line by the cache: '+JSON.stringify(e6.lines));
var home7=path.join(tmp,'home7'); fs.mkdirSync(home7);
var e7=run(f5,path.join(tmp,'d7'),{HOME:home7});
check(e7.lines.length===1&&JSON.parse(read(path.join(tmp,'d7','first-session'))).addon.present===null,'claude fails and no cache: unmeasured, no line');
// 6. No data folder: the ready line alone, nothing written.
var g=run(f1,null);
check(g.r.status===0&&g.lines.length===1&&g.lines[0]===LINE&&Object.keys(g.out).sort().join()==='hookSpecificOutput,systemMessage','no data folder: the ready line alone');
// The data folder from the environment when no argument is given.
var d8=path.join(tmp,'d8');
var h8=run(f1,null,{CLAUDE_PLUGIN_DATA:d8});
check(h8.lines.length===3&&fs.existsSync(path.join(d8,'first-session')),'the data folder is read from CLAUDE_PLUGIN_DATA when no argument comes');
// 7. hooks.json, the manifests, the docs.
var hooks=JSON.parse(read(path.join(plugin,'hooks','hooks.json')));
var sh=hooks.hooks.SessionStart[0].hooks[0];
check(sh.command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js" "${CLAUDE_PLUGIN_DATA}"'&&sh.timeout>=12,'hooks.json: the SessionStart command passes the data folder and the timeout covers two 5 s budgets: '+JSON.stringify(sh));
var market=JSON.parse(read(path.join(root,'.claude-plugin','marketplace.json')));
var cw=market.plugins.filter(function(p){return p.name==='cw';})[0];
check(cw&&Array.isArray(cw.dependencies)&&cw.dependencies.join()==='combat-writing-crew','marketplace.json: the cw entry depends on combat-writing-crew');
var manifest=JSON.parse(read(path.join(plugin,'.claude-plugin','plugin.json')));
check(manifest.dependencies===undefined,'plugin.json: declares no dependency (the directory copy must stay installable)');
var src=read(hook);
check(!/plugin\s*,\s*['"]install|plugin install/.test(src.replace(/\/\/[^\n]*/g,''))&&!/\bfetch\(|https?:\/\//.test(src.replace(/\/\/[^\n]*/g,'')),'session-start.js: never installs, fetches or holds a URL');
check(/^- \*\*What one install brings\.\*\*|\*\*What one install brings\.\*\* Installed from the Learning Producers marketplace/m.test(read(path.join(plugin,'README.md'))),'the plugin README has the What one install brings paragraph');
var help=read(path.join(plugin,'skills','help','SKILL.md'));
check(/^## Voices$/m.test(help)&&/`help voices` shows this section\./.test(help)&&/champion, briefs, runs, voices, files/.test(help),'help: the Voices section and the topic');
check(/first-session/.test(read(path.join(root,'CLAUDE.md')))&&/The first-session line \(Part 83/.test(read(path.join(root,'CLAUDE.md'))),'CLAUDE.md names the first-session line');

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'session_start_check: '+failures.length+' failure(s), ':'session_start_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
