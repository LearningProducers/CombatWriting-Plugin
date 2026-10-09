// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// check-answer.js: verifies one seat's answer file against its first-line contract.
//
//   node check-answer.js <answer file> [--word-cap <n>] [--run <run folder>] [--contract rating|sn|redflag]
//
// The contract comes from the packet the seat was sent (with --run), else from the file
// name, unless --contract says otherwise:
//   <seat>.answer.md          rating:   RATING: X/10, uppercase, X 1 to 10, never 7, nothing else on the line
//                             critique: a battle round that asked for no rating (ruled 2026-10-09):
//                                       no RATING line; the critique opens the answer
//   <seat>.sn.answer.md       sn:       S/N RATIO: XX%, XX 0 to 100 (the app's final read; no 7 rule)
//   <seat>.redflag.answer.md  redflag:  NO RED FLAGS, or RED FLAGS FOUND: X with X 1 or more (the app's)
// Reasoning must follow the first line, and the whole answer must be within the word cap.
// Prints one line: OK or FAIL with the reasons, and a JSON summary on the second line.
// Exit 0 on pass, 1 on fail, 2 on misuse.
//
// The word cap: --word-cap when given; else, with --run, the cap the seat was actually
// sent, read from the round's packet.built line in log.jsonl or, failing that, from the
// "Under N words" line of the seat's packet file; else the contract's default.
// With --run, appends the result to the run's log.jsonl.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var file=args._[0];
if(!file)lib.die('usage: check-answer.js <answer file> [--word-cap <n>] [--run <run folder>] [--contract rating|critique|sn|redflag]');
if(!fs.existsSync(file))lib.die('answer file not found: '+file);
var runDir=(args.run&&args.run!==true)?path.resolve(args.run):null;
var rel=runDir?path.relative(runDir,path.resolve(file)).split(path.sep):[];
var round=rel.length>=3&&rel[0]==='rounds'?rel[1]:null;
var seatId=path.basename(file).replace(/(\.sn|\.redflag)?\.answer\.md$/,'');
var contract=args.contract&&args.contract!==true?args.contract:(runDir&&round)?lib.contractSent(runDir,round,path.resolve(file)):lib.contractOf(file);
if(['rating','critique','sn','redflag'].indexOf(contract)<0)lib.die('--contract must be rating, critique, sn or redflag');
var capSource='default', cap=null;
if(args['word-cap']&&args['word-cap']!==true){cap=parseInt(args['word-cap'],10);capSource='--word-cap';}
else if(runDir&&round){var fromRun=lib.capSent(runDir,round,path.resolve(file));if(fromRun!==null){cap=fromRun;capSource='packet';}}
var result=lib.checkAnswer(lib.readText(file),cap,contract);
var summary={file:path.basename(file),contract:contract,ok:result.ok,rating:result.rating,value:result.value,words:result.words,
  word_cap:cap||(contract==='rating'||contract==='critique'?lib.DEFAULT_WORD_CAP:lib.DEFAULT_FINAL_WORD_CAP),word_cap_source:capSource,reasons:result.reasons};
if(runDir&&fs.existsSync(path.join(runDir,'log.jsonl'))){
  lib.appendLog(runDir,Object.assign({event:'answer.checked',round:round,seat:seatId},summary,{file:rel.join('/')}));
}
var headline=result.ok
  ?('OK '+(contract==='rating'?'rating '+result.rating+'/10':contract==='critique'?'critique, no rating this round':contract==='sn'?'S/N '+result.value+'%':(result.value===0?'no red flags':result.value+' red flag(s)'))+', '+result.words+' words')
  :('FAIL '+result.reasons.join('; '));
process.stdout.write(headline+'\n'+JSON.stringify(summary)+'\n');
process.exit(result.ok?0:1);
