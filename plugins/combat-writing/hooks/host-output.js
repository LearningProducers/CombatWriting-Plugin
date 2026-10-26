// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// host-output.js: the host held to the short form (issue 60, measured 2026-10-26). A PreToolUse
// hook on the AskUserQuestion tool, the Next picker every sparring and battle round ends with.
// The skills tell the host to show the short form `render-record.js --short` printed (the Crew
// line, the scoreboard, the Board line, the Seat key line) and the opener's failed or no-opener
// line (it carries the command to open the board by hand) exactly as printed, before the picker.
// On 2026-10-26 the host ran the three scripts, folded their output into a collapsed shell line,
// narrated, and opened the picker: the person saw no result. The instruction alone did not hold,
// so this hook holds it, the way seat-scope.js holds a fresh reader's reach (ruled 2026-10-16).
//
// How it judges: it reads the session's own transcript (transcript_path, a JSONL of user and
// assistant records whose message.content is a string or an array of text, tool_use and
// tool_result blocks; measured on the Claude Code version in PROVED_ON, the one constant the
// reason and the test read). After the last prompt record (a user record that is not meta and
// carries no tool_result block: a picker's answer is a tool_result, so one turn may hold several
// rounds), it finds the newest Bash call with a `render-record.js ... --short` segment that has a
// result, pulls the Crew, Board and Seat key lines from that result by prefix (the result may be
// one combined shell output with other scripts' lines and an exit code on top), and the opener's
// line from that result or any later `open-board.js` result. Then it joins every assistant text
// block written after that result, normalizes both sides (markdown bold, backticks, fences,
// bullets and whitespace), and requires the Seat key line whole, the Crew line's first sixty
// characters, the Board path when the short form had one, and the opener's line when one was
// printed. Any missing: the picker is refused with the lines named, and the host prints them and
// opens the picker again. Allowed without a look: any other event or tool, a subagent's call, a
// transcript it cannot read, a turn with no short form (a bare-command picker), a result with no
// Seat key line (a failed script, nothing to show), and a third picker after the same short form
// (a host that will not print never loops).
//
// Output on deny: one JSON line, hookSpecificOutput.permissionDecision "deny" with the reason,
// exit 0 (the documented form). On allow: nothing, exit 0. The hook reads the transcript; it
// writes nothing, calls nothing, reads no environment, and prints nothing from the draft: the
// reason quotes only lines the plugin's own scripts printed.

var fs=require('fs'), path=require('path');

