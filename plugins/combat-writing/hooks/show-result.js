// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// show-result.js: the result shown by the plugin itself (issue 70). A PostToolUse
// hook on the Bash tool. When the host's command ran `render-record.js --short`, the hook puts
// the short form the script printed (the Crew line through the Seat key line) on the person's
// screen as the plugin's own message, through the hook's systemMessage, the field the terminal
// shows the person (the one hook of the plugin that uses it: the session-start hook hands its
// line to the host as context and prints nothing, issue 165); no host relays it,
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
// on the screen instead of a wrong cause. With Part 82 the script renders every quality voice per
// seat (up to four files a seat), so the render window is 60 seconds, hooks.json's timeout 80 (five seconds past the two windows for the hook's own start and log line), the
// line counts the voices per seat and names the default, and a render stopped at the window still
// reports the files it finished, because the script writes voices.json after each one.
//
// Measured before this hook (2026-10-26, three rounds on cw 0.8.1 to 0.8.5): the host folded
// the scripts' output into collapsed shell lines and narrated, and a hook that refused the Next
// picker until the host printed (hooks/host-output.js, issues 60 and 68) could not make it
// print: it produced red refusals and the host waited out the loop cap. Retired by this hook.
//
// THE SILENCED COMMAND (Part 116, issue 179): a command that ran a script of the four but carries
// none of its lines (the host sent the output to /dev/null) is re-run by the hook from the
// command's literal --run path: the short form rendered again, the voices rendered when the
// round's voices.json is missing or lists silenced seats, the board opened unless the log's last
// board.opened is a fresh success by the shell; a shell variable for the run names the miss.
//
// THE MEASURED MODEL: the name a fresh reader carries in the run is the host's word, written by
// new-run.js from what the host said, and nothing in the run measured it. When the command ran
// `check-answer.js <answer file> --run <run folder>` (the host runs it once per seat after the
// seat's answer is written; a hook on the start of a seat would fire before the seat has
// answered, seats being started in the background), the hook reads which model wrote that
// seat's replies. The seat id and the round come from the answer file's place in the run
// (rounds/<round>/<seat>.answer.md, and the final reads' and the second pass's own names); both
// paths are literal or the hook does nothing (a token holding `$` or a backtick is no path, the
// rule above). The seat's own transcript is the newest of
// <session dir>/<session_id>/subagents/agent-*.jsonl whose first user record, the seat's task,
// names that seat's packet for that round on its `Packet:` line (a seat sent back once has two).
// From it the hook reads the model id on each assistant record, and from the file beside it,
// agent-<id>.meta.json, the model choice the host passed when it started the seat; from the
// session's own transcript, the model id on its newest reply that is not a subagent's. It
// appends one line to the run's log, `seat.model` {seat, round, model, passed, session, by:
// "hook"}: model is the id that answered (the last when the replies carry more than one, with
// `models` listing them in order), passed the choice string or null, session the session's id
// or null. Nothing is written twice: a log whose latest seat.model line for that seat and round
// holds the same model is left as it is. An outside seat (its record carries a provider) has no
// transcript here and is never measured. A transcript the hook cannot place (another host, a
// moved layout) means no line and no word on the screen: the run keeps the recorded name, as
// before. The work is bounded: at most eight checks from one command; the first 64 KiB of at
// most 200 transcripts, newest first, for the task; the first 8 MiB of the one matching
// transcript for its model fields; the last 2 MiB of the session's (a session whose last 2 MiB
// holds no reply of its own gives session null).
// Of those files it reads the task's lines and the model id fields, and nothing of the
// conversation reaches any output. For this the hook prints nothing and tells the host nothing.
// The transcript shape was read on the Claude Code versions in MODEL_READ_ON, from the host's
// own files, not proved on a live round.
//
// Silent (no output, exit 0) on any other event, tool or command, and on input it cannot read.
// It reads the hook input and, from the run folder, seats.json's existence and one seat's record,
// the round's voices.json, the log's board.opened and seat.model lines and board.html's existence;
// from the session's folder, the files named under THE MEASURED MODEL; it writes log lines to the
// run and nothing else, one when it opened the board and one per seat's model it measured; it
// spawns the opener and the plugin's own speak.js, render-board.js and
// render-record.js and nothing else; it reads one environment variable, CW_OPENER, which the tests set to a fake
// opener and no one else sets (speak.js reads its own, CW_SAY, from the inherited environment). The version
// in PROVED_ON is the Claude Code version the hook's input shape and the message's display were
// measured on; the checklist row records the live pass.

