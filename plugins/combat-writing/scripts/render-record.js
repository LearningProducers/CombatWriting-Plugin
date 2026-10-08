// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// render-record.js: renders record.md for a run from the files on disk and log.jsonl.
//
//   node render-record.js --run <run folder> [--short]
//
// record.md opens with the credit line, then the crew line, the drafts and the brief, the
// scoreboard (one row per seat, one column per round, every rating shown on its own, flips
// marked valid or invalid with the earlier number kept visible, Stand marked, missing seats
// marked missing, the final round's S/N and red-flag counts per seat), then every answer in
// full by round under its seat's name, then the log of what was sent. Nothing is averaged,
// summed or ranked. Rebuilt after every round; the log and the answer files are the truth.
//
// --short prints the scoreboard and the crew line to stdout for the host to show, and still
// writes record.md. Without it, prints the record's path.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
var seatsFile=lib.readSeats(runDir), seats=seatsFile.seats;
var log=lib.readLog(runDir);
var rounds=lib.listRounds(runDir);
var drafts=lib.listDrafts(runDir);
var created=log.filter(function(e){return e.event==='run.created';})[0]||{};

function bar(n){ return n===null?'          ':new Array(n+1).join('█')+new Array(11-n).join('░'); }
function lastLog(pred){ for(var i=log.length-1;i>=0;i--){ if(pred(log[i]))return log[i]; } return null; }

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
      return {c:c,ok:r.ok,value:r.value,reasons:r.reasons};
    });
    var snP=parts[0], rfP=parts[1];
    var snText=snP.missing?'S/N missing':snP.ok?'S/N '+snP.value+'%':'S/N failed read';
    var rfText=rfP.missing?'red flags missing':rfP.ok?(rfP.value===0?'no red flags':rfP.value+' red flag'+(rfP.value===1?'':'s')):'red-flag read failed';
    return {text:snText+' · '+rfText,rating:null,final:true,sn:snP,redflag:rfP};
  }
  var p=path.join(runDir,'rounds',round,seat.id+'.answer.md');
  if(!fs.existsSync(p))return {text:'missing',rating:null,missing:true};
  var text=lib.readText(p);
  var logged=lastLog(function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&(!e.contract||e.contract==='rating');});
  var check=lib.checkAnswer(text,logged?logged.word_cap:null,'rating');
  if(!check.ok)return {text:'failed read ('+check.reasons[0]+')'+(check.rating!==null?' · wrote '+check.rating+'/10':''),rating:null,failed:true,reasons:check.reasons};
  var flip=lastLog(function(e){return e.event==='flip.checked'&&e.round===round&&e.seat===seat.id;});
  if(!flip){
    var inputs=lib.flipInputs(runDir,seat,round,seats);
    flip=lib.checkFlip(text,seat,inputs.own?inputs.own.text:null,inputs.prevAnswers);
  }
  var r=check.rating+'/10';
  var mark={first:'',stand:' · Stand','held':' · held, no Stand',
    'flip-valid':' · flip from '+flip.from+', valid (quoted '+flip.cited+')',
    'flip-invalid':' · flip from '+flip.from+', INVALID ('+(flip.reason||'quote not found')+')',unrated:''}[flip.status]||'';
  return {text:r+mark,rating:check.rating,flip:flip};
}

var grid={}; seats.forEach(function(s){grid[s.id]={};rounds.forEach(function(r){grid[s.id][r]=cell(s,r);});});

