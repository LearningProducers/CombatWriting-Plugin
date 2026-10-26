// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// host_output_check.js: the host held to the short form (issue 60, measured 2026-10-26). The
// PreToolUse hook on AskUserQuestion, hooks/host-output.js, refuses the Next picker when the
// newest `render-record.js --short` result in the turn has not been shown in the host's own text
// since, and is silent on everything else.
//
// Runs the REAL hook as a child process with the hook's stdin JSON, against a fake session
// transcript (the JSONL shape measured on Claude Code 2.1.310: user and assistant records whose
// message.content is a string or an array of text, tool_use and tool_result blocks) built around
// the REAL short form the listed plugin's render-record.js prints for a real run, and the REAL
// opener lines open-board.js prints with a failing opener and with no opener.
//
// What it pins:
//   - Untouched: another event, another tool, a subagent's call (agent_id), stdin that does not
//     parse, no transcript_path, a transcript that is not there, a turn with no --short result
//     (a bare-command picker; an older short form before the last prompt record does not count),
//     a --short result with no Seat key line (a failed script), and a third picker after the same
//     short form (two already opened: a host that will not print never loops).
//   - Refused, with the missing lines named: the short form's result followed by no host text; by
//     narration that names the board path but not the Crew or Seat key lines (the reason names
//     those two and not the Board line); by a print that lacks the opener's failed line when the
//     opener printed one; the 2026-10-26 shape (three scripts in one Bash command, the result
//     opening with "Exit code 1" and holding every script's output) with nothing printed; a
//     second round in the same turn whose short form is not printed although the first was.
//   - Allowed: a faithful print of the short form and the opener's line (the Round line after
//     the seat key), with the markdown bold stripped, inside a fence, as a bulleted list, with the
//     no-opener shape, with a tool_result content given as an array of text blocks, and after
//     strategy, where the short form has no Board line and none is required.
//   - The deny is one JSON line in the documented form, exit 0, nothing on stderr; the allow is
//     silence and exit 0. The hook's source carries the Shield header, the one PROVED_ON constant
//     on its own line, and no write, spawn, fetch, URL or environment read. hooks.json carries the
//     AskUserQuestion entry beside the seat-scope one, both with a short timeout.
//
// Run from the repo root:   node tests/host_output_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var plugin=path.join(__dirname,'..','plugins','combat-writing');
var hook=path.join(plugin,'hooks','host-output.js');
var scripts=path.join(plugin,'scripts');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

var tmp=fs.mkdtempSync(path.join(os.tmpdir(),'cw-host-'));
var proj=path.join(tmp,'proj'); fs.mkdirSync(proj);
fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company. The ask lands in the first line.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }

// A real run with one round, and the real short form (the first call prints the legend; the second does not).
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','host','--model','Test Model']).stdout.trim();
check(!!run&&fs.existsSync(run),'new-run failed');
node('packet.js',['--run',run,'--round','01-sparring','--seat','seat-1']);
fs.writeFileSync(path.join(run,'rounds','01-sparring','seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
node('check-answer.js',[path.join(run,'rounds','01-sparring','seat-1.answer.md'),'--run',run]);
var shortForm=node('render-record.js',['--run',run,'--short']).stdout;
var shortForm2=node('render-record.js',['--run',run,'--short']).stdout;
var board=path.join(run,'board.html');
node('render-board.js',['--run',run]);
var sfLines=shortForm.split('\n');
check(sfLines[0].indexOf('**Crew:**')===0&&/Every number is one seat's own/.test(shortForm)&&shortForm.indexOf('Board: '+board)>=0&&/\nSeat key: seat-1 [^\n]+\n$/.test(shortForm),'the real short form should open with the Crew line, carry the legend once, the Board line and end with the Seat key line, got '+JSON.stringify(shortForm.slice(0,120)));
check(shortForm2.indexOf('Every number is one seat')<0&&/\nSeat key: /.test(shortForm2),'the second short form should carry no legend');
var seatKeyLine=sfLines.filter(function(l){return l.indexOf('Seat key: ')===0;})[0];
var crewLine=sfLines[0];
// The real opener lines: a failing opener, and no opener at all.
var failer=path.join(tmp,'fail.js'); fs.writeFileSync(failer,'process.stderr.write("kLSNoExecutableErr: The executable is missing\\n");process.exit(1);\n');
var failedLine=node('open-board.js',['--run',run,'--opener',process.execPath+' '+failer]).stdout.trim();
var noOpenerLine=node('open-board.js',['--run',run,'--opener',path.join(tmp,'no-such-opener')]).stdout.trim();
check(/^Board: .*\(the opener failed: kLSNoExecutableErr: The executable is missing \(exit 1\); open it yourself: /.test(failedLine),'the real failed-opener line, got '+failedLine);
check(/^Board: .*\(no browser opener here: /.test(noOpenerLine),'the real no-opener line, got '+noOpenerLine);
// After strategy: a run from a brief alone, whose short form has no Board line.
var run2=node('new-run.js',['--brief','brief.md','--name','brief-only','--model','Test Model']).stdout.trim();
var shortStrategy=node('render-record.js',['--run',run2,'--short']).stdout;
check(shortStrategy.indexOf('Board: ')<0&&/\nSeat key: /.test(shortStrategy),'the post-strategy short form should carry no Board line, got '+JSON.stringify(shortStrategy.slice(-80)));

// ---- the fake transcript ------------------------------------------------------------------
var sdir=path.join(tmp,'sessions'); fs.mkdirSync(sdir); var sid='sess-1', n=0;
function prompt(text){ return {type:'user',message:{role:'user',content:text}}; }
function meta(text){ return {type:'user',isMeta:true,message:{role:'user',content:[{type:'text',text:text}]}}; }
function asst(blocks){ return {type:'assistant',message:{role:'assistant',content:blocks}}; }
function text(t){ return asst([{type:'text',text:t}]); }
function bash(id,command){ return asst([{type:'tool_use',id:id,name:'Bash',input:{command:command,description:'x'}}]); }
function picker(id){ return asst([{type:'tool_use',id:id,name:'AskUserQuestion',input:{questions:[]}}]); }
function result(id,content,isError){ return {type:'user',message:{role:'user',content:[{type:'tool_result',tool_use_id:id,content:content,is_error:!!isError}]}}; }
function transcript(recs){
  var p=path.join(sdir,'t'+(++n)+'.jsonl');
  fs.writeFileSync(p,recs.map(function(r){return typeof r==='string'?r:JSON.stringify(r);}).join('\n')+'\n');
  return p;
}
var S='node '+scripts+'/render-record.js --run '+run+' --short', B='node '+scripts+'/render-board.js --run '+run, O='node '+scripts+'/open-board.js --run '+run;
var roundLine='Round 01-sparring, plain; this run holds 0 battle rounds.';
function call(tp,extra){
  var input=typeof extra==='string'?extra:Object.assign({session_id:sid,transcript_path:tp,cwd:proj,hook_event_name:'PreToolUse',tool_name:'AskUserQuestion',tool_input:{questions:[]},tool_use_id:'toolu_x'},extra||{});
  var raw=typeof input==='string'?input:JSON.stringify(input);
  var r=cp.spawnSync(process.execPath,[hook],{input:raw,encoding:'utf8',cwd:proj});
  var out=r.stdout.trim(), json=null; try{json=out?JSON.parse(out):null;}catch(e){}
  return {status:r.status,out:out,json:json,stderr:r.stderr,reason:json&&json.hookSpecificOutput?json.hookSpecificOutput.permissionDecisionReason:''};
}
function allowed(name,r){ check(r.status===0&&r.out===''&&r.stderr==='',name+': expected silence and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,200))+' err '+r.stderr); }
function denied(name,r,re,notRe){
  check(r.status===0&&!!r.json&&r.json.hookSpecificOutput&&r.json.hookSpecificOutput.hookEventName==='PreToolUse'&&r.json.hookSpecificOutput.permissionDecision==='deny'&&Object.keys(r.json).join(',')==='hookSpecificOutput'&&r.stderr===''&&/^Combat Writing host output: /.test(r.reason),name+': expected a deny line and exit 0, got exit '+r.status+' out '+JSON.stringify(r.out.slice(0,200))+' err '+r.stderr);
  if(re)check(re.test(r.reason),name+': reason "'+r.reason.slice(0,300)+'" does not match '+re);
  // notRe is tested on the Missing list alone, after the fixed wording that names every line.
  var missingList=(/Missing: (.*)\. Measured on Claude Code/.exec(r.reason)||['',''])[1];
  if(notRe)check(!notRe.test(missingList),name+': the Missing list should not match '+notRe+', got "'+missingList.slice(0,300)+'"');
}
var esc=function(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');};
var seatKeyRe=new RegExp('the Seat key line \\("'+esc(seatKeyLine)+'"\\)');

// The plain round: the three scripts one by one, the short form's result, then the host's text.
var base=[prompt('/cw:sparring'),meta('Base directory for this skill: '+plugin),bash('s1',S),result('s1',shortForm),bash('b1',B),result('b1',board+'\n'),bash('o1',O),result('o1',failedLine+'\n')];

// Untouched.
allowed('another tool',call(transcript(base),{tool_name:'Bash',tool_input:{command:'ls'}}));
allowed('another event',call(transcript(base),{hook_event_name:'PostToolUse'}));
allowed('a subagent',call(transcript(base),{agent_id:'agent1',agent_type:'cw:seat'}));
allowed('stdin that does not parse',call(transcript(base),'{not json'));
allowed('no transcript_path',call(transcript(base),{transcript_path:undefined}));
allowed('transcript not there',call(path.join(sdir,'nope.jsonl')));
allowed('a folder as the transcript',call(sdir));
allowed('no short form in the turn',call(transcript([prompt('/cw:battle'),text('Paste the draft, or give its path. /cw:help for the full guide.')])));
allowed('an older short form before the last prompt',call(transcript(base.concat([text(shortForm+'\n'+failedLine+'\n'+roundLine),picker('p1'),result('p1','{"answer":"Done for now"}'),text('Next: ...'),prompt('/cw:battle')]))));
allowed('a --short result with no Seat key line',call(transcript([prompt('/cw:sparring'),bash('s1',S),result('s1','Error: no seats.json in '+run+'\n',true)])));
allowed('a third picker after the same short form',call(transcript(base.concat([picker('p1'),result('p1','deny',true),text('oops'),picker('p2'),result('p2','deny',true)]))));
allowed('a line that does not parse is skipped',call(transcript(base.concat(['{not json',text(shortForm+'\n'+failedLine+'\n'+roundLine)]))));

// Refused.
denied('nothing printed after the short form',call(transcript(base)),seatKeyRe);
var noPrint=call(transcript(base));
check(/the Crew line \("Crew: Test Model \(Anthropic\), seat-1/.test(noPrint.reason)&&new RegExp('the Board line \\("'+esc(board)+'"\\)').test(noPrint.reason)&&new RegExp("the opener's line \\(\""+esc(failedLine)+'"\\)').test(noPrint.reason),'nothing printed: the reason should name the Crew line (bold stripped, sixty characters), the Board path and the opener\'s line, got '+noPrint.reason.slice(0,600));
check(/^Combat Writing host output: the short form render-record\.js --short printed has not been shown to the person, or was shown in the same message as this picker call, which the transcript does not hold yet \(a message lands with its tool result, after the tool runs\)\. Print it exactly as printed \(the Crew line, any Seats line, the legend when printed, the scoreboard, the Board line, the Seat key line\), then the opener's line when it failed \(it carries the command to open the board by hand\), then one line naming the round, then run render-state\.js --run <folder> --write, and open the picker in the message after that call returns\. Missing: /.test(noPrint.reason)&&/Measured on Claude Code \d+\.\d+\.\d+; if the short form was printed and this still refuses, a newer Claude Code may keep the transcript in another shape: run `claude --version` and open an issue at github\.com\/LearningProducers\/CombatWriting-Plugin\/issues naming the version$/.test(noPrint.reason),'the reason\'s wording, got '+noPrint.reason);
denied('narration with the board path only',call(transcript(base.concat([text('Round 01-sparring is complete across the seat. The board is at '+board+' and the opener failed, so open it by hand.')]))),seatKeyRe,/the Board line/);
denied('a print without the opener\'s failed line',call(transcript(base.concat([text(shortForm+'\n'+roundLine)]))),new RegExp("^Combat Writing host output: .*Missing: the opener's line \\(\""+esc(failedLine)+'"\\)\\. Measured'));
var oneCommand='S='+scripts+'; R='+run+'; node $S/render-record.js --run $R --short; echo ===BOARD; node $S/render-board.js --run $R; echo ===OPEN; node $S/open-board.js --run $R';
var oneResult='Exit code 1\n'+shortForm+'===BOARD\n'+board+'\n===OPEN\n'+failedLine+'\n';
denied('the 2026-10-26 shape, nothing printed',call(transcript([prompt('/cw:battle'),bash('c1',oneCommand),result('c1',oneResult,true),text('Round 01-battle is complete. The board file failed to open automatically, so I will need to open it manually instead.')])),seatKeyRe);
check(new RegExp("the opener's line \\(\""+esc(failedLine)+'"\\)').test(call(transcript([prompt('/cw:battle'),bash('c1',oneCommand),result('c1',oneResult,true)])).reason),'the 2026-10-26 shape: the opener\'s line inside the one combined result must be found and required');
allowed('the 2026-10-26 shape, printed',call(transcript([prompt('/cw:battle'),bash('c1',oneCommand),result('c1',oneResult,true),text(shortForm+'\n'+failedLine+'\n'+roundLine)])));
denied('a second round in the same turn, the first printed and the second not',call(transcript(base.concat([text(shortForm+'\n'+failedLine+'\n'+roundLine),picker('p1'),result('p1','{"answer":"Battle: everyone"}'),bash('s2',S),result('s2',shortForm2),bash('o2',O),result('o2',failedLine+'\n'),text('Round 02 done.')]))),seatKeyRe);
allowed('a second round in the same turn, both printed',call(transcript(base.concat([text(shortForm+'\n'+failedLine+'\n'+roundLine),picker('p1'),result('p1','{"answer":"Battle: everyone"}'),bash('s2',S),result('s2',shortForm2),bash('o2',O),result('o2',failedLine+'\n'),text(shortForm2+'\n'+failedLine+'\nRound 02-battle, N; this run holds 1 battle round.')]))));
denied('a print of the wrong seat key',call(transcript(base.concat([text(shortForm.replace(seatKeyLine,'Seat key: seat-1 claude')+'\n'+failedLine)]))),seatKeyRe);

// Allowed: a faithful print in the shapes a host writes.
var faithful=shortForm+'\n'+failedLine+'\n'+roundLine;
allowed('a faithful print',call(transcript(base.concat([text(faithful)]))));
allowed('a faithful print in two text blocks',call(transcript(base.concat([text(shortForm),text(failedLine+'\n'+roundLine)]))));
// The order the skills fix (issue 68): the print in the message before the picker's, that message ending with the
// state call whose result is on disk; the picker's own message is not in the transcript when the hook runs.
allowed('the print in the message before the picker, the state call between',call(transcript(base.concat([asst([{type:'text',text:faithful},{type:'tool_use',id:'st1',name:'Bash',input:{command:'node '+scripts+'/render-state.js --run '+run+' --write',description:'x'}}]),result('st1',run+'/state.json\n')]))));
allowed('the bold stripped',call(transcript(base.concat([text(faithful.replace(/\*\*/g,''))]))));
allowed('inside a fence',call(transcript(base.concat([text('```\n'+shortForm+'```\n\n'+failedLine+'\n'+roundLine)]))));
allowed('as a bulleted list',call(transcript(base.concat([text(faithful.split('\n').map(function(l){return l?'- '+l:l;}).join('\n'))]))));
allowed('the path in backticks and the seat key quoted',call(transcript(base.concat([text(faithful.replace('Board: '+board,'Board: `'+board+'`').replace(seatKeyLine,'> '+seatKeyLine))]))));
allowed('the no-opener shape',call(transcript([prompt('/cw:sparring'),bash('s1',S),result('s1',shortForm),bash('o1',O),result('o1',noOpenerLine+'\n'),text(shortForm+'\n'+noOpenerLine+'\n'+roundLine)])));
denied('the no-opener shape, its line not printed',call(transcript([prompt('/cw:sparring'),bash('s1',S),result('s1',shortForm),bash('o1',O),result('o1',noOpenerLine+'\n'),text(shortForm+'\n'+roundLine)])),new RegExp("Missing: the opener's line \\(\""+esc(noOpenerLine)+'"\\)'));
allowed('the opener opened (no line required)',call(transcript([prompt('/cw:sparring'),bash('s1',S),result('s1',shortForm),bash('o1',O),result('o1','Board opened in your browser: '+board+'\n'),text(shortForm+'\n'+roundLine)])));
allowed('tool_result content as an array of text blocks',call(transcript([prompt('/cw:sparring'),bash('s1',S),result('s1',[{type:'text',text:shortForm}]),text(shortForm+'\n'+roundLine)])));
denied('tool_result content as an array, nothing printed',call(transcript([prompt('/cw:sparring'),bash('s1',S),result('s1',[{type:'text',text:shortForm}])])),seatKeyRe);
allowed('after strategy, no Board line required',call(transcript([prompt('/cw:strategy brief: CEO.'),bash('s1','node '+scripts+'/render-record.js --run '+run2+' --short'),result('s1',shortStrategy),text(shortStrategy+'\nNext: /cw:sparring')])));
denied('after strategy, nothing printed',call(transcript([prompt('/cw:strategy brief: CEO.'),bash('s1','node '+scripts+'/render-record.js --run '+run2+' --short'),result('s1',shortStrategy)])),/the Seat key line/,/the Board line/);
allowed('a --short run with a redirect and a pipe',call(transcript([prompt('/cw:sparring'),bash('s1','cd '+proj+' && '+S+' 2>&1 | cat'),result('s1',shortForm),text(faithful)])));
denied('a --short run with a redirect and a pipe, nothing printed',call(transcript([prompt('/cw:sparring'),bash('s1','cd '+proj+' && '+S+' 2>&1 | cat'),result('s1',shortForm)])),seatKeyRe);
allowed('a command that only mentions the script in another argument',call(transcript([prompt('/cw:sparring'),bash('s1','grep -n short '+scripts+'/render-record.js'),result('s1','217: --short\n'+shortForm)])));

// The hook wrote nothing in the run or the project.
check(fs.readdirSync(run).sort().join(',')==='board.html,brief.md,draft.md,log.jsonl,record.md,rounds,seats.json','run folder changed by the hook: '+fs.readdirSync(run).sort().join(','));

// hooks.json carries the entry beside the seat-scope one; the script is clean.
var hooks=JSON.parse(fs.readFileSync(path.join(plugin,'hooks','hooks.json'),'utf8'));
var pre=hooks.hooks.PreToolUse||[];
var mine=pre.filter(function(e){return e.matcher==='AskUserQuestion';});
check(pre.length===2&&mine.length===1&&mine[0].hooks.length===1&&mine[0].hooks[0].type==='command'&&mine[0].hooks[0].command==='node "${CLAUDE_PLUGIN_ROOT}/hooks/host-output.js"'&&typeof mine[0].hooks[0].timeout==='number'&&mine[0].hooks[0].timeout<=10,'hooks.json: PreToolUse must hold the seat-scope entry and one AskUserQuestion entry running host-output.js with a short timeout: '+JSON.stringify(pre));
var src=fs.readFileSync(hook,'utf8');
check(src.split('\n')[0]==='// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0','host-output.js: no Shield header on line 1');
check(!/writeFileSync|appendFileSync|mkdirSync|child_process|\bfetch\(|https?:\/\/|process\.env/.test(src.replace(/\/\/[^\n]*/g,'')),'host-output.js: must write nothing, spawn nothing, fetch nothing, read no environment');
var provedOn=(/^var PROVED_ON='([^']+)';$/m.exec(src)||[])[1];
check(typeof provedOn==='string'&&/^\d+\.\d+\.\d+$/.test(provedOn)&&src.split(provedOn).length===2,'host-output.js: PROVED_ON must be one version constant on its own line, appearing once, got '+provedOn);
check(noPrint.reason.indexOf('Measured on Claude Code '+provedOn)>=0,'the deny reason must carry PROVED_ON');

fs.rmSync(tmp,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'host_output_check: '+failures.length+' failure(s), ':'host_output_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