var fs=require('fs'), path=require('path'), cp=require('child_process');

var PROVED_ON='2.1.310';
// The Claude Code versions the seat's and the session's transcript shapes were read on (THE MEASURED MODEL). One copy.
var MODEL_READ_ON='2.1.319 to 2.1.322';
var CHECK_RE=/check-answer\.js\b/, ROUND_RE=/^\d\d-[a-z][a-z0-9-]*$/, ANSWER_RE=/^(seat-\d+)((?:\.[a-z]+)?)\.answer\.md$/;
var AGENT_FILE_RE=/^agent-[A-Za-z0-9_-]+\.jsonl$/, ID_RE=/^[A-Za-z0-9_-]+$/;
var SEAT_TYPES=['cw:seat','seat'];
// A record that is no reply carries this in place of a model id.
var NOT_A_REPLY='<synthetic>';
// The bounds of the measurement: checks read from one command, transcripts listed and opened,
// bytes read for a task, from the seat's transcript and from the end of the session's, ids kept.
var CHECKS_MAX=8, AGENTS_LISTED_MAX=2000, AGENTS_READ_MAX=200, TASK_BYTES=65536, SEAT_BYTES=8388608, SESSION_BYTES=2097152, MODEL_ID_MAX=120, MODELS_MAX=12;
var SHORT_RE=/render-record\.js\b.*--short\b/, OPENER_RE=/open-board\.js\b/;
var SPEAK_RE=/speak\.js\b.*--run\b/, BOARD_RE=/render-board\.js\b/;
var SILENCED=/^Voices: the speech engine wrote no sound in this shell[^;]*; .* owed for round (\S+?)(?: of (.+?))?\.$/m;
var RUN_UNKNOWN='Voices: the plugin could not tell which run the speech command ran on (the line named none and the command carried no literal --run path); nothing rendered. Rerun speak.js with the run folder spelled out.';
// The render window (Part 82): three files of 40 to 76 seconds of speech took 4,059 and 4,144 ms
// through this hook on 2026-10-31 (the run's log), about 1.4 s a file; four voices for three seats
// are twelve files, about 17 s; the window holds three times that and hooks.json's timeout covers
// the window plus the board.
var RENDER_WAIT_MS=60000, BOARD_WAIT_MS=15000;
var OPENER_FAILED=/^Board: (.+?) \((?:the opener failed|no browser opener here): /;
var OPENER_LINE=/^Board(?: opened in your browser)?: /;
var EXIT_WAIT_MS=3000, REASON_MAX=200, FRESH_MS=120000;
var scripts=path.join(__dirname,'..','scripts');
var STARVED_UNKNOWN='Combat Writing: the command hid the scripts\' output and named the run folder with a shell variable, so the plugin could not re-run them; rerun them with the run folder spelled out and the output left alone.';
var STARVED_NOT_A_RUN='Combat Writing: the command hid the scripts\' output and its --run path is not a run folder (no seats.json there), so the plugin re-ran nothing: ';
var CONTEXT='Combat Writing: the short form and the board line are on the person\'s screen already, printed by the plugin\'s own hook as the scripts returned. Print nothing from those scripts\' output and never redirect it (no >/dev/null, no file): the hook reads it; print one line naming the round just run, then open the Next picker.';

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
// The --round value in the command's speak.js segment, literal only (Part 116).
function roundOf(command){
  var seg=String(command||'').split(/;|&&|\|\||\||\n/).filter(function(x){return SPEAK_RE.test(x);})[0]||'';
  var m=/--round\s+(?:"([^"]+)"|'([^']+)'|(\S+))/.exec(seg);
  var token=m?(m[1]||m[2]||m[3]):'';
  return !token||/[$`]/.test(token)?null:token;
}
// The round still owes its voices: no voices.json (speak.js never finished) or silenced seats in it (Part 116).
function voicesOwed(runDir,round){
  var vj=null; try{ vj=JSON.parse(fs.readFileSync(path.join(runDir,'rounds',round,'voices.json'),'utf8')); }catch(e){ return true; }
  return !!(vj&&vj.silenced&&vj.silenced.length);
}
// The log's last board.opened is a success by the shell itself within the last two minutes (Part 116): the board is open; the hook does not open it twice.
function openedFresh(runDir){
  var last=null;
  try{ fs.readFileSync(path.join(runDir,'log.jsonl'),'utf8').trim().split('\n').forEach(function(l){ try{ var e=JSON.parse(l); if(e.event==='board.opened')last=e; }catch(x){} }); }catch(e){ return false; }
  if(!last||last.ok!==true||last.by==='hook')return false;
  var t=Date.parse(last.ts||last.at||''); return !isNaN(t)&&(Date.now()-t)<FRESH_MS;
}
// The voices rendered outside the sandbox: the same speak.js, then the board when the command built it.
function renderVoices(runDir,round,rebuild,opened){
  var r=cp.spawnSync(process.execPath,[path.join(scripts,'speak.js'),'--run',runDir,'--round',round,'--by','hook'],{encoding:'utf8',timeout:RENDER_WAIT_MS});
  var stopped=!!(r.error&&r.error.code==='ETIMEDOUT');
  if(r.error&&!stopped)return 'Voices: the plugin could not start the render: '+(r.error.code||r.error.message)+'; the board reads with the browser.';
  if(!stopped&&SILENCED.test(String(r.stdout||'')))return 'Voices: the speech engine wrote no sound outside the sandbox either; the board reads with the browser.';
  // speak.js writes voices.json after every rendered file, so a render stopped at the window still
  // leaves what it rendered on the record.
  var vj=null; try{ vj=JSON.parse(fs.readFileSync(path.join(runDir,'rounds',round,'voices.json'),'utf8')); }catch(e){}
  var ids=vj&&vj.files?Object.keys(vj.files).sort():[];
  if(!ids.length)return stopped?'Voices: the plugin\'s render ran past '+(RENDER_WAIT_MS/1000)+' seconds and was stopped before any file was done; the board reads with the browser this round.':'Voices: nothing rendered by the plugin'+(r.stderr&&String(r.stderr).trim()?': '+String(r.stderr).trim().split('\n')[0].slice(0,REASON_MAX):'')+'; the board reads with the browser.';
  if(rebuild)cp.spawnSync(process.execPath,[path.join(scripts,'render-board.js'),'--run',runDir],{encoding:'utf8',timeout:BOARD_WAIT_MS});
  // Part 82: with more than one voice rendered for a seat, the line counts the voices per seat and
  // names the default; with one voice a seat, the Part 81.1 shape.
  var counts=ids.map(function(id){ return vj.renders&&vj.renders[id]?Math.max(1,Object.keys(vj.renders[id]).length):1; });
  var multi=counts.some(function(c){return c>1;});
  var named=ids.map(function(id,i){
    var sec=vj.seconds&&vj.seconds[id], secs=typeof sec==='number'?sec+' s':'';
    if(!multi)return vj.assigned[id]+' for '+id+(secs?' ('+secs+')':'');
    return counts[i]+' voice'+(counts[i]===1?'':'s')+' for '+id+' ('+vj.assigned[id]+' the default'+(secs?', '+secs:'')+')';
  });
  return 'Voices rendered by the plugin: '+named.join(multi?'; ':', ')+'.'+(stopped?' The render was stopped at '+(RENDER_WAIT_MS/1000)+' seconds; the voices after that are missing.':'')+(rebuild?(opened?' The board was rebuilt after it opened: reload it to hear them.':' The board carries them.'):'');
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

// THE MEASURED MODEL. Every read is guarded and every miss is silence: this never fails the command it follows.
function wordsOf(s){ var out=[], re=/"([^"]*)"|'([^']*)'|(\S+)/g, m; while((m=re.exec(s)))out.push(m[1]!==undefined?m[1]:m[2]!==undefined?m[2]:m[3]); return out; }
function real(p){ try{ return fs.realpathSync(p); }catch(e){ return path.resolve(p); } }
function samePath(a,b){ return process.platform==='win32'?a.toLowerCase()===b.toLowerCase():a===b; }
// The checks a command ran: the answer file (the first word that is no option, as check-answer.js
// reads its arguments) and the --run folder of each check-answer.js segment, literal paths only.
function checksOf(command,cwd){
  var out=[];
  String(command||'').split(/;|&&|\|\||\||\n/).forEach(function(seg){
    var at=seg.search(CHECK_RE); if(at<0||out.length>=CHECKS_MAX)return;
    var words=wordsOf(seg.slice(at).replace(/^check-answer\.js["']?/,'')), file=null, run=null;
    for(var i=0;i<words.length;i++){
      if(words[i].indexOf('--')===0){ if(i+1<words.length&&words[i+1].indexOf('--')!==0){ if(words[i]==='--run')run=words[i+1]; i++; } }
      else if(file===null)file=words[i];
    }
    if(!file||!run||/[$`]/.test(file)||/[$`]/.test(run))return; // a shell variable or a substitution is no path
    out.push({answer:path.resolve(cwd,file),run:path.resolve(cwd,run)});
  });
  return out;
}
// The seat, the round and the packet an answer file belongs to, from its place in the run; null
// when it is not a seat's answer two levels under the run's rounds folder, when the run holds no
// log or no record for the seat, and for an outside seat.
function seatOf(check){
  var rel=path.relative(check.run,check.answer).split(path.sep);
  if(rel.length!==3||rel[0]!=='rounds'||!ROUND_RE.test(rel[1]))return null;
  var m=ANSWER_RE.exec(rel[2]); if(!m)return null;
  if(!fs.existsSync(path.join(check.run,'log.jsonl')))return null;
  var seats=null; try{ seats=JSON.parse(fs.readFileSync(path.join(check.run,'seats.json'),'utf8')).seats; }catch(e){}
  var seat=Array.isArray(seats)?seats.filter(function(s){ return s&&s.id===m[1]; })[0]:null;
  if(!seat||seat.provider)return null;
  return {seat:m[1],round:rel[1],packet:path.join(check.run,'rounds',rel[1],m[1]+m[2]+'.packet.md')};
}
function bytesOf(file,start,length){
  var fd=null;
  try{ fd=fs.openSync(file,'r'); var buf=Buffer.alloc(length), n=fs.readSync(fd,buf,0,length,start); return buf.toString('utf8',0,n); }
  catch(e){ return null; }
  finally{ if(fd!==null)try{ fs.closeSync(fd); }catch(e){} }
}
// A transcript's task: its first user record, from the file's first bytes (the rule of seat-scope.js).
function taskOf(file){
  var text=bytesOf(file,0,TASK_BYTES); if(text===null)return null;
  var lines=text.split('\n');
  for(var i=0;i<lines.length;i++){
    if(!lines[i].trim())continue;
    var rec; try{ rec=JSON.parse(lines[i]); }catch(e){ return null; }
    if(rec&&rec.type==='user'&&rec.message){
      var c=rec.message.content;
      if(Array.isArray(c))c=c.map(function(x){return x&&typeof x.text==='string'?x.text:'';}).join('\n');
      return typeof c==='string'?c:null;
    }
  }
  return null;
}
function modelIdOf(rec){
  var id=rec&&rec.type==='assistant'&&rec.message?rec.message.model:null;
  return typeof id==='string'&&id.trim()&&id!==NOT_A_REPLY&&id.length<=MODEL_ID_MAX?id.trim():null;
}
// The seat's own transcript for a packet: the newest agent file of the session whose task names it.
function transcriptOf(input,packet,cwd){
  var tp=input.transcript_path, sid=input.session_id;
  if(typeof tp!=='string'||typeof sid!=='string'||!ID_RE.test(sid))return null;
  var dir=path.join(path.dirname(tp),sid,'subagents'), names;
  try{ names=fs.readdirSync(dir); }catch(e){ return null; }
  var files=[];
  names.filter(function(n){ return AGENT_FILE_RE.test(n); }).slice(0,AGENTS_LISTED_MAX).forEach(function(n){
    try{ var st=fs.statSync(path.join(dir,n)); if(st.isFile())files.push({file:path.join(dir,n),mtime:st.mtimeMs,size:st.size}); }catch(e){}
  });
  files.sort(function(a,b){ return b.mtime-a.mtime||(a.file<b.file?1:-1); });
  var want=real(packet);
  for(var i=0;i<files.length&&i<AGENTS_READ_MAX;i++){
    var task=taskOf(files[i].file), m=task?/^Packet:[ \t]*(.+?)[ \t]*$/m.exec(task):null;
    if(!m||!samePath(real(path.resolve(cwd,m[1])),want))continue;
    var meta=null; try{ meta=JSON.parse(fs.readFileSync(files[i].file.replace(/\.jsonl$/,'.meta.json'),'utf8')); }catch(e){}
    if(meta&&typeof meta.agentType==='string'&&SEAT_TYPES.indexOf(meta.agentType)<0)continue; // another agent handed the same packet is no seat
    return {file:files[i].file,size:files[i].size,meta:meta&&typeof meta==='object'?meta:null};
  }
  return null;
}
// The model ids on a transcript's replies, in order, a run of one id counted once; null when it holds none.
function modelsOf(file,size){
  var text=bytesOf(file,0,Math.min(size,SEAT_BYTES)); if(text===null)return null;
  var ids=[];
  text.split('\n').forEach(function(l){
    if(l.indexOf('"assistant"')<0)return;
    var rec; try{ rec=JSON.parse(l); }catch(e){ return; }
    var id=modelIdOf(rec); if(id&&ids[ids.length-1]!==id)ids.push(id);
  });
  return ids.length?ids:null;
}
// The session's own model: the id on the newest reply of the session's transcript that is not a subagent's.
function sessionModelOf(tp){
  var size; try{ size=fs.statSync(tp).size; }catch(e){ return null; }
  var start=Math.max(0,size-SESSION_BYTES), text=bytesOf(tp,start,size-start); if(text===null)return null;
  var lines=text.split('\n'); if(start>0)lines.shift(); // the first line of a tail is a cut one
  for(var i=lines.length-1;i>=0;i--){
    if(lines[i].indexOf('"assistant"')<0)continue;
    var rec; try{ rec=JSON.parse(lines[i]); }catch(e){ continue; }
    if(rec&&rec.isSidechain)continue;
    var id=modelIdOf(rec); if(id)return id;
  }
  return null;
}
function measureSeats(input,command){
  var cwd=typeof input.cwd==='string'&&input.cwd?input.cwd:process.cwd(), session;
  checksOf(command,cwd).forEach(function(check){ try{
    var place=seatOf(check); if(!place)return;
    var found=transcriptOf(input,place.packet,cwd); if(!found)return;
    var ids=modelsOf(found.file,found.size); if(!ids)return;
    var model=ids[ids.length-1], logFile=path.join(check.run,'log.jsonl'), last=null;
    fs.readFileSync(logFile,'utf8').split('\n').forEach(function(l){ if(l.indexOf('seat.model')<0)return; try{ var e=JSON.parse(l); if(e.event==='seat.model'&&e.seat===place.seat&&e.round===place.round)last=e; }catch(x){} });
    if(last&&last.model===model)return; // measured already: nothing is written twice
    if(session===undefined)session=sessionModelOf(input.transcript_path);
    var line={ts:new Date().toISOString(),event:'seat.model',seat:place.seat,round:place.round,model:model};
    if(ids.length>1)line.models=ids.slice(-MODELS_MAX);
    line.passed=found.meta&&typeof found.meta.model==='string'&&found.meta.model.trim()?found.meta.model.trim().slice(0,MODEL_ID_MAX):null;
    if(!found.meta)line.meta=false; // the file that holds the start choice could not be read: passed is unknown, not none
    line.session=session; line.by='hook';
    fs.appendFileSync(logFile,JSON.stringify(line)+'\n');
  }catch(e){} });
}

var raw='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',function(c){ raw+=c; });
process.stdin.on('end',function(){
  var input;
  try{ input=JSON.parse(raw); }catch(e){ return silent(); }
  if(!input||input.hook_event_name!=='PostToolUse'||input.tool_name!=='Bash')return silent();
  var command=input.tool_input&&input.tool_input.command;
  var wantShort=hasSegment(command,SHORT_RE), wantOpener=hasSegment(command,OPENER_RE), wantSpeak=hasSegment(command,SPEAK_RE), wantBoard=hasSegment(command,BOARD_RE);
  // THE MEASURED MODEL: one log line per seat checked, no output; a miss or a fault is silence.
  if(hasSegment(command,CHECK_RE)){ try{ measureSeats(input,command); }catch(e){} }
  if(!wantShort&&!wantOpener&&!wantSpeak)return silent();
  var text=textOf(input.tool_response);
  var parts=[];
  var shortForm=wantShort?shortFormOf(text):null;
  var openerLine=wantOpener?openerLineOf(text):null;
  var silencedLine=wantSpeak?SILENCED.exec(text):null;
  var spoke=wantSpeak?/^Voices/m.test(text):false;
  // THE SILENCED COMMAND (Part 116, issue 179; measured 2026-11-06 on the first round run on cw
  // 0.9.0): the host sent the scripts' output to /dev/null, so no short form, no silenced line
  // and no opener line reached this hook, and the person saw no crew line, heard one browser
  // voice and had no board. The hook no longer depends on the command's output: when a script
  // ran and its line is missing, the run folder is read from the command's literal --run path,
  // the short form is rendered again, the voices are rendered when the round's voices.json is
  // missing or lists silenced seats, and the board is opened unless the log's last board.opened
  // is a fresh success. A shell variable for the run names the miss on the screen, as before.
  var starved=(wantShort&&!shortForm)||(wantOpener&&!openerLine)||(wantSpeak&&!spoke);
  var runDir=null, runMiss=null;
  if(starved){
    runDir=runDirOf(command,SHORT_RE,input.cwd)||runDirOf(command,OPENER_RE,input.cwd)||runDirOf(command,BOARD_RE,input.cwd)||runDirOf(command,SPEAK_RE,input.cwd);
    if(!runDir)runMiss=STARVED_UNKNOWN;
    else if(!fs.existsSync(path.join(runDir,'seats.json'))){ runMiss=STARVED_NOT_A_RUN+runDir; runDir=null; }
  }
  if(runDir){
    if(wantShort&&!shortForm){
      var rr=cp.spawnSync(process.execPath,[path.join(scripts,'render-record.js'),'--run',runDir,'--short'],{encoding:'utf8',timeout:BOARD_WAIT_MS});
      shortForm=shortFormOf(String(rr.stdout||''));
    }
    if(wantSpeak&&!spoke){ var round=roundOf(command); if(round&&voicesOwed(runDir,round))silencedLine=[null,round,runDir]; }
  }
  if(shortForm)parts.push(shortForm);
  if(silencedLine){
    var voicesDir=silencedLine[2]?path.resolve(input.cwd||process.cwd(),silencedLine[2]):runDirOf(command,SPEAK_RE,input.cwd);
    parts.push(voicesDir?renderVoices(voicesDir,silencedLine[1],wantBoard,!!openerLine):RUN_UNKNOWN);
  }
  if(runMiss)parts.push(runMiss);
  var failed=openerLine&&OPENER_FAILED.exec(openerLine);
  var board=failed?failed[1]:null;
  if(!board&&wantOpener&&!openerLine&&runDir){ var b=path.join(runDir,'board.html'); if(fs.existsSync(b)&&!openedFresh(runDir))board=b; }
  if(!board){
    if(openerLine)parts.push(openerLine);
    if(!parts.length)return silent();
    return finish({systemMessage:parts.join('\n\n'),hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:CONTEXT}});
  }
  openBoard(board,function(ok,reason,cmd){
    logOpened(board,ok,reason,cmd);
    parts.push(ok?'Board opened by the plugin: '+board:'Board: '+board+' (the plugin could not open it either: '+reason+'; open it yourself: open '+board+')');
    finish({systemMessage:parts.join('\n\n'),hookSpecificOutput:{hookEventName:'PostToolUse',additionalContext:CONTEXT}});
  });
});