// The Claude Code version the transcript shape was measured on. One copy.
var PROVED_ON='2.1.310';
var ISSUES='github.com/LearningProducers/CombatWriting-Plugin/issues';
var SHORT_RE=/render-record\.js\b.*--short\b/, OPENER_RE=/open-board\.js\b/;
var OPENER_LINE=/\((?:the opener failed|no browser opener here): /;
var CREW_CHARS=60;

function deny(reason){
  process.stdout.write(JSON.stringify({hookSpecificOutput:{hookEventName:'PreToolUse',permissionDecision:'deny',permissionDecisionReason:'Combat Writing host output: '+reason}})+'\n');
  process.exit(0);
}
function allow(){ process.exit(0); }

// A command's segments: the pieces between ;, &&, ||, | and newlines, so a script named in a
// chained command is found and a path that merely mentions it in another argument is not matched loosely.
function hasSegment(command,re){
  return String(command||'').split(/;|&&|\|\||\||\n/).some(function(s){return re.test(s);});
}
function textOf(content){
  if(typeof content==='string')return content;
  if(Array.isArray(content))return content.map(function(b){return b&&typeof b.text==='string'?b.text:'';}).join('\n');
  return '';
}
function blocksOf(rec){ var c=rec&&rec.message?rec.message.content:null; return Array.isArray(c)?c:[]; }
// A prompt record: the person's own turn. Not a meta record, and not a tool result.
function isPrompt(rec){
  if(!rec||rec.type!=='user'||!rec.message||rec.isMeta===true)return false;
  var c=rec.message.content;
  if(typeof c==='string')return true;
  if(Array.isArray(c))return !c.some(function(b){return b&&b.type==='tool_result';});
  return false;
}
// The same normalization on both sides: markdown dressing off, fences dropped, one space per run.
function normalize(s){
  return String(s||'').normalize('NFC').split('\n').filter(function(l){return !/^\s*```/.test(l);})
    .map(function(l){return l.replace(/^\s*(?:>\s*)+/,'').replace(/^\s*[-*]\s+/,'');}).join('\n')
    .replace(/\*\*|__|`/g,'').replace(/’/g,"'").replace(/•/g,'·').replace(/\s+/g,' ').trim();
}
function firstLine(lines,prefix,not){
  for(var i=0;i<lines.length;i++){ if(lines[i].indexOf(prefix)===0&&!(not&&not.test(lines[i])))return lines[i]; }
  return null;
}

var raw='';
process.stdin.setEncoding('utf8');
process.stdin.on('data',function(c){ raw+=c; });
process.stdin.on('end',function(){
  var input;
  try{ input=JSON.parse(raw); }catch(e){ return allow(); }
  if(!input||input.hook_event_name!=='PreToolUse'||input.tool_name!=='AskUserQuestion')return allow();
  if(typeof input.agent_id==='string'&&input.agent_id)return allow();  // a subagent: not the host
  var tp=input.transcript_path;
  if(typeof tp!=='string'||!tp)return allow();
  var text;
  try{ if(!fs.statSync(tp).isFile())return allow(); text=fs.readFileSync(tp,'utf8'); }catch(e){ return allow(); }
  var recs=[];
  text.split('\n').forEach(function(line){
    if(!line.trim())return;
    var rec; try{ rec=JSON.parse(line); }catch(e){ return; }
    if(rec&&(rec.type==='user'||rec.type==='assistant')&&rec.message)recs.push(rec);
  });
  var start=-1;
  for(var i=recs.length-1;i>=0;i--){ if(isPrompt(recs[i])){start=i;break;} }
  var uses={}, results={}, texts=[], pickers=[];
  for(var j=start+1;j<recs.length;j++){
    var rec=recs[j];
    blocksOf(rec).forEach(function(b){
      if(!b)return;
      if(rec.type==='assistant'&&b.type==='tool_use'){
        uses[b.id]={j:j,name:b.name,command:b.input&&b.input.command};
        if(b.name==='AskUserQuestion')pickers.push(j);
      }else if(rec.type==='assistant'&&b.type==='text'&&typeof b.text==='string'){
        texts.push({j:j,text:b.text});
      }else if(rec.type==='user'&&b.type==='tool_result'){
        results[b.tool_use_id]={j:j,text:textOf(b.content)};
      }
    });
  }
  // The newest --short call with a result.
  var shortId=null, shortJ=-1;
  Object.keys(uses).forEach(function(id){
    var u=uses[id];
    if(u.name==='Bash'&&hasSegment(u.command,SHORT_RE)&&results[id]&&results[id].j>shortJ){shortId=id;shortJ=results[id].j;}
  });
  if(!shortId)return allow();
  var lines=results[shortId].text.split('\n').map(function(l){return l.replace(/\r$/,'');});
  var seatKey=firstLine(lines,'Seat key: ');
  if(!seatKey)return allow();  // the script failed: nothing to show
  var crew=firstLine(lines,'**Crew:**');
  var board=firstLine(lines,'Board: ',OPENER_LINE);
  // The opener's line: from the short form's result (one combined command) or any later open-board.js result.
  var opener=null;
  Object.keys(uses).forEach(function(id){
    var u=uses[id], r=results[id];
    if(!r||r.j<shortJ)return;
    if(id!==shortId&&!(u.name==='Bash'&&hasSegment(u.command,OPENER_RE)))return;
    r.text.split('\n').forEach(function(l){ if(OPENER_LINE.test(l))opener={j:r.j,line:l.replace(/\r$/,'')}; });
  });
  if(pickers.filter(function(p){return p>shortJ;}).length>=2)return allow();  // never loops
  var shown=normalize(texts.filter(function(t){return t.j>shortJ;}).map(function(t){return t.text;}).join('\n'));
  var required=[{name:'the Seat key line',value:seatKey}];
  if(crew)required.push({name:'the Crew line',value:normalize(crew).slice(0,CREW_CHARS)});
  if(board)required.push({name:'the Board line',value:board.slice('Board: '.length).trim()});
  if(opener)required.push({name:'the opener\'s line',value:opener.line});
  var missing=required.filter(function(r){return shown.indexOf(normalize(r.value))<0;});
  if(!missing.length)return allow();
  return deny('the short form render-record.js --short printed has not been shown to the person. Print it exactly as printed (the Crew line, any Seats line, the legend when printed, the scoreboard, the Board line, the Seat key line), then the opener\'s line when it failed (it carries the command to open the board by hand), then one line naming the round, then open the picker again. Missing: '+missing.map(function(r){return r.name+' ("'+r.value+'")';}).join('; ')+'. Measured on Claude Code '+PROVED_ON+'; if the short form was printed and this still refuses, a newer Claude Code may keep the transcript in another shape: run `claude --version` and open an issue at '+ISSUES+' naming the version');
});
