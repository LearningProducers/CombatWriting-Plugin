// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// new-run.js: creates the run folder for one Combat Writing session.
//
//   node new-run.js [--draft <file>] [--brief <file> | --no-brief] [--reader <file>] [--stage strategy|sparring|battle]
//                   [--name <slug>] [--model "<model name>"] [--company "<company>"] [--root <dir>]
//
// The brief (issue 65, 2026-10-26; issue 72 the same day): --brief <file> is the run's brief and
// the project's: unless that file is the project's brief itself, <root>/combat-writing/brief.md
// is written from it (the founder's rule: the brief typed overrides the previous one), logged
// brief.kept with the sha256 when the project's brief changed, and the short form says so once.
// With no --brief, the project's brief serves when it exists; --no-brief means none for this
// run and leaves the project's alone. --keep, the word of issue 65, is refused by name: every
// brief given is kept. run.created logs the brief's source, read from the path
// (lib.briefSourceOf): project, last (another run's brief.md, the run id kept), pasted (an
// inbox file) or given; the record's Started-at line names it.
//
// The reader (Part 84, 2026-10-31): --reader <file> is who this one piece is for, from the author
// (the prospect of the day, the page the piece quotes), copied into the run as reader.md and
// logged in run.created; it travels with the run and is never written to the project's brief,
// which is the standing rules of the project. Every packet carries it after the brief.
//
// Copies the draft (and the brief, when given) into a new folder under
// <root>/combat-writing/runs/<run-id>/, writes seats.json with one fresh reader, and
// opens log.jsonl. Prints the run folder path on stdout, and nothing else. On the first run
// inside a git repository it also writes <root>/combat-writing/.gitignore with exactly two
// lines, runs/ and inbox/ (issue 36, ruled 2026-10-19), never overwriting a file already there,
// and logs gitignore.written so the short form says so once. With neither --draft nor --brief
// the project's brief, when it exists, makes a brief-only run (issue 72: strategy with a brief
// update alone stores the updated brief); with no project brief either, the call is refused:
// strategy may store a brief alone (2026-10-14: any stage may be skipped, the order is the
// person's choice), and sparring or battle then brings the draft into the same run through
// add-draft.js, which writes draft.md when there is none. --stage names the command that made
// the run; the record and the board say where the run started.
//
// The crew (ruled 2026-10-09, enforced 2026-10-12): one fresh reader, seat-1, plus one
// seat per outside model the crew add-on has a key for; the add-on's crew_register appends
// those. Never padded: there is no option to seat a second fresh reader, and a --seats
// flag is refused. packet.js refuses a second fresh reader in an older run.
//
// The run id is the UTC date and time plus the slug: 2026-10-08-1930-board-letter.
// The slug comes from --name, else from the draft's file name.
//
// Seats: every seat is named by model and company. The model name is what the host
// knows about the agent it will run (--model); when the host cannot tell, the seat
// is recorded as "model unreported". The company defaults to Anthropic, because the
// listed plugin's fresh readers are Claude agents. seats.json records that the name
// comes from the agent configuration, not from an API field. No model name is
// written in this file.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));

var hasDraft=!!args.draft&&args.draft!==true, hasBrief=!!args.brief&&args.brief!==true;
var root=path.resolve(args.root&&args.root!==true?args.root:process.cwd());
var noBrief=args['no-brief']===true;
var projectBriefThere=!noBrief&&fs.existsSync(lib.projectBriefPath(root));
if(!hasDraft&&!hasBrief&&!projectBriefThere)lib.die('--draft <file> or --brief <file> is required (a brief alone is allowed: the draft joins the run later through add-draft.js)');
if(args.draft===true)lib.die('--draft takes a file path');
if(args.brief===true)lib.die('--brief takes a file path');
if(hasDraft&&!fs.existsSync(args.draft))lib.die('draft not found: '+args.draft);
if(hasBrief&&!fs.existsSync(args.brief))lib.die('brief not found: '+args.brief);
var hasReader=args.reader!==undefined;
if(args.reader===true)lib.die('--reader takes a file path');
if(hasReader&&!fs.existsSync(args.reader))lib.die('reader not found: '+args.reader);
if(noBrief&&hasBrief)lib.die('--no-brief and --brief together: one or the other');
if(args.keep!==undefined)lib.die('--keep is gone (issue 72): every brief given with --brief is the project\'s; pass --brief alone');
var STAGES=['strategy','sparring','battle'];
var stage=null;
if(args.stage!==undefined){
  if(args.stage===true||STAGES.indexOf(String(args.stage).toLowerCase())<0)lib.die('--stage must be strategy, sparring or battle');
  stage=String(args.stage).toLowerCase();
}