var out=[];
out.push(lib.CREDIT);
out.push('');
out.push('# Combat Writing record — '+path.basename(runDir));
out.push('');
var companies=seats.map(function(s){return s.company;}).filter(function(v,i,a){return a.indexOf(v)===i;});
out.push('**Crew:** '+seats.map(lib.seatLabel).join('; ')+'. '+(companies.length===1?'One company\'s models ('+companies[0]+').':companies.length+' companies.')+' Seat names come from the agent configuration, not from an API field.');
out.push('');
out.push('**Drafts:** '+drafts.map(function(d){var e=lastLog(function(x){return (x.event==='draft.added'&&x.file===d)||(x.event==='run.created'&&d==='draft.md');});var sha=e?(e.sha256||(e.draft&&e.draft.sha256)):null;return d+(sha?' (sha256 '+sha.slice(0,12)+'…)':'');}).join(', ')+'.');
if(fs.existsSync(path.join(runDir,'brief.md'))){
  out.push('');
  out.push('**Brief:**');
  out.push('');
  out.push(lib.readText(path.join(runDir,'brief.md')).trim());
}
out.push('');
out.push('## Scoreboard');
out.push('');
out.push('Every number is one seat\'s own. Nothing here is averaged. A flip shows the earlier number beside the new one; INVALID means the quote the seat gave does not match the seat it named. Missing means the seat gave no answer in that round. The bar is the seat\'s latest rating.');
out.push('');
if(rounds.length){
  out.push('| Seat | '+rounds.join(' | ')+' | Latest |');
  out.push('|---|'+rounds.map(function(){return '---|';}).join('')+'---|');
  seats.forEach(function(s){
    var latest=null; rounds.forEach(function(r){var c=grid[s.id][r];if(c.rating!==null&&c.rating!==undefined)latest=c.rating;});
    out.push('| '+lib.seatLabel(s)+' | '+rounds.map(function(r){return grid[s.id][r].text;}).join(' | ')+' | '+(latest===null?'—':bar(latest)+' '+latest+'/10')+' |');
  });
}else out.push('No rounds yet.');
out.push('');
out.push('## Answers');
rounds.forEach(function(r){
  out.push('');
  out.push('### Round '+r);
  var pb=log.filter(function(e){return e.event==='packet.built'&&e.round===r;})[0];
  if(pb)out.push('');
  if(pb)out.push('Draft read: '+pb.draft+'.'+(pb.reads_round?' Answers carried from round '+pb.reads_round+'.':'')+(pb.sfq?' SFQ: '+pb.sfq+'.':'')+(pb.sn?' SN: '+pb.sn+'.':''));
  seats.forEach(function(s){
    var files=lib.isFinalRound(r)?[s.id+'.sn.answer.md',s.id+'.redflag.answer.md']:[s.id+'.answer.md'];
    files.forEach(function(f){
      var p=path.join(runDir,'rounds',r,f);
      out.push('');
      out.push('#### '+lib.seatLabel(s)+(f.indexOf('.sn.')>=0?' — S/N ratio':f.indexOf('.redflag.')>=0?' — red flags':''));
      out.push('');
      if(!fs.existsSync(p)){out.push('*Missing: no answer file.*');return;}
      var q=path.join(runDir,'rounds',r,s.id+'.question.md');
      if(fs.existsSync(q)&&f===s.id+'.answer.md'){out.push('*Question to this seat:* '+lib.readText(q).trim());out.push('');}
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
  out.push('| '+e.ts+' | '+e.round+' | '+e.seat+' | '+e.file+' | '+e.draft+' | '+e.mode+(e.question?' + question':'')+' | '+((e.carried||[]).map(function(c){return c.seat;}).join(', ')||'—')+' | '+((e.missing||[]).join(', ')||'—')+' | '+e.word_cap+' |');
});
out.push('');
out.push('Full log: log.jsonl in this folder.');
out.push('');
fs.writeFileSync(path.join(runDir,'record.md'),out.join('\n'));
lib.appendLog(runDir,{event:'record.rendered',file:'record.md',rounds:rounds.length});
if(args.short===true){
  var s=[lib.CREDIT,'',out.filter(function(l){return l.indexOf('**Crew:**')===0;})[0],''];
  var tableStart=out.indexOf('## Scoreboard');
  var tableEnd=out.indexOf('## Answers');
  var board=out.slice(tableStart+1,tableEnd).filter(function(l){return l.trim();});
  var firstRow=board.findIndex(function(l){return l.indexOf('|')===0;});
  if(firstRow>0)board.splice(firstRow,0,'');
  s=s.concat(board);
  s.push('','Record: '+path.join(runDir,'record.md'));
  process.stdout.write(s.join('\n')+'\n');
}else process.stdout.write(path.join(runDir,'record.md')+'\n');
