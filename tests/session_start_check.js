// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// session_start_check.js: the first-session line (Part 83, 2026-10-31). The founder's words: "how do
// we make it so when they install the plugin the ai crew add on is installed too or they are prompted
// after the cw installs to also install the add on ... and same for the voices ... (whatever is best
// practice and more transparent)". No hook event fires on install, so the first SessionStart is the
// moment, and a sentinel in the plugin's data folder makes it fire once. Part 128, 2026-11-16: the
// hook learns that folder from its environment alone (CLAUDE_PLUGIN_DATA, which the host exports
// to every plugin hook), the command in hooks.json names ${CLAUDE_PLUGIN_ROOT} and no other
// variable, and the check is skipped only when the hook can see its sentinel: a host that names no
// folder, or one the hook cannot make, read or write, gets the measurement at every start, never
// silence. Part 129, 2026-11-16 (issue 210): the sentinel is the proof the check ran, so it is
// written only when every measurement the start owed came back; a start where one did not writes
// nothing, and the next start measures again.
//
// What it pins, with the REAL hook as a child process, fake `claude` and `say` commands in a folder
// that is the whole of the child's PATH (issue 239: the hook reads no switch of the tests'; it
// finds the two commands the way it finds the real ones), and a temporary data folder in the
// hook's CLAUDE_PLUGIN_DATA:
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
//   - A measurement that did not come back (Part 129): the add-on unmeasured (`claude` fails and
//     no cache), or the voice list unread on a Mac (`say` fails, or is not there): no line for
//     the part unmeasured, the line for a lack that was measured still given, NO sentinel, and the
//     second start measures again; when the measurement comes back at a later start the sentinel
//     is written then, holding no unmeasured part, and the start after it measures nothing.
//   - Off a Mac (the fake folder's `platform` file names the platform the child is started
//     as, through a file of the test's own that node loads before the hook; with none the child
//     is a Mac) there is no voice measurement to owe: `say` is never run, the add-on alone
//     decides, the sentinel is written with `voices` null, and an unmeasured add-on still
//     writes none.
//   - The tests' old switch is gone (issue 239): CW_SESSION_PROBE naming a folder of commands
//     runs none of them, and the hook's code reads no variable of that name.
//   - Every sentinel the suite writes, found by a walk, holds two whole measurements.
//   - No data folder (no CLAUDE_PLUGIN_DATA): there is no place to remember a start, so the hook
//     measures at every start and writes nothing: the same lines on the first start and on the
//     second, both measured; the ready line alone when nothing is lacking.
//   - A data folder that is named but cannot be made: the check is skipped only when the hook can
//     see the sentinel, so it measures at the first start and again at the second, nothing written.
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
function fakes(dir,claudeOut,sayOut,claudeExit,sayExit){
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'claude'),'#!/bin/sh\necho "$@" >> "'+dir+'/calls"\n'+(claudeExit?'exit '+claudeExit+'\n':'')+'printf %s "'+claudeOut.replace(/"/g,'\\"')+'"\n');
  fs.writeFileSync(path.join(dir,'say'),'#!/bin/sh\necho "$@" >> "'+dir+'/calls"\n'+(sayExit?'exit '+sayExit+'\n':'')+'printf %s "'+sayOut.replace(/"/g,'\\"')+'"\n');
  fs.chmodSync(path.join(dir,'claude'),493); fs.chmodSync(path.join(dir,'say'),493);
}
// dataDir reaches the hook as production hands it, in CLAUDE_PLUGIN_DATA; null is a host that names
// no folder. args is for the one case that proves an argument is ignored.
// The fakes reach the hook the way the real commands do: the fake folder is the child's whole
// PATH, so `claude` and `say` are the fakes or are not there. The platform the child is started
// as is the fake folder's `platform` file, a Mac with none, set by a file of the test's own that
// node loads before the hook (NODE_OPTIONS); the hook itself reads no switch.
var asPlatform=path.join(tmp,'as-platform.js');
fs.writeFileSync(asPlatform,'if(process.env.FAKE_PLATFORM)Object.defineProperty(process,"platform",{value:process.env.FAKE_PLATFORM});\n');
function run(fakeDir,dataDir,env,args){
  var plat='darwin'; try{ plat=fs.readFileSync(path.join(fakeDir,'platform'),'utf8').trim()||'darwin'; }catch(x){}
  var e=Object.assign({},process.env,{PATH:fakeDir,NODE_OPTIONS:'--require '+asPlatform,FAKE_PLATFORM:plat},env||{});
  delete e.CW_SESSION_PROBE;
  if(env&&env.CW_SESSION_PROBE)e.CW_SESSION_PROBE=env.CW_SESSION_PROBE;
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
// 5b. A measurement that did not come back (issue 210, Part 129). The sentinel is the proof the check
// ran, so a start where the add-on or the Mac's voice list could not be read writes none: the next
// start measures again, and the sentinel is written at the first start where both came back.
function sentinelOf(dir){ var p=path.join(dir,'first-session'); if(!fs.existsSync(p))return null; try{ return JSON.parse(read(p)); }catch(x){ return {unparsed:read(p)}; } }
function measuredWhole(s){ return !!s&&!!s.addon&&typeof s.addon.present==='boolean'&&s.addon.by!=='unmeasured'&&(s.voices===null||Array.isArray(s.voices)); }
// The add-on unmeasured: `claude` fails and there is no cache to read.
var home7=path.join(tmp,'home7'); fs.mkdirSync(home7);
var f5c=path.join(tmp,'f5c'), d7=path.join(tmp,'d7');
fakes(f5c,'',SAY_THREE,1);
var e7=run(f5c,d7,{HOME:home7});
check(e7.r.status===0&&e7.r.stderr===''&&e7.lines.length===1&&e7.lines[0]===LINE,'add-on unmeasured (claude fails, no cache): the ready line alone, no line for a part nobody measured: '+JSON.stringify(e7.lines));
check(sentinelOf(d7)===null&&fs.existsSync(d7)&&fs.readdirSync(d7).length===0,'add-on unmeasured: the sentinel is written although the add-on was never measured, so this host is never measured again: '+JSON.stringify(sentinelOf(d7)));
var e7b=run(f5c,d7,{HOME:home7});
check(e7b.r.status===0&&e7b.lines.length===1&&callsIn(f5c).length===4&&sentinelOf(d7)===null,'add-on unmeasured, second start: measured again (four calls), still no sentinel: calls '+callsIn(f5c).length+' sentinel '+JSON.stringify(sentinelOf(d7)));
// The measurement comes back at the third start (the cache can be read now): the line, and the sentinel.
fs.mkdirSync(path.join(home7,'.claude','plugins','cache','learning-producers','cw'),{recursive:true});
var e7c=run(f5c,d7,{HOME:home7});
var s7=sentinelOf(d7);
check(e7c.lines.length===2&&/^The crew add-on is not installed/.test(e7c.lines[1])&&measuredWhole(s7)&&s7.addon.present===false&&s7.addon.by==='plugin cache'&&Array.isArray(s7.voices)&&s7.voices.length===3,'add-on unmeasured twice, measured at the third start: the add-on line and the sentinel written then, holding what was measured: '+JSON.stringify(e7c.lines)+' '+JSON.stringify(s7));
var e7d=run(f5c,d7,{HOME:home7});
check(e7d.lines.length===1&&e7d.lines[0]===LINE&&callsIn(f5c).length===6,'after the sentinel: the ready line alone, nothing measured again: calls '+callsIn(f5c).length);
// The mirror: the add-on unmeasured and one voice counted. The voices line is still given, and no sentinel.
var f5d=path.join(tmp,'f5d'), d7m=path.join(tmp,'d7m'), home7m=path.join(tmp,'home7m'); fs.mkdirSync(home7m);
fakes(f5d,'',SAY_ONE,1);
var e7m=run(f5d,d7m,{HOME:home7m});
check(e7m.r.status===0&&e7m.lines.length===2&&e7m.lines[0]===LINE&&e7m.lines[1]===a.lines[2]&&sentinelOf(d7m)===null,'add-on unmeasured, one voice counted: the voices line (measured) still given, no add-on line, no sentinel: '+JSON.stringify(e7m.lines)+' '+JSON.stringify(sentinelOf(d7m)));
// The voice list unread on a Mac: `say` fails. The add-on was measured absent, so its line is still given.
var fv=path.join(tmp,'fv'), dv=path.join(tmp,'dv');
fakes(fv,LIST_ABSENT,'',0,1);
var v1=run(fv,dv);
check(v1.r.status===0&&v1.r.stderr===''&&v1.lines.length===2&&v1.lines[0]===LINE&&v1.lines[1]===a.lines[1],'voice list unread: the add-on line (measured) still given, no voices line: '+JSON.stringify(v1.lines));
check(sentinelOf(dv)===null,'voice list unread: the sentinel is written although the voices were never counted: '+JSON.stringify(sentinelOf(dv)));
var v2=run(fv,dv);
check(v2.lines.join('\n')===v1.lines.join('\n')&&callsIn(fv).length===4&&sentinelOf(dv)===null,'voice list unread, second start: measured again, the same lines, still no sentinel: calls '+callsIn(fv).length+' '+JSON.stringify(v2.lines));
fakes(fv,LIST_ABSENT,SAY_ONE);
var v3=run(fv,dv);
var sv=sentinelOf(dv);
check(v3.lines.length===3&&v3.lines.join('\n')===a.lines.join('\n')&&measuredWhole(sv)&&sv.addon.present===false&&Array.isArray(sv.voices)&&sv.voices.join()==='Ava (Premium)','voice list read at the third start: both lines and the sentinel written then: '+JSON.stringify(v3.lines)+' '+JSON.stringify(sv));
var v4=run(fv,dv);
check(v4.lines.length===1&&callsIn(fv).length===6,'after the sentinel: nothing measured again: calls '+callsIn(fv).length);
// No `say` command at all on a Mac: unread, as a failed one is.
var fn=path.join(tmp,'fn'), dn=path.join(tmp,'dn');
fakes(fn,LIST_PRESENT,SAY_THREE); fs.unlinkSync(path.join(fn,'say'));
var n1=run(fn,dn);
check(n1.r.status===0&&n1.r.stderr===''&&n1.lines.length===1&&sentinelOf(dn)===null,'no say command on a Mac: the voice list is unread, no sentinel: '+JSON.stringify(n1.lines)+' '+JSON.stringify(sentinelOf(dn)));
// Neither came back.
var fb=path.join(tmp,'fb'), db=path.join(tmp,'db'), homeb=path.join(tmp,'homeb'); fs.mkdirSync(homeb);
fakes(fb,'','',1,1);
var b1=run(fb,db,{HOME:homeb});
check(b1.r.status===0&&b1.lines.length===1&&sentinelOf(db)===null,'neither measurement came back: the ready line alone, no sentinel: '+JSON.stringify(b1.lines)+' '+JSON.stringify(sentinelOf(db)));
// 5c. Off a Mac there is no voice measurement to owe: `say` is never run and the add-on alone decides.
function platformOf(dir,name){ fs.writeFileSync(path.join(dir,'platform'),name+'\n'); }
var fl=path.join(tmp,'fl'), dl=path.join(tmp,'dl');
fakes(fl,LIST_PRESENT,SAY_ONE); platformOf(fl,'linux');
var l1=run(fl,dl);
var sl=sentinelOf(dl);
check(l1.r.status===0&&l1.r.stderr===''&&l1.lines.length===1&&l1.lines[0]===LINE&&callsIn(fl).join()==='plugin list','off a Mac: the ready line alone and say never run: '+JSON.stringify(l1.lines)+' calls '+JSON.stringify(callsIn(fl)));
check(measuredWhole(sl)&&sl.addon.present===true&&sl.voices===null,'off a Mac, the add-on measured: the sentinel is written, voices null (no measurement owed there): '+JSON.stringify(sl));
var l2=run(fl,dl);
check(l2.lines.length===1&&callsIn(fl).length===1,'off a Mac, second start: nothing measured again: calls '+callsIn(fl).length);
var fl2=path.join(tmp,'fl2'), dl2=path.join(tmp,'dl2');
fakes(fl2,LIST_ABSENT,SAY_ONE); platformOf(fl2,'win32');
var l3=run(fl2,dl2);
var sl2=sentinelOf(dl2);
check(l3.lines.length===2&&l3.lines[1]===a.lines[1]&&callsIn(fl2).join()==='plugin list'&&measuredWhole(sl2)&&sl2.addon.present===false&&sl2.voices===null,'off a Mac, the add-on absent: the add-on line, no voices line, the sentinel written: '+JSON.stringify(l3.lines)+' '+JSON.stringify(sl2));
var fl3=path.join(tmp,'fl3'), dl3=path.join(tmp,'dl3'), homel=path.join(tmp,'homel'); fs.mkdirSync(homel);
fakes(fl3,'',SAY_THREE,1); platformOf(fl3,'linux');
var l4=run(fl3,dl3,{HOME:homel});
var l5=run(fl3,dl3,{HOME:homel});
check(l4.lines.length===1&&l5.lines.length===1&&sentinelOf(dl3)===null&&callsIn(fl3).join()==='plugin list,plugin list','off a Mac, the add-on unmeasured: no sentinel, and the second start measures again: '+JSON.stringify(sentinelOf(dl3))+' calls '+JSON.stringify(callsIn(fl3)));
// A platform file that names a Mac is a Mac: the voices are owed.
var fm=path.join(tmp,'fm'), dm=path.join(tmp,'dm');
fakes(fm,LIST_PRESENT,SAY_ONE); platformOf(fm,'darwin');
var m1=run(fm,dm);
check(m1.lines.length===2&&/^This Mac has 1 premium or enhanced voice /.test(m1.lines[1])&&callsIn(fm).join()==='plugin list,-v ?','a platform file naming a Mac: the voices are measured: '+JSON.stringify(m1.lines));
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
// A data folder the hook cannot make (its parent is a file): no sentinel can be seen, so every start measures.
var f7=path.join(tmp,'f7'), blocker=path.join(tmp,'blocker');
fakes(f7,LIST_ABSENT,SAY_ONE);
fs.writeFileSync(blocker,'a file where a folder would go\n');
var u=run(f7,path.join(blocker,'data'));
check(u.r.status===0&&u.r.stderr===''&&u.lines.length===3&&u.lines.join('\n')===a.lines.join('\n')&&callsIn(f7).join()==='plugin list,-v ?'&&read(blocker)==='a file where a folder would go\n','a data folder that cannot be made: the hook measures and hands the host the lines a first start does, and writes nothing: '+JSON.stringify(u.lines)+' calls '+callsIn(f7).length);
var u2=run(f7,path.join(blocker,'data'));
check(u2.r.status===0&&u2.lines.join('\n')===u.lines.join('\n')&&callsIn(f7).length===4&&read(blocker)==='a file where a folder would go\n','a data folder that cannot be made, second start: measured again, the same lines (no sentinel seen, never silence): '+JSON.stringify(u2.lines)+' calls '+callsIn(f7).length);
// An argument is never read: the folder comes from the environment alone.
var d8=path.join(tmp,'d8'), f8=path.join(tmp,'f8');
fakes(f8,LIST_ABSENT,SAY_ONE);
var h8=run(f8,null,null,[d8]);
check(h8.r.status===0&&h8.lines.length===3&&!fs.existsSync(d8),'a folder handed as an argument is not made and not used: '+JSON.stringify(h8.lines)+' exists '+fs.existsSync(d8));
var h9=run(f8,d8,null,[path.join(tmp,'d9')]);
check(h9.lines.length===3&&fs.existsSync(path.join(d8,'first-session'))&&!fs.existsSync(path.join(tmp,'d9')),'with CLAUDE_PLUGIN_DATA set and an argument beside it, the sentinel lands in the environment\'s folder');
// Every sentinel any case above wrote, found by walking the whole temporary folder, holds two whole
// measurements: none records an unmeasured add-on, and the voices are a list or, off a Mac, null.
var written=tree(tmp).split('\n').filter(function(rel){ return path.basename(rel)==='first-session'; });
// A null voice list is whole only where none was owed: the two data folders of the off-Mac cases.
var offMac=[dl,dl2];
function whole(rel){ var dir=path.dirname(path.join(tmp,rel)), s=sentinelOf(dir); return measuredWhole(s)&&(Array.isArray(s.voices)||offMac.indexOf(dir)>=0); }
check(written.length>=9&&written.every(whole),'a sentinel the suite wrote holds an unmeasured part (an unmeasured add-on, or a null voice list from a Mac), or fewer were written than the cases above write: '+JSON.stringify(written.filter(function(rel){ return !whole(rel); }))+' of '+written.length);
// No case prints on the screen: no systemMessage key in any output (issue 165).
check(outs.length>=14&&outs.every(function(o){ return o&&!('systemMessage' in o); }),'no run carries a systemMessage key: nothing prints on the screen at session start; got '+outs.map(function(o){return o?Object.keys(o).join('+'):'(none)';}).join(', '));
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
// The platform is the machine's own, read in one place, and the voices are owed on darwin alone.
check(/if\(process\.platform!=='darwin'\)return \{owed:false,names:null\};/.test(src)&&(src.replace(/\/\/[^\n]*/g,'').match(/process\.platform/g)||[]).length===1,'session-start.js: the platform must be process.platform, read in one place, and the voices owed on darwin alone');
// THE TESTS' SWITCH IS GONE (issue 239). CW_SESSION_PROBE named a folder whose `claude` and `say`
// the hook ran in place of the real ones, so whoever could set a variable in the session chose
// two programs the hook started at session start. A folder named by it now runs nothing: the
// commands the hook finds are the ones on its PATH, here the fakes that say the add-on is there.
var planted=path.join(tmp,'planted'), plantedMark=path.join(tmp,'planted-ran');
fs.mkdirSync(planted);
['claude','say'].forEach(function(n){ fs.writeFileSync(path.join(planted,n),'#!/bin/sh\necho ran >> "'+plantedMark+'"\nexit 0\n'); fs.chmodSync(path.join(planted,n),493); });
var fp=path.join(tmp,'fp'); fakes(fp,LIST_PRESENT,SAY_THREE);
var pr=run(fp,path.join(tmp,'dp'),{CW_SESSION_PROBE:planted});
check(!fs.existsSync(plantedMark),'the tests\' switch: a folder named by CW_SESSION_PROBE had its commands run by the hook');
check(pr.lines.length===1&&callsIn(fp).join()==='plugin list,-v ?','the tests\' switch: the hook must measure with the commands on its PATH, got lines '+JSON.stringify(pr.lines)+' calls '+JSON.stringify(callsIn(fp)));
check(!/CW_SESSION_PROBE|CW_[A-Z_]+/.test(src.replace(/\/\/[^\n]*/g,'')),'session-start.js: the code reads a CW_ variable; the tests reach it through PATH alone');
check(!/plugin\s*,\s*['"]install|plugin install/.test(src.replace(/\/\/[^\n]*/g,''))&&!/\bfetch\(|https?:\/\//.test(src.replace(/\/\/[^\n]*/g,'')),'session-start.js: never installs, fetches or holds a URL');
check(/^- \*\*What one install brings\.\*\*|\*\*What one install brings\.\*\* Installed from the Learning Producers marketplace/m.test(read(path.join(plugin,'README.md'))),'the plugin README has the What one install brings paragraph');
var help=read(path.join(plugin,'skills','help','SKILL.md'));
check(/^## Voices$/m.test(help)&&/`help voices` shows this section\./.test(help)&&/champion, briefs, runs, voices, files/.test(help),'help: the Voices section and the topic');
check(/first-session/.test(read(path.join(root,'CLAUDE.md')))&&new RegExp('^- The session-start hook:[^\\n]* Held by: [^\\n]*tests/session_start_check\\.js','m').test(read(path.join(root,'CLAUDE.md')))&&/The first-session line \(Part 83/.test(read(path.join(root,'RULINGS.md'))),'CLAUDE.md names the first-session line and its bullet names this check (issue 226), and RULINGS.md (issue 224) names the line with its part');
var NEXT=/the next start measures again/;
check(NEXT.test(read(path.join(root,'RULINGS.md')))&&NEXT.test(read(path.join(root,'README.md')))&&NEXT.test(read(path.join(plugin,'README.md')))&&NEXT.test(read(path.join(root,'docs','plugin-map.md')))&&NEXT.test(read(path.join(root,'docs','directory-checklist.md')))&&NEXT.test(src),'RULINGS.md (issue 226: the sentence left CLAUDE.md, the checks above hold it in the hook), the two READMEs, the plugin map, the checklist and the hook\'s own header each say what a start does after a measurement that did not come back: "the next start measures again" (Part 129)');
check(!/the sentinel is still written/.test(read(path.join(root,'CLAUDE.md')))&&!/the sentinel is still written/.test(read(path.join(root,'RULINGS.md'))),'CLAUDE.md or RULINGS.md still says the sentinel is written after a failed measurement (issue 210)');
check(/never carries `systemMessage`/.test(read(path.join(root,'RULINGS.md')))&&/prints nothing to the person/.test(read(path.join(plugin,'README.md')))&&/prints nothing to the person/.test(read(path.join(root,'docs','plugin-map.md'))),'RULINGS.md (issue 226: the sentence left CLAUDE.md), the plugin README and the plugin map say the hook prints nothing to the person (issue 165)');

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'session_start_check: '+failures.length+' failure(s), ':'session_start_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
