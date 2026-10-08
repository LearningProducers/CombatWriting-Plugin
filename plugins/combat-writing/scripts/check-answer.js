// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// check-answer.js: verifies one seat's answer file against the rating contract.
//
//   node check-answer.js <answer file> [--word-cap <n>] [--run <run folder>]
//
// Passes when the first line is exactly RATING: X/10 (uppercase, X from 1 to 10,
// never 7, nothing else on the line), reasoning follows, and the whole answer is
// within the word cap (default 400). Prints one line: OK or FAIL with the reasons,
// and a JSON summary on the second line. Exit 0 on pass, 1 on fail, 2 on misuse.
// With --run, appends the result to the run's log.jsonl.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var file=args._[0];
if(!file)lib.die('usage: check-answer.js <answer file> [--word-cap <n>] [--run <run folder>]');
if(!fs.existsSync(file))lib.die('answer file not found: '+file);
var cap=args['word-cap']&&args['word-cap']!==true?parseInt(args['word-cap'],10):lib.DEFAULT_WORD_CAP;
var result=lib.checkAnswer(lib.readText(file),cap);
var summary={file:path.basename(file),ok:result.ok,rating:result.rating,words:result.words,word_cap:cap,reasons:result.reasons};
if(args.run&&args.run!==true&&fs.existsSync(path.join(args.run,'log.jsonl'))){
  var rel=path.relative(path.resolve(args.run),path.resolve(file)).split(path.sep);
  lib.appendLog(args.run,Object.assign({event:'answer.checked',round:rel.length>=3?rel[1]:null,seat:path.basename(file).replace(/\.answer\.md$/,'')},summary,{file:rel.join('/')}));
}
process.stdout.write((result.ok?'OK rating '+result.rating+'/10, '+result.words+' words':'FAIL '+result.reasons.join('; '))+'\n'+JSON.stringify(summary)+'\n');
process.exit(result.ok?0:1);
