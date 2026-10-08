// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// check-answer.js: verifies one seat's answer file against the rating contract.
//
//   node check-answer.js <answer file> [--word-cap <n>] [--run <run folder>]
//
// Passes when the first line is exactly RATING: X/10 (uppercase, X from 1 to 10,
// never 7, nothing else on the line), reasoning follows, and the whole answer is
// within the word cap. Prints one line: OK or FAIL with the reasons, and a JSON
// summary on the second line. Exit 0 on pass, 1 on fail, 2 on misuse.
//
// The word cap: --word-cap when given; else, with --run, the cap the seat was
// actually sent, read from the round's packet.built line in log.jsonl or, failing
// that, from the "Under N words" line of the seat's packet file; else 400.
// With --run, appends the result to the run's log.jsonl.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var file=args._[0];
if(!file)lib.die('usage: check-answer.js <answer file> [--word-cap <n>] [--run <run folder>]');
if(!fs.existsSync(file))lib.die('answer file not found: '+file);
var runDir=(args.run&&args.run!==true)?path.resolve(args.run):null;
var rel=runDir?path.relative(runDir,path.resolve(file)).split(path.sep):[];
var round=rel.length>=3&&rel[0]==='rounds'?rel[1]:null;
var seatId=path.basename(file).replace(/\.answer\.md$/,'');

function capFromRun(){
  if(!runDir||!round)return null;
  var logPath=path.join(runDir,'log.jsonl');
  if(fs.existsSync(logPath)){
    var lines=lib.readText(logPath).split('\n').filter(Boolean);
    for(var i=lines.length-1;i>=0;i--){
      var e; try{e=JSON.parse(lines[i]);}catch(err){continue;}
      if(e.event==='packet.built'&&e.round===round&&e.seat===seatId&&typeof e.word_cap==='number')return e.word_cap;
    }
  }
  var packetPath=path.join(runDir,'rounds',round,seatId+'.packet.md');
  if(fs.existsSync(packetPath)){
    var m=/Under (\d+) words\./.exec(lib.readText(packetPath));
    if(m)return parseInt(m[1],10);
  }
  return null;
}
var capSource='default';
var cap;
if(args['word-cap']&&args['word-cap']!==true){cap=parseInt(args['word-cap'],10);capSource='--word-cap';}
else{var fromRun=capFromRun();if(fromRun!==null){cap=fromRun;capSource='packet';}else cap=lib.DEFAULT_WORD_CAP;}
var result=lib.checkAnswer(lib.readText(file),cap);
var summary={file:path.basename(file),ok:result.ok,rating:result.rating,words:result.words,word_cap:cap,word_cap_source:capSource,reasons:result.reasons};
if(runDir&&fs.existsSync(path.join(runDir,'log.jsonl'))){
  lib.appendLog(runDir,Object.assign({event:'answer.checked',round:round,seat:seatId},summary,{file:rel.join('/')}));
}
process.stdout.write((result.ok?'OK rating '+result.rating+'/10, '+result.words+' words':'FAIL '+result.reasons.join('; '))+'\n'+JSON.stringify(summary)+'\n');
process.exit(result.ok?0:1);
