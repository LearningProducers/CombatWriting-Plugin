// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// check-flip.js: did this seat change its rating, and if so, did it quote who moved it?
//
//   node check-flip.js --run <run folder> --round <nn-kind> --seat <seat id>
//
// Reads the seat's answer in the round, the seat's own earlier turn (the one its packet
// carried, from the packet.built log line, else its latest earlier answer), and the other
// seats' answers in the round the packet read. A seat whose rating changed must quote a line from another seat's answer,
// in double quotes, attributed to that seat by id, label or (when unambiguous) model name;
// the quote is matched word for word, whitespace and quote marks normalized, against the
// cited seat's answer file. A quote that does not match there marks the flip invalid. A
// seat that holds its rating should say Stand.
//
// Statuses: first (no earlier answer of its own), stand, held (held without saying Stand),
// flip-valid, flip-invalid, unrated (the first line is not a rating line), missing (no
// answer file). Prints one line and a JSON summary, appends flip.checked to log.jsonl.
// Exit 0 for first, stand, held and flip-valid; 1 for flip-invalid, unrated and missing;
// 2 on misuse. The record shows the seat's rating whatever the status.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
['run','round','seat'].forEach(function(k){ if(!args[k]||args[k]===true)lib.die('--'+k+' is required'); });
var runDir=path.resolve(args.run);
var seats=lib.readSeats(runDir).seats;
var seat=seats.filter(function(s){return s.id===args.seat;})[0];
if(!seat)lib.die('seat '+args.seat+' is not in seats.json');
if(lib.isFinalRound(args.round))lib.die('a final round has no rating to flip');

var answerPath=path.join(runDir,'rounds',args.round,seat.id+'.answer.md');
var result;
if(!fs.existsSync(answerPath))result={status:'missing',from:null,to:null,reason:'no answer file'};
else{
  var inputs=lib.flipInputs(runDir,seat,args.round,seats);
  result=lib.checkFlip(lib.readText(answerPath),seat,inputs.own?inputs.own.text:null,inputs.prevAnswers);
  result.reads_round=inputs.readsRound;
  result.own_previous=inputs.own?inputs.own.round:null;
}
var summary=Object.assign({round:args.round,seat:seat.id},result);
lib.appendLog(runDir,Object.assign({event:'flip.checked'},summary));
var line={first:'FIRST rating '+result.to+'/10, nothing earlier to hold or flip',
  stand:'STAND at '+result.to+'/10',held:'HELD at '+result.to+'/10 without saying Stand',
  'flip-valid':'FLIP '+result.from+' to '+result.to+', valid: quoted '+result.cited,
  'flip-invalid':'FLIP '+result.from+' to '+result.to+', INVALID: '+result.reason,
  unrated:'UNRATED: the first line is not a rating line',missing:'MISSING: no answer file'}[result.status];
process.stdout.write(line+'\n'+JSON.stringify(summary)+'\n');
process.exit(['first','stand','held','flip-valid'].indexOf(result.status)>=0?0:1);