if(args.seats!==undefined)lib.die('--seats is not an option: the crew is one fresh reader, seat-1, plus the outside seats the add-on registers, never padded (ruled 2026-10-09, enforced 2026-10-12)');
var model=(args.model&&args.model!==true)?String(args.model).trim():lib.MODEL_UNREPORTED;
var company=(args.company&&args.company!==true)?String(args.company).trim():lib.DEFAULT_COMPANY;

function slugOf(s){ return String(s).toLowerCase().replace(/\.[a-z0-9]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'draft'; }
var slug=slugOf(args.name&&args.name!==true?args.name:path.basename(hasDraft?args.draft:args.brief));
var now=new Date();
function two(n){ return (n<10?'0':'')+n; }
var stamp=now.getUTCFullYear()+'-'+two(now.getUTCMonth()+1)+'-'+two(now.getUTCDate())+'-'+two(now.getUTCHours())+two(now.getUTCMinutes());
var runId=stamp+'-'+slug;
var runDir=path.join(root,lib.RUNS_DIR,runId);
var n=2;
while(fs.existsSync(runDir)){runDir=path.join(root,lib.RUNS_DIR,runId+'-'+(n++));}
fs.mkdirSync(path.join(runDir,'rounds'),{recursive:true});
// The ignore file (issue 36, ruled 2026-10-19): on the first run inside a git repository,
// combat-writing/.gitignore with runs/ and inbox/, never overwriting a file already there,
// nothing outside a repository. Logged so the short form says so once.
var ignore=lib.writeGitignore(root);

var draft=null;
if(hasDraft){draft=fs.readFileSync(args.draft);fs.writeFileSync(path.join(runDir,'draft.md'),draft);}
// The brief: the file given, else the project's when it exists and --no-brief was not said.
var briefFile=hasBrief?path.resolve(args.brief):null;
if(!briefFile&&projectBriefThere)briefFile=lib.projectBriefPath(root);
var briefHash=null, briefSource=null, kept=null;
if(briefFile){
  var brief=fs.readFileSync(briefFile);
  fs.writeFileSync(path.join(runDir,'brief.md'),brief);
  briefHash=lib.sha256(brief);
  briefSource=lib.briefSourceOf(briefFile,root);
  // A brief given is the project's (issue 72): written unless it is that file, logged when it changed.
  if(briefSource.source!=='project'){
    var pb=lib.projectBriefPath(root);
    var before=fs.existsSync(pb)?lib.sha256(fs.readFileSync(pb)):null;
    fs.mkdirSync(path.dirname(pb),{recursive:true});
    fs.writeFileSync(pb,brief);
    if(before!==briefHash)kept={file:lib.PROJECT_BRIEF_REL.split(path.sep).join('/'),sha256:briefHash,replaced:before};
  }
}

// The reader rides in the run alone (Part 84): reader.md, never the project's brief.
var reader=null;
if(hasReader){
  var readerText=lib.readText(args.reader).replace(/\r\n/g,'\n').trim();
  if(!readerText)lib.die('the reader file is empty: '+args.reader);
  fs.writeFileSync(lib.readerPath(runDir),readerText+'\n');
  reader={file:lib.READER_FILE,sha256:lib.sha256(fs.readFileSync(lib.readerPath(runDir))),words:lib.wordCount(readerText)};
}

var seats=[{id:'seat-1',model:model,company:company,
  source:'agent configuration (model: inherit); the model name was supplied by the host from what it knows about the agent it runs, not read from an API field'}];
fs.writeFileSync(path.join(runDir,'seats.json'),JSON.stringify({seats:seats},null,2)+'\n');

lib.appendLog(runDir,{event:'run.created',run:path.basename(runDir),stage:stage,
  draft:draft?Object.assign({file:'draft.md',sha256:lib.sha256(draft)},lib.draftFacts(draft.toString('utf8'))):null,
  brief:briefHash?{file:'brief.md',sha256:briefHash,source:briefSource.source,from:briefSource.from}:null,
  reader:reader,
  seats:seats.map(function(s){return {id:s.id,model:s.model,company:s.company};}),
  crew_note:'one fresh reader, every seat is '+company+'\'s models until the crew add-on registers outside seats; the plugin never fakes a seat and never pads the crew'});
if(ignore.state==='written')lib.appendLog(runDir,{event:'gitignore.written',file:path.join('combat-writing',lib.GITIGNORE_FILE).split(path.sep).join('/'),lines:lib.GITIGNORE_LINES});
if(kept)lib.appendLog(runDir,{event:'brief.kept',file:kept.file,sha256:kept.sha256,replaced:kept.replaced});
process.stdout.write(runDir+'\n');
