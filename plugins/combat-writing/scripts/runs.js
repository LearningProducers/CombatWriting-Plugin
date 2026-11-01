// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// runs.js: the project's runs, and the way back to one (Part 85, 2026-10-31). The founder's words:
// "There needs to be a clear way for a user to return to a run not finished whether it's an email
// or an article and it ought to be able to start fresh on a new one whenever also, i guess
// publishing or sending makes it complete?"
//
//   node runs.js [--root <dir>] [--match <word>]
//
// Bare: one line per run under <root>/combat-writing/runs/, newest first (lib.runsLine): the run
// id, its brief by name (default, or none), its reader's first words, its last round, the drafts
// it holds, and OPEN or SHIPPED <date> (a run is shipped when it holds a canon, written by
// champion.js on `shipped`; the date is the shipped line's). Then one line saying how to return
// and how to start fresh. With no run, one line saying so. Nothing is computed beyond what the
// folders and logs hold.
//
// --match <word>: the runs whose id holds the word, case-insensitively (`run: <word>` in any
// command). Exactly one: prints its folder path alone, exit 0. Two or more: prints "N runs match
// <word>:" and their lines, exit 3, so the host asks which. None: prints "No run matches <word>."
// and the listing, exit 1. Reads only; writes nothing, logs nothing.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var root=path.resolve(args.root&&args.root!==true?args.root:process.cwd());
var runs=lib.listRunSummaries(root);
var CLOSING='run: <word> on any stage command returns to a run (a word of its id); a new piece: paste it with battle: or sparring:. A run is OPEN until /cw:champion shipped freezes its canon.';
function listing(){ return runs.length?runs.map(lib.runsLine).concat([CLOSING]):['No run yet. Paste a draft with battle: or sparring: to start one.']; }
if(args.match!==undefined){
  if(args.match===true)lib.die('--match takes a word');
  var hits=lib.matchRuns(root,args.match);
  if(hits.length===1){ process.stdout.write(hits[0].dir+'\n'); process.exit(0); }
  if(hits.length>1){ process.stdout.write(hits.length+' runs match '+args.match+':\n'+hits.map(lib.runsLine).join('\n')+'\n'); process.exit(3); }
  process.stdout.write('No run matches '+args.match+'.\n'+listing().join('\n')+'\n'); process.exit(1);
}
process.stdout.write(listing().join('\n')+'\n');
