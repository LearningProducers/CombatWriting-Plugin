// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// show_result_check.js: the result shown by the plugin itself (issue 70, 2026-10-26). The
// PostToolUse hook on Bash, hooks/show-result.js, puts the short form on the person's screen
// through systemMessage when the command ran render-record.js --short, opens the board outside
// the sandbox when the opener's line says the shell could not or no line reached it (Part 116), re-runs
// a silenced command from its --run path, and is silent on a command that ran none of the four.
//
// Runs the REAL hook as a child process with the hook's stdin JSON (the PostToolUse shape:
// tool_name, tool_input.command, tool_response {stdout, stderr}), around the REAL short form
// render-record.js prints for a real run and the REAL lines open-board.js prints with a failing
// opener and with none; the board is opened through a fake opener named by CW_OPENER.
//
// What it pins:
//   - Silent (no output, exit 0): another event, another tool, a command that ran neither script,
//     stdin that does not parse. A --short result with no short form in it is re-rendered by the
//     hook from the command's literal --run path (Part 116, THE SILENCED COMMAND below).
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
//     a speak.js that printed nothing is re-run when the round still owes voices (Part 116); the short form rides first and the voices line
//     after it.
//   - The run folder (Part 81.2, measured 2026-10-31): the hook reads the run from the script's own
//     line (" owed for round <round> of <run folder>."), so a command written with a shell variable
//     (`--run $R`) still renders; a line without the folder (an older speak.js) falls back to the
//     command's literal --run path; a variable in the command and no folder on the line puts a line
//     naming the miss on the screen, renders nothing, exit 0.
//   - additionalContext tells the host the lines are on the screen and to print the round line
//     and the picker only. The output is one JSON line, exit 0, nothing on stderr.
//   - Every quality voice (Part 82, issue 129): with two quality voices listed the hook renders both
//     for the seat, the line counts them and names the default ("2 voices for seat-1 (Ava (Premium)
//     the default, 12.5 s)"), the second file is on disk, voices.json's renders names both, and the
//     rebuilt board's frame carries both in data-renders; the render window is 60 s and hooks.json's
//     timeout covers it plus the board.
//   - THE MEASURED MODEL (issue 196, measured 2026-11-10: the name on every result was the host's
//     word and nothing in the run measured it): after a check-answer.js command the hook finds the
//     seat's own transcript in a fake session layout (<session dir>/<session_id>/subagents/
//     agent-<id>.jsonl, its first user record naming the seat's packet, its assistant records
//     carrying an invented model id, agent-<id>.meta.json beside it) and appends exactly one
//     seat.model line to the run's log: seat, round, model, passed (the meta file's model, or
//     null), session (the id on the session's newest reply that is no subagent's and no synthetic
//     record), by hook; it prints nothing and exits 0. A second identical call writes nothing; a
//     seat sent back (several transcripts for one packet) reads the newest by the file's time,
//     never by its name, its packet path compared resolved (a link to the run folder reads);
//     replies carrying two ids give `models` in order and `model` the last; another agent's
//     transcript naming the same packet is passed over; a missing meta file gives meta:false; a
//     final read's answer file finds its own packet; quoted paths read; two checks in one
//     command measure both seats. Nothing is written and nothing printed: with no transcript,
//     with a `$` in the --run path or in the answer file's (also when a folder of that name
//     holds a run), with a substitution, with no --run, for an outside seat, for an answer file
//     outside the run's rounds folder, for a session id that is no id, and for a command that
//     only names the script. The line carries the listed keys alone and none of the
//     transcript's text. One command carrying a check and the short form yields both the line
//     and the message.
//   - hooks.json carries the PostToolUse entry on Bash with a timeout that covers the render; the source has
//     the Shield header, the one PROVED_ON constant, the one MODEL_READ_ON constant, and spawns only the opener.
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
// The short form as the run stands now (the crew tests below add seats): what a re-render by the hook must equal.
function freshShort(){ return node('render-record.js',['--run',run,'--short']).stdout.replace(/\n+$/,''); }
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
var m0=shown('a --short result with no short form: re-rendered from the run path (Part 116)',call(post(S,'Error: no seats.json\n')));
var m0b=shown('a --short result with no short form on a path that is not a run',call(post('node '+scripts+'/render-record.js --run '+proj+' --short','Error: no seats.json\n')));
check(/is not a run folder \(no seats\.json there\)/.test(m0b)&&m0b.indexOf('**Crew:**')<0,'a --short result on a non-run path: the miss names the path, not a shell variable, got '+JSON.stringify(m0b.slice(0,160)));
check(m0===freshShort(),'a --short result with no short form: the hook renders the short form itself, got '+JSON.stringify(m0.slice(0,120)));

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
 +'if(a[0]==="-v"&&a[1]==="?"){process.stdout.write("Samantha            en_US    # Hello! My name is Samantha.\\nAva (Premium)       en_US    # Hello! My name is Ava.\\n"+(process.env.FAKE_SAY_TWO?"Nathan (Enhanced)   en_US    # Hello! My name is Nathan.\\n":""));process.exit(0);}\n'
 +'if(a.indexOf("-o")<0){process.stdout.write("lpcm  Linear PCM\\n");process.exit(0);}\n'
 +'var out=a[a.indexOf("-o")+1],sec=parseFloat(process.env.FAKE_M4A_SECONDS||"0");\n'
 +'function atom(t,b){var h=Buffer.alloc(8);h.writeUInt32BE(8+b.length,0);h.write(t,4,"latin1");return Buffer.concat([h,b]);}\n'
 +'var mv=Buffer.alloc(100);mv.writeUInt32BE(1000,12);mv.writeUInt32BE(Math.round(sec*1000),16);\n'
 +'var parts=[atom("ftyp",Buffer.from("M4A \\0\\0\\0\\0M4A mp42isom","latin1")),atom("moov",atom("mvhd",mv))];\n'
 +'if(sec>0)parts.push(atom("mdat",Buffer.alloc(256,1)));\n'
 +'fs.writeFileSync(out,Buffer.concat(parts));\n');
