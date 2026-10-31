// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// speak_check.js: THE MAC SPEAKS THE FILES (Part 81, issue 121, 2026-10-28). speak.js renders each
// answered seat of a round to an audio file in that seat's voice with the Mac's own speech engine,
// writes rounds/<round>/voices.json for the board, logs voices.rendered, and is silent on success.
// Runs the REAL speak.js from plugins/combat-writing/scripts against a fixture run in a temporary
// project, with a fake speech command (--say) that lists voices on `-v ?` and writes the voice name
// and the text it was handed on `-v V -o OUT -f IN`; the real `say` is never run.
//
// What it pins:
//   - The voice list is read from the command; only Premium or Enhanced voices count; Premium ranks
//     above Enhanced, then the founder's order (Ava, Nathan, Allison), then the name; the page's
//     language first (en).
//   - seat-1 gets the first, seat-2 the next distinct, seat-3 the next; every answered seat gets a
//     file; a seat with no answer gets none; voices.json carries engine, installed, assigned, files.
//   - The text handed to the engine is the spoken form: no rewrite fence line, no bare Answer label,
//     no markdown marks; the second pass appended under its heading when the seat has one.
//   - A voice kept for a seat in <project>/combat-writing/voices.json wins when installed, and the
//     other seats take the next distinct voices around it; --set writes that file and refuses a
//     voice that is not installed Premium or Enhanced, naming the installed ones; --list prints them.
//   - A command that fails for one seat logs voices.failed for it, writes no file for it, says so on
//     stderr, and the other seats still get theirs.
//   - No quality voice installed: voices.skipped with the reason, no files, exit 0, silent.
//   - A command that cannot start: voices.skipped, exit 0.
//   - Off macOS with no command given: voices.skipped naming the platform (forced through
//     CW_PLATFORM, read only by this harness's wrapper), exit 0.
//   - The log line voices.rendered carries the round, the assignment and the files.
//   - A silenced shell (Part 81.1, issue 123): a command that exits 0 and writes an MPEG-4 container
//     with no sound (ftyp and moov, duration 0, no mdat, the sandbox's output measured 2026-10-28)
//     is not a render: the files are removed, voices.json lists the seats as silenced with no
//     files, the log gets voices.silenced, and one stdout line names the seats owed, the round and
//     the run folder in full (Part 81.2: the hook reads the run from that line, never from the
//     shape of the host's command).
//   - A container with sound: counted, its length in seconds carried in voices.json and on the log
//     line; `--by hook` rides on the log line.
//
// Run from the repo root:   node tests/speak_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..'), scripts=path.join(root,'plugins','combat-writing','scripts');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function J(x){ return JSON.stringify(x); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,t){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,t); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}); }
function speak(args,env){ return cp.spawnSync(process.execPath,[path.join(scripts,'speak.js')].concat(args),{encoding:'utf8',env:Object.assign({},process.env,env||{})}); }

var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-speak-'));
var fake=path.join(tmp,'fakesay.sh');
write(fake,'#!/bin/bash\n'
 +'if [ "$1" = "-v" ] && [ "$2" = "?" ]; then\n'
 +'  if [ -n "$FAKE_SAY_NONE" ]; then printf "Samantha            en_US    # Hello! My name is Samantha.\\nDaniel              en_GB    # Hello! My name is Daniel.\\n"; exit 0; fi\n'
 +'  printf "Samantha            en_US    # Hello! My name is Samantha.\\nAllison (Enhanced)  en_US    # Hello! My name is Allison.\\nDaniel              en_GB    # Hello! My name is Daniel.\\nAva (Premium)       en_US    # Hello! My name is Ava.\\nNathan (Enhanced)   en_US    # Hello! My name is Nathan.\\nZoe (Premium)       en_US    # Hello! My name is Zoe.\\nAmelie (Premium)    fr_CA    # Bonjour! Je m\'appelle Amelie.\\n"; exit 0; fi\n'
 +'voice=""; out=""; in=""\n'
 +'while [ $# -gt 0 ]; do case "$1" in -v) voice="$2"; shift 2;; -o) out="$2"; shift 2;; -f) in="$2"; shift 2;; *) shift;; esac; done\n'
 +'if [ -n "$FAKE_SAY_FAIL_VOICE" ] && [ "$voice" = "$FAKE_SAY_FAIL_VOICE" ]; then echo "fake say: refused $voice" >&2; exit 1; fi\n'
 +'{ echo "VOICE: $voice"; cat "$in"; } > "$out"\n');
