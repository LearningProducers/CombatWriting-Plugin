// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// add-draft.js: adds a revised draft to an existing run.
//
//   node add-draft.js --run <run folder> --file <path>
//
// Copies the file into the run as draft-2.md, draft-3.md, ... (draft.md is never
// changed), logs draft.added with the SHA-256 and word count, and prints the new
// draft's file name. packet.js reads the newest draft unless told otherwise.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
['run','file'].forEach(function(k){ if(!args[k]||args[k]===true)lib.die('--'+k+' is required'); });
var runDir=path.resolve(args.run);
if(!fs.existsSync(path.join(runDir,'draft.md')))lib.die('no draft.md in '+runDir);
if(!fs.existsSync(args.file))lib.die('file not found: '+args.file);
var drafts=lib.listDrafts(runDir);
var n=drafts.length+1;
var name='draft-'+n+'.md';
while(fs.existsSync(path.join(runDir,name)))name='draft-'+(++n)+'.md';
var buf=fs.readFileSync(args.file);
fs.writeFileSync(path.join(runDir,name),buf);
lib.appendLog(runDir,{event:'draft.added',file:name,source:path.basename(args.file),sha256:lib.sha256(buf),words:lib.wordCount(buf.toString('utf8'))});
process.stdout.write(name+'\n');
