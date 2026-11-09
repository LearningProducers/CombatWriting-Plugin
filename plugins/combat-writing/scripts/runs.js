// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// runs.js: the project's runs, and the way back to one (Part 85).
//
//   node runs.js [--root <dir>] [--match <word>] [--pick [N]]
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
//
// --pick [N]: the N (4 unset) open runs touched last, any stage (issue 186: "going by activity
// not stage"), as one JSON array for the host's picker. Activity is the latest `ts` in the run's
// log.jsonl (every line appendLog writes carries one; a run with no log falls back to its
// folder's birth time), so a run made in October and worked this morning sorts first; the
// listing above keeps its creation order. A shipped run is left out (`run: <word>` still
// reaches it). Each entry: id, slug, dir, label (the slug), description (the run's listing
// line without its id), stage (the last round's kind, or none), active (the ts read). No open
// run: [] and exit 0. Reads only; writes nothing, logs nothing.

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
if(args.pick!==undefined){
  var n=args.pick===true?4:parseInt(args.pick,10);
  if(!(n>0))lib.die('--pick takes a count');
  function lastActive(dir){
    var last=null, p=path.join(dir,'log.jsonl');
    if(fs.existsSync(p))fs.readFileSync(p,'utf8').split('\n').filter(Boolean).forEach(function(l){
      try{ var e=JSON.parse(l); if(e&&e.ts&&(!last||e.ts>last))last=e.ts; }catch(err){}
    });
    if(!last){ try{ last=fs.statSync(dir).birthtime.toISOString(); }catch(err){ last=''; } }
    return last;
  }
  var picked=runs.filter(function(s){return !s.shipped;}).map(function(s){return {s:s,active:lastActive(s.dir)};})
    .sort(function(a,b){ return a.active<b.active?1:a.active>b.active?-1:(a.s.id<b.s.id?1:a.s.id>b.s.id?-1:0); }).slice(0,n)
    .map(function(o){ var s=o.s; return {id:s.id,slug:s.slug,dir:s.dir,label:s.slug,
      description:lib.runsLine(s).slice(s.id.length+3),stage:s.last_round?s.last_round.replace(/^\d\d-/,''):'none',active:o.active}; });
  process.stdout.write(JSON.stringify(picked)+'\n');
  process.exit(0);
}
process.stdout.write(listing().join('\n')+'\n');
