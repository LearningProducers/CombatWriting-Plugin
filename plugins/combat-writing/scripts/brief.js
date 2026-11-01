// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// brief.js: adds to the brief (issue 72, 2026-10-26). The founder's rule: "brief update: followed
// by a line just adds to the brief." The prospect of the day (who the piece is to, the page it
// quotes) lives in the brief, where the seats already read, so no other keyword carries it.
//
//   node brief.js --update <inbox file> [--name <brief name>] [--run <run folder>] [--root <dir>] [--at <time>]
//
// The text reaches this script as a file cut from the inbox, never as inline text (the packet
// rule). It is appended as one dated paragraph, "Update YYYY-MM-DD: <text>" (lib.briefUpdateParagraph;
// a multi-line update keeps its lines), after a blank line:
//   - to the project's brief, <root>/combat-writing/brief.md, created from the update alone when
//     there is none (a missing brief never errors: the update is then the whole brief);
//   - to the run's brief.md when --run names a run, so the next packet of that run carries it; a
//     run with no brief.md gets the project's brief, update included, as its brief.md.
// An append never removes: an earlier update stays above the new one, dated, so a seat reads the
// order; a whole `brief:` replaces the file when the pile is long (new-run.js). The short form's
// Brief line names the newest update (lib.briefLine). Logs brief.updated in the run when --run is
// given, with the project file's and the run file's sha256 after the write and the update's
// words; prints one line, "Brief updated <date> in combat-writing/brief.md[ and the run's]: <text>",
// and nothing else. --at dates the update (any form Date parses; UTC); it defaults to now.
//
// Briefs by name (Part 86, 2026-10-31): --name <name> appends to the saved brief
// <root>/combat-writing/briefs/<name>.md instead of the unnamed default (`brief update <name>:`),
// created from the update alone when there is none; with no --name and a --run whose brief has a
// name (run.created brief.name), that named brief is the one added to, so an update typed on a run
// lands where the run's brief lives; the unnamed default is touched only when neither names one.
// brief.updated and the printed line carry the name and the file.
//
// Refusals, exit 2 with one line on stderr: a missing --update; a missing or empty file; a --run
// folder that does not exist; an --at that is not a date. Writes nowhere but the two brief files
// and the run's log. No network module, no fetch.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));

if(!args.update||args.update===true)lib.die('--update <file> is required: the update text, cut from the inbox');
if(!fs.existsSync(args.update))lib.die('update file not found: '+args.update);
var text=lib.readText(args.update).replace(/\r\n/g,'\n').trim();
if(!text)lib.die('the update file is empty: '+args.update);
var root=path.resolve(args.root&&args.root!==true?args.root:process.cwd());
var runDir=null;
if(args.run!==undefined){
  if(args.run===true)lib.die('--run takes a run folder');
  runDir=path.resolve(args.run);
  if(!fs.existsSync(runDir)||!fs.statSync(runDir).isDirectory())lib.die('run folder not found: '+args.run);
}
var name=null;
if(args.name!==undefined){
  if(args.name===true)lib.die('--name takes a brief name');
  name=String(args.name).trim().toLowerCase();
  if(!lib.isBriefName(name))lib.die('not a brief name: '+args.name);
}
if(!name&&runDir){
  var createdLine=lib.readLog(runDir).filter(function(e){return e.event==='run.created';})[0];
  if(createdLine&&createdLine.brief&&createdLine.brief.name)name=createdLine.brief.name;
}
var at=new Date();
if(args.at!==undefined){
  if(args.at===true||isNaN(new Date(args.at).getTime()))lib.die('--at takes a date');
  at=new Date(args.at);
}
var date=lib.dateUtc(at.toISOString());
var paragraph=lib.briefUpdateParagraph(text,date);

// Append after a blank line; a file that is empty or missing holds the update alone.
function appendTo(file){
  var had=fs.existsSync(file)?lib.readText(file):'';
  var out=had.replace(/\s+$/,'');
  out=(out?out+'\n\n':'')+paragraph+'\n';
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,out);
  return {created:!had.trim(),sha256:lib.sha256(fs.readFileSync(file))};
}

var pb=name?lib.briefNamePath(root,name):lib.projectBriefPath(root);
var pbRel=name?lib.BRIEFS_DIR_REL.split(path.sep).join('/')+'/'+name+'.md':lib.PROJECT_BRIEF_REL.split(path.sep).join('/');
var project=appendTo(pb);
var run=null;
if(runDir){
  var rb=path.join(runDir,'brief.md');
  if(fs.existsSync(rb))run=appendTo(rb);
  else { fs.copyFileSync(pb,rb); run={created:true,sha256:lib.sha256(fs.readFileSync(rb))}; }
  lib.appendLog(runDir,{event:'brief.updated',date:date,words:lib.wordCount(text),name:name,
    project:{file:pbRel,sha256:project.sha256,created:project.created},
    run:{file:'brief.md',sha256:run.sha256,created:run.created}});
}
process.stdout.write('Brief updated '+date+' in '+pbRel+(project.created?' (created from this update)':'')+(run?' and the run\'s':'')+': '+text.split('\n')[0]+'\n');
