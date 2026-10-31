// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// show-result.js: the result shown by the plugin itself (issue 70, 2026-10-26). A PostToolUse
// hook on the Bash tool. When the host's command ran `render-record.js --short`, the hook puts
// the short form the script printed (the Crew line through the Seat key line) on the person's
// screen as the plugin's own message, through the hook's systemMessage, the field the terminal
// shows the person (the session-start line "Combat Writing ready" is one); no host relays it,
// so a host that narrates instead of printing changes nothing the person sees. When the command
// ran `open-board.js` and its line says the opener failed or there is no opener (a shell with
// no desktop: Claude Code's sandbox has no Launch Services, measured 2026-10-24), the hook opens
// the board itself with the system opener, outside the sandbox (hooks run with the session's
// full access, the Claude Code docs' word), appends `board.opened {ok, by: "hook"}` to the run's
// log, and says "Board opened by the plugin" or why not. One command may carry both scripts.
// When the command ran `speak.js` and its line says the speech engine wrote no sound in that
// shell (Part 81.1, issue 123, measured 2026-10-28: inside the sandbox `say -o` writes a container
// with no sound), the hook runs the same script outside the sandbox with `--by hook`, rebuilds the
// board when the command had built it, and says "Voices rendered by the plugin" naming each seat's
// voice and its length in seconds as read from the file, or why not; the script writes the files,
// voices.json and the log lines, the hook writes nothing. The run folder comes from the script's
// own line (Part 81.2, measured 2026-10-31: the host wrote `--run $R`, the hook read the run from
// the command text, took `$R` for a path, and said "nothing rendered: not a run folder: .../$R"
// for a folder that existed, so the round's voices were never rendered until a rerun with the
// literal path); the command's literal `--run` path is the fallback for a line that carries none,
// a token holding `$` or a backtick is no path, and when neither resolves the hook names the miss
// on the screen instead of a wrong cause.
//
// Measured before this hook (2026-10-26, three rounds on cw 0.8.1 to 0.8.5): the host folded
// the scripts' output into collapsed shell lines and narrated, and a hook that refused the Next
// picker until the host printed (hooks/host-output.js, issues 60 and 68) could not make it
// print: it produced red refusals and the host waited out the loop cap. Retired by this hook.
//
// Silent (no output, exit 0) on any other event, tool or command, and on input it cannot read.
// It reads the hook input and the run's log file's existence; it writes one log line to the run
// when it opened the board; it spawns the opener and the plugin's own speak.js and render-board.js
// and nothing else; it reads one environment variable, CW_OPENER, which the tests set to a fake
// opener and no one else sets (speak.js reads its own, CW_SAY, from the inherited environment). The version
// in PROVED_ON is the Claude Code version the hook's input shape and the message's display were
// measured on; the checklist row records the live pass.

var fs=require('fs'), path=require('path'), cp=require('child_process');

