// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// session_start_check.js: the first-session line (Part 83, 2026-10-31). The founder's words: "how do
// we make it so when they install the plugin the ai crew add on is installed too or they are prompted
// after the cw installs to also install the add on ... and same for the voices ... (whatever is best
// practice and more transparent)". No hook event fires on install, so the first SessionStart is the
// moment, and a sentinel in the plugin's data folder makes it fire once. Part 128, 2026-11-16: the
// hook learns that folder from its environment alone (CLAUDE_PLUGIN_DATA, which the host exports
// to every plugin hook), the command in hooks.json names ${CLAUDE_PLUGIN_ROOT} and no other
// variable, and a host that names no folder gets the measurement at every start, never silence.
//
// What it pins, with the REAL hook as a child process, fake `claude` and `say` commands in a folder
// named by CW_SESSION_PROBE, and a temporary data folder in the hook's CLAUDE_PLUGIN_DATA:
//   - First start, the add-on absent and one quality voice: the ready line, then the add-on line
//     (lib.ADDON_INSTALL in it), then the voices line naming the count, the voice and the download
//     path, all in hookSpecificOutput.additionalContext, the context the host reads and the
//     terminal never shows; the sentinel `first-session` written with what was measured.
//   - No case carries a systemMessage key (issue 165, 2026-11-04: nothing prints on the screen at
//     session start, ever; the ready line is for the model and belongs in additionalContext alone).
//   - Second start on the same data folder: the ready line alone.
//   - First start with the add-on present and three English quality voices: the ready line alone;
//     the sentinel still written. A French premium voice and a stock voice are not counted.
//   - A `claude` that fails: the plugin cache is read instead (HOME pointed at a fake home with
//     cache/<marketplace>/combat-writing-crew/), present and absent.
//   - No data folder (no CLAUDE_PLUGIN_DATA): there is no place to remember a start, so the hook
//     measures at every start and writes nothing: the same lines on the first start and on the
//     second, both measured; the ready line alone when nothing is lacking.
//   - A data folder that is named but cannot be made: nothing is measured and nothing written.
//   - An argument is never read: a folder handed on the command line is not made and not used.
//   - The hook writes nothing but the sentinel, installs nothing (the fake `claude` records every
//     call; only `plugin list` is ever run), and the SessionStart command in hooks.json is node on
//     the hook file under ${CLAUDE_PLUGIN_ROOT} with no argument and no other variable, with a
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
var outs=[];
var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-session-'));
function fakes(dir,claudeOut,sayOut,claudeExit){
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'claude'),'#!/bin/sh\necho "$@" >> "'+dir+'/calls"\n'+(claudeExit?'exit '+claudeExit+'\n':'')+'printf %s "'+claudeOut.replace(/"/g,'\\"')+'"\n');
  fs.writeFileSync(path.join(dir,'say'),'#!/bin/sh\necho "$@" >> "'+dir+'/calls"\nprintf %s "'+sayOut.replace(/"/g,'\\"')+'"\n');
  fs.chmodSync(path.join(dir,'claude'),493); fs.chmodSync(path.join(dir,'say'),493);
}
// dataDir reaches the hook as production hands it, in CLAUDE_PLUGIN_DATA; null is a host that names
// no folder. args is for the one case that proves an argument is ignored.
function run(fakeDir,dataDir,env,args){
  var e=Object.assign({},process.env,{CW_SESSION_PROBE:fakeDir},env||{});
  delete e.CLAUDE_PLUGIN_DATA; if(dataDir)e.CLAUDE_PLUGIN_DATA=dataDir;
  var r=cp.spawnSync(process.execPath,[hook].concat(args||[]),{encoding:'utf8',env:e,cwd:tmp});
  var out=null; try{ out=JSON.parse((r.stdout||'').trim().split('\n')[0]); }catch(x){}
  outs.push(out);
  var ctx=out&&out.hookSpecificOutput&&typeof out.hookSpecificOutput.additionalContext==='string'?out.hookSpecificOutput.additionalContext:null;
  return {r:r,out:out,lines:ctx!==null?ctx.split('\n'):[]};
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
check(a.lines[1]==='The crew add-on is not installed: the crew is the two fresh readers, one company\'s models. '+lib.ADDON_INSTALL+' seats two more models on a free Groq key in the second chair, your key going only to Groq. /cw:help crew for the three states.','first start: the add-on line: '+a.lines[1]);
check(/^This Mac has 1 premium or enhanced voice \(Ava \(Premium\)\)\. The board reads each seat in its own voice when three are installed: System Settings, Accessibility, Read & Speak \(Spoken Content before macOS 26\), the ⓘ beside System voice, then the arrow beside Ava \(Premium\), Nathan \(Enhanced\) and Allison \(Enhanced\), or any Premium or Enhanced voice\. \/cw:help voices\.$/.test(a.lines[2]),'first start: the voices line counts one and names the path: '+a.lines[2]);
check(a.out.hookSpecificOutput&&a.out.hookSpecificOutput.hookEventName==='SessionStart'&&Object.keys(a.out).join()==='hookSpecificOutput'&&Object.keys(a.out.hookSpecificOutput).sort().join()==='additionalContext,hookEventName','first start: hookSpecificOutput for SessionStart with additionalContext is the whole object, no systemMessage: '+JSON.stringify(Object.keys(a.out)));
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
// 6. No data folder: no memory, so every start measures and nothing is written.
function tree(dir){ var out=[]; (function walk(d){ fs.readdirSync(d).sort().forEach(function(n){ var p=path.join(d,n); out.push(path.relative(dir,p)); if(fs.statSync(p).isDirectory())walk(p); }); })(dir); return out.join('\n'); }
function callsIn(dir){ var p=path.join(dir,'calls'); return fs.existsSync(p)?read(p).trim().split('\n'):[]; }
var f6=path.join(tmp,'f6');
fakes(f6,LIST_ABSENT,SAY_ONE);
var before6=tree(tmp);
var g=run(f6,null);
check(g.r.status===0&&g.r.stderr===''&&g.lines.length===3&&g.lines[0]===LINE&&g.lines[1]===a.lines[1]&&g.lines[2]===a.lines[2]&&Object.keys(g.out).sort().join()==='hookSpecificOutput','no data folder: the hook still measures and hands the host the same lines a first start does, in additionalContext alone: '+JSON.stringify(g.lines));
check(callsIn(f6).join()==='plugin list,-v ?','no data folder: plugin list and say -v ? are run, nothing else: '+JSON.stringify(callsIn(f6)));
var g2=run(f6,null);
check(g2.lines.join('\n')===g.lines.join('\n')&&callsIn(f6).length===4,'no data folder, second start: measured again, the same lines (no memory, never silence): '+JSON.stringify(g2.lines)+' calls '+callsIn(f6).length);
check(tree(tmp).replace(/(^|\n)f6\/calls(?=\n|$)/,'')===before6,'no data folder: the hook wrote something (only the fake commands\' own call record may be new)');
var f6b=path.join(tmp,'f6b');
fakes(f6b,LIST_PRESENT,SAY_THREE);
var g3=run(f6b,null);
check(g3.r.status===0&&g3.lines.length===1&&g3.lines[0]===LINE&&callsIn(f6b).length===2,'no data folder, nothing lacking: measured, the ready line alone: '+JSON.stringify(g3.lines));
// A data folder the hook cannot make (its parent is a file): nothing is measured, nothing written, as before.
var f7=path.join(tmp,'f7'), blocker=path.join(tmp,'blocker');
fakes(f7,LIST_ABSENT,SAY_ONE);
fs.writeFileSync(blocker,'a file where a folder would go\n');
var u=run(f7,path.join(blocker,'data'));
check(u.r.status===0&&u.r.stderr===''&&u.lines.length===1&&u.lines[0]===LINE&&callsIn(f7).length===0&&read(blocker)==='a file where a folder would go\n','a data folder that cannot be made: the ready line alone, nothing measured, nothing written: '+JSON.stringify(u.lines)+' calls '+callsIn(f7).length);
// An argument is never read: the folder comes from the environment alone.
var d8=path.join(tmp,'d8'), f8=path.join(tmp,'f8');
fakes(f8,LIST_ABSENT,SAY_ONE);
var h8=run(f8,null,null,[d8]);
check(h8.r.status===0&&h8.lines.length===3&&!fs.existsSync(d8),'a folder handed as an argument is not made and not used: '+JSON.stringify(h8.lines)+' exists '+fs.existsSync(d8));
var h9=run(f8,d8,null,[path.join(tmp,'d9')]);
check(h9.lines.length===3&&fs.existsSync(path.join(d8,'first-session'))&&!fs.existsSync(path.join(tmp,'d9')),'with CLAUDE_PLUGIN_DATA set and an argument beside it, the sentinel lands in the environment\'s folder');
// No case prints on the screen: no systemMessage key in any output (issue 165).
check(outs.length>=13&&outs.every(function(o){ return o&&!('systemMessage' in o); }),'no run carries a systemMessage key: nothing prints on the screen at session start; got '+outs.map(function(o){return o?Object.keys(o).join('+'):'(none)';}).join(', '));
// 7. hooks.json, the manifests, the docs.
var hooks=JSON.parse(read(path.join(plugin,'hooks','hooks.json')));
var sh=hooks.hooks.SessionStart[0].hooks[0];
check(sh.command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.js"'&&sh.args===undefined&&sh.timeout>=12,'hooks.json: the SessionStart command is node on the hook file under ${CLAUDE_PLUGIN_ROOT}, no argument, no other variable, and the timeout covers two 5 s budgets: '+JSON.stringify(sh));
check(!/CLAUDE_PLUGIN_DATA/.test(read(path.join(plugin,'hooks','hooks.json'))),'hooks.json names CLAUDE_PLUGIN_DATA: the hook reads its data folder from the environment, never from the command line');
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
check(/never carries `systemMessage`/.test(read(path.join(root,'CLAUDE.md')))&&/prints nothing to the person/.test(read(path.join(plugin,'README.md')))&&/prints nothing to the person/.test(read(path.join(root,'docs','plugin-map.md'))),'CLAUDE.md, the plugin README and the plugin map say the hook prints nothing to the person (issue 165)');

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'session_start_check: '+failures.length+' failure(s), ':'session_start_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
