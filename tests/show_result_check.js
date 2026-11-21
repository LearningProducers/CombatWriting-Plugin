// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// show_result_check.js: the result shown by the plugin itself (issue 70, 2026-10-26). The
// PostToolUse hook on Bash, hooks/show-result.js, puts the short form on the person's screen
// through systemMessage when the command ran render-record.js --short, opens the board outside
// the sandbox when the opener's line says the shell could not or no line reached it (Part 116), re-runs
// a silenced command from its --run path, and is silent on a command that ran none of the four.
// Every act is held to a real run folder (issue 235): the command's literal --run path names it,
// and for the voices the script's own line.
//
// Runs the REAL hook as a child process with the hook's stdin JSON (the PostToolUse shape:
// tool_name, tool_input.command, tool_response {stdout, stderr}), around the REAL short form
// render-record.js prints for a real run and the REAL lines open-board.js prints with a failing
// opener and with none; the board is opened through a fake opener the hook finds the way it finds
// the real one (issue 239): a folder first on the hook's PATH holds it under the names `open` and
// `xdg-open`. The hook reads no switch of the tests'.
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
//     wrote no sound in that shell, the hook runs speak.js itself (here with a fake command named
//     `say` first on the PATH, the child started as a Mac by a file of this test's own, that
//     writes an MPEG-4 container with sound) and says "Voices rendered by the plugin"
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
//     and the picker only; it is handed only when the command names a real run folder by a
//     literal path (issue 235), and a message for a run the hook cannot place rides with none.
//     The output is one JSON line, exit 0, nothing on stderr.
//   - THE SWITCH (issue 216): the hook reads <project>/combat-writing/picker.json, the project read
//     from the command's literal --run path, and never writes it. Off, the context says to print
//     the text Next line and open no picker; on, absent, unreadable or a pipe, it ends as before;
//     for a run the hook cannot place (a shell variable, a tilde, a working folder that is no
//     string) no context is handed at all (issue 235). The reading equals lib.readPicker's on the same file.
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
//   - THE MEASURED MODEL, hardened (issue 196): a pipe named as the meta file, as seats.json, as
//     the run's log, as an agent transcript and as the session's transcript each return within a
//     second (the legs are skipped by name where there is no mkfifo), nothing written but for the
//     last, where the seat is measured and the session is null; a meta file or a seats.json over
//     the small cap is passed over; a folder with a log, a seats.json and no packet gets no line
//     and the same folder with its packet gets one; twenty tasks whose Packet line is 62,000
//     spaces between two letters finish within a second and the seat's own transcript behind
//     them is read; a reply's id holding a line break, a space, an angle bracket or 121
//     characters is no measurement, an id of the class is taken, a start choice or a session id
//     outside it is null; a transcript past the bytes read is logged with its LAST reply's id
//     and `partial: true`; among 2,100 agent files the newest is found though the folder lists
//     it last. The source: the id pattern equals lib.js's, every read of the measurement goes
//     through the one bounded reader, which opens without blocking and reads a regular file
//     alone, and the Packet line is read with no pattern.
//   - THE REAL RUN (issue 235): a command that only mentions a script's name, with a line in its
//     output shaped like the opener's failed line and naming a file or a web address, gets
//     silence and opens nothing; with the real run in the command and another path on the line,
//     the run's own board is opened and the other never; a run named by a shell variable is not
//     opened, the script's line shown as printed, no context; a folder that is no run, a
//     board.html that is a link and a run whose log is a link are never opened and nothing is
//     written through the link; the voices are not rendered into a round folder holding a link,
//     for a round named `..`, or in a folder that is no run; a board.html that is a link is
//     never rebuilt through; with the platform named win32 and a recorder standing in for cmd, a
//     plain path is handed to cmd /c start and a path holding & never is; the failed-opener
//     pattern captures no path.
//   - THE RENDER BEFORE THE OPEN (issue 235): the hook renders the board with the plugin's own
//     script the moment before it opens it: a board.html written by another hand is replaced by
//     that render and nothing of it is left, board.rendered then board.opened on the log; the
//     same for a silenced opener; with the voices owed in the same command there is one render,
//     after them, and the line says the board carries them; a hand-made run folder is opened as
//     the plugin's render of it; a folder the renderer cannot render is not opened, its page
//     left as it was, the renderer's own error line in the message.
//   - THE RUN FOLDER, ALL THE WAY DOWN (issue 235): a seat's answer that is a symbolic link, or a
//     hard link, to a file outside the run is never read into a render by the hook (not on the
//     open, not on the record rendered again for a silenced command) and its board is not
//     opened; a run whose log is a link gets no seat.model line through it; a pipe in a round's
//     folder is never waited on; a command continued over two lines with a backslash is one
//     command to each of the hook's three readers: the script segments, the round of a silenced
//     speech command, and a seat's check.
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

// The fakes reach the hook and the script it starts the way the real programs do, through the
// PATH. A fake opener is a folder holding it as `open` and `xdg-open`, so the hook finds it on a
// Mac and off one. The fake speech command is a folder holding it as `say`; a call that wants it
// passes WITH_FAKE_SAY, read here and never by the hook, and that child is started as a Mac by
// a file node loads first, so speak.js looks for the engine at all.
function standIn(dir,names,script){
  if(fs.existsSync(dir))return dir;
  fs.mkdirSync(dir);
  names.forEach(function(n){ var f=path.join(dir,n); fs.writeFileSync(f,'#!/bin/sh\nexec '+JSON.stringify(process.execPath)+' '+JSON.stringify(script)+' "$@"\n'); fs.chmodSync(f,0o755); });
  return dir;
}
function openerBin(script){ return standIn(script+'.bin',['open','xdg-open'],script); }
var asMac=path.join(tmp,'as-mac.js'); fs.writeFileSync(asMac,'Object.defineProperty(process,"platform",{value:"darwin"});\n');
function fakeEnv(opener,extra){
  var env=Object.assign({},process.env,extra||{}), front=[];
  if(!(extra&&extra.CW_OPENER))delete env.CW_OPENER;
  if(opener)front.push(openerBin(opener));
  if(env.WITH_FAKE_SAY){ front.push(standIn(path.join(tmp,'say.bin'),['say'],path.join(tmp,'fakesay.js'))); env.NODE_OPTIONS='--require '+asMac; }
  delete env.WITH_FAKE_SAY;
  if(front.length)env.PATH=front.concat([process.env.PATH||'']).join(path.delimiter);
  return env;
}
function call(input,opener,extra){
  var env=fakeEnv(opener,extra);
  var raw=typeof input==='string'?input:JSON.stringify(input);
  var r=cp.spawnSync(process.execPath,[hook],{input:raw,encoding:'utf8',cwd:proj,env:env});
  var out=r.stdout.trim(), json=null; try{json=out?JSON.parse(out):null;}catch(e){}
  return {status:r.status,out:out,json:json,stderr:r.stderr};
}
function post(command,stdout,extra){ return Object.assign({session_id:'s',transcript_path:path.join(tmp,'t.jsonl'),cwd:proj,hook_event_name:'PostToolUse',tool_name:'Bash',tool_input:{command:command,description:'x'},tool_response:{stdout:stdout,stderr:'',interrupted:false,isImage:false},tool_use_id:'toolu_x'},extra||{}); }
function silent(name,r){ check(r.status===0&&r.out===''&&r.stderr==='',name+': expected silence and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,120))+' err '+r.stderr); }
function shown(name,r){ check(r.status===0&&!!r.json&&typeof r.json.systemMessage==='string'&&r.json.hookSpecificOutput&&r.json.hookSpecificOutput.hookEventName==='PostToolUse'&&/on the person's screen already/.test(r.json.hookSpecificOutput.additionalContext)&&Object.keys(r.json).sort().join(',')==='hookSpecificOutput,systemMessage'&&r.stderr===''&&r.out.split('\n').length===1,name+': expected one JSON line with systemMessage and the context, got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,200))+' err '+r.stderr); return r.json?r.json.systemMessage:''; }