var PROVED_ON='2.1.310';
var SHORT_RE=/render-record\.js\b.*--short\b/, OPENER_RE=/open-board\.js\b/;
var SPEAK_RE=/speak\.js\b.*--run\b/, BOARD_RE=/render-board\.js\b/;
var SILENCED=/^Voices: the speech engine wrote no sound in this shell[^;]*; .* owed for round (\S+?)(?: of (.+?))?\.$/m;
var RUN_UNKNOWN='Voices: the plugin could not tell which run the speech command ran on (the line named none and the command carried no literal --run path); nothing rendered. Rerun speak.js with the run folder spelled out.';
var RENDER_WAIT_MS=30000, BOARD_WAIT_MS=15000;
var OPENER_FAILED=/^Board: (.+?) \((?:the opener failed|no browser opener here): /;
var OPENER_LINE=/^Board(?: opened in your browser)?: /;
var EXIT_WAIT_MS=3000, REASON_MAX=200;
var CONTEXT='Combat Writing: the short form and the board line are on the person\'s screen already, printed by the plugin\'s own hook as the scripts returned. Print nothing from those scripts\' output; print one line naming the round just run, then open the Next picker.';

function hasSegment(command,re){ return String(command||'').split(/;|&&|\|\||\||\n/).some(function(s){return re.test(s);}); }
function textOf(resp){
  if(typeof resp==='string')return resp;
  if(resp&&typeof resp==='object'){ var s=typeof resp.stdout==='string'?resp.stdout:''; if(typeof resp.stderr==='string'&&resp.stderr.trim())s+=(s?'\n':'')+resp.stderr; return s; }
  return '';
}
// The short form as the script printed it: from the Crew line through the last Seat key line.
function shortFormOf(text){
  var lines=text.split('\n').map(function(l){return l.replace(/\r$/,'');}), start=-1, end=-1;
  for(var i=0;i<lines.length;i++){
    if(start<0&&/^\*\*Crew:\*\*/.test(lines[i]))start=i;
    if(/^Seat key: /.test(lines[i]))end=i;
  }
  return start>=0&&end>=start?lines.slice(start,end+1).join('\n'):null;
}
function openerLineOf(text){
  var lines=text.split('\n').map(function(l){return l.replace(/\r$/,'');}), found=null;
  lines.forEach(function(l){ if(OPENER_LINE.test(l))found=l; });
  return found;
}
// The --run value in the command's segment that ran the script named by re, resolved from the cwd:
// the fallback for a silenced line that names no run folder (a speak.js older than Part 81.2).
function runDirOf(command,re,cwd){
  var seg=String(command||'').split(/;|&&|\|\||\||\n/).filter(function(x){return re.test(x);})[0]||'';
  var m=/--run\s+(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(seg);
  var token=m?(m[1]||m[2]||m[3]):'';
  if(!token||/[$`]/.test(token))return null; // a shell variable or a substitution is no path: the shell expanded it, the hook cannot
  return path.resolve(cwd||process.cwd(),token);
}
// The voices rendered outside the sandbox: the same speak.js, then the board when the command built it.
function renderVoices(runDir,round,rebuild,opened){
  var scripts=path.join(__dirname,'..','scripts');
  var r=cp.spawnSync(process.execPath,[path.join(scripts,'speak.js'),'--run',runDir,'--round',round,'--by','hook'],{encoding:'utf8',timeout:RENDER_WAIT_MS});
  if(r.error&&r.error.code==='ETIMEDOUT')return 'Voices: the plugin\'s render ran past '+(RENDER_WAIT_MS/1000)+' seconds and was stopped; the board reads with the browser this round.';
  if(r.error)return 'Voices: the plugin could not start the render: '+(r.error.code||r.error.message)+'; the board reads with the browser.';
  if(SILENCED.test(String(r.stdout||'')))return 'Voices: the speech engine wrote no sound outside the sandbox either; the board reads with the browser.';
  var vj=null; try{ vj=JSON.parse(fs.readFileSync(path.join(runDir,'rounds',round,'voices.json'),'utf8')); }catch(e){}
  var ids=vj&&vj.files?Object.keys(vj.files).sort():[];
  if(!ids.length)return 'Voices: nothing rendered by the plugin'+(r.stderr&&String(r.stderr).trim()?': '+String(r.stderr).trim().split('\n')[0].slice(0,REASON_MAX):'')+'; the board reads with the browser.';
  if(rebuild)cp.spawnSync(process.execPath,[path.join(scripts,'render-board.js'),'--run',runDir],{encoding:'utf8',timeout:BOARD_WAIT_MS});
  var named=ids.map(function(id){ var sec=vj.seconds&&vj.seconds[id]; return vj.assigned[id]+' for '+id+(typeof sec==='number'?' ('+sec+' s)':''); });
  return 'Voices rendered by the plugin: '+named.join(', ')+'.'+(rebuild?(opened?' The board was rebuilt after it opened: reload it to hear them.':' The board carries them.'):'');
}
function finish(obj){ process.stdout.write(JSON.stringify(obj)+'\n'); process.exit(0); }
function silent(){ process.exit(0); }

// The board opened outside the sandbox: the same opener open-board.js uses, the exit read the same way.
function openBoard(board,done){
  var cmd, argv;
  var override=(process.env.CW_OPENER||'').trim();
  if(override){ var parts=override.split(/\s+/); cmd=parts[0]; argv=parts.slice(1).concat([board]); }
  else if(process.platform==='darwin'){ cmd='open'; argv=[board]; }
  else if(process.platform==='win32'){ cmd='cmd'; argv=['/c','start','',board]; }
  else { cmd='xdg-open'; argv=[board]; }
  var settled=false, stderr='', child;
  function settle(ok,reason){ if(settled)return; settled=true; done(ok,reason,cmd); }
  try{ child=cp.spawn(cmd,argv,{stdio:['ignore','ignore','pipe']}); }catch(e){ return settle(false,'could not start '+cmd+': '+(e.code||e.message)); }
  child.on('error',function(e){ settle(false,'could not start '+cmd+': '+(e.code||e.message)); });
  if(child.stderr)child.stderr.on('data',function(d){ stderr+=String(d); });
  child.on('exit',function(code){
    if(code===0)return settle(true,null);
    var first=stderr.split('\n').filter(function(l){return l.trim();})[0]||('exit '+code);
    settle(false,first.slice(0,REASON_MAX)+' (exit '+code+')');
  });
  setTimeout(function(){ if(settled)return; try{child.unref();}catch(e){} settle(true,'still running after '+EXIT_WAIT_MS+' ms; counted as opened'); },EXIT_WAIT_MS);
}
function logOpened(board,ok,reason,cmd){
  var runDir=path.dirname(board), logFile=path.join(runDir,'log.jsonl');
  if(!fs.existsSync(logFile))return;
  try{ fs.appendFileSync(logFile,JSON.stringify({ts:new Date().toISOString(),event:'board.opened',file:path.basename(board),opener:cmd,ok:ok,reason:reason||null,by:'hook'})+'\n'); }catch(e){}
}

var raw='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',function(c){ raw+=c; });
process.stdin.on('end',function(){
  var input;
  try{ input=JSON.parse(raw); }catch(e){ return silent(); }
  if(!input||input.hook_event_name!=='PostToolUse'||input.tool_name!=='Bash')return silent();
  var command=input.tool_input&&input.tool_input.command;
  var wantShort=hasSegment(command,SHORT_RE), wantOpener=hasSegment(command,OPENER_RE), wantSpeak=hasSegment(command,SPEAK_RE);
  if(!wantShort&&!wantOpener&&!wantSpeak)return silent();
  var text=textOf(input.tool_response);
  var parts=[];
  var shortForm=wantShort?shortFormOf(text):null;
  if(shortForm)parts.push(shortForm);
  var openerLine=wantOpener?openerLineOf(text):null;
  var silencedLine=wantSpeak?SILENCED.exec(text):null;
  if(silencedLine){
    var runDir=silencedLine[2]?path.resolve(input.cwd||process.cwd(),silencedLine[2]):runDirOf(command,SPEAK_RE,input.cwd);
    parts.push(runDir?renderVoices(runDir,silencedLine[1],hasSegment(command,BOARD_RE),!!openerLine):RUN_UNKNOWN);
  }
  var failed=openerLine&&OPENER_FAILED.exec(openerLine);
  if(!failed){
    if(openerLine)parts.push(openerLine);
    if(!parts.length)return silent();
    return finish({systemMessage:parts.join('\n\n'),hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:CONTEXT}});
  }
  var board=failed[1];
  openBoard(board,function(ok,reason,cmd){
    logOpened(board,ok,reason,cmd);
    parts.push(ok?'Board opened by the plugin: '+board:'Board: '+board+' (the plugin could not open it either: '+reason+'; open it yourself: open '+board+')');
    finish({systemMessage:parts.join('\n\n'),hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:CONTEXT}});
  });
});
