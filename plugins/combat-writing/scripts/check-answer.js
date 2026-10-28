// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// check-answer.js: verifies one seat's answer file against its first-line contract.
//
//   node check-answer.js <answer file> [--word-cap <n>] [--run <run folder>] [--contract rating|sn|redflag] [--sections] [--rewrite]
//
// The contract comes from the packet the seat was sent (with --run), else from the file
// name, unless --contract says otherwise. The two sections of a battle answer that shares
// (issue 80, Answer then To the crew, lib.SECTIONS_LINE) are held when the packet asked for
// them (lib.sectionsSent with --run; --sections without one): a missing label fails the first
// check and is sent back with the reason; on the second check it is a note (section_notes in
// the summary and the log line), the answer accepted, so a read is never lost over a label.
//   <seat>.answer.md          rating:   RATING: X/10, uppercase, X 1 to 10, never 7, nothing else on the line
//                             critique: a battle round that asked for no rating (ruled 2026-10-09):
//                                       no RATING line; the critique opens the answer
//   <seat>.sn.answer.md       sn:       S/N RATIO: XX%, XX 0 to 100 (the app's final read; no 7 rule)
//   <seat>.redflag.answer.md  redflag:  NO RED FLAGS, or RED FLAGS FOUND: X with X 1 or more (the app's)
// Reasoning must follow the first line, and the whole answer must be within the word cap.
// Prints one line: with --run, "<seat> <short name> finished round <nn-kind>: " then OK or FAIL
// with the reasons (issue 33, 2026-10-19: the host prints it as each seat finishes, so the person
// sees one line per seat before the board opens); without --run, OK or FAIL alone. Then a JSON
// summary on the second line.
// Exit 0 on pass, 1 on fail, 2 on misuse.
//
// The word cap: --word-cap when given; else, with --run, the cap the seat was actually
// sent, read from the round's packet.built line in log.jsonl or, failing that, from the
// "Under N words" line of the seat's packet file; else the contract's default.
// With --run, appends the result to the run's log.jsonl.
//
// The second overrun (ruled 2026-10-15, one rule for every seat): with --run, when the log already
// holds a failed answer.checked line for this same file (so this is the retry's check) and the answer
// is over the cap, the file is cut at the cap, at the last sentence end before it, with its
// first line kept (lib.truncateAnswer, the add-on's rule for an outside seat), written back,
// and checked as cut; the log line and the summary carry `truncated`, and the record marks the
// read. Any other fault on the second answer still fails. A first check never writes the file.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var file=args._[0];
if(!file)lib.die('usage: check-answer.js <answer file> [--word-cap <n>] [--run <run folder>] [--contract rating|critique|sn|redflag]');
if(!fs.existsSync(file))lib.die('answer file not found: '+file);
var runDir=(args.run&&args.run!==true)?path.resolve(args.run):null;
var rel=runDir?path.relative(runDir,path.resolve(file)).split(path.sep):[];
var round=rel.length>=3&&rel[0]==='rounds'?rel[1]:null;
var seatId=path.basename(file).replace(/(\.sn|\.redflag|\.crew)?\.answer\.md$/,'');
var contract=args.contract&&args.contract!==true?args.contract:(runDir&&round)?lib.contractSent(runDir,round,path.resolve(file)):lib.contractOf(file);
if(['rating','critique','sn','redflag','crew'].indexOf(contract)<0)lib.die('--contract must be rating, critique, sn, redflag or crew');
var capSource='default', cap=null;
if(args['word-cap']&&args['word-cap']!==true){cap=parseInt(args['word-cap'],10);capSource='--word-cap';}
else if(runDir&&round){var fromRun=lib.capSent(runDir,round,path.resolve(file));if(fromRun!==null){cap=fromRun;capSource='packet';}}
var text=lib.readText(file);
var capInForce=cap||(contract==='rating'||contract==='critique'?lib.DEFAULT_WORD_CAP:contract==='crew'?lib.DEFAULT_CREW_WORD_CAP:lib.DEFAULT_FINAL_WORD_CAP);
var truncated=null, second=false;
// The two sections (issue 80): held when the packet asked for them (--sections says so without a run).
var sections=(runDir&&round)?lib.sectionsSent(runDir,round,path.resolve(file)):args.sections===true;
// The rewrite (issue 103): held when the packet asked for one (--rewrite says so without a run); its faults ride with the section faults.
var rewrite=(runDir&&round)?lib.rewriteSent(runDir,round,path.resolve(file)):args.rewrite===true;
if(runDir&&round){
  var relFile=rel.join('/');
  // A second answer: one whose first check failed, or one the add-on already cut on the seat's second
  // overrun (crew.answered with truncated), which is a second answer by definition.
  second=lib.readLog(runDir).some(function(e){return (e.event==='answer.checked'&&e.round===round&&e.seat===seatId&&e.file===relFile&&e.ok===false)||(e.event==='crew.answered'&&e.round===round&&e.seat===seatId&&e.file===relFile&&!!e.truncated);});
  if(second&&lib.wordCount(text)>capInForce){
    var cut=lib.truncateAnswer(text,capInForce,contract==='sn'?'sn':contract==='redflag'?'redflag':contract==='crew'?'crew':'rating',contract);
    if(cut){text=cut.text+'\n';fs.writeFileSync(file,text);truncated=Object.assign({by:'checker'},cut.truncated);}
  }
}
var result=lib.checkAnswer(text,cap,contract,{sections:sections,rewrite:rewrite});
// The copy check (issue 107): a rewrite measured against the rewrites carried in the seat's packet.
var copy=(rewrite&&runDir&&round&&result.rewrite)?lib.rewriteCopy(runDir,round,seatId,text,lib.readSeats(runDir).seats||[],lib.readLog(runDir)):null;
// On the second check a section fault is a note, not a failure (issue 80): the seat was sent back once
// for it, as for an overrun, and a read is never lost over a label.
var sectionNotes=[];
if(second&&result.section_reasons.length){
  sectionNotes=result.section_reasons;
  result.reasons=result.reasons.filter(function(r){return sectionNotes.indexOf(r)<0;});
  result.ok=result.reasons.length===0;
}
var summary={file:path.basename(file),contract:contract,ok:result.ok,rating:result.rating,value:result.value,words:result.words,
  word_cap:capInForce,word_cap_source:capSource,reasons:result.reasons,truncated:truncated,sections:result.sections,rewrite:result.rewrite,copy:copy,section_notes:sectionNotes};
