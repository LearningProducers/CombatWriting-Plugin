// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// render-record.js: renders record.md for a run from the files on disk and log.jsonl.
//
//   node render-record.js --run <run folder> [--short]
//
// record.md opens with the crew line, then the drafts and the brief, the
// scoreboard (one row per seat, one column per round, every rating shown on its own, flips
// marked valid or invalid with the earlier number kept visible, Stand marked, missing seats
// marked missing, a seat the round was not put to marked "not asked" (a round of seat lines
// alone goes to the named seats only), a battle round that asked for no rating marked "critique", an outside
// seat's read the add-on cut marked "truncated at N words", the final round's S/N and
// red-flag counts per seat), then every answer in full by round under its seat's name, then
// the log of what was sent. Nothing is averaged, summed or ranked. Rebuilt after every
// round; the log and the answer files are the truth.
//
// --short prints what the person sees in the terminal after a round (2026-10-14: the board is
// the result, the terminal is short): the crew line, the Seats line when the crew is short, the
// scoreboard legend the first time this run prints it and never again (the log line
// legend.printed), the scoreboard, the board's path, and last the seat key (one line, every
// seat by id and short name, from the live crew). On a run with no round it prints the no-rounds
// line and the Started-at line instead of the scoreboard. It still writes record.md. --next
// prints the text Next line alone (the picker's "Done for now", or a host with no picker).
// Without either, prints the record's path.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
var seatsFile=lib.readSeats(runDir), seats=seatsFile.seats;
var log=lib.readLog(runDir);
var rounds=lib.listRounds(runDir);
// A run strategy made and nothing has read yet (ruled 2026-10-13): the record and the short form say
// what is stored and name the next move, so the person is never left without one. Since 2026-10-14
// the order of the stages is the person's choice, so the next move is sparring or battle, and a run
// that holds a brief alone says the draft joins it when either command brings one.
var hasBrief=fs.existsSync(path.join(runDir,'brief.md')), hasDraft=!!lib.latestDraft(runDir);
var noRoundsLine=hasDraft
  ?'No rounds yet. The draft'+(hasBrief?' and the brief are':' is')+' stored; no seat has read it. Next: '+lib.CMD.sparring+' for the first reads and ratings, or '+lib.CMD.battle+' to start with the discussion.'
  :'No rounds yet. The brief is stored; there is no draft yet. Next: '+lib.CMD.sparring+' or '+lib.CMD.battle+' with the draft pasted; it joins this run.';
var drafts=lib.listDrafts(runDir);
var created=log.filter(function(e){return e.event==='run.created';})[0]||{};

function bar(n){ return n===null?'          ':new Array(n+1).join('█')+new Array(11-n).join('░'); }
function lastLog(pred){ for(var i=log.length-1;i>=0;i--){ if(pred(log[i]))return log[i]; } return null; }

// The add-on's cut of an outside seat's read (ruled 2026-10-09): the last crew.answered line
// for that seat, round and read says whether the reply was truncated at the cap.
function truncationOf(seat,round,read){
  var e=lastLog(function(x){return x.event==='crew.answered'&&x.round===round&&x.seat===seat.id&&(x.read||'rating')===read;});
  return e&&e.truncated?e.truncated:null;
}
function truncMark(t){ return t?' · truncated at '+t.at+' words':''; }