// A message on the person's screen and no context for the host: the command named no real run folder by a literal path (issue 235).
function bare(name,r){ check(r.status===0&&!!r.json&&typeof r.json.systemMessage==='string'&&Object.keys(r.json).join(',')==='systemMessage'&&r.stderr===''&&r.out.split('\n').length===1,name+': expected one JSON line with systemMessage and no context, got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,200))+' err '+r.stderr); return r.json?r.json.systemMessage:''; }

var S='node '+scripts+'/render-record.js --run '+run+' --short', B='node '+scripts+'/render-board.js --run '+run, O='node '+scripts+'/open-board.js --run '+run;

// Silent.
silent('another event',call(post(S,shortForm,{hook_event_name:'PreToolUse'})));
silent('another tool',call(post(S,shortForm,{tool_name:'Read'})));
silent('neither script',call(post('ls '+run,'draft.md\n')));
silent('a script only mentioned in an argument',call(post('grep -n short '+scripts+'/render-record.js','217: --short\n')));
silent('stdin that does not parse',call('{not json'));
var m0=shown('a --short result with no short form: re-rendered from the run path (Part 116)',call(post(S,'Error: no seats.json\n')));
var m0b=bare('a --short result with no short form on a path that is not a run',call(post('node '+scripts+'/render-record.js --run '+proj+' --short','Error: no seats.json\n')));
check(/is not a run folder \(/.test(m0b)&&m0b.indexOf(proj)>0&&m0b.indexOf('**Crew:**')<0,'a --short result on a non-run path: the miss names the path, not a shell variable, got '+JSON.stringify(m0b.slice(0,160)));
check(m0===freshShort(),'a --short result with no short form: the hook renders the short form itself, got '+JSON.stringify(m0.slice(0,120)));

// The short form.
var m1=shown('the short form',call(post(S,shortForm)));
check(m1===expected,'the short form: systemMessage must be the Crew line through the Seat key line, got '+JSON.stringify(m1.slice(0,120))+' ... '+JSON.stringify(m1.slice(-60)));
var m2=shown('the short form behind a pipe',call(post('cd '+proj+' && '+S+' 2>&1 | cat',shortForm)));
check(m2===expected,'the short form behind a pipe: same message');
var m3=shown('tool_response as a string',call(post(S,shortForm,{tool_response:shortForm})));
check(m3===expected,'tool_response as a string: same message');
var m4=bare('the 2026-10-26 shape: a run named by shell variables, the short form shown, no context',call(post('S='+scripts+'; R='+run+'; node $S/render-record.js --run $R --short; echo ===BOARD; node $S/render-board.js --run $R; echo ===OPEN; node $S/open-board.js --run $R','Exit code 1\n'+shortForm+'===BOARD\n'+board+'\n===OPEN\n'+openedLine+'\n')));
check(m4===expected+'\n\n'+openedLine,'the combined command: the short form then the opener\'s line, nothing else, got '+JSON.stringify(m4.slice(-160)));

// The opener.
var before=logOf().length;
var m5=shown('the opener failed, the plugin opens it',call(post(O,failedLine+'\n'),okOpener));
check(m5==='Board opened by the plugin: '+board,'the opener failed: the message, got '+JSON.stringify(m5));
check(opens().length===1&&opens()[0]===board,'the opener failed: the fake opener must be run once on the board, got '+JSON.stringify(opens()));
var e5=logOf().slice(before);
check(e5.length===2&&e5[0].event==='board.rendered'&&e5[1].event==='board.opened'&&e5[1].ok===true&&e5[1].by==='hook'&&e5[1].file==='board.html'&&/^(open|xdg-open)$/.test(e5[1].opener),'the opener failed: the board rendered again by the plugin\'s own script, then one board.opened line by the hook, got '+JSON.stringify(e5));
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
var sayEnv={WITH_FAKE_SAY:'1',FAKE_M4A_SECONDS:'12.5'};
var speakCmd='node '+path.join(scripts,'speak.js')+' --run '+run+' --round 01-sparring';
var silencedLineOld='Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1 owed for round 01-sparring.';
var silencedLine=silencedLineOld.replace(/\.$/,' of '+run+'.');
var voiceFile=path.join(run,'rounds','01-sparring','seat-1.m4a');
var realSilenced=cp.spawnSync(process.execPath,[path.join(scripts,'speak.js'),'--run',run,'--round','01-sparring'],{cwd:proj,encoding:'utf8',env:fakeEnv(null,{WITH_FAKE_SAY:'1'})}).stdout;
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
var v4=shown('the voices still silent outside',call(post(speakCmd,silencedLine+'\n'),null,{WITH_FAKE_SAY:'1',FAKE_M4A_SECONDS:'0'}));
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
var v6=bare('a shell variable in the command, the run on the line',call(post(speakVar,silencedLine+'\n'),null,sayEnv));
check(v6==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).'&&fs.existsSync(voiceFile),'a shell variable in the command: rendered from the line\'s run folder, got '+JSON.stringify(v6));
check(logOf().filter(function(e){return e.event==='voices.rendered';}).length===renderedBefore+1&&logOf().slice(-1)[0].by==='hook','a shell variable in the command: one voices.rendered line by hook');
fs.unlinkSync(voiceFile);
var v7=bare('a shell variable in the command, no run on the line',call(post(speakVar,silencedLineOld+'\n'),null,sayEnv));
check(v7==='Voices: the plugin could not tell which run the speech command ran on (the line named none and the command carried no literal --run path); nothing rendered. Rerun speak.js with the run folder spelled out.','a shell variable and no run on the line: the miss named, got '+JSON.stringify(v7));
check(!fs.existsSync(voiceFile)&&logOf().filter(function(e){return e.event==='voices.rendered';}).length===renderedBefore+1,'a shell variable and no run on the line: nothing rendered, no log line');
var v8=shown('the literal path in the command, no run on the line',call(post(speakCmd,silencedLineOld+'\n'),null,sayEnv));
check(v8==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).'&&fs.existsSync(voiceFile),'the literal path and the old line: rendered from the command, got '+JSON.stringify(v8));
fs.unlinkSync(voiceFile);
var v9=bare('the short form, a shell variable and the run on the line',call(post('R='+run+'; node '+path.join(scripts,'render-record.js')+' --run $R --short; '+speakVar,shortForm+silencedLine+'\n'),null,sayEnv));
check(v9===expected+'\n\nVoices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s).','the short form then the voices with a shell variable: the order, got '+JSON.stringify(v9.slice(-120)));
fs.unlinkSync(voiceFile);
// Every quality voice (Part 82): two voices listed, both rendered, the line counts them.
var twoEnv={WITH_FAKE_SAY:'1',FAKE_M4A_SECONDS:'12.5',FAKE_SAY_TWO:'1'};
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
var q3=bare('the silenced command with a shell variable for the run',call(post('S='+scripts+'; R='+run+'; node $S/render-record.js --run $R --short >/dev/null 2>&1; node $S/open-board.js --run $R >/dev/null 2>&1; echo done','done\n'),okOpener));
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
// The session's own transcript: a reply on test-id-1, then a subagent's reply and a synthetic record, neither the session's.
fs.writeFileSync(sessionFile,[rec('user',{},{role:'user',content:'spar this'}),rec('assistant',{},{role:'assistant',model:'test-id-0',content:[{type:'text',text:SECRET}]}),rec('assistant',{},{role:'assistant',model:'test-id-1',content:[{type:'text',text:SECRET}]}),rec('assistant',{isSidechain:true},{role:'assistant',model:'test-id-9',content:[]}),rec('assistant',{},{role:'assistant',model:'<synthetic>',content:[]})].join('\n')+'\n');
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
agent('a1',packetM('01-sparring','seat-1'),answerM('01-sparring','seat-1'),['test-id-1','test-id-1'],{agentType:'cw:seat'},60);
var realCheck=node('check-answer.js',[answerM('01-sparring','seat-1'),'--run',runM]).stdout;
check(/^seat-1 \S.* finished round 01-sparring: OK rating 8\/10/.test(realCheck),'measured: the real check-answer.js line, got '+JSON.stringify(realCheck.slice(0,120)));
var filesBefore=fs.readdirSync(runM).sort().join(',');
mute('measured: seat-1 after its check',call(postM(checkCmd(answerM('01-sparring','seat-1')),realCheck)),1);
var l1=measuredM()[0]||{};
check(l1.seat==='seat-1'&&l1.round==='01-sparring'&&l1.model==='test-id-1'&&l1.passed===null&&l1.session==='test-id-1'&&l1.by==='hook'&&!isNaN(Date.parse(l1.ts)),'measured: seat-1\'s line names the seat, the round, the id that answered, none passed, the session\'s id and the hook, got '+JSON.stringify(l1));
check(Object.keys(l1).join(',')==='ts,event,seat,round,model,passed,session,by','measured: the line carries the listed keys alone (no models for one id, no meta when the file was read), got '+Object.keys(l1).join(','));
check(logM().slice(-1)[0].event==='seat.model','measured: the line is the log\'s last, appended and nothing after it');
// A second identical call writes nothing.
mute('measured: a second identical call',call(postM(checkCmd(answerM('01-sparring','seat-1')),realCheck)),1);
// seat-2 sent back: three transcripts for one packet; the newest by the file's time is read, and by name it is neither the first nor the last.
agent('aa-first',packetM('01-sparring','seat-2'),answerM('01-sparring','seat-2'),['test-id-3'],{agentType:'cw:seat',model:'test-c'},50);
agent('zz-second',packetM('01-sparring','seat-2'),answerM('01-sparring','seat-2'),['test-id-3'],{agentType:'cw:seat',model:'test-c'},45);
// Its task names the packet through a link to the run folder: the two paths are compared resolved.
var alias=path.join(tmp,'alias'); fs.symlinkSync(runM,alias);
agent('mm-third',path.join(alias,'rounds','01-sparring','seat-2.packet.md'),answerM('01-sparring','seat-2'),['test-id-2'],{agentType:'cw:seat',model:'test-b'},40);
// Another agent handed the same packet, newer still, is no seat.
agent('other',packetM('01-sparring','seat-2'),answerM('01-sparring','seat-2'),['test-id-8'],{agentType:'general-purpose'},30);
mute('measured: seat-2 sent back, quoted paths',call(postM('node "'+scripts+'/check-answer.js" "'+answerM('01-sparring','seat-2')+'" --run \''+runM+'\'')),2);
var l2=measuredM()[1]||{};
check(l2.seat==='seat-2'&&l2.model==='test-id-2'&&l2.passed==='test-b'&&l2.session==='test-id-1'&&l2.models===undefined,'measured: a seat sent back reads its newest transcript and the choice passed at that start, never another agent\'s, got '+JSON.stringify(l2));
// An outside seat has a record with a provider: never measured, even with a transcript naming its packet.
agent('outside',packetM('01-sparring','seat-3'),answerM('01-sparring','seat-3'),['test-id-7'],{agentType:'cw:seat'},20);
mute('measured: an outside seat',call(postM(checkCmd(answerM('01-sparring','seat-3')))),2);
// Round 02: the replies carry two ids; a shell variable is no path.
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',runM,'--round','02-battle','--seat',s]); fs.writeFileSync(answerM('02-battle',s),'The close asks for a vote and never says on what.\n'); });
agent('b2',packetM('02-battle','seat-2'),answerM('02-battle','seat-2'),['test-id-2','test-id-2','<synthetic>','test-id-4'],{agentType:'cw:seat',model:'test-b'},15);
agent('b1',packetM('02-battle','seat-1'),answerM('02-battle','seat-1'),['test-id-1'],null,10);
mute('measured: a shell variable for the run',call(postM('R='+runM+'; node '+scripts+'/check-answer.js '+answerM('02-battle','seat-2')+' --run $R')),2);
mute('measured: a shell variable in the answer file\'s path',call(postM('R='+runM+'; node '+scripts+'/check-answer.js $R/rounds/02-battle/seat-2.answer.md --run '+runM)),2);
var dollar=path.join(proj,'$R'), dollarRound=path.join(dollar,'rounds','02-battle');
fs.mkdirSync(dollarRound,{recursive:true}); fs.writeFileSync(path.join(dollar,'seats.json'),JSON.stringify({seats:[{id:'seat-2',model:'Test Model B',company:'Anthropic',start:'named'}]})); fs.writeFileSync(path.join(dollar,'log.jsonl'),JSON.stringify({ts:new Date().toISOString(),event:'run.created'})+'\n');
fs.writeFileSync(path.join(dollarRound,'seat-2.packet.md'),'a packet\n'); fs.writeFileSync(path.join(dollarRound,'seat-2.answer.md'),'an answer\n');
agent('dollar',path.join(dollarRound,'seat-2.packet.md'),path.join(dollarRound,'seat-2.answer.md'),['test-id-7'],{agentType:'cw:seat'},12);
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
check(l3.seat==='seat-2'&&l3.round==='02-battle'&&l3.model==='test-id-4'&&JSON.stringify(l3.models)==='["test-id-2","test-id-4"]'&&l3.passed==='test-b','measured: replies carrying two ids list both in order, the last the model, the synthetic record no reply, got '+JSON.stringify(l3));
check(l4.seat==='seat-1'&&l4.round==='02-battle'&&l4.model==='test-id-1'&&l4.passed===null&&l4.meta===false,'measured: a transcript with no meta file beside it says the start choice was not read, got '+JSON.stringify(l4));
// The session's transcript missing: the seat is still measured, the session null.
var hostDir2=path.join(tmp,'host2'); fs.mkdirSync(path.join(hostDir2,SID),{recursive:true}); fs.cpSync(agentsDir,path.join(hostDir2,SID,'subagents'),{recursive:true});
node('packet.js',['--run',runM,'--round','03-final','--seat','seat-1','--final','sn']); fs.writeFileSync(answerM('03-final','seat-1','sn'),'S/N RATIO: 80%\nMostly signal.\n');
var snFile=path.join(hostDir2,SID,'subagents','agent-f1.jsonl');
fs.writeFileSync(snFile,[rec('user',{isSidechain:true},{role:'user',content:[{type:'text',text:'Packet: '+packetM('03-final','seat-1','sn')+'\nAnswer file: '+answerM('03-final','seat-1','sn')}]}),rec('assistant',{isSidechain:true},{role:'assistant',model:'test-id-5',content:[]})].join('\n')+'\n');
fs.writeFileSync(snFile.replace(/\.jsonl$/,'.meta.json'),JSON.stringify({agentType:'cw:seat'}));
check(fs.existsSync(packetM('03-final','seat-1','sn')),'measured: the real packet.js built the final read\'s packet');
mute('measured: a final read, the session\'s transcript missing',call(postM(checkCmd(answerM('03-final','seat-1','sn')),undefined,{transcript_path:path.join(hostDir2,SID+'.jsonl')})),5);
var l5=measuredM()[4]||{};
check(l5.seat==='seat-1'&&l5.round==='03-final'&&l5.model==='test-id-5'&&l5.session===null&&l5.passed===null&&l5.meta===undefined,'measured: a final read\'s answer file finds its own packet; with no session transcript the session is null, got '+JSON.stringify(l5));
// The line holds ids and places, never the transcript's words; the run folder gained no file.
check(fs.readFileSync(path.join(runM,'log.jsonl'),'utf8').indexOf(SECRET)<0&&fs.readFileSync(path.join(runM,'log.jsonl'),'utf8').indexOf('Read the packet')<0,'measured: no text of a transcript reaches the log');
check(fs.readdirSync(runM).sort().join(',')===filesBefore,'measured: the hook wrote no file in the run but the log lines, got '+fs.readdirSync(runM).sort().join(','));
// One command carrying a check and the short form: the line is written and the message is the short form alone.
fs.rmSync(path.join(agentsDir,'agent-b1.jsonl')); agent('b1b',packetM('02-battle','seat-1'),answerM('02-battle','seat-1'),['test-id-6'],{agentType:'cw:seat'},5);
var shortM=node('render-record.js',['--run',runM,'--short']).stdout;
var mm=shown('measured: a check and the short form in one command',call(postM(checkCmd(answerM('02-battle','seat-1'))+'; node '+scripts+'/render-record.js --run '+runM+' --short',shortM)));
var l6=measuredM()[5]||{};
check(mm===shortM.replace(/\n+$/,'')&&measuredM().length===6&&l6.seat==='seat-1'&&l6.round==='02-battle'&&l6.model==='test-id-6'&&l6.session==='test-id-1','measured: a seat whose newest transcript carries another id gets a new line for the round, and the message is the short form alone, got '+JSON.stringify(l6));

// THE MEASURED MODEL, hardened (issue 196, the read before the pull request opened): every read of
// the measurement is bounded and refuses what is no regular file, the task's Packet line is read
// without a backtracking pattern, an id is taken only when it is of a model id's class, the ids
// come from the END of a long transcript, the newest transcript is found past the opened count,
// and a folder with no packet is no run. A third run and one session folder per leg.
var runH=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','harden','--session-model','Test Session Model','--model-2','Test Model B']).stdout.trim();
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',runH,'--round','01-sparring','--seat',s]); fs.writeFileSync(path.join(runH,'rounds','01-sparring',s+'.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n'); });
function packetH(seat){ return path.join(runH,'rounds','01-sparring',seat+'.packet.md'); }
function answerH(seat){ return path.join(runH,'rounds','01-sparring',seat+'.answer.md'); }
function linesOf(runDir){ return fs.readFileSync(path.join(runDir,'log.jsonl'),'utf8').split('\n').filter(Boolean).map(function(l){ try{ return JSON.parse(l); }catch(e){ return {}; } }).filter(function(e){ return e.event==='seat.model'; }); }
var SESSION_LINES=[rec('user',{},{role:'user',content:'spar this'}),rec('assistant',{},{role:'assistant',model:'test-id-1',content:[]})];
// One session folder: its transcript (the lines given, or the plain two) and its subagents folder.
function hostAt(name,sessionLines){
  var dir=path.join(tmp,name), h={sid:'sess-h',file:path.join(dir,'sess-h.jsonl'),agents:path.join(dir,'sess-h','subagents')};
  fs.mkdirSync(h.agents,{recursive:true}); fs.writeFileSync(h.file,(sessionLines||SESSION_LINES).join('\n')+'\n');
  return h;
}
// One agent transcript in it: the task's text as given, one reply per id, the meta file unless null, the file's time secondsAgo back.
function agentAt(h,id,taskText,ids,meta,secondsAgo,between){
  var lines=[rec('user',{isSidechain:true},{role:'user',content:taskText})];
  ids.forEach(function(m,i){ lines.push(rec('assistant',{isSidechain:true},{role:'assistant',model:m,content:[]})); if(between&&i===0)lines.push(between); });
  var file=path.join(h.agents,'agent-'+id+'.jsonl'); fs.writeFileSync(file,lines.join('\n')+'\n');
  if(meta)fs.writeFileSync(file.replace(/\.jsonl$/,'.meta.json'),typeof meta==='string'?meta:JSON.stringify(meta));
  var when=new Date(Date.now()-(secondsAgo||0)*1000); fs.utimesSync(file,when,when);
  return file;
}
function taskFor(packet,answer){ return 'Packet: '+packet+'\nAnswer file: '+answer+'\nRead the packet, write your answer to the answer file, reply with one line.'; }
// The hook after a check, timed, killed when it has not returned within the limit.
function timed(h,answer,runDir,limitMs,extra){
  var input=post('node '+scripts+'/check-answer.js '+answer+' --run '+runDir,'ok\n',Object.assign({session_id:h.sid,transcript_path:h.file},extra||{}));
  var t0=Date.now(), r=cp.spawnSync(process.execPath,[hook],{input:JSON.stringify(input),encoding:'utf8',cwd:proj,timeout:limitMs,killSignal:'SIGKILL'});
  return {status:r.status,out:String(r.stdout||''),err:String(r.stderr||''),ms:Date.now()-t0};
}
function swift(name,r,limitMs){ check(r.status===0&&r.out===''&&r.err===''&&r.ms<limitMs,name+': expected exit 0, no output and under '+limitMs+' ms, got exit '+r.status+' in '+r.ms+' ms, out '+JSON.stringify(r.out.slice(0,120))); }
// A hand-made folder shaped like a run: a log, a seats.json holding seat-1, the answer file, and the packet when asked.
function handRun(name,withPacket){
  var dir=path.join(tmp,name), round=path.join(dir,'rounds','01-sparring'); fs.mkdirSync(round,{recursive:true});
  fs.writeFileSync(path.join(dir,'log.jsonl'),JSON.stringify({ts:new Date().toISOString(),event:'run.created'})+'\n');
  fs.writeFileSync(path.join(dir,'seats.json'),JSON.stringify({seats:[{id:'seat-1',model:'Test Session Model',company:'Anthropic',start:'session'}]}));
  fs.writeFileSync(path.join(round,'seat-1.answer.md'),'an answer\n');
  if(withPacket)fs.writeFileSync(path.join(round,'seat-1.packet.md'),'a packet\n');
  return {dir:dir,packet:path.join(round,'seat-1.packet.md'),answer:path.join(round,'seat-1.answer.md')};
}
var LIMIT=1000;

// 1. Every read bounded. A pipe where a file is expected would hold an unguarded read until the hook's timeout.
var fifoProbe=path.join(tmp,'probe.fifo'), haveFifo=cp.spawnSync('mkfifo',[fifoProbe]).status===0;
function fifo(p){ fs.rmSync(p,{force:true}); return cp.spawnSync('mkfifo',[p]).status===0; }
if(!haveFifo)console.log('skip measured: the five pipe legs (no mkfifo on this platform)');
else{
  var hF1=hostAt('h-fifo-meta'), fMeta=agentAt(hF1,'pipe',taskFor(packetH('seat-1'),answerH('seat-1')),['test-id-1'],null,5);
  fifo(fMeta.replace(/\.jsonl$/,'.meta.json'));
  swift('measured: a pipe named as the meta file',timed(hF1,answerH('seat-1'),runH,5000),LIMIT);
  check(linesOf(runH).length===0,'measured: a pipe named as the meta file: the agent is passed over and nothing is written, got '+JSON.stringify(linesOf(runH)));
  var pipeRun=handRun('pipe-seats',true); fifo(path.join(pipeRun.dir,'seats.json'));
  var hF2=hostAt('h-fifo-seats'); agentAt(hF2,'a',taskFor(pipeRun.packet,pipeRun.answer),['test-id-1'],{agentType:'cw:seat'},5);
  swift('measured: a pipe named seats.json',timed(hF2,pipeRun.answer,pipeRun.dir,5000),LIMIT);
  check(linesOf(pipeRun.dir).length===0,'measured: a pipe named seats.json: nothing is written');
  var pipeLog=handRun('pipe-log',true); fifo(path.join(pipeLog.dir,'log.jsonl'));
  var hF3=hostAt('h-fifo-log'); agentAt(hF3,'a',taskFor(pipeLog.packet,pipeLog.answer),['test-id-1'],{agentType:'cw:seat'},5);
  swift('measured: a pipe named log.jsonl',timed(hF3,pipeLog.answer,pipeLog.dir,5000),LIMIT);
  var hF4=hostAt('h-fifo-session'); fifo(hF4.file); agentAt(hF4,'a',taskFor(packetH('seat-1'),answerH('seat-1')),['test-id-1'],{agentType:'cw:seat'},5);
  var hF5=hostAt('h-fifo-agent'); fifo(path.join(hF5.agents,'agent-pipe.jsonl'));
  swift('measured: a pipe named as an agent transcript',timed(hF5,answerH('seat-1'),runH,5000),LIMIT);
  check(linesOf(runH).length===0,'measured: a pipe named as an agent transcript is never opened and nothing is written');
  swift('measured: a pipe named as the session\'s transcript',timed(hF4,answerH('seat-1'),runH,5000),LIMIT);
  var lF=linesOf(runH);
  check(lF.length===1&&lF[0].seat==='seat-1'&&lF[0].model==='test-id-1'&&lF[0].session===null,'measured: a pipe named as the session\'s transcript: the seat is measured and the session is null, got '+JSON.stringify(lF));
}
// A meta file or a seats.json over the small cap is passed over.
var hBig=hostAt('h-big-meta'), bigMeta=JSON.stringify({agentType:'cw:seat',model:'test-b',pad:new Array(70000).join('x')});
agentAt(hBig,'big',taskFor(packetH('seat-2'),answerH('seat-2')),['test-id-2'],bigMeta,5);
swift('measured: a meta file over the small cap',timed(hBig,answerH('seat-2'),runH,5000),LIMIT);
check(linesOf(runH).filter(function(e){ return e.seat==='seat-2'; }).length===0,'measured: a meta file over the small cap: the agent is passed over, nothing written for seat-2');
var bigSeats=handRun('big-seats',true); fs.writeFileSync(path.join(bigSeats.dir,'seats.json'),JSON.stringify({seats:[{id:'seat-1',model:'Test Session Model',company:'Anthropic',start:'session'}],pad:new Array(70000).join('x')}));
var hBigS=hostAt('h-big-seats'); agentAt(hBigS,'a',taskFor(bigSeats.packet,bigSeats.answer),['test-id-1'],{agentType:'cw:seat'},5);
swift('measured: a seats.json over the small cap',timed(hBigS,bigSeats.answer,bigSeats.dir,5000),LIMIT);
check(linesOf(bigSeats.dir).length===0,'measured: a seats.json over the small cap: nothing is written');

// 6. A folder that is not a run: a log and a seats.json and no packet gets no line, though an agent's task names the path.
var noPacket=handRun('no-packet',false), hNo=hostAt('h-no-packet');
agentAt(hNo,'a',taskFor(noPacket.packet,noPacket.answer),['test-id-1'],{agentType:'cw:seat'},5);
swift('measured: a folder with a log, a seats.json and no packet',timed(hNo,noPacket.answer,noPacket.dir,5000),LIMIT);
check(linesOf(noPacket.dir).length===0,'measured: a folder with no packet is no run: nothing is written, got '+JSON.stringify(linesOf(noPacket.dir)));
var withPacket=handRun('with-packet',true), hYes=hostAt('h-with-packet');
agentAt(hYes,'a',taskFor(withPacket.packet,withPacket.answer),['test-id-1'],null,5);
swift('measured: the same folder with its packet',timed(hYes,withPacket.answer,withPacket.dir,5000),LIMIT);
var lY=linesOf(withPacket.dir);
check(lY.length===1&&lY[0].model==='test-id-1'&&lY[0].meta===false&&lY[0].passed===null,'measured: the same folder with its packet is measured, an absent meta file said on the line, got '+JSON.stringify(lY));

// 2. The task line, linear: twenty transcripts whose Packet line is 62,000 spaces between two letters, then the seat's own, the oldest.
var hLong=hostAt('h-long-line'), spaces=new Array(62001).join(' ');
for(var li=0;li<20;li++)agentAt(hLong,'long'+li,'Packet:x'+spaces+'y\nAnswer file: z',['test-id-9'],{agentType:'cw:seat'},10+li);
agentAt(hLong,'own',taskFor(packetH('seat-2'),answerH('seat-2')),['test-id-2'],{agentType:'cw:seat',model:'test-b'},500);
check(fs.statSync(path.join(hLong.agents,'agent-long0.jsonl')).size<65536,'measured: the long line\'s record sits inside the bytes read for a task');
var rLong=timed(hLong,answerH('seat-2'),runH,20000);
swift('measured: twenty tasks with a 62,000-space Packet line',rLong,LIMIT);
var lLong=linesOf(runH).filter(function(e){ return e.seat==='seat-2'; });
check(lLong.length===1&&lLong[0].model==='test-id-2'&&lLong[0].passed==='test-b','measured: the long lines are no paths and the seat\'s own transcript behind them is read, got '+JSON.stringify(lLong));
// A Packet line with spaces before the path and after it still reads; a line over the cap is no path.
var trimRun=handRun('trim',true), hTrim=hostAt('h-trim');
agentAt(hTrim,'a','Packet:  \t'+trimRun.packet+' \t \r\nAnswer file: '+trimRun.answer,['test-id-1'],{agentType:'cw:seat'},5);
timed(hTrim,trimRun.answer,trimRun.dir,5000);
check(linesOf(trimRun.dir).length===1,'measured: a Packet line with spaces around its path reads');
var capRun=handRun('line-cap',true), hCap=hostAt('h-line-cap');
agentAt(hCap,'a','Packet:'+new Array(4200).join(' ')+capRun.packet+'\nAnswer file: '+capRun.answer,['test-id-1'],{agentType:'cw:seat'},5);
timed(hCap,capRun.answer,capRun.dir,5000);
check(linesOf(capRun.dir).length===0,'measured: a Packet line past 4,096 characters is no path, though it ends in the seat\'s packet');

// 3. The model id's characters: a line break, a space or a bracket no id carries means no line; a start choice or a session id of that kind is not written.
[['a line break','test-id-1\nINJECTED: a second line'],['a space','test id 1'],['an angle bracket','<test-id-1>'],['121 characters',new Array(122).join('a')]].forEach(function(c,i){
  var bad=handRun('bad-id-'+i,true), hBad=hostAt('h-bad-id-'+i);
  agentAt(hBad,'a',taskFor(bad.packet,bad.answer),['test-id-1',c[1]],{agentType:'cw:seat'},5);
  timed(hBad,bad.answer,bad.dir,5000);
  check(linesOf(bad.dir).length===0&&fs.readFileSync(path.join(bad.dir,'log.jsonl'),'utf8').indexOf('INJECTED')<0,'measured: a reply whose id holds '+c[0]+' is no measurement, got '+JSON.stringify(linesOf(bad.dir)));
});
var okId=handRun('ok-id',true), hOk=hostAt('h-ok-id');
agentAt(hOk,'a',taskFor(okId.packet,okId.answer),['maker/test-id_1.5:x[1m]'],{agentType:'cw:seat',model:'test-b[1m]'},5);
timed(hOk,okId.answer,okId.dir,5000);
check(linesOf(okId.dir).length===1&&linesOf(okId.dir)[0].model==='maker/test-id_1.5:x[1m]'&&linesOf(okId.dir)[0].passed==='test-b[1m]','measured: an id of letters, digits, dot, dash, underscore, slash, colon and square brackets is taken, got '+JSON.stringify(linesOf(okId.dir)));
var badPass=handRun('bad-pass',true), hBadPass=hostAt('h-bad-pass',[rec('user',{},{role:'user',content:'x'}),rec('assistant',{},{role:'assistant',model:'test-id-1',content:[]}),rec('assistant',{},{role:'assistant',model:'test id\n9',content:[]})]);
agentAt(hBadPass,'a',taskFor(badPass.packet,badPass.answer),['test-id-1'],{agentType:'cw:seat',model:'test b\nINJECTED'},5);
timed(hBadPass,badPass.answer,badPass.dir,5000);
var lBP=linesOf(badPass.dir)[0]||{};
check(lBP.model==='test-id-1'&&lBP.passed===null&&lBP.meta===false&&lBP.session===null&&fs.readFileSync(path.join(badPass.dir,'log.jsonl'),'utf8').indexOf('INJECTED')<0,'measured: a start choice that is no model id is null with meta false, a session id that is none is null, got '+JSON.stringify(lBP));

// 4. The last reply of a long transcript: past the bytes read, the ids come from the END of the file.
var longRun=handRun('long-transcript',true), hEnd=hostAt('h-long-transcript');
var filler=JSON.stringify({type:'attachment',blob:new Array(65000).join('x')}), fillerLines=[]; for(var fi=0;fi<135;fi++)fillerLines.push(filler);
var endFile=agentAt(hEnd,'a',taskFor(longRun.packet,longRun.answer),['test-id-3','test-id-4'],{agentType:'cw:seat'},5,fillerLines.join('\n'));
check(fs.statSync(endFile).size>8388608,'measured: the long transcript is past the bytes read, got '+fs.statSync(endFile).size);
swift('measured: a transcript past the bytes read',timed(hEnd,longRun.answer,longRun.dir,5000),LIMIT);
var lEnd=linesOf(longRun.dir)[0]||{};
check(lEnd.model==='test-id-4'&&lEnd.partial===true&&lEnd.models===undefined,'measured: a long transcript is logged with its last reply\'s id and marked partial, got '+JSON.stringify(lEnd));
check(Object.keys(linesOf(withPacket.dir)[0]||{}).indexOf('partial')<0,'measured: a transcript read whole carries no partial mark');

// 5. Newest first past the list: 2,100 agent files, more than are opened and more than the list once
// held before its sort; the seat's own is the newest, and it is the file the folder lists LAST (the
// folder's own order is read here, so the leg does not lean on how a file system orders names),
// while the file the folder lists first is an older transcript of the same packet.
var hMany=hostAt('h-many'), manyRun=handRun('many',true), hourAgo=new Date(Date.now()-3600000);
for(var mi=0;mi<2100;mi++){ var mf=path.join(hMany.agents,'agent-f'+('0000'+mi).slice(-4)+'.jsonl'); fs.writeFileSync(mf,'{"type":"user","message":{"content":"Packet: /nowhere/rounds/01-sparring/seat-1.packet.md"}}\n'); fs.utimesSync(mf,hourAgo,hourAgo); }
var listed=fs.readdirSync(hMany.agents).filter(function(n){ return /^agent-.*\.jsonl$/.test(n); });
function ownAt(name,id,when){ var file=path.join(hMany.agents,name); fs.writeFileSync(file,[rec('user',{isSidechain:true},{role:'user',content:taskFor(manyRun.packet,manyRun.answer)}),rec('assistant',{isSidechain:true},{role:'assistant',model:id,content:[]})].join('\n')+'\n'); fs.utimesSync(file,when,when); }
ownAt(listed[0],'test-id-6',new Date(Date.now()-5*3600000));
ownAt(listed[listed.length-1],'test-id-5',new Date(Date.now()-1000));
check(fs.readdirSync(hMany.agents).filter(function(n){ return /^agent-.*\.jsonl$/.test(n); }).join(',')===listed.join(','),'measured: the folder lists its files in the order read before the seat\'s own were written');
swift('measured: 2,100 agent files',timed(hMany,manyRun.answer,manyRun.dir,10000),LIMIT);
var lMany=linesOf(manyRun.dir)[0]||{};
check(lMany.model==='test-id-5','measured: the newest transcript is found among more files than are opened, though the folder lists it last, got '+JSON.stringify(lMany));

var src=fs.readFileSync(hook,'utf8');
check(src.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','show-result.js: no Shield header on line 1');
check(!/writeFileSync|mkdirSync|\bfetch\(|https?:\/\/|execSync|execFile|cp\.exec\b|\bshell\s*:\s*true/.test(src.replace(/\/\/[^\n]*/g,'')),'show-result.js: must write no file but the log line, fetch nothing, run no shell');
check(!/process\.env/.test(src.replace(/\/\/[^\n]*/g,'')),'show-result.js: the code reads the environment; it reads none, and the tests reach it through the PATH alone, got '+(src.match(/process\.env\.[A-Z_]+/g)||[]).join(','));
// THE TESTS' SWITCH IS GONE (issue 239). CW_OPENER named a program the hook ran, outside the
// sandbox, in place of the system's opener, so whoever could set a variable in the session chose a
// program the hook started after a round. A program named by it now never runs: the board is
// opened by the opener the PATH holds.
var plantedMark=path.join(tmp,'planted-ran.txt');
var planted=path.join(tmp,'planted.js'); fs.writeFileSync(planted,'require("fs").appendFileSync('+JSON.stringify(plantedMark)+',"ran\\n");process.exit(0);\n');
var opensBeforeSwitch=opens().length;
var sw=shown('the tests\' switch: CW_OPENER names a program',call(post('node '+scripts+'/open-board.js --run '+run,failedLine+'\n'),okOpener,{CW_OPENER:process.execPath+' '+planted}));
check(!fs.existsSync(plantedMark),'the tests\' switch: the program CW_OPENER names was run by the hook');
check(sw==='Board opened by the plugin: '+board&&opens().length===opensBeforeSwitch+1,'the tests\' switch: the board must be opened by the opener on the PATH, got '+JSON.stringify(sw)+' and '+(opens().length-opensBeforeSwitch)+' open(s)');
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
// Hardened: every function of the measurement reads through the one reader, which opens without blocking and reads a regular file alone.
function bodyOf(n){ return (new RegExp('\\nfunction '+n+'\\([\\s\\S]*?\\n}\\n').exec(src)||[''])[0]; }
var measuring=['smallJson','seatOf','packetLineOf','transcriptOf','modelsOf','sessionModelOf','measureSeats'].map(bodyOf);
check(measuring.every(function(body){ return body.length>0&&!/readFileSync/.test(body); }),'show-result.js: no function of the measurement reads a file whole (smallJson, seatOf, packetLineOf, transcriptOf, modelsOf, sessionModelOf, measureSeats)');
check(/fstatSync\(fd\)/.test(bodyOf('bytesOf'))&&/isFile\(\)/.test(bodyOf('bytesOf'))&&/openSync\(file,OPEN_FLAGS\)/.test(bodyOf('bytesOf'))&&/^var OPEN_FLAGS=fs\.constants\.O_RDONLY\|\(fs\.constants\.O_NONBLOCK\|\|0\);$/m.test(src),'show-result.js: the bounded reader opens without blocking and reads a regular file alone');
check(bodyOf('packetLineOf').length>0&&!/\.exec\(|\.match\(|\.replace\(|RegExp|\/\^/.test(bodyOf('packetLineOf'))&&!/Packet:\[ /.test(src.replace(/\/\/.*$/gm,'')),'show-result.js: the Packet line is read by splitting and trimming, with no pattern');
var caps=/AGENTS_STAT_MAX=(\d+), AGENTS_READ_MAX=(\d+),[^;]*SMALL_BYTES=(\d+), LOG_BYTES=(\d+), PACKET_LINE_MAX=(\d+)/.exec(src)||[];
check(+caps[1]>=2000&&+caps[1]>+caps[2]&&+caps[3]>0&&+caps[3]<=65536&&+caps[4]>0&&+caps[4]<=8388608&&+caps[5]>0&&+caps[5]<=4096,'show-result.js: more agent files are asked their time than are opened, and the small files, the log and the Packet line are capped, got '+caps.slice(1).join(', '));
var idRe=(/^var MODEL_ID_RE=(\/.*\/);$/m.exec(src)||[])[1], libRe=(/^var MODEL_ID_RE=(\/.*\/);$/m.exec(fs.readFileSync(path.join(scripts,'lib.js'),'utf8'))||[])[1];
check(typeof idRe==='string'&&idRe===libRe,'show-result.js: the model id pattern equals lib.js\'s, got '+idRe+' and '+libRe);
var idTest=idRe?new RegExp(idRe.slice(1,-1)):/$^/;
check(['test-id-0','test-id-9','maker/name-1.5:x[1m]_y',new Array(121).join('a')].every(function(s){ return idTest.test(s); })&&['','a b','a\nb','a\tb','<synthetic>','a"b','a\u0007b',new Array(122).join('a')].every(function(s){ return !idTest.test(s); }),'show-result.js: the model id pattern takes letters, digits, dot, dash, underscore, slash, colon and square brackets up to 120 and nothing else');

// THE SWITCH (issue 216): the hook reads the project's picker.json and ends its context to match.
// With the picker on, or where the hook cannot place the project, the context ends as it always
// has, "then open the Next picker."; with the picker off it says to print the text Next line and
// open no picker, so nothing the plugin hands the host after a round says to open one there.
var libP=require(path.join(scripts,'lib.js'));
var pickerFile=path.join(proj,'combat-writing','picker.json');
var ON_TAIL='print one line naming the round just run, then open the Next picker.';
function ctxOf(r){ return r.json&&r.json.hookSpecificOutput?String(r.json.hookSpecificOutput.additionalContext||''):''; }
function isOn(r){ var c=ctxOf(r); return c.slice(-ON_TAIL.length)===ON_TAIL&&!/open no picker/.test(c); }
function isOff(r){ var c=ctxOf(r); return /print one line naming the round just run, then the text Next line/.test(c)&&/open no picker/.test(c)&&!/open the Next picker/.test(c)&&/combat-writing\/picker\.json/.test(c)&&/picker\.js --run <folder>/.test(c); }
fs.rmSync(pickerFile,{force:true});
var swOn=call(post(S,freshShort()+'\n'));
shown('the switch, no file',swOn);
check(isOn(swOn)&&libP.readPicker(proj).off===false,'the switch, no file: the context must end "'+ON_TAIL+'"; got '+JSON.stringify(ctxOf(swOn).slice(-120)));
var offRun=node('picker.js',['--run',run,'--off']);
check(offRun.status===0&&fs.existsSync(pickerFile)&&libP.readPicker(proj).off===true,'the switch: picker.js --off must write the project file; got '+offRun.stdout+offRun.stderr);
var keptBytes=fs.existsSync(pickerFile)?fs.readFileSync(pickerFile,'utf8'):'';
var swOff=call(post(S,freshShort()+'\n'));
shown('the switch, off',swOff);
check(isOff(swOff),'the switch, off: the context must say the text Next line, "open no picker", the file and picker.js --run <folder>, and never "open the Next picker"; got '+JSON.stringify(ctxOf(swOff).slice(-260)));
check(swOff.json&&swOff.json.systemMessage===freshShort(),'the switch, off: the short form on the screen is unchanged');
// The opener's line alone, in the same project, carries the same context.
var swOffOpener=call(post(O,failedLine+'\n'),okOpener);
check(isOff(swOffOpener),'the switch, off, the opener alone: the context must be the off one; got '+JSON.stringify(ctxOf(swOffOpener).slice(-160)));
// A run named by a shell variable: the hook cannot place the run, so it hands no context (issue 235; it handed the default line before).
var swVar=call(post('node '+scripts+'/render-record.js --run $R --short',freshShort()+'\n'));
check(bare('the switch, off, a shell variable for the run',swVar)===freshShort()&&ctxOf(swVar)==='','the switch, off, a shell variable for the run: the short form on the screen and no context; got '+JSON.stringify(ctxOf(swVar).slice(-120)));
// A run written with a tilde: the shell expands it for the script, the hook cannot (issue 220).
var swTilde=call(post('node '+scripts+'/render-record.js --run ~/combat-writing/runs/'+path.basename(run)+' --short',freshShort()+'\n'));
check(bare('the switch, off, a tilde in the run path',swTilde)===freshShort()&&ctxOf(swTilde)==='','the switch, off, a tilde in the run path: the hook cannot place the run and hands no context (issue 235); got '+JSON.stringify(ctxOf(swTilde).slice(-120)));
// A working folder that is no string, with a relative run path: the run cannot be placed, so no context (issue 235), exit 0, never a crash.
var swCwd=call(post('node '+scripts+'/render-record.js --run combat-writing/runs/'+path.basename(run)+' --short',freshShort()+'\n',{cwd:5}));
check(swCwd.status===0&&swCwd.stderr===''&&bare('the switch, a working folder that is no string',swCwd)===freshShort()&&ctxOf(swCwd)==='','the switch, a working folder that is no string: exit 0, the short form and no context; got exit '+swCwd.status+' '+swCwd.stderr.slice(0,160));
// A relative run path under a real working folder is placed, and reads off.
var swRel=call(post('node '+scripts+'/render-record.js --run combat-writing/runs/'+path.basename(run)+' --short',freshShort()+'\n'));
check(isOff(swRel),'the switch, off, a relative run path: placed under the working folder and read as off; got '+JSON.stringify(ctxOf(swRel).slice(-160)));
// A run folder that is not under <project>/combat-writing/runs/ has no project to read.
var loose=path.join(tmp,'loose','a-run'); fs.mkdirSync(path.dirname(loose),{recursive:true}); fs.cpSync(run,loose,{recursive:true});
var swLoose=call(post('node '+scripts+'/render-record.js --run '+loose+' --short',freshShort()+'\n'));
check(isOn(swLoose),'the switch, a run outside combat-writing/runs: the default line; got '+JSON.stringify(ctxOf(swLoose).slice(-120)));
// The hook reads and never writes: the file's bytes are as picker.js left them.
check(fs.existsSync(pickerFile)&&fs.readFileSync(pickerFile,'utf8')===keptBytes,'the switch: the hook must leave picker.json as picker.js wrote it');
// The hook's reading equals lib's on the same file: not JSON, another value, an array, off written
// by hand, and a folder in the file's place: five, each compared to lib.readPicker.
[['not JSON','{not json'],['another value','{"picker":"maybe"}\n'],['an array','["off"]\n'],['off, by hand','{"picker":"off"}\n']].forEach(function(c){
  fs.writeFileSync(pickerFile,c[1]);
  var r=call(post(S,freshShort()+'\n')), want=libP.readPicker(proj).off;
  check((want?isOff(r):isOn(r)),'the switch, picker.json '+c[0]+': the hook must read it as lib.readPicker does ('+(want?'off':'on')+'); got '+JSON.stringify(ctxOf(r).slice(-120)));
});
fs.rmSync(pickerFile,{force:true}); fs.mkdirSync(pickerFile);
check(libP.readPicker(proj).off===false&&isOn(call(post(S,freshShort()+'\n'))),'the switch, a folder in the file\'s place: the hook must read it as lib.readPicker does (on)');
fs.rmSync(pickerFile,{recursive:true,force:true});
// A pipe in the file's place is passed over, never waited on.
if(haveFifo&&fifo(pickerFile)){
  var tF=Date.now(), rF=cp.spawnSync(process.execPath,[hook],{input:JSON.stringify(post(S,freshShort()+'\n')),encoding:'utf8',cwd:proj,timeout:8000,killSignal:'SIGKILL'});
  var jF=null; try{ jF=JSON.parse(rF.stdout.trim()); }catch(e){}
  check(rF.status===0&&Date.now()-tF<8000&&isOn({json:jF}),'the switch, a pipe in the file\'s place: the hook must not wait on it and must read on; exit '+rF.status+' after '+(Date.now()-tF)+' ms');
  fs.rmSync(pickerFile,{force:true});
}
// The way back: picker.js --on removes the file and the context is the default again.
node('picker.js',['--run',run,'--off']);
check(isOff(call(post(S,freshShort()+'\n'))),'the switch: off again before the way back');
var backRun=node('picker.js',['--on']);
check(backRun.status===0&&!fs.existsSync(pickerFile)&&isOn(call(post(S,freshShort()+'\n'))),'the switch, the way back: after picker.js --on the context ends "'+ON_TAIL+'"');

// THE REAL RUN (issue 235). The hook acts outside the sandbox, so what it acts on is held to one
// thing: a real run folder. The board's run is the one the command itself names by a literal
// --run path: the hook opens that run's own board.html and no other file, never a path read from
// the command's output, and hands the host context only for a run named that way; the voices it
// renders and the board it rebuilds stay on the folder the script's own line names, held to a
// real run and to a round of it; a link among the run's files makes the folder no run.
fs.rmSync(marker,{force:true});
var decoy=path.join(tmp,'decoy.html'); fs.writeFileSync(decoy,'<p>not a board</p>\n');
function failedFor(p){ return 'Board: '+p+' (the opener failed: x; open it yourself: y)\n'; }
// A command that only mentions a script, with a line in its output shaped like the opener's: silence, nothing opened.
silent('real run: a command that only mentions open-board.js, a failed line naming another file',call(post('cat notes.txt # open-board.js',failedFor(decoy)),okOpener));
silent('real run: the same with a web address on a no-opener line',call(post('cat notes.txt # open-board.js','Board: https://example.invalid/x?y=1 (no browser opener here: x)\n'),okOpener));
silent('real run: a command that only mentions render-record.js --short, a short form in its output',call(post('cat notes.txt # render-record.js --short',shortForm)));
check(opens().length===0,'real run: a command that only mentions a script opens nothing, got '+JSON.stringify(opens()));
// The command names the real run; its output names another file: the run's own board is opened, the other never.
var rr1=shown('real run: the output names another file',call(post(O,failedFor(decoy)),okOpener));
check(rr1==='Board opened by the plugin: '+board&&opens().length===1&&opens()[0]===board,'real run: the board opened is the run\'s own, from the command\'s path, never the path on the line; got '+JSON.stringify(rr1)+' and '+JSON.stringify(opens()));
var rr1b=shown('real run: the output names a web address',call(post(O,'Board: https://example.invalid/x?y=1 (no browser opener here: x)\n'),okOpener));
check(rr1b==='Board opened by the plugin: '+board&&opens().length===2&&opens()[1]===board,'real run: a web address on the line is never opened; got '+JSON.stringify(opens()));
// A shell variable for the run: the hook cannot place it, opens nothing, shows the script's own line (which carries the command to open it by hand) and hands no context.
var rr2=bare('real run: a shell variable for the run and a failed opener',call(post('R='+run+'; node '+scripts+'/open-board.js --run $R',failedLine+'\n'),okOpener));
check(rr2===failedLine&&opens().length===2,'real run: a run named by a shell variable is not opened by the hook, the script\'s line shown as printed; got '+JSON.stringify(rr2)+' and '+opens().length+' opens');
// A literal path that is no run folder: a board.html in it is not opened, no context.
var notRun=path.join(tmp,'not-a-run'); fs.mkdirSync(notRun); fs.writeFileSync(path.join(notRun,'board.html'),'<p>x</p>\n');
var rr3=bare('real run: a folder with a board.html and no run in it',call(post('node '+scripts+'/open-board.js --run '+notRun,failedFor(path.join(notRun,'board.html'))),okOpener));
check(opens().length===2&&rr3.indexOf('Board opened by the plugin')<0,'real run: a board.html in a folder that is no run is not opened; got '+JSON.stringify(rr3));
// A folder made to look like a run: seats.json and log.jsonl as files, with a link in it.
function lookalike(name){ var d=path.join(tmp,name); fs.mkdirSync(d); fs.writeFileSync(path.join(d,'seats.json'),JSON.stringify({seats:[{id:'seat-1',model:'Test Model',company:'Anthropic',start:'session'}]})); fs.writeFileSync(path.join(d,'log.jsonl'),JSON.stringify({ts:new Date().toISOString(),event:'run.created'})+'\n'); fs.writeFileSync(path.join(d,'board.html'),'<p>x</p>\n'); return d; }
var haveLinks=true; try{ fs.symlinkSync(decoy,path.join(tmp,'link-probe')); }catch(e){ haveLinks=false; }
var plainLook=lookalike('look-plain');
// A hand-made folder of plain files passes as a run folder; the page opened in it is the plugin's own render of it, never the page that stood there.
var rr4=shown('real run: a hand-made folder with seats.json, log.jsonl and board.html as plain files',call(post('node '+scripts+'/open-board.js --run '+plainLook,failedFor(path.join(plainLook,'board.html'))),okOpener));
check(rr4==='Board opened by the plugin: '+path.join(plainLook,'board.html')&&opens().length===3&&/<header class="strip">/.test(fs.readFileSync(path.join(plainLook,'board.html'),'utf8'))&&fs.readFileSync(path.join(plainLook,'board.html'),'utf8').indexOf('<p>x</p>')<0,'real run: a hand-made run folder is opened as the plugin\'s own render, the page that stood there gone; got '+JSON.stringify(rr4));
// A folder the renderer cannot render: nothing is opened, the page is left as it was, and the message says why.
var brokenLook=lookalike('look-broken'); fs.writeFileSync(path.join(brokenLook,'seats.json'),JSON.stringify({seats:[null]}));
var rr4b=shown('real run: a run folder the renderer cannot render',call(post('node '+scripts+'/open-board.js --run '+brokenLook,failedFor(path.join(brokenLook,'board.html'))),okOpener));
check(rr4b==='Board: '+path.join(brokenLook,'board.html')+' (the plugin could not render it again, so it did not open it: TypeError: Cannot read properties of null (reading \'id\'))'&&opens().length===3&&fs.readFileSync(path.join(brokenLook,'board.html'),'utf8')==='<p>x</p>\n','real run: a board the plugin cannot render again is not opened, and is left as it was; got '+JSON.stringify(rr4b)+' and '+opens().length+' opens');
// THE RENDER BEFORE THE OPEN (issue 235): the page the hook opens is the plugin's own render of the run, made by the hook
// the moment before. A board.html written by another hand is replaced by that render, then opened; nothing of it is left.
var planted='<p>PLANTED-PAGE</p><script>document.title="planted"</script>\n';
fs.writeFileSync(board,planted);
var beforeP=logOf().length, opensP=opens().length;
var rp=shown('the render before the open: a board.html written by another hand',call(post(O,failedLine+'\n'),okOpener));
var afterP=fs.readFileSync(board,'utf8'), eP=logOf().slice(beforeP);
check(rp==='Board opened by the plugin: '+board&&opens().length===opensP+1&&opens()[opensP]===board,'the render before the open: the run\'s board is opened; got '+JSON.stringify(rp));
check(afterP.indexOf('PLANTED-PAGE')<0&&/<header class="strip">/.test(afterP)&&afterP.indexOf('Dear board, buy the company.')>0,'the render before the open: the page opened must be the plugin\'s own render of the run, with nothing of the page that stood there; got '+JSON.stringify(afterP.slice(0,120)));
check(eP.length===2&&eP[0].event==='board.rendered'&&eP[1].event==='board.opened'&&eP[1].by==='hook','the render before the open: board.rendered, then board.opened by the hook, on the log; got '+JSON.stringify(eP));
// The silenced opener (no line reached the hook) is rendered before it is opened too.
fs.writeFileSync(board,planted);
var logQ=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').filter(function(l){ return l.indexOf('"board.opened"')<0; }); fs.writeFileSync(path.join(run,'log.jsonl'),logQ.join('\n')+'\n');
var rq=shown('the render before the open: the silenced opener',call(post(O+' >/dev/null 2>&1; echo done','done\n'),okOpener));
check(/Board opened by the plugin: /.test(rq)&&fs.readFileSync(board,'utf8').indexOf('PLANTED-PAGE')<0,'the render before the open: a silenced opener\'s board is rendered again before it is opened; got '+JSON.stringify(rq));
// With the voices owed in the same command the board is rendered once, after them, and the line says the board carries them.
fs.readdirSync(path.join(run,'rounds','01-sparring')).filter(function(n){ return /^voices\.json$|\.m4a$/.test(n); }).forEach(function(n){ fs.rmSync(path.join(run,'rounds','01-sparring',n)); });
fs.writeFileSync(board,planted);
var beforeV=logOf().length;
var rv=shown('the render before the open: the voices, the board and a failed opener in one command',call(post(combined,silencedLine+'\n'+failedLine+'\n'),okOpener,sayEnv));
var eV=logOf().slice(beforeV).map(function(e){ return e.event; });
check(rv==='Voices rendered by the plugin: Ava (Premium) for seat-1 (12.5 s). The board carries them.\n\nBoard opened by the plugin: '+board,'the render before the open, with the voices: the message; got '+JSON.stringify(rv));
check(eV.filter(function(e){ return e==='board.rendered'; }).length===1&&eV.indexOf('board.rendered')>eV.indexOf('voices.rendered')&&/data-audio="[^"]*seat-1\.m4a"/.test(fs.readFileSync(board,'utf8')),'the render before the open, with the voices: one render, after the voices, the opened board carrying the file; got '+JSON.stringify(eV));
fs.rmSync(path.join(run,'rounds','01-sparring','seat-1.m4a'),{force:true}); fs.rmSync(path.join(run,'rounds','01-sparring','voices.json'),{force:true});
var opensL=opens().length;
if(!haveLinks)console.log('skip real run: the link legs (no symbolic links on this platform)');
else{
  // board.html is a link to a file outside the run: not the run's own file, not opened.
  var linkBoard=lookalike('look-link-board'); fs.rmSync(path.join(linkBoard,'board.html')); fs.symlinkSync(decoy,path.join(linkBoard,'board.html'));
  var rr5=bare('real run: board.html is a link',call(post('node '+scripts+'/open-board.js --run '+linkBoard,failedFor(path.join(linkBoard,'board.html'))),okOpener));
  check(opens().length===opensL&&rr5.indexOf('Board opened by the plugin')<0,'real run: a board.html that is a link is never opened; got '+JSON.stringify(rr5));
  // log.jsonl is a link to a file outside the run: the hook writes no line through it.
  var outsideLog=path.join(tmp,'outside-log.jsonl'); fs.writeFileSync(outsideLog,'KEEP\n');
  var linkLog=lookalike('look-link-log'); fs.rmSync(path.join(linkLog,'log.jsonl')); fs.symlinkSync(outsideLog,path.join(linkLog,'log.jsonl'));
  bare('real run: log.jsonl is a link',call(post('node '+scripts+'/open-board.js --run '+linkLog,failedFor(path.join(linkLog,'board.html'))),okOpener));
  check(opens().length===opensL&&fs.readFileSync(outsideLog,'utf8')==='KEEP\n','real run: a run whose log is a link is no run: nothing opened and no line written through the link; got '+JSON.stringify(fs.readFileSync(outsideLog,'utf8').slice(0,120)));
  // The voices: a link in the round's folder is no place to render into; the file it points at is left as it was.
  var outsideVoices=path.join(tmp,'outside-voices.json'); fs.writeFileSync(outsideVoices,'KEEP\n');
  var vRun=path.join(tmp,'proj-v','combat-writing','runs','v-run'); fs.mkdirSync(path.dirname(vRun),{recursive:true}); fs.cpSync(run,vRun,{recursive:true});
  var vRound=path.join(vRun,'rounds','01-sparring'); fs.readdirSync(vRound).filter(function(n){ return /^voices\.json$|\.m4a$/.test(n); }).forEach(function(n){ fs.rmSync(path.join(vRound,n)); });
  fs.symlinkSync(outsideVoices,path.join(vRound,'voices.json'));
  var vSilenced='Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1 owed for round 01-sparring of '+vRun+'.';
  var rr6=bare('real run: a link in the round\'s folder',call(post('node '+path.join(scripts,'speak.js')+' --run '+vRun+' --round 01-sparring',vSilenced+'\n'),null,sayEnv));
  check(fs.readFileSync(outsideVoices,'utf8')==='KEEP\n'&&!fs.existsSync(path.join(vRound,'seat-1.m4a'))&&/^Voices: nothing rendered by the plugin: /.test(rr6),'real run: the voices are not rendered into a round folder holding a link, and the file the link names is untouched; got '+JSON.stringify(rr6)+' and '+JSON.stringify(fs.readFileSync(outsideVoices,'utf8').slice(0,80)));
  // The board rebuilt after the voices: a board.html that is a link is never written through.
  var outsideBoard=path.join(tmp,'outside-board.txt'); fs.writeFileSync(outsideBoard,'KEEP\n');
  var bRun=path.join(tmp,'proj-b','combat-writing','runs','b-run'); fs.mkdirSync(path.dirname(bRun),{recursive:true}); fs.cpSync(run,bRun,{recursive:true});
  var bRound=path.join(bRun,'rounds','01-sparring'); fs.readdirSync(bRound).filter(function(n){ return /^voices\.json$|\.m4a$/.test(n); }).forEach(function(n){ fs.rmSync(path.join(bRound,n)); });
  fs.rmSync(path.join(bRun,'board.html')); fs.symlinkSync(outsideBoard,path.join(bRun,'board.html'));
  var bSilenced='Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1 owed for round 01-sparring of '+bRun+'.';
  call(post('node '+path.join(scripts,'speak.js')+' --run '+bRun+' --round 01-sparring && node '+path.join(scripts,'render-board.js')+' --run '+bRun,bSilenced+'\n'),null,sayEnv);
  check(fs.readFileSync(outsideBoard,'utf8')==='KEEP\n','real run: a board.html that is a link is never rebuilt through; the file it names holds '+JSON.stringify(fs.readFileSync(outsideBoard,'utf8').slice(0,80)));
}
// THE RUN FOLDER, ALL THE WAY DOWN (issue 235, the read before the pull request opened). The hook's renders run
// outside the sandbox and read the run's files, so a link in the run's tree is a file from anywhere read into the
// board, the record or a voice. A run folder holds plain files and plain folders alone, down through its rounds.
var SECRET_TEXT='OUTSIDE-SECRET-LINE';
var outsideSecret=path.join(tmp,'outside-secret.txt'); fs.writeFileSync(outsideSecret,'RATING: 8/10\n'+SECRET_TEXT+'\n');
function copyRun(name){ var d=path.join(tmp,'proj-'+name,'combat-writing','runs',name+'-run'); fs.mkdirSync(path.dirname(d),{recursive:true}); fs.cpSync(run,d,{recursive:true}); fs.readdirSync(path.join(d,'rounds','01-sparring')).filter(function(n){ return /^voices\.json$|\.m4a$/.test(n); }).forEach(function(n){ fs.rmSync(path.join(d,'rounds','01-sparring',n)); }); return d; }
function readAll(d){ return ['board.html','record.md'].map(function(n){ try{ return fs.readFileSync(path.join(d,n),'utf8'); }catch(e){ return ''; } }).join('\n'); }
if(haveLinks){
  // A seat's answer that is a symbolic link to a file outside the run: nothing is rendered from it, nothing opened.
  var sRun=copyRun('s'), sAnswer=path.join(sRun,'rounds','01-sparring','seat-1.answer.md'); fs.rmSync(sAnswer); fs.symlinkSync(outsideSecret,sAnswer);
  var opensS=opens().length;
  var rs1=call(post('node '+scripts+'/open-board.js --run '+sRun,failedFor(path.join(sRun,'board.html'))),okOpener);
  check(rs1.status===0&&opens().length===opensS&&readAll(sRun).indexOf(SECRET_TEXT)<0,'the run folder all the way down: an answer that is a symbolic link is never read into a render by the hook, and its board is not opened; opens '+opens().length+' against '+opensS+', the secret on the page: '+(readAll(sRun).indexOf(SECRET_TEXT)>=0));
  // The same through the silenced command: the hook renders no record and no short form from a run that holds a link.
  var rs2=call(post('node '+scripts+'/render-record.js --run '+sRun+' --short >/dev/null 2>&1; echo done','done\n'),okOpener);
  check(rs2.status===0&&readAll(sRun).indexOf(SECRET_TEXT)<0&&String(rs2.out).indexOf(SECRET_TEXT)<0&&(!rs2.json||!rs2.json.hookSpecificOutput),'the run folder all the way down: the record is not rendered again from a run that holds a link, and no context is handed; got '+JSON.stringify(String(rs2.out).slice(0,200)));
  // A hard link is a link too: a second name for a file that lives outside the run.
  var hRun=copyRun('h'), hAnswer=path.join(hRun,'rounds','01-sparring','seat-1.answer.md'), hardOk=true; fs.rmSync(hAnswer);
  try{ fs.linkSync(outsideSecret,hAnswer); }catch(e){ hardOk=false; }
  if(!hardOk)console.log('skip the run folder all the way down: the hard link leg (no hard links on this platform)');
  else{
    var opensH=opens().length;
    call(post('node '+scripts+'/open-board.js --run '+hRun,failedFor(path.join(hRun,'board.html'))),okOpener);
    check(opens().length===opensH&&readAll(hRun).indexOf(SECRET_TEXT)<0,'the run folder all the way down: an answer that is a hard link to a file outside the run is never read into a render by the hook; the secret on the page: '+(readAll(hRun).indexOf(SECRET_TEXT)>=0));
  }
  // THE MEASURED MODEL under the same rule: a run whose log is a link gets no seat.model line through it.
  var outsideM=path.join(tmp,'outside-measured.jsonl'); fs.writeFileSync(outsideM,'KEEP\n');
  var mLink=handRun('measure-link-log',true); fs.rmSync(path.join(mLink.dir,'log.jsonl')); fs.symlinkSync(outsideM,path.join(mLink.dir,'log.jsonl'));
  var hLink=hostAt('h-measure-link'); agentAt(hLink,'a',taskFor(mLink.packet,mLink.answer),['test-id-1'],{agentType:'cw:seat'},5);
  timed(hLink,mLink.answer,mLink.dir,5000);
  check(fs.readFileSync(outsideM,'utf8')==='KEEP\n','the measured model: a run whose log.jsonl is a link is no run, and no seat.model line is written through the link; the file it names holds '+JSON.stringify(fs.readFileSync(outsideM,'utf8').slice(0,120)));
}
// A pipe in a round's folder is no file of a run: the hook does not wait on it and renders nothing.
if(haveFifo){
  var fRun=copyRun('f'); fifo(path.join(fRun,'rounds','01-sparring','voices.json'));
  var tP=Date.now(), rP=cp.spawnSync(process.execPath,[hook],{input:JSON.stringify(post('node '+path.join(scripts,'speak.js')+' --run '+fRun+' --round 01-sparring >/dev/null 2>&1; echo done','done\n')),encoding:'utf8',cwd:proj,timeout:8000,killSignal:'SIGKILL',env:Object.assign({},process.env,sayEnv)});
  check(rP.status===0&&Date.now()-tP<8000,'the run folder all the way down: a pipe in a round\'s folder is never waited on; exit '+rP.status+' after '+(Date.now()-tP)+' ms');
}
// A command written over two lines with a backslash is one command: the run on the second line is the command's own.
var opensC=opens().length;
var rc1=shown('real run: a command continued over two lines',call(post('node '+scripts+'/open-board.js \\\n  --run '+run,failedLine+'\n'),okOpener));
check(rc1==='Board opened by the plugin: '+board&&opens().length===opensC+1,'real run: a backslash at a line\'s end joins the two lines, and the board is opened; got '+JSON.stringify(rc1));
// The same join in the hook's other two readers of a command: the round of a silenced speech command, and a seat's check.
fs.readdirSync(path.join(run,'rounds','01-sparring')).filter(function(n){ return /^voices\.json$|\.m4a$/.test(n); }).forEach(function(n){ fs.rmSync(path.join(run,'rounds','01-sparring',n)); });
var rc2=shown('real run: a silenced speech command continued over two lines',call(post('node '+path.join(scripts,'speak.js')+' --run '+run+' \\\n  --round 01-sparring >/dev/null 2>&1; echo done','done\n'),null,sayEnv));
check(/^Voices rendered by the plugin: Ava \(Premium\) for seat-1 \(12\.5 s\)\./.test(rc2),'real run: the round is read across a continued line, and the owed voices are rendered; got '+JSON.stringify(rc2));
fs.readdirSync(path.join(run,'rounds','01-sparring')).filter(function(n){ return /^voices\.json$|\.m4a$/.test(n); }).forEach(function(n){ fs.rmSync(path.join(run,'rounds','01-sparring',n)); });
var contRun=handRun('continued-check',true), hCont=hostAt('h-continued'); agentAt(hCont,'a',taskFor(contRun.packet,contRun.answer),['test-id-1'],{agentType:'cw:seat'},5);
var contIn=post('node '+scripts+'/check-answer.js '+contRun.answer+' \\\n  --run '+contRun.dir,'ok\n',{session_id:hCont.sid,transcript_path:hCont.file});
cp.spawnSync(process.execPath,[hook],{input:JSON.stringify(contIn),encoding:'utf8',cwd:proj,timeout:5000,killSignal:'SIGKILL'});
check(linesOf(contRun.dir).length===1&&linesOf(contRun.dir)[0].model==='test-id-1','the measured model: a check continued over two lines is one check, and the seat is measured; got '+JSON.stringify(linesOf(contRun.dir)));
// The voices: the round on the script's line must be a round of the run. A line naming `..` renders nothing and writes nothing above the rounds.
var dRun=path.join(tmp,'proj-d','combat-writing','runs','d-run'); fs.mkdirSync(path.dirname(dRun),{recursive:true}); fs.cpSync(run,dRun,{recursive:true});
var dFiles=fs.readdirSync(dRun).sort().join(',');
var rr7=shown('real run: a round that is no round of the run',call(post('node '+path.join(scripts,'speak.js')+' --run '+dRun+' --round 01-sparring','Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1 owed for round .. of '+dRun+'.\n'),null,sayEnv));
check(/^Voices: nothing rendered by the plugin: /.test(rr7)&&fs.readdirSync(dRun).sort().join(',')===dFiles,'real run: a round named `..` is no round: nothing rendered, the run folder as it was; got '+JSON.stringify(rr7)+' and '+fs.readdirSync(dRun).sort().join(','));
// The voices: the script's line names a folder that is no run: nothing is started there.
var rr8=bare('real run: the script\'s line names a folder that is no run',call(post('R=x; node '+path.join(scripts,'speak.js')+' --run $R --round 01-sparring','Voices: the speech engine wrote no sound in this shell (a sandbox); seat-1 owed for round 01-sparring of '+notRun+'.\n'),null,sayEnv));
check(/^Voices: nothing rendered by the plugin: not a run folder/.test(rr8)&&fs.readdirSync(notRun).join(',')==='board.html','real run: a line naming a folder that is no run renders nothing there; got '+JSON.stringify(rr8));
// The Windows opener: cmd reads `&`, `|`, `<`, `>`, `^`, `%` and `"` in a path as its own, so a board whose path holds one
// is not handed to it. Run here with the platform named win32 and a stand-in `cmd` first on the PATH that records its words.
if(process.platform==='win32')console.log('skip real run: the Windows opener legs (they stand in for cmd, and here cmd is real)');
else{
  var winPre=path.join(tmp,'as-win32.js'); fs.writeFileSync(winPre,'Object.defineProperty(process,"platform",{value:"win32"});\n');
  var fakeBin=path.join(tmp,'fakebin'), cmdLog=path.join(tmp,'cmd.log'); fs.mkdirSync(fakeBin);
  fs.writeFileSync(path.join(fakeBin,'cmd'),'#!/bin/sh\nprintf \'%s\\n\' "$*" >> '+JSON.stringify(cmdLog)+'\nexit 0\n'); fs.chmodSync(path.join(fakeBin,'cmd'),0o755);
  function asWin(input){ var env=Object.assign({},process.env,{PATH:fakeBin+path.delimiter+process.env.PATH}); var r=cp.spawnSync(process.execPath,['-r',winPre,hook],{input:JSON.stringify(input),encoding:'utf8',cwd:proj,env:env}); var j=null; try{ j=JSON.parse(r.stdout.trim()); }catch(e){} return {status:r.status,json:j,out:r.stdout.trim(),stderr:r.stderr}; }
  function cmdCalls(){ return fs.existsSync(cmdLog)?fs.readFileSync(cmdLog,'utf8').trim().split('\n').filter(Boolean):[]; }
  var w1=asWin(post(O,failedLine+'\n'));
  check(w1.status===0&&cmdCalls().length===1&&cmdCalls()[0]==='/c start  '+board&&!!w1.json&&w1.json.systemMessage==='Board opened by the plugin: '+board,'real run, the Windows opener: a plain path is handed to cmd /c start "" <board>; got '+JSON.stringify(cmdCalls())+' and '+JSON.stringify(w1.out.slice(0,160)));
  var ampRun=path.join(tmp,'r&d','combat-writing','runs','x&y'); fs.mkdirSync(path.dirname(ampRun),{recursive:true}); fs.cpSync(run,ampRun,{recursive:true});
  var w2=asWin(post('node '+scripts+'/open-board.js --run "'+ampRun+'"',failedFor(path.join(ampRun,'board.html'))));
  check(w2.status===0&&cmdCalls().length===1&&!!w2.json&&/the plugin could not open it either: .*Windows opener/.test(w2.json.systemMessage),'real run, the Windows opener: a board whose path holds & is never handed to cmd, and the message says why; got '+JSON.stringify(cmdCalls())+' and '+JSON.stringify(w2.out.slice(0,200)));
}
// The source: the opener's line is matched and never mined for a path.
check(!/failed\[1\]/.test(src)&&/^var OPENER_FAILED=\/\^Board: \.\+\? /m.test(src),'show-result.js: the failed-opener pattern captures no path, and no path is taken from the line');

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'show_result_check: '+failures.length+' failure(s), ':'show_result_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
