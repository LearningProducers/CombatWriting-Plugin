// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// show_result_check.js: the result shown by the plugin itself (issue 70, 2026-10-26). The
// PostToolUse hook on Bash, hooks/show-result.js, puts the short form on the person's screen
// through systemMessage when the command ran render-record.js --short, opens the board outside
// the sandbox when the opener's line says the shell could not, and is silent otherwise.
//
// Runs the REAL hook as a child process with the hook's stdin JSON (the PostToolUse shape:
// tool_name, tool_input.command, tool_response {stdout, stderr}), around the REAL short form
// render-record.js prints for a real run and the REAL lines open-board.js prints with a failing
// opener and with none; the board is opened through a fake opener named by CW_OPENER.
//
// What it pins:
//   - Silent (no output, exit 0): another event, another tool, a command that ran neither script,
//     stdin that does not parse, a --short result with no short form in it.
//   - The short form: systemMessage is exactly the Crew line through the Seat key line of the
//     script's stdout, nothing before it (an "Exit code 1" line, another script's output) and
//     nothing after; the tool_response as an object with stdout and as a string both read.
//   - The opener: a failed line makes the hook run the opener on the board's path; exit 0 logs
//     board.opened ok:true by:hook and says "Board opened by the plugin: <path>"; exit 1 logs
//     ok:false with the opener's first stderr line and says the plugin could not open it either,
//     with the open command; a no-opener line is retried the same way; an opened line is shown
//     as printed and no opener is run.
//   - One combined command (the three scripts in one Bash call, the 2026-10-26 shape) yields the
//     short form and the opener's result in one message.
//   - The voices (Part 81.1, issue 123): when the command ran speak.js and its line says the engine
//     wrote no sound in that shell, the hook runs speak.js itself (here with a fake command through
//     CW_SAY that writes an MPEG-4 container with sound) and says "Voices rendered by the plugin"
//     naming the voice, the seat and the length in seconds, the file on disk with voices.json and the
//     log line by hook; with render-board.js in the same command the board is rebuilt and carries
//     the file, and with the opener too the message says to reload; a render still silent says so;
//     a speak.js that printed nothing is silent; the short form rides first and the voices line
//     after it.
//   - additionalContext tells the host the lines are on the screen and to print the round line
//     and the picker only. The output is one JSON line, exit 0, nothing on stderr.
//   - hooks.json carries the PostToolUse entry on Bash with a timeout under 15; the source has
//     the Shield header, the one PROVED_ON constant, and spawns only the opener.
//
// Run from the repo root:   node tests/show_result_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var plugin=path.join(__dirname,'..','plugins','combat-writing');
var hook=path.join(plugin,'hooks','show-result.js');
var scripts=path.join(plugin,'scripts');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-show-'));
var proj=path.join(tmp,'proj'); fs.mkdirSync(proj);
fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company. The ask lands in the first line.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','show','--model','Test Model']).stdout.trim();
node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-1']);
fs.writeFileSync(path.join(run,'rounds','01-sparring','seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
node('check-answer.js',[path.join(run,'rounds','01-sparring','seat-1.answer.md'),'--run',run]);
var shortForm=node('render-record.js',['--run',run,'--short']).stdout;
var board=path.join(run,'board.html');
node('render-board.js',['--run',run]);
var expected=shortForm.replace(/\n+$/,'');
check(/^\*\*Crew:\*\*/.test(expected)&&/\nSeat key: seat-1 [^\n]+$/.test(expected),'the real short form opens with the Crew line and ends with the Seat key line');
var failer=path.join(tmp,'fail.js'); fs.writeFileSync(failer,'process.stderr.write("kLSNoExecutableErr: The executable is missing\\n");process.exit(1);\n');
var failedLine=node('open-board.js',['--run',run,'--opener',process.execPath+' '+failer]).stdout.trim();
var noOpenerLine=node('open-board.js',['--run',run,'--opener',path.join(tmp,'no-such-opener')]).stdout.trim();
var openedLine='Board opened in your browser: '+board;
check(/^Board: .*\(the opener failed: /.test(failedLine)&&/^Board: .*\(no browser opener here: /.test(noOpenerLine),'the real opener lines');
// Fake openers for the hook: one that records its argument and exits 0, one that exits 1 with a reason.
var marker=path.join(tmp,'opened.txt');
var okOpener=path.join(tmp,'ok.js'); fs.writeFileSync(okOpener,'require("fs").appendFileSync('+JSON.stringify(marker)+',process.argv[2]+"\\n");process.exit(0);\n');
var badOpener=path.join(tmp,'bad.js'); fs.writeFileSync(badOpener,'process.stderr.write("no display here\\n");process.exit(1);\n');
function logOf(){ return fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){return JSON.parse(l);}); }
function opens(){ return fs.existsSync(marker)?fs.readFileSync(marker,'utf8').trim().split('\n').filter(Boolean):[]; }

function call(input,opener,extra){
  var env=Object.assign({},process.env,extra||{}); delete env.CW_OPENER; if(opener)env.CW_OPENER=process.execPath+' '+opener;
  var raw=typeof input==='string'?input:JSON.stringify(input);
  var r=cp.spawnSync(process.execPath,[hook],{input:raw,encoding:'utf8',cwd:proj,env:env});
  var out=r.stdout.trim(), json=null; try{json=out?JSON.parse(out):null;}catch(e){}
  return {status:r.status,out:out,json:json,stderr:r.stderr};
}
function post(command,stdout,extra){ return Object.assign({session_id:'s',transcript_path:path.join(tmp,'t.jsonl'),cwd:proj,hook_event_name:'PostToolUse',tool_name:'Bash',tool_input:{command:command,description:'x'},tool_response:{stdout:stdout,stderr:'',interrupted:false,isImage:false},tool_use_id:'toolu_x'},extra||{}); }
function silent(name,r){ check(r.status===0&&r.out===''&&r.stderr==='',name+': expected silence and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,120))+' err '+r.stderr); }
function shown(name,r){ check(r.status===0&&!!r.json&&typeof r.json.systemMessage==='string'&&r.json.hookSpecificOutput&&r.json.hookSpecificOutput.hookEventName==='PostToolUse'&&/on the person's screen already/.test(r.json.hookSpecificOutput.additionalContext)&&Object.keys(r.json).sort().join(',')==='hookSpecificOutput,systemMessage'&&r.stderr===''&&r.out.split('\n').length===1,name+': expected one JSON line with systemMessage and the context, got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,200))+' err '+r.stderr); return r.json?r.json.systemMessage:''; }

var S='node '+scripts+'/render-record.js --run '+run+' --short', B='node '+scripts+'/render-board.js --run '+run, O='node '+scripts+'/open-board.js --run '+run;

// Silent.
silent('another event',call(post(S,shortForm,{hook_event_name:'PreToolUse'})));
silent('another tool',call(post(S,shortForm,{tool_name:'Read'})));
silent('neither script',call(post('ls '+run,'draft.md\n')));
silent('a script only mentioned in an argument',call(post('grep -n short '+scripts+'/render-record.js','217: --short\n')));
silent('stdin that does not parse',call('{not json'));
silent('a --short result with no short form',call(post(S,'Error: no seats.json\n')));

// The short form.
var m1=shown('the short form',call(post(S,shortForm)));
check(m1===expected,'the short form: systemMessage must be the Crew line through the Seat key line, got '+JSON.stringify(m1.slice(0,120))+' ... '+JSON.stringify(m1.slice(-60)));
var m2=shown('the short form behind a pipe',call(post('cd '+proj+' && '+S+' 2>&1 | cat',shortForm)));
check(m2===expected,'the short form behind a pipe: same message');
var m3=shown('tool_response as a string',call(post(S,shortForm,{tool_response:shortForm})));
check(m3===expected,'tool_response as a string: same message');
var m4=shown('the 2026-10-26 shape',call(post('S='+scripts+'; R='+run+'; node $S/render-record.js --run $R --short; echo ===BOARD; node $S/render-board.js --run $R; echo ===OPEN; node $S/open-board.js --run $R','Exit code 1\n'+shortForm+'===BOARD\n'+board+'\n===OPEN\n'+openedLine+'\n')));
check(m4===expected+'\n\n'+openedLine,'the combined command: the short form then the opener\'s line, nothing else, got '+JSON.stringify(m4.slice(-160)));

// The opener.
var before=logOf().length;
var m5=shown('the opener failed, the plugin opens it',call(post(O,failedLine+'\n'),okOpener));
check(m5==='Board opened by the plugin: '+board,'the opener failed: the message, got '+JSON.stringify(m5));
check(opens().length===1&&opens()[0]===board,'the opener failed: the fake opener must be run once on the board, got '+JSON.stringify(opens()));
var e5=logOf().slice(before);
check(e5.length===1&&e5[0].event==='board.opened'&&e5[0].ok===true&&e5[0].by==='hook'&&e5[0].file==='board.html'&&/ok\.js|node/.test(e5[0].opener),'the opener failed: one board.opened line by the hook, got '+JSON.stringify(e5));
var m6=shown('the plugin could not open it either',call(post(O,failedLine+'\n'),badOpener));
check(m6==='Board: '+board+' (the plugin could not open it either: no display here (exit 1); open it yourself: open '+board+')','the plugin could not open it either: the message, got '+JSON.stringify(m6));
var e6=logOf().slice(-1)[0];
check(e6.event==='board.opened'&&e6.ok===false&&e6.by==='hook'&&/no display here/.test(e6.reason),'the plugin could not open it either: the log line, got '+JSON.stringify(e6));
var m7=shown('no opener in the shell',call(post(O,noOpenerLine+'\n'),okOpener));
check(m7==='Board opened by the plugin: '+board&&opens().length===2,'no opener in the shell: the plugin opens it, got '+JSON.stringify(m7));
var m8=shown('the shell opened it',call(post(O,openedLine+'\n'),okOpener));
check(m8===openedLine&&opens().length===2,'the shell opened it: the line as printed and no second open, got '+JSON.stringify(m8));
var m9=shown('one command, the short form and a failed opener',call(post(S+'; '+B+'; '+O,shortForm+board+'\n'+failedLine+'\n'),okOpener));
check(m9===expected+'\n\nBoard opened by the plugin: '+board&&opens().length===3,'one command: the short form then the plugin\'s line, got '+JSON.stringify(m9.slice(-120)));
var m10=shown('a missing opener program',call(post(O,failedLine+'\n'),path.join(tmp,'nope.js')));
check(/^Board: .*\(the plugin could not open it either: /.test(m10),'a missing opener program: named, not thrown, got '+JSON.stringify(m10));

// The voices: a fake speech command that lists one quality voice and writes an MPEG-4 container
// with FAKE_M4A_SECONDS of sound (0: a silent one, the sandbox's output).
var fakeSay=path.join(tmp,'fakesay.js');
fs.writeFileSync(fakeSay,'var fs=require("fs");var a=process.argv.slice(2);\n'
 +'if(a[0]==="-v"&&a[1]==="?"){process.stdout.write("Samantha            en_US    # Hello! My name is Samantha.\\nAva (Premium)       en_US    # Hello! My name is Ava.\\n");process.exit(0);}\n'
 +'var out=a[a.indexOf("-o")+1],sec=parseFloat(process.env.FAKE_M4A_SECONDS||"0");\n'
 +'function atom(t,b){var h=Buffer.alloc(8);h.writeUInt32BE(8+b.length,0);h.write(t,4,"latin1");return Buffer.concat([h,b]);}\n'
 +'var mv=Buffer.alloc(100);mv.writeUInt32BE(1000,12);mv.writeUInt32BE(Math.round(sec*1000),16);\n'
 +'var parts=[atom("ftyp",Buffer.from("M4A \\0\\0\\0\\0M4A mp42isom","latin1")),atom("moov",atom("mvhd",mv))];\n'
 +'if(sec>0)parts.push(atom("mdat",Buffer.alloc(256,1)));\n'
 +'fs.writeFileSync(out,Buffer.concat(parts));\n');
var sayEnv={CW_SAY:process.execPath+' '+fakeSay,FAKE_M4A_SECONDS:'12.5'};
var speakCmd='node '+path.join(scripts,'speak.js')+' --run '+run+' --round 01-sparring';
var silencedLine='Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1 owed for round 01-sparring.';
var voiceFile=path.join(run,'rounds','01-sparring','seat-1.m4a');
var v1=shown('the voices: silenced in the shell',call(post(speakCmd,silencedLine+'\n'),null,sayEnv));
check(v1==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).','the voices: the message names the voice, the seat and the seconds, got '+JSON.stringify(v1));
check(fs.existsSync(voiceFile)&&fs.statSync(voiceFile).size>300,'the voices: the file is on disk with sound');
var vjson=JSON.parse(fs.readFileSync(path.join(run,'rounds','01-sparring','voices.json'),'utf8'));
check(vjson.files['seat-1']==='seat-1.m4a'&&vjson.seconds['seat-1']===12.5&&vjson.silenced.length===0,'the voices: voices.json carries the file and the seconds, got '+JSON.stringify(vjson));
var vlog=logOf().filter(function(e){return e.event==='voices.rendered';});
check(vlog.length===1&&vlog[0].by==='hook'&&vlog[0].files['seat-1']==='seat-1.m4a','the voices: one voices.rendered line by hook, got '+JSON.stringify(vlog));
fs.unlinkSync(voiceFile);
var combined=speakCmd+' && node '+path.join(scripts,'render-board.js')+' --run '+run+' && node '+path.join(scripts,'open-board.js')+' --run '+run;
var v2=shown('the voices with the board and the opener',call(post(combined,silencedLine+'\n'+openedLine+'\n'),null,sayEnv));
check(v2==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s). The board was rebuilt after it opened: reload it to hear them.\n\n'+openedLine,'the voices with the board and the opener: the message, got '+JSON.stringify(v2));
check(/data-audio="[^"]*seat-1\.m4a"/.test(fs.readFileSync(board,'utf8')),'the voices with the board: the rebuilt board carries the file');
var v3=shown('the voices with the board alone',call(post(speakCmd+' && node '+path.join(scripts,'render-board.js')+' --run '+run,silencedLine+'\n'),null,sayEnv));
check(v3==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s). The board carries them.','the voices with the board alone: the message, got '+JSON.stringify(v3));
var v4=shown('the voices still silent outside',call(post(speakCmd,silencedLine+'\n'),null,{CW_SAY:sayEnv.CW_SAY,FAKE_M4A_SECONDS:'0'}));
check(v4==='Voices: the speech engine wrote no sound outside the sandbox either; the board reads with the browser.','the voices still silent outside: the message, got '+JSON.stringify(v4));
check(!fs.existsSync(voiceFile),'the voices still silent outside: no silent file left on disk');
silent('speak.js that printed nothing',call(post(speakCmd,''),null,sayEnv));
var v5=shown('the short form then the voices',call(post('node '+path.join(scripts,'render-record.js')+' --run '+run+' --short; '+speakCmd,shortForm+silencedLine+'\n'),null,sayEnv));
check(v5===expected+'\n\nVoices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).','the short form then the voices: the order, got '+JSON.stringify(v5.slice(-120)));
fs.unlinkSync(voiceFile);

// The hook wrote nothing but the log lines; the run folder is as the scripts left it.
check(fs.readdirSync(run).sort().join(',')==='board.html,brief.md,draft.md,log.jsonl,record.md,rounds,seats.json','run folder changed by the hook: '+fs.readdirSync(run).sort().join(','));

// hooks.json and the source.
var hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks','hooks.json'),'utf8'));
var postEntries=hooks.hooks.PostToolUse||[];
check(postEntries.length===1&&postEntries[0].matcher==='Bash'&&postEntries[0].hooks.length===1&&postEntries[0].hooks[0].type==='command'&&postEntries[0].hooks[0].command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/show-result.js"'&&typeof postEntries[0].hooks[0].timeout==='number'&&postEntries[0].hooks[0].timeout<=45,'hooks.json: one PostToolUse entry on Bash running show-result.js with a timeout that holds a three-file render: '+JSON.stringify(postEntries));
check(!(hooks.hooks.PreToolUse||[]).some(function(e){return e.matcher==='AskUserQuestion';}),'hooks.json: the refusing hook on AskUserQuestion must be gone');
var src=fs.readFileSync(hook,'utf8');
check(src.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','show-result.js: no Shield header on line 1');
check(!/writeFileSync|mkdirSync|\bfetch\(|https?:\/\/|execSync|execFile|cp\.exec\b|\bshell\s*:\s*true/.test(src.replace(/\/\/[^\n]*/g,'')),'show-result.js: must write no file but the log line, fetch nothing, run no shell');
check((src.match(/process\.env\.[A-Z_]+/g)||[]).join(',')==='process.env.CW_OPENER','show-result.js: the one environment read is CW_OPENER, got '+(src.match(/process\.env\.[A-Z_]+/g)||[]).join(','));
var provedOn=(/^var PROVED_ON='([^']+)';$/m.exec(src)||[])[1];
check(typeof provedOn==='string'&&/^\d+\.\d+\.\d+$/.test(provedOn)&&src.split(provedOn).length===2,'show-result.js: PROVED_ON must be one version constant on its own line, appearing once, got '+provedOn);

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'show_result_check: '+failures.length+' failure(s), ':'show_result_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
