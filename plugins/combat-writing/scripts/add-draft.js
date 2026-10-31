// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// add-draft.js: adds a revised draft to an existing run.
//
//   node add-draft.js --run <run folder> [--file <path>] [--reader <file>]
//
// Copies the file into the run as draft-2.md, draft-3.md, ... (draft.md is never
// changed), logs draft.added with the SHA-256 and the draft's counts (words, lines,
// paragraphs, lib.draftFacts), and prints the new
// draft's file name. packet.js reads the newest draft unless told otherwise.
//
// A run with no draft.md (strategy stored a brief alone; 2026-10-14, any stage may be
// skipped) gets the file as draft.md, the snapshot, and the log line says so (first: true).
// --stage names the command that brought it, for the record's Started-at line.
//
// The reader (Part 84, 2026-10-31): --reader <file> writes who this piece is for into the run as
// reader.md, the newest standing (a reader may change with a revised draft, rare), logged
// reader.set with the draft it came with; with --reader alone no draft is added. Never the
// project's brief: the reader is one run's and travels with it.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
if(args.file===true)lib.die('--file takes a file path');
if(args.reader===true)lib.die('--reader takes a file path');
var hasFile=!!args.file, hasReader=args.reader!==undefined;
if(!hasFile&&!hasReader)lib.die('--file <path> is required (or --reader <file> alone, to set the reader of the run)');
var runDir=path.resolve(args.run);
lib.readSeats(runDir);
if(hasFile&&!fs.existsSync(args.file))lib.die('file not found: '+args.file);
if(hasReader&&!fs.existsSync(args.reader))lib.die('reader not found: '+args.reader);
var stage=(args.stage&&args.stage!==true)?String(args.stage).toLowerCase():null;
var name=null;
if(hasFile){
  var first=!fs.existsSync(path.join(runDir,'draft.md'));
  name='draft.md';
  if(!first){
    var drafts=lib.listDrafts(runDir);
    var n=drafts.length+1;
    name='draft-'+n+'.md';
    while(fs.existsSync(path.join(runDir,name)))name='draft-'+(++n)+'.md';
  }
  var buf=fs.readFileSync(args.file);
  fs.writeFileSync(path.join(runDir,name),buf);
  lib.appendLog(runDir,Object.assign({event:'draft.added',file:name,first:first,stage:stage,source:path.basename(args.file),sha256:lib.sha256(buf)},lib.draftFacts(buf.toString('utf8'))));
}
if(hasReader){
  var readerText=lib.readText(args.reader).replace(/\r\n/g,'\n').trim();
  if(!readerText)lib.die('the reader file is empty: '+args.reader);
  var had=fs.existsSync(lib.readerPath(runDir));
  fs.writeFileSync(lib.readerPath(runDir),readerText+'\n');
  lib.appendLog(runDir,{event:'reader.set',file:lib.READER_FILE,replaced:had,with_draft:name,stage:stage,source:path.basename(args.reader),sha256:lib.sha256(fs.readFileSync(lib.readerPath(runDir))),words:lib.wordCount(readerText)});
}
process.stdout.write((name?name:lib.READER_FILE)+'\n');