fs.chmodSync(fake,0o755);
// A fake that writes MPEG-4 containers: FAKE_M4A_SECONDS=0 a silent one (ftyp, moov with duration
// 0, no mdat), above 0 one with sound (an mdat atom and that duration).
var m4a=path.join(tmp,'m4a.js');
write(m4a,'var fs=require("fs");var out=process.argv[2],sec=parseFloat(process.argv[3]||"0");\n'
 +'function atom(t,b){var h=Buffer.alloc(8);h.writeUInt32BE(8+b.length,0);h.write(t,4,"latin1");return Buffer.concat([h,b]);}\n'
 +'var mv=Buffer.alloc(100);mv.writeUInt32BE(1000,12);mv.writeUInt32BE(Math.round(sec*1000),16);\n'
 +'var parts=[atom("ftyp",Buffer.from("M4A \\0\\0\\0\\0M4A mp42isom","latin1")),atom("moov",atom("mvhd",mv))];\n'
 +'if(sec>0)parts.push(atom("mdat",Buffer.alloc(256,1)));\n'
 +'fs.writeFileSync(out,Buffer.concat(parts));\n');
var fakeM4a=path.join(tmp,'fakesay-m4a.sh');
write(fakeM4a,'#!/bin/bash\n'
 +'if [ "$1" = "-v" ] && [ "$2" = "?" ]; then exec "'+fake+'" -v "?"; fi\n'
 +'out=""\n'
 +'while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2;; -v|-f) shift 2;; *) shift;; esac; done\n'
 +'exec '+JSON.stringify(process.execPath)+' "'+m4a+'" "$out" "${FAKE_M4A_SECONDS:-0}"\n');
fs.chmodSync(fakeM4a,0o755);

// A fixture run under <project>/combat-writing/runs/ with three seats and a round of answers.
var proj=path.join(tmp,'proj'), run=path.join(proj,'combat-writing','runs','2026-10-28-1200-fixture');
write(path.join(run,'seats.json'),JSON.stringify({seats:[{id:'seat-1',model:'Test Model 1.0',company:'Anthropic'},{id:'seat-2',model:'maker/model-a',company:'Alibaba'},{id:'seat-3',model:'maker/model-b',company:'OpenAI'}]},null,2));
write(path.join(run,'draft.md'),'Dana,\n\nOne line.\n');
write(path.join(run,'log.jsonl'),JSON.stringify({ts:'2026-10-28T12:00:00.000Z',event:'run.created'})+'\n');
var rd=path.join(run,'rounds','01-battle');
write(path.join(rd,'seat-1.answer.md'),'=== REWRITE BEGIN ===\nDana,\n\nThe **rewrite** line.\n=== REWRITE END ===\n\nAnswer\n\n- The *opener* quotes his page back to him.\n## Why\nIt skims.\n');
write(path.join(rd,'seat-1.crew.answer.md'),'I agree with `maker/model-a` on the opener.\n');
write(path.join(rd,'seat-2.answer.md'),'RATING: 6/10\nNot send-ready: the opener is a compliment.\n');
// seat-3 has no answer this round

// 1. The plain render
var r1=speak(['--run',run,'--round','01-battle','--say',fake]);
check(r1.status===0&&r1.stdout===''&&r1.stderr==='','render: exit 0 and silent: '+J([r1.status,r1.stdout,r1.stderr]));
var vj=JSON.parse(read(path.join(rd,'voices.json')));
check(J(vj.installed)===J(['Ava (Premium)','Zoe (Premium)','Nathan (Enhanced)','Allison (Enhanced)']),'render: installed ranks Premium first, then the founder order, English only: '+J(vj.installed));
check(vj.assigned['seat-1']==='Ava (Premium)'&&vj.assigned['seat-2']==='Zoe (Premium)'&&vj.assigned['seat-3']==='Nathan (Enhanced)','render: seats take the first, second and third distinct voices: '+J(vj.assigned));
check(vj.files['seat-1']==='seat-1.m4a'&&vj.files['seat-2']==='seat-2.m4a'&&!vj.files['seat-3']&&fs.existsSync(path.join(rd,'seat-1.m4a'))&&fs.existsSync(path.join(rd,'seat-2.m4a'))&&!fs.existsSync(path.join(rd,'seat-3.m4a')),'render: a file per answered seat, none for the seat with no answer: '+J(vj.files));
var f1=read(path.join(rd,'seat-1.m4a'));
check(/^VOICE: Ava \(Premium\)\n/.test(f1),'render: seat-1 rendered in Ava: '+f1.slice(0,40));
check(f1.indexOf('REWRITE BEGIN')<0&&f1.indexOf('REWRITE END')<0&&!/\nAnswer\n/.test(f1)&&f1.indexOf('**')<0&&f1.indexOf('*opener*')<0&&f1.indexOf('## ')<0&&f1.indexOf('- The')<0&&/The rewrite line\./.test(f1)&&/The opener quotes his page back to him\./.test(f1)&&/\nWhy\n/.test(f1),'render: the spoken text drops the fence, the Answer label and the markdown marks: '+J(f1));
check(/To the crew \(second pass\)\.\n\nI agree with maker\/model-a on the opener\./.test(f1),'render: the second pass rides under its heading, marks dropped: '+J(f1));
var lr=logOf(run).filter(function(e){return e.event==='voices.rendered';});
check(lr.length===1&&lr[0].round==='01-battle'&&lr[0].assigned['seat-1']==='Ava (Premium)'&&lr[0].files['seat-2']==='seat-2.m4a'&&typeof lr[0].ms==='number','render: the log line carries the round, the assignment and the files: '+J(lr));