// One seat in one round: the facts from the files, with the log's verdicts where it has them.
function cell(seat,round){
  if(lib.isFinalRound(round)){
    var parts=['sn','redflag'].map(function(c){
      var p=path.join(runDir,'rounds',round,seat.id+'.'+c+'.answer.md');
      if(!fs.existsSync(p))return {c:c,missing:true};
      var r=lib.checkAnswer(lib.readText(p),null,c);
      var logged=lastLog(function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&e.contract===c;});
      var cap=logged?logged.word_cap:null;
      if(cap)r=lib.checkAnswer(lib.readText(p),cap,c);
      return {c:c,ok:r.ok,value:r.value,reasons:r.reasons,truncated:truncationOf(seat,round,c)};
    });
    var snP=parts[0], rfP=parts[1];
    var snText=(snP.missing?'S/N missing':snP.ok?'S/N '+snP.value+'%':'S/N failed read')+(snP.truncated?' (truncated at '+snP.truncated.at+' words)':'');
    var rfText=(rfP.missing?'red flags missing':rfP.ok?(rfP.value===0?'no red flags':rfP.value+' red flag'+(rfP.value===1?'':'s')):'red-flag read failed')+(rfP.truncated?' (truncated at '+rfP.truncated.at+' words)':'');
    return {text:snText+' · '+rfText,rating:null,final:true,sn:snP,redflag:rfP};
  }
  var p=path.join(runDir,'rounds',round,seat.id+'.answer.md');
  if(!fs.existsSync(p))return lib.wasAsked(runDir,round,seat.id,log)?{text:'missing',rating:null,missing:true}:{text:'not asked',rating:null,missing:true,notAsked:true};
  var text=lib.readText(p);
  var contract=lib.contractSent(runDir,round,p,log);
  var logged=lastLog(function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&(!e.contract||e.contract===contract);});
  var check=lib.checkAnswer(text,logged?logged.word_cap:null,contract);
  var trunc=truncationOf(seat,round,'rating');
  if(!check.ok)return {text:'failed read ('+check.reasons[0]+')'+(check.rating!==null?' · wrote '+check.rating+'/10':'')+truncMark(trunc),rating:null,failed:true,reasons:check.reasons,truncated:trunc};
  if(contract==='critique')return {text:'critique'+truncMark(trunc),rating:null,critique:true,truncated:trunc};
  var flip=lastLog(function(e){return e.event==='flip.checked'&&e.round===round&&e.seat===seat.id;});
  if(!flip){
    var inputs=lib.flipInputs(runDir,seat,round,seats);
    flip=lib.checkFlip(text,seat,inputs.ownRated?inputs.ownRated.text:null,inputs.prevAnswers);
  }
  var r=check.rating+'/10';
  var mark={first:'',stand:' · Stand','held':' · held, no Stand',
    'flip-valid':' · flip from '+flip.from+', valid (quoted '+flip.cited+')',
    'flip-invalid':' · flip from '+flip.from+', INVALID ('+(flip.reason||'quote not found')+')',unrated:''}[flip.status]||'';
  return {text:r+mark+truncMark(trunc),rating:check.rating,flip:flip,truncated:trunc};
}

var grid={}; seats.forEach(function(s){grid[s.id]={};rounds.forEach(function(r){grid[s.id][r]=cell(s,r);});});

