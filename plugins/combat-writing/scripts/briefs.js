// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// briefs.js: lists the project's briefs (Part 86, 2026-10-31): the unnamed default and every
// brief saved by name, each with its first line and the runs on it, read from the files and
// each run's log, nothing computed beyond that.
//
//   node briefs.js [--root <dir>] [--names]
//
// Prints, for the unnamed default (combat-writing/brief.md) when it exists and for each saved
// brief in combat-writing/briefs/<name>.md, one line "<name>: <first line>" (the default as
// "default (combat-writing/brief.md): ...") and under it one line naming the runs whose
// run.created carries that brief (by name, or the unnamed default as source project or a brief
// typed with no name), newest first, or "no run yet". With no brief at all it prints one line
// saying so and how to save one. --names prints the saved names alone, one per line, for the
// host's check of `brief: <word>`. Reads only; writes nothing, logs nothing.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
var root=path.resolve(args.root&&args.root!==true?args.root:process.cwd());
var briefs=lib.listBriefs(root);
if(args.names===true){ process.stdout.write(briefs.map(function(b){return b.name+'\n';}).join('')); process.exit(0); }
var runsDir=path.join(root,lib.RUNS_DIR);
var runs=fs.existsSync(runsDir)?fs.readdirSync(runsDir).filter(function(d){return fs.existsSync(path.join(runsDir,d,'seats.json'));}).sort().reverse():[];
var byBrief={default:[]};
briefs.forEach(function(b){byBrief[b.name]=[];});
runs.forEach(function(r){
  var created=null;
  try{ created=lib.readLog(path.join(runsDir,r)).filter(function(e){return e.event==='run.created';})[0]; }catch(e){}
  if(!created||!created.brief)return;
  var key=created.brief.name?created.brief.name:'default';
  if(!byBrief[key])byBrief[key]=[];
  byBrief[key].push(r);
});
var out=[];
var pb=lib.projectBriefPath(root);
if(fs.existsSync(pb)){
  var t=lib.readText(pb);
  out.push('default (combat-writing/brief.md): '+lib.briefFirstLine(t)+' ('+lib.wordCount(t)+' words)');
  out.push('  runs: '+(byBrief.default.length?byBrief.default.join(', '):'no run yet'));
}
briefs.forEach(function(b){
  out.push(b.name+' ('+b.file+'): '+b.first_line+' ('+b.words+' words)');
  out.push('  runs: '+(byBrief[b.name].length?byBrief[b.name].join(', '):'no run yet'));
});
if(!out.length)out.push('No brief yet. brief: <text> in any command saves the project\'s default; brief <name>: <text> saves one by name (brief cold-email: ..., brief blog: ...), and brief: <name> picks it for a run.');
else out.push('brief: <name> picks a saved brief for the next run; brief <name>: <text> replaces it; brief update <name>: <text> adds a dated line; brief: <text> with no name is the default.');
process.stdout.write(out.join('\n')+'\n');