// 2. --list and --set
var rl=speak(['--list','--say',fake]);
check(rl.status===0&&rl.stdout==='Voices the board would use, best first: Ava (Premium) · Zoe (Premium) · Nathan (Enhanced) · Allison (Enhanced)\n','--list: the installed quality voices, best first: '+J(rl.stdout));
var rs=speak(['--run',run,'--set','seat-1','Allison','--say',fake]);
check(rs.status===0&&/^Voice kept: seat-1 reads in Allison \(Enhanced\) from the next round \(combat-writing\/voices\.json\)\.\n$/.test(rs.stdout),'--set: keeps the voice by its base name and says so: '+J([rs.status,rs.stdout,rs.stderr]));
check(J(JSON.parse(read(path.join(proj,'combat-writing','voices.json'))))===J({'seat-1':'Allison (Enhanced)'}),'--set: writes the project file');
check(logOf(run).some(function(e){return e.event==='voices.set'&&e.seat==='seat-1'&&e.voice==='Allison (Enhanced)';}),'--set: logs voices.set in the run');
var rbad=speak(['--run',run,'--set','seat-1','Daniel','--say',fake]);
check(rbad.status===2&&/"Daniel" is not an installed Premium or Enhanced voice\. Installed: Ava \(Premium\), Zoe \(Premium\), Nathan \(Enhanced\), Allison \(Enhanced\)/.test(rbad.stderr),'--set: refuses a stock voice and names the installed ones: '+J(rbad.stderr));
// the kept voice wins and the others go around it
write(path.join(rd,'seat-3.answer.md'),'RATING: 8/10\nShips as is.\n');
var r2=speak(['--run',run,'--round','01-battle','--say',fake]);
var vj2=JSON.parse(read(path.join(rd,'voices.json')));
check(r2.status===0&&vj2.assigned['seat-1']==='Allison (Enhanced)'&&vj2.assigned['seat-2']==='Ava (Premium)'&&vj2.assigned['seat-3']==='Zoe (Premium)','kept voice: seat-1 Allison by the project file, the others the next distinct from the top: '+J(vj2.assigned));
check(/^VOICE: Allison \(Enhanced\)\n/.test(read(path.join(rd,'seat-1.m4a')))&&vj2.files['seat-3']==='seat-3.m4a','kept voice: the file is rendered in it and the third seat now has a file');

// 3. One seat's render fails
var r3=speak(['--run',run,'--round','01-battle','--say',fake],{FAKE_SAY_FAIL_VOICE:'Ava (Premium)'});
var vj3=JSON.parse(read(path.join(rd,'voices.json')));
check(r3.status===0&&!vj3.files['seat-2']&&vj3.failed['seat-2']==='fake say: refused Ava (Premium)'&&vj3.files['seat-1']==='seat-1.m4a'&&vj3.files['seat-3']==='seat-3.m4a'&&!fs.existsSync(path.join(rd,'seat-2.m4a')),'a failed seat: no file, the reason recorded, the others rendered: '+J(vj3));
check(/voice file for seat-2 not rendered: fake say: refused Ava \(Premium\); the board reads that seat with the browser/.test(r3.stderr),'a failed seat: named on stderr: '+J(r3.stderr));
check(logOf(run).some(function(e){return e.event==='voices.rendered'&&e.failed&&e.failed['seat-2'];}),'a failed seat: on the log line');

// 4. No quality voice installed
var r4=speak(['--run',run,'--round','01-battle','--say',fake],{FAKE_SAY_NONE:'1'});
var sk=logOf(run).filter(function(e){return e.event==='voices.skipped';});
check(r4.status===0&&r4.stdout===''&&sk.length===1&&/no voice named Premium or Enhanced is installed/.test(sk[0].reason)&&sk[0].installed===2,'no quality voice: skipped with the reason and the count, silent: '+J([r4.status,sk]));