var sayEnv={CW_SAY:process.execPath+' '+fakeSay,FAKE_M4A_SECONDS:'12.5'};
var speakCmd='node '+path.join(scripts,'speak.js')+' --run '+run+' --round 01-sparring';
var silencedLineOld='Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1 owed for round 01-sparring.';
var silencedLine=silencedLineOld.replace(/\.$/,' of '+run+'.');
var voiceFile=path.join(run,'rounds','01-sparring','seat-1.m4a');
var realSilenced=node('speak.js',['--run',run,'--round','01-sparring','--say',sayEnv.CW_SAY]).stdout;
check(realSilenced===silencedLine+'\n','the real speak.js prints the silenced line with the run folder: '+JSON.stringify(realSilenced));
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
var v5=shown('speak.js that printed nothing: re-run while the round owes voices (Part 116)',call(post(speakCmd,''),null,sayEnv));
check(/^Voices rendered by the plugin: /.test(v5),'speak.js that printed nothing: the hook renders when voices.json lists silenced seats, got '+JSON.stringify(v5.slice(0,120)));
var v5=shown('the short form then the voices',call(post('node '+path.join(scripts,'render-record.js')+' --run '+run+' --short; '+speakCmd,shortForm+silencedLine+'\n'),null,sayEnv));
check(v5===expected+'\n\nVoices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).','the short form then the voices: the order, got '+JSON.stringify(v5.slice(-120)));
fs.unlinkSync(voiceFile);
// The run folder (Part 81.2): a command written with a shell variable, the line naming the run.
var speakVar='R='+run+'; node '+path.join(scripts,'speak.js')+' --run $R --round 01-sparring';
var renderedBefore=logOf().filter(function(e){return e.event==='voices.rendered';}).length;
var v6=shown('a shell variable in the command, the run on the line',call(post(speakVar,silencedLine+'\n'),null,sayEnv));
check(v6==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).'&&fs.existsSync(voiceFile),'a shell variable in the command: rendered from the line\'s run folder, got '+JSON.stringify(v6));
check(logOf().filter(function(e){return e.event==='voices.rendered';}).length===renderedBefore+1&&logOf().slice(-1)[0].by==='hook','a shell variable in the command: one voices.rendered line by hook');
fs.unlinkSync(voiceFile);
var v7=shown('a shell variable in the command, no run on the line',call(post(speakVar,silencedLineOld+'\n'),null,sayEnv));
check(v7==='Voices: the plugin could not tell which run the speech command ran on (the line named none and the command carried no literal --run path); nothing rendered. Rerun speak.js with the run folder spelled out.','a shell variable and no run on the line: the miss named, got '+JSON.stringify(v7));
check(!fs.existsSync(voiceFile)&&logOf().filter(function(e){return e.event==='voices.rendered';}).length===renderedBefore+1,'a shell variable and no run on the line: nothing rendered, no log line');
var v8=shown('the literal path in the command, no run on the line',call(post(speakCmd,silencedLineOld+'\n'),null,sayEnv));
check(v8==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).'&&fs.existsSync(voiceFile),'the literal path and the old line: rendered from the command, got '+JSON.stringify(v8));
fs.unlinkSync(voiceFile);
var v9=shown('the short form, a shell variable and the run on the line',call(post('R='+run+'; node '+path.join(scripts,'render-record.js')+' --run $R --short; '+speakVar,shortForm+silencedLine+'\n'),null,sayEnv));
check(v9===expected+'\n\nVoices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).','the short form then the voices with a shell variable: the order, got '+JSON.stringify(v9.slice(-120)));
fs.unlinkSync(voiceFile);
// Every quality voice (Part 82): two voices listed, both rendered, the line counts them.
var twoEnv={CW_SAY:sayEnv.CW_SAY,FAKE_M4A_SECONDS:'12.5',FAKE_SAY_TWO:'1'};
var secondFile=path.join(run,'rounds','01-sparring','seat-1.nathan-enhanced.m4a');
var v10=shown('two voices rendered',call(post(speakCmd+' && node '+path.join(scripts,'render-board.js')+' --run '+run,silencedLine+'\n'),null,twoEnv));
check(v10==='Voices rendered by the plugin: 2 voices for seat-1 (Ava (Premium) the default, 12.5 s). The board carries them.','two voices: the line counts the voices and names the default, got '+JSON.stringify(v10));
check(fs.existsSync(voiceFile)&&fs.existsSync(secondFile),'two voices: both files on disk');
var vj2=JSON.parse(fs.readFileSync(path.join(run,'rounds','01-sparring','voices.json'),'utf8'));
check(vj2.files['seat-1']==='seat-1.m4a'&&vj2.renders['seat-1']['Ava (Premium)'].file==='seat-1.m4a'&&vj2.renders['seat-1']['Nathan (Enhanced)'].file==='seat-1.nathan-enhanced.m4a'&&vj2.renders['seat-1']['Nathan (Enhanced)'].seconds===12.5,'two voices: voices.json names both renders, got '+JSON.stringify(vj2.renders));
var boardTwo=fs.readFileSync(board,'utf8'), dr=(/data-renders="([^"]*)"/.exec(boardTwo)||[])[1]||'';
check(/Ava \(Premium\)/.test(dr.replace(/&quot;/g,'"'))&&/seat-1\.nathan-enhanced\.m4a/.test(dr),'two voices: the rebuilt board\'s frame carries both renders, got '+JSON.stringify(dr.slice(0,200)));
fs.unlinkSync(voiceFile); fs.unlinkSync(secondFile);