if(runDir&&fs.existsSync(path.join(runDir,'log.jsonl'))){
  lib.appendLog(runDir,Object.assign({event:'answer.checked',round:round,seat:seatId},summary,{file:rel.join('/')}));
}
var headline=result.ok
  ?('OK '+(contract==='rating'?'rating '+result.rating+'/10':contract==='critique'?'critique, no rating this round':contract==='crew'?'to the crew, second pass':contract==='sn'?'S/N '+result.value+'%':(result.value===0?'no red flags':result.value+' red flag(s)'))+', '+result.words+' words'+(truncated?', truncated at '+truncated.at+' words on the second overrun (cut at '+(truncated.cut_at==='sentence'?'the last sentence end':'the word')+'; the seat returned '+truncated.words_returned+')':'')+(sectionNotes.length?', accepted without its two sections on the second check ('+sectionNotes.join('; ')+')':'')+(copy?'; the rewrite is a copy of '+copy.model+'\'s ('+Math.round(copy.share*100)+' in 100 of its three-word runs)':''))
  :('FAIL '+result.reasons.join('; ')+(truncated?' (cut at '+truncated.at+' words on the second overrun first)':''));
var who='';
if(runDir&&round){
  var seatRec=null; try{var sf=path.join(runDir,'seats.json'); if(fs.existsSync(sf))seatRec=(JSON.parse(lib.readText(sf)).seats||[]).filter(function(s){return s.id===seatId;})[0]||null;}catch(e){}
  who=seatId+(seatRec?' '+lib.seatShortName(seatRec):'')+' finished round '+round+': ';
}
process.stdout.write(who+headline+'\n'+JSON.stringify(summary)+'\n');
process.exit(result.ok?0:1);
