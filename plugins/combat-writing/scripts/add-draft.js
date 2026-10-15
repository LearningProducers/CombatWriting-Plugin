// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// add-draft.js: adds a revised draft to an existing run.
//
//   node add-draft.js --run <run folder> --file <path>
//
// Copies the file into the run as draft-2.md, draft-3.md, ... (draft.md is never
// changed), logs draft.added with the SHA-256 and word count, and prints the new
// draft's file name. packet.js reads the newest draft unless told otherwise.
//
// A run with no draft.md (strategy stored a brief alone; 2026-10-14, any stage may be
// skipped) gets the file as draft.md, the snapshot, and the log line says so (first: true).
// --stage names the command that brought it, for the record's Started-at line.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
['run','file'].forEach(function(k){ if(!args[k]||args[k]===true)lib.die('--'+k+' is required'); });
var runDir=path.resolve(args.run);
lib.readSeats(runDir);
if(!fs.existsSync(args.file))lib.die('file not found: '+args.file);
var first=!fs.existsSync(path.join(runDir,'draft.md'));
var name='draft.md';
if(!first){
  var drafts=lib.listDrafts(runDir);
  var n=drafts.length+1;
  name='draft-'+n+'.md';
  while(fs.existsSync(path.join(runDir,name)))name='draft-'+(++n)+'.md';
}
var stage=(args.stage&&args.stage!==true)?String(args.stage).toLowerCase():null;
var buf=fs.readFileSync(args.file);
fs.writeFileSync(path.join(runDir,name),buf);
lib.appendLog(runDir,{event:'draft.added',file:name,first:first,stage:stage,source:path.basename(args.file),sha256:lib.sha256(buf),words:lib.wordCount(buf.toString('utf8'))});
process.stdout.write(name+'\n');