// 5. A command that cannot start
var r5=speak(['--run',run,'--round','01-battle','--say',path.join(tmp,'no-such-say')]);
var sk5=logOf(run).filter(function(e){return e.event==='voices.skipped';});
check(r5.status===0&&sk5.length===2&&/could not start/.test(sk5[1].reason),'a command that cannot start: skipped, exit 0: '+J([r5.status,sk5[1]]));

// 6. Off macOS with no command: the platform named (the harness fakes the platform through a wrapper)
var wrap=path.join(tmp,'wrap.js');
write(wrap,'Object.defineProperty(process,"platform",{value:"linux"});require('+J(path.join(scripts,'speak.js'))+');');
var r6=cp.spawnSync(process.execPath,[wrap,'--run',run,'--round','01-battle'],{encoding:'utf8',env:Object.assign({},process.env,{CW_SAY:''})});
var sk6=logOf(run).filter(function(e){return e.event==='voices.skipped';});
check(r6.status===0&&sk6.length===3&&/not macOS/.test(sk6[2].reason),'off macOS: skipped naming the platform, exit 0: '+J([r6.status,r6.stderr,sk6[2]]));

// 7. Usage
var r7=speak(['--round','01-battle','--say',fake]);
check(r7.status===2&&/--run is required/.test(r7.stderr),'usage: --run required');
var r8=speak(['--run',run,'--say',fake]);
check(r8.status===2&&/--round is required/.test(r8.stderr),'usage: --round required');

// 8. A silenced shell: the container has no sound
write(path.join(rd,'seat-2.answer.md'),'RATING: 6/10\nNot send-ready: the opener is a compliment.\n');
var r9=speak(['--run',run,'--round','01-battle','--say',fakeM4a],{FAKE_M4A_SECONDS:'0'});
var vj9=JSON.parse(read(path.join(rd,'voices.json')));
check(r9.status===0&&r9.stdout==='Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1, seat-2, seat-3 owed for round 01-battle of '+run+'.\n'&&r9.stderr==='','silenced: one stdout line naming the seats owed, the round and the run folder: '+J([r9.status,r9.stdout,r9.stderr]));
check(J(vj9.files)==='{}'&&J(vj9.silenced)===J(['seat-1','seat-2','seat-3'])&&J(vj9.failed)==='{}'&&vj9.assigned['seat-1']==='Allison (Enhanced)','silenced: voices.json lists the seats as silenced with no files, the assignment kept: '+J(vj9));
check(!fs.existsSync(path.join(rd,'seat-1.m4a'))&&!fs.existsSync(path.join(rd,'seat-2.m4a'))&&!fs.existsSync(path.join(rd,'seat-3.m4a')),'silenced: the silent files are removed');
var ls9=logOf(run).filter(function(e){return e.event==='voices.silenced';});
check(ls9.length===1&&ls9[0].round==='01-battle'&&J(ls9[0].seats)===J(['seat-1','seat-2','seat-3'])&&ls9[0].by==='host'&&typeof ls9[0].ms==='number','silenced: the log line voices.silenced with the seats and by host: '+J(ls9));
check(logOf(run).filter(function(e){return e.event==='voices.rendered';}).length===3,'silenced: no voices.rendered line for a round nothing rendered');

// 9. A container with sound, rendered by the hook
var r10=speak(['--run',run,'--round','01-battle','--say',fakeM4a,'--by','hook'],{FAKE_M4A_SECONDS:'38.25'});
var vj10=JSON.parse(read(path.join(rd,'voices.json')));
check(r10.status===0&&r10.stdout===''&&r10.stderr===''&&J(vj10.files)===J({'seat-1':'seat-1.m4a','seat-2':'seat-2.m4a','seat-3':'seat-3.m4a'})&&J(vj10.silenced)==='[]','with sound: every seat has a file, silent and quiet: '+J([r10.status,r10.stdout,r10.stderr,vj10.files,vj10.silenced]));
check(vj10.seconds['seat-1']===38.3&&vj10.seconds['seat-3']===38.3,'with sound: the length in seconds read from the container, one decimal: '+J(vj10.seconds));
var lr10=logOf(run).filter(function(e){return e.event==='voices.rendered';}).pop();
check(lr10.by==='hook'&&lr10.seconds['seat-2']===38.3&&lr10.files['seat-2']==='seat-2.m4a','with sound: the log line carries by hook and the seconds: '+J(lr10));

fs.rmSync(tmp,{recursive:true,force:true});
if(failures.length){ console.log('speak_check: '+failures.length+' failure(s), '+(passes+failures.length)+' checks'); failures.forEach(function(f){console.log('  FAIL '+f);}); }
else console.log('speak_check: all passed, '+passes+' checks');
process.exit(failures.length?1:0);