// The hook wrote nothing but the log lines; the run folder is as the scripts left it.
check(fs.readdirSync(run).sort().join(',')==='board.html,brief.md,draft.md,log.jsonl,record.md,rounds,seats.json','run folder changed by the hook: '+fs.readdirSync(run).sort().join(','));

// hooks.json and the source.
var hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks','hooks.json'),'utf8'));
var postEntries=hooks.hooks.PostToolUse||[];
var srcForWait=fs.readFileSync(hook,'utf8');
var renderWait=parseInt((/var RENDER_WAIT_MS=(\d+)/.exec(srcForWait)||[])[1],10), boardWait=parseInt((/BOARD_WAIT_MS=(\d+)/.exec(srcForWait)||[])[1],10);
check(renderWait===60000&&boardWait===15000,'show-result.js: the render window is 60 s and the board window 15 s (Part 82: twelve files at about 1.4 s each, measured 2026-10-31, three times over), got '+renderWait+' and '+boardWait);
check(postEntries.length===1&&postEntries[0].matcher==='Bash'&&postEntries[0].hooks.length===1&&postEntries[0].hooks[0].type==='command'&&postEntries[0].hooks[0].command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/show-result.js"'&&typeof postEntries[0].hooks[0].timeout==='number'&&postEntries[0].hooks[0].timeout*1000>=renderWait+boardWait&&postEntries[0].hooks[0].timeout<=90,'hooks.json: one PostToolUse entry on Bash running show-result.js with a timeout that covers the render window plus the board and stays at 90 s or under: '+JSON.stringify(postEntries));
check(!(hooks.hooks.PreToolUse||[]).some(function(e){return e.matcher==='AskUserQuestion';}),'hooks.json: the refusing hook on AskUserQuestion must be gone');
// THE SILENCED COMMAND (Part 116, issue 179; measured 2026-11-06 on the first round run on cw 0.9.0): the
// host sent the four scripts' output to /dev/null and echoed "done". The hook re-renders the short form,
// renders the voices when the round still owes them, and opens the board (the fake opener runs once,
// board.opened by hook on the log); a shell variable for the run names the miss and opens nothing; a
// round whose voices are on disk is not rendered again; a fresh success by the shell is not opened twice.
fs.rmSync(marker,{force:true});
var quiet=S+' 2>&1 >/dev/null\n'+speakCmd+' >/dev/null 2>&1\n'+B+' >/dev/null 2>&1\n'+O+' >/dev/null 2>&1; echo done';
fs.rmSync(path.join(run,'rounds','01-sparring','voices.json'),{force:true}); fs.rmSync(voiceFile,{force:true});
var q1=shown('the silenced command',call(post(quiet,'done\n'),okOpener,sayEnv));
check(q1.indexOf(freshShort())===0&&/\n\nVoices rendered by the plugin: Ava \(Premium\) for seat-1 \(12\.5 s\)\./.test(q1)&&/\n\nBoard opened by the plugin: /.test(q1)&&q1.slice(-board.length)===board,'the silenced command: the short form, the voices and the opened board, got '+JSON.stringify(q1.slice(0,80))+' ... '+JSON.stringify(q1.slice(-120)));
check(opens().length===1&&opens()[0]===board,'the silenced command: the opener ran once on the board, got '+JSON.stringify(opens()));
var lastQ=logOf().filter(function(e){return e.event==='board.opened';}).slice(-1)[0];
check(lastQ.event==='board.opened'&&lastQ.by==='hook'&&lastQ.ok===true,'the silenced command: board.opened by hook on the log, got '+JSON.stringify(lastQ));
check(fs.existsSync(voiceFile)&&fs.statSync(voiceFile).size>300&&/data-audio="rounds\/01-sparring\/seat-1\.m4a"/.test(fs.readFileSync(board,'utf8')),'the silenced command: the voice file is on disk and the rebuilt board carries it');
var q2=shown('the silenced command, voices already on disk',call(post(quiet,'done\n'),okOpener,sayEnv));
check(q2.indexOf(freshShort())===0&&q2.indexOf('Voices')<0&&/Board opened by the plugin: /.test(q2)&&opens().length===2,'the silenced command: a round with its voices on disk is not rendered again, the board still opened, got '+JSON.stringify(q2.slice(0,60))+' ... '+JSON.stringify(q2.slice(-80)));
var q3=shown('the silenced command with a shell variable for the run',call(post('S='+scripts+'; R='+run+'; node $S/render-record.js --run $R --short >/dev/null 2>&1; node $S/open-board.js --run $R >/dev/null 2>&1; echo done','done\n'),okOpener));
check(/shell variable/.test(q3)&&q3.indexOf('**Crew:**')<0&&opens().length===2,'the silenced command with a variable: the miss is named, nothing rendered, nothing opened, got '+JSON.stringify(q3.slice(0,160)));
fs.appendFileSync(path.join(run,'log.jsonl'),JSON.stringify({ts:new Date().toISOString(),event:'board.opened',file:'board.html',opener:'open',ok:true,reason:null})+'\n');
var q4=call(post(O+' >/dev/null 2>&1; echo done','done\n'),okOpener);
check(q4.status===0&&q4.out===''&&opens().length===2,'the silenced opener after a fresh success by the shell: silent, not opened twice, got '+JSON.stringify(q4.out.slice(0,120)));

// THE MEASURED MODEL (issue 196): the model that wrote a fresh reader's replies, read from the
// seat's own transcript after its answer is checked. A second run, two fresh readers and one
// outside seat; a fake session layout beside a fake session transcript. Invented ids only.
var runM=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','measured','--session-model','Test Session Model','--model-2','Test Model B']).stdout.trim();
var seatsFileM=path.join(runM,'seats.json'), sjM=JSON.parse(fs.readFileSync(seatsFileM,'utf8'));
sjM.seats.push({id:'seat-3',model:'outside-test',company:'Example',provider:'test-fixture',source:'test fixture: an outside seat as the add-on would register it'});
fs.writeFileSync(seatsFileM,JSON.stringify(sjM,null,2)+'\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',runM,'--round','01-sparring','--seat',s]); });
function packetM(round,seat,kind){ return path.join(runM,'rounds',round,seat+(kind?'.'+kind:'')+'.packet.md'); }
function answerM(round,seat,kind){ return path.join(runM,'rounds',round,seat+(kind?'.'+kind:'')+'.answer.md'); }
['seat-1','seat-2','seat-3'].forEach(function(s){ fs.writeFileSync(answerM('01-sparring',s),'RATING: 8/10\nThe ask lands in the first line.\n'); });
var hostDir=path.join(tmp,'host'), SID='sess-1', sessionFile=path.join(hostDir,SID+'.jsonl'), agentsDir=path.join(hostDir,SID,'subagents');
fs.mkdirSync(agentsDir,{recursive:true});
var SECRET='A reply the hook never reads.';
function rec(type,extra,message){ return JSON.stringify(Object.assign({type:type,timestamp:'2026-11-10T14:00:00.000Z'},extra,{message:message})); }
// The session's own transcript: a reply on claude-test-1, then a subagent's reply and a synthetic record, neither the session's.
fs.writeFileSync(sessionFile,[rec('user',{},{role:'user',content:'spar this'}),rec('assistant',{},{role:'assistant',model:'claude-test-0',content:[{type:'text',text:SECRET}]}),rec('assistant',{},{role:'assistant',model:'claude-test-1',content:[{type:'text',text:SECRET}]}),rec('assistant',{isSidechain:true},{role:'assistant',model:'claude-test-9',content:[]}),rec('assistant',{},{role:'assistant',model:'<synthetic>',content:[]})].join('\n')+'\n');
// One agent transcript: the task as the host writes it, one assistant record per id given, the meta file unless null, the file's time secondsAgo back.
function agent(id,packet,answer,ids,meta,secondsAgo){
  var lines=[rec('user',{isSidechain:true,agentId:id},{role:'user',content:'Packet: '+packet+'\nAnswer file: '+answer+'\nRead the packet, write your answer to the answer file, reply with one line.'})];
  ids.forEach(function(m){ lines.push(rec('assistant',{isSidechain:true,agentId:id},{role:'assistant',model:m,content:[{type:'text',text:SECRET}]})); });
  var file=path.join(agentsDir,'agent-'+id+'.jsonl'); fs.writeFileSync(file,lines.join('\n')+'\n');
  if(meta)fs.writeFileSync(path.join(agentsDir,'agent-'+id+'.meta.json'),JSON.stringify(meta));
  var when=new Date(Date.now()-(secondsAgo||0)*1000); fs.utimesSync(file,when,when);
}
function logM(){ return fs.readFileSync(path.join(runM,'log.jsonl'),'utf8').trim().split('\n').map(function(l){return JSON.parse(l);}); }
function measuredM(){ return logM().filter(function(e){return e.event==='seat.model';}); }
function checkCmd(answer,runArg){ return 'node '+scripts+'/check-answer.js '+answer+' --run '+(runArg||runM); }
function postM(command,stdout,extra){ return post(command,stdout===undefined?'seat-1 finished round 01-sparring: OK rating 8/10, 9 words\n{}\n':stdout,Object.assign({session_id:SID,transcript_path:sessionFile},extra||{})); }
function mute(name,r,lines){ check(r.status===0&&r.out===''&&r.stderr===''&&measuredM().length===lines,name+': expected no output, exit 0 and '+lines+' seat.model line(s), got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,160))+' err '+r.stderr.slice(0,160)+' lines '+measuredM().length); }
// No transcript: nothing written, nothing printed.
mute('measured: no transcript for the seat',call(postM(checkCmd(answerM('01-sparring','seat-1')))),0);
// seat-1: no model passed at start, its replies on the session's id; the real check's own output is what the hook is handed.
agent('a1',packetM('01-sparring','seat-1'),answerM('01-sparring','seat-1'),['claude-test-1','claude-test-1'],{agentType:'cw:seat'},60);
var realCheck=node('check-answer.js',[answerM('01-sparring','seat-1'),'--run',runM]).stdout;
check(/^seat-1 \S.* finished round 01-sparring: OK rating 8\/10/.test(realCheck),'measured: the real check-answer.js line, got '+JSON.stringify(realCheck.slice(0,120)));
var filesBefore=fs.readdirSync(runM).sort().join(',');
mute('measured: seat-1 after its check',call(postM(checkCmd(answerM('01-sparring','seat-1')),realCheck)),1);
var l1=measuredM()[0]||{};
check(l1.seat==='seat-1'&&l1.round==='01-sparring'&&l1.model==='claude-test-1'&&l1.passed===null&&l1.session==='claude-test-1'&&l1.by==='hook'&&!isNaN(Date.parse(l1.ts)),'measured: seat-1\'s line names the seat, the round, the id that answered, none passed, the session\'s id and the hook, got '+JSON.stringify(l1));
check(Object.keys(l1).join(',')==='ts,event,seat,round,model,passed,session,by','measured: the line carries the listed keys alone (no models for one id, no meta when the file was read), got '+Object.keys(l1).join(','));
check(logM().slice(-1)[0].event==='seat.model','measured: the line is the log\'s last, appended and nothing after it');
// A second identical call writes nothing.
mute('measured: a second identical call',call(postM(checkCmd(answerM('01-sparring','seat-1')),realCheck)),1);
// seat-2 sent back: three transcripts for one packet; the newest by the file's time is read, and by name it is neither the first nor the last.
agent('aa-first',packetM('01-sparring','seat-2'),answerM('01-sparring','seat-2'),['claude-test-3'],{agentType:'cw:seat',model:'test-c'},50);
agent('zz-second',packetM('01-sparring','seat-2'),answerM('01-sparring','seat-2'),['claude-test-3'],{agentType:'cw:seat',model:'test-c'},45);
// Its task names the packet through a link to the run folder: the two paths are compared resolved.
var alias=path.join(tmp,'alias'); fs.symlinkSync(runM,alias);
agent('mm-third',path.join(alias,'rounds','01-sparring','seat-2.packet.md'),answerM('01-sparring','seat-2'),['claude-test-2'],{agentType:'cw:seat',model:'test-b'},40);
// Another agent handed the same packet, newer still, is no seat.
agent('other',packetM('01-sparring','seat-2'),answerM('01-sparring','seat-2'),['claude-test-8'],{agentType:'general-purpose'},30);
mute('measured: seat-2 sent back, quoted paths',call(postM('node "'+scripts+'/check-answer.js" "'+answerM('01-sparring','seat-2')+'" --run \''+runM+'\'')),2);
var l2=measuredM()[1]||{};
check(l2.seat==='seat-2'&&l2.model==='claude-test-2'&&l2.passed==='test-b'&&l2.session==='claude-test-1'&&l2.models===undefined,'measured: a seat sent back reads its newest transcript and the choice passed at that start, never another agent\'s, got '+JSON.stringify(l2));
// An outside seat has a record with a provider: never measured, even with a transcript naming its packet.
agent('outside',packetM('01-sparring','seat-3'),answerM('01-sparring','seat-3'),['claude-test-7'],{agentType:'cw:seat'},20);
mute('measured: an outside seat',call(postM(checkCmd(answerM('01-sparring','seat-3')))),2);
// Round 02: the replies carry two ids; a shell variable is no path.
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',runM,'--round','02-battle','--seat',s]); fs.writeFileSync(answerM('02-battle',s),'The close asks for a vote and never says on what.\n'); });
agent('b2',packetM('02-battle','seat-2'),answerM('02-battle','seat-2'),['claude-test-2','claude-test-2','<synthetic>','claude-test-4'],{agentType:'cw:seat',model:'test-b'},15);
agent('b1',packetM('02-battle','seat-1'),answerM('02-battle','seat-1'),['claude-test-1'],null,10);
mute('measured: a shell variable for the run',call(postM('R='+runM+'; node '+scripts+'/check-answer.js '+answerM('02-battle','seat-2')+' --run $R')),2);
mute('measured: a shell variable in the answer file\'s path',call(postM('R='+runM+'; node '+scripts+'/check-answer.js $R/rounds/02-battle/seat-2.answer.md --run '+runM)),2);
var dollar=path.join(proj,'$R'), dollarRound=path.join(dollar,'rounds','02-battle');
fs.mkdirSync(dollarRound,{recursive:true}); fs.writeFileSync(path.join(dollar,'seats.json'),JSON.stringify({seats:[{id:'seat-2',model:'Test Model B',company:'Anthropic',start:'named'}]})); fs.writeFileSync(path.join(dollar,'log.jsonl'),JSON.stringify({ts:new Date().toISOString(),event:'run.created'})+'\n');
fs.writeFileSync(path.join(dollarRound,'seat-2.packet.md'),'a packet\n'); fs.writeFileSync(path.join(dollarRound,'seat-2.answer.md'),'an answer\n');
agent('dollar',path.join(dollarRound,'seat-2.packet.md'),path.join(dollarRound,'seat-2.answer.md'),['claude-test-7'],{agentType:'cw:seat'},12);
mute('measured: a folder really named for the variable',call(postM('R='+runM+'; node '+scripts+'/check-answer.js $R/rounds/02-battle/seat-2.answer.md --run $R')),2);
check(fs.readFileSync(path.join(dollar,'log.jsonl'),'utf8').indexOf('seat.model')<0,'measured: a token holding $ is no path, also when a folder of that name exists and holds a run');
mute('measured: a substitution for the run',call(postM('node '+scripts+'/check-answer.js '+answerM('02-battle','seat-2')+' --run `pwd`')),2);
mute('measured: the script only named in an argument',call(postM('grep -n round '+scripts+'/check-answer.js','44: var round\n')),2);
mute('measured: an answer file outside the run\'s rounds',call(postM(checkCmd(path.join(proj,'seat-2.answer.md')))),2);
mute('measured: an answer file in the run and not under its rounds folder',call(postM(checkCmd(path.join(runM,'elsewhere','02-battle','seat-2.answer.md')))),2);
mute('measured: a session id that is no id',call(postM(checkCmd(answerM('02-battle','seat-2')),undefined,{session_id:'nope/../'+SID})),2);
mute('measured: no --run on the command',call(postM('node '+scripts+'/check-answer.js '+answerM('02-battle','seat-2'))),2);
// Two checks in one command: both seats measured, in the command's order.
mute('measured: two checks in one command',call(postM(checkCmd(answerM('02-battle','seat-2'))+' && '+checkCmd(answerM('02-battle','seat-1')))),4);
var l3=measuredM()[2]||{}, l4=measuredM()[3]||{};
check(l3.seat==='seat-2'&&l3.round==='02-battle'&&l3.model==='claude-test-4'&&JSON.stringify(l3.models)==='["claude-test-2","claude-test-4"]'&&l3.passed==='test-b','measured: replies carrying two ids list both in order, the last the model, the synthetic record no reply, got '+JSON.stringify(l3));
check(l4.seat==='seat-1'&&l4.round==='02-battle'&&l4.model==='claude-test-1'&&l4.passed===null&&l4.meta===false,'measured: a transcript with no meta file beside it says the start choice was not read, got '+JSON.stringify(l4));
// The session's transcript missing: the seat is still measured, the session null.
var hostDir2=path.join(tmp,'host2'); fs.mkdirSync(path.join(hostDir2,SID),{recursive:true}); fs.cpSync(agentsDir,path.join(hostDir2,SID,'subagents'),{recursive:true});
node('packet.js',['--run',runM,'--round','03-final','--seat','seat-1','--final','sn']); fs.writeFileSync(answerM('03-final','seat-1','sn'),'S/N RATIO: 80%\nMostly signal.\n');
var snFile=path.join(hostDir2,SID,'subagents','agent-f1.jsonl');
fs.writeFileSync(snFile,[rec('user',{isSidechain:true},{role:'user',content:[{type:'text',text:'Packet: '+packetM('03-final','seat-1','sn')+'\nAnswer file: '+answerM('03-final','seat-1','sn')}]}),rec('assistant',{isSidechain:true},{role:'assistant',model:'claude-test-5',content:[]})].join('\n')+'\n');
fs.writeFileSync(snFile.replace(/\.jsonl$/,'.meta.json'),JSON.stringify({agentType:'cw:seat'}));
check(fs.existsSync(packetM('03-final','seat-1','sn')),'measured: the real packet.js built the final read\'s packet');
mute('measured: a final read, the session\'s transcript missing',call(postM(checkCmd(answerM('03-final','seat-1','sn')),undefined,{transcript_path:path.join(hostDir2,SID+'.jsonl')})),5);
var l5=measuredM()[4]||{};
check(l5.seat==='seat-1'&&l5.round==='03-final'&&l5.model==='claude-test-5'&&l5.session===null&&l5.passed===null&&l5.meta===undefined,'measured: a final read\'s answer file finds its own packet; with no session transcript the session is null, got '+JSON.stringify(l5));
// The line holds ids and places, never the transcript's words; the run folder gained no file.
check(fs.readFileSync(path.join(runM,'log.jsonl'),'utf8').indexOf(SECRET)<0&&fs.readFileSync(path.join(runM,'log.jsonl'),'utf8').indexOf('Read the packet')<0,'measured: no text of a transcript reaches the log');
check(fs.readdirSync(runM).sort().join(',')===filesBefore,'measured: the hook wrote no file in the run but the log lines, got '+fs.readdirSync(runM).sort().join(','));
// One command carrying a check and the short form: the line is written and the message is the short form alone.
fs.rmSync(path.join(agentsDir,'agent-b1.jsonl')); agent('b1b',packetM('02-battle','seat-1'),answerM('02-battle','seat-1'),['claude-test-6'],{agentType:'cw:seat'},5);
var shortM=node('render-record.js',['--run',runM,'--short']).stdout;
var mm=shown('measured: a check and the short form in one command',call(postM(checkCmd(answerM('02-battle','seat-1'))+'; node '+scripts+'/render-record.js --run '+runM+' --short',shortM)));
var l6=measuredM()[5]||{};
check(mm===shortM.replace(/\n+$/,'')&&measuredM().length===6&&l6.seat==='seat-1'&&l6.round==='02-battle'&&l6.model==='claude-test-6'&&l6.session==='claude-test-1','measured: a seat whose newest transcript carries another id gets a new line for the round, and the message is the short form alone, got '+JSON.stringify(l6));

var src=fs.readFileSync(hook,'utf8');
check(src.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','show-result.js: no Shield header on line 1');
check(!/writeFileSync|mkdirSync|\bfetch\(|https?:\/\/|execSync|execFile|cp\.exec\b|\bshell\s*:\s*true/.test(src.replace(/\/\/[^\n]*/g,'')),'show-result.js: must write no file but the log line, fetch nothing, run no shell');
check((src.match(/process\.env\.[A-Z_]+/g)||[]).join(',')==='process.env.CW_OPENER','show-result.js: the one environment read is CW_OPENER, got '+(src.match(/process\.env\.[A-Z_]+/g)||[]).join(','));
var provedOn=(/^var PROVED_ON='([^']+)';$/m.exec(src)||[])[1];
check(typeof provedOn==='string'&&/^\d+\.\d+\.\d+$/.test(provedOn)&&src.split(provedOn).length===2,'show-result.js: PROVED_ON must be one version constant on its own line, appearing once, got '+provedOn);
// THE MEASURED MODEL in the source: the versions the transcript shape was read on in one constant, the
// bounds named, no file required but fs, path and child_process, no model name in the code.
var readOn=(/^var MODEL_READ_ON='([^']+)';$/m.exec(src)||[])[1];
check(typeof readOn==='string'&&/^\d+\.\d+\.\d+( to \d+\.\d+\.\d+)?$/.test(readOn)&&src.split(readOn).length===2,'show-result.js: MODEL_READ_ON must be one constant on its own line naming the versions the transcript shape was read on, appearing once, got '+readOn);
var bounds=/AGENTS_READ_MAX=(\d+), TASK_BYTES=(\d+), SEAT_BYTES=(\d+), SESSION_BYTES=(\d+)/.exec(src)||[];
check(+bounds[1]>0&&+bounds[1]<=200&&+bounds[2]>0&&+bounds[2]<=65536&&+bounds[3]>0&&+bounds[3]<=8388608&&+bounds[4]>0&&+bounds[4]<=2097152,'show-result.js: the measurement is bounded (at most 200 transcripts opened, 64 KiB for a task, 8 MiB of the seat\'s transcript, 2 MiB of the session\'s), got '+bounds.slice(1).join(', '));
check((src.match(/require\('[^']+'\)/g)||[]).join(',')==="require('fs'),require('path'),require('child_process')",'show-result.js: requires fs, path and child_process alone, got '+(src.match(/require\('[^']+'\)/g)||[]).join(','));
check(!/claude-(?!plugin)|\b(opus|sonnet|haiku|fable)\b/i.test(src.replace(/\/\/.*$/gm,'')),'show-result.js: no model name in the code');
var readers=['taskOf','modelsOf','sessionModelOf'].map(function(n){ return (new RegExp('\\nfunction '+n+'\\([\\s\\S]*?\\n}\\n').exec(src)||[''])[0]; });
check(readers.every(function(body){ return /bytesOf\(/.test(body)&&!/readFileSync/.test(body); }),'show-result.js: a transcript is read through the bounded reader, never whole');

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'show_result_check: '+failures.length+' failure(s), ':'show_result_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