var out=[];
out.push('# Combat Writing record — '+path.basename(runDir));
out.push('');
var companies=seats.map(function(s){return s.company;}).filter(function(v,i,a){return a.indexOf(v)===i;});
out.push('**Crew:** '+seats.map(lib.seatLabel).join('; ')+'. '+(companies.length===1?'One company\'s models ('+companies[0]+').':companies.length+' companies: '+companies.join(', ')+'.')+' '+lib.nameSources(seats));
out.push('');
// Fewer seats than expected (ruled 2026-10-13): the reason and the next command, from the log.
lib.crewStateLines(runDir,seats,log).forEach(function(l){ out.push('**Seats:** '+l); out.push(''); });
out.push('**Seat key:** '+lib.seatKey(seats));
out.push('');
out.push('**Drafts:** '+(drafts.length?drafts.map(function(d){var e=lastLog(function(x){return (x.event==='draft.added'&&x.file===d)||(x.event==='run.created'&&d==='draft.md');});var sha=e?(e.sha256||(e.draft&&e.draft.sha256)):null;return d+(sha?' (sha256 '+sha.slice(0,12)+'…)':'');}).join(', ')+'.':'none yet; the brief is stored and the draft joins the run when sparring or battle brings it.'));
out.push('');
// Where the run started (2026-10-14: the order of the stages is the person's choice).
out.push('**Started at:** '+lib.startedAtLine(runDir,log,rounds));
if(fs.existsSync(path.join(runDir,'brief.md'))){
  out.push('');
  out.push('**Brief:**');
  out.push('');
  out.push(lib.readText(path.join(runDir,'brief.md')).trim());
}
out.push('');
out.push('## Scoreboard');
out.push('');
out.push(lib.SCOREBOARD_LEGEND);
out.push('');
if(rounds.length){
  out.push('| Seat | '+rounds.join(' | ')+' | Latest |');
  out.push('|---|'+rounds.map(function(){return '---|';}).join('')+'---|');
  seats.forEach(function(s){
    var latest=null; rounds.forEach(function(r){var c=grid[s.id][r];if(c.rating!==null&&c.rating!==undefined)latest=c.rating;});
    out.push('| '+lib.seatLabel(s)+' | '+rounds.map(function(r){return grid[s.id][r].text;}).join(' | ')+' | '+(latest===null?'—':bar(latest)+' '+latest+'/10')+' |');
  });
  out.push('');
  // The text Next line (2026-10-14): kept here, and printed by --short for the host's picker.
  out.push('**'+lib.nextLine(seats).replace(/^Next: /,'Next:** '));
}else out.push(noRoundsLine);
out.push('');
out.push('## Answers');
rounds.forEach(function(r){
  out.push('');
  out.push('### Round '+r);
  var pb=log.filter(function(e){return e.event==='packet.built'&&e.round===r;})[0];
  if(pb)out.push('');
  // The round's task in words (ruled 2026-10-15), from the packet through lib.roundTask, never the inbox file name.
  var task=lib.roundTask(runDir,r,log);
  if(pb)out.push('Draft read: '+pb.draft+'.'+(pb.reads_round?' Answers carried from round '+pb.reads_round+'.':'')+(pb.mode==='navigation'?' Navigation round: no other seat\'s answer carried.':'')+(pb.mode==='focus'?' Focus-question round: no other seat\'s answer carried.':'')+(pb.contract==='critique'?' No rating this round.':pb.rerate?' Rerate: a new rating asked.':'')+' Task: '+lib.taskLine(task)+'.');
  var askedHere=lib.askedIn(runDir,r,log);
  var notAskedHere=askedHere?seats.filter(function(s){return !askedHere[s.id];}).map(function(s){return s.id;}):[];
  if(notAskedHere.length)out.push('');
  if(notAskedHere.length)out.push('Put to '+seats.filter(function(s){return askedHere[s.id];}).map(function(s){return s.id;}).join(', ')+' only; not asked: '+notAskedHere.join(', ')+'.');
  seats.forEach(function(s){
    var files=lib.isFinalRound(r)?[s.id+'.sn.answer.md',s.id+'.redflag.answer.md']:[s.id+'.answer.md'];
    files.forEach(function(f){
      var p=path.join(runDir,'rounds',r,f);
      out.push('');
      out.push('#### '+lib.seatLabel(s)+(f.indexOf('.sn.')>=0?' — S/N ratio':f.indexOf('.redflag.')>=0?' — red flags':''));
      out.push('');
      if(!fs.existsSync(p)){out.push(lib.isFinalRound(r)||lib.wasAsked(runDir,r,s.id,log)?'*Missing: no answer file.*':'*Not asked this round.*');return;}
      var q=path.join(runDir,'rounds',r,s.id+'.question.md');
      if(fs.existsSync(q)&&f===s.id+'.answer.md'){out.push('*Question to this seat:* '+lib.readText(q).trim());out.push('');}
      var t=truncationOf(s,r,f.indexOf('.sn.')>=0?'sn':f.indexOf('.redflag.')>=0?'redflag':'rating');
      if(t){out.push('*Truncated at '+t.at+' words by the crew add-on on the seat\'s second overrun; the seat returned '+t.words_returned+' words'+(t.first_line_moved?'; its first line was found lower in the reply and moved to the top':'')+'.*');out.push('');}
      out.push(lib.readText(p).replace(/\s+$/,''));
    });
  });
});
out.push('');
out.push('## What was sent');
out.push('');
out.push('| When (UTC) | Round | Seat | Packet | Draft | Mode | Carried | Missing | Cap |');
out.push('|---|---|---|---|---|---|---|---|---|');
log.filter(function(e){return e.event==='packet.built';}).forEach(function(e){
  out.push('| '+e.ts+' | '+e.round+' | '+e.seat+' | '+e.file+' | '+e.draft+' | '+e.mode+(e.contract==='critique'?' (no rating)':e.rerate?' + rerate':'')+(e.question&&e.mode!=='seat'?' + question':'')+' | '+((e.carried||[]).map(function(c){return c.seat;}).join(', ')||'—')+' | '+((e.missing||[]).join(', ')||'—')+' | '+e.word_cap+' |');
});
out.push('');
out.push('Full log: log.jsonl in this folder.');
out.push('');
fs.writeFileSync(path.join(runDir,'record.md'),out.join('\n'));
lib.appendLog(runDir,{event:'record.rendered',file:'record.md',rounds:rounds.length});
if(args.next===true){
  process.stdout.write((rounds.length?lib.nextLine(seats):noRoundsLine)+'\n');
}else if(args.short===true){
  var s=[out.filter(function(l){return l.indexOf('**Crew:**')===0;})[0],''];
  out.filter(function(l){return l.indexOf('**Seats:**')===0;}).forEach(function(l){ s.push(l,''); });
  if(rounds.length){
    // The legend once per run: the first short form of the run prints it and logs that it did.
    var legendShown=log.some(function(e){return e.event==='legend.printed';});
    if(!legendShown){ s.push(lib.SCOREBOARD_LEGEND,''); lib.appendLog(runDir,{event:'legend.printed'}); }
    var tableStart=out.indexOf('## Scoreboard');
    var tableEnd=out.indexOf('## Answers');
    s=s.concat(out.slice(tableStart+1,tableEnd).filter(function(l){return l.indexOf('|')===0;}));
    s.push('','Board: '+path.join(runDir,lib.BOARD_FILE));
  }else{
    s.push(noRoundsLine,'','Started at: '+lib.startedAtLine(runDir,log,rounds));
  }
  s.push('','Seat key: '+lib.seatKey(seats));
  process.stdout.write(s.join('\n')+'\n');
}else process.stdout.write(path.join(runDir,'record.md')+'\n');
