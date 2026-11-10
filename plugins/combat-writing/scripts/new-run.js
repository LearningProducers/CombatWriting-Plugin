// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// new-run.js: creates the run folder for one Combat Writing session.
//
//   node new-run.js [--draft <file>] [--brief <file> | --no-brief] [--brief-name <name>] [--reader <file>] [--stage strategy|sparring|battle]
//                   [--name <slug>] [--model "<model name>"] [--company "<company>"] [--root <dir>]
//
// The brief (issue 65; issue 72): --brief <file> is the run's brief and
// the project's: unless that file is the project's brief itself, <root>/combat-writing/brief.md
// is written from it (the brief typed overrides the previous one), logged
// brief.kept with the sha256 when the project's brief changed, and the short form says so once.
// With no --brief, the project's brief serves when it exists; --no-brief means none for this
// run and leaves the project's alone. --keep, the word of issue 65, is refused by name: every
// brief given is kept. run.created logs the brief's source, read from the path
// (lib.briefSourceOf): project, last (another run's brief.md, the run id kept), pasted (an
// inbox file) or given; the record's Started-at line names it.
//
// Briefs by name (Part 86): --brief <file> --brief-name <name> saves the brief as
// <root>/combat-writing/briefs/<name>.md (`brief <name>: <text>`) and makes it the run's, the
// unnamed default untouched; --brief-name <name> alone picks the saved brief for the run
// (`brief: <name>`), refused with the saved names listed when there is none; a --brief path
// that is a saved brief's own file is read as that name. run.created carries brief.name and
// brief.kept the name and the file written. --brief with no name keeps today's meaning: the
// unnamed default, combat-writing/brief.md, replaced.
//
// The reader (Part 84): --reader <file> is who this one piece is for, from the author
// (the prospect of the day, the page the piece quotes), copied into the run as reader.md and
// logged in run.created; it travels with the run and is never written to the project's brief,
// which is the standing rules of the project. Every packet carries it after the brief.
//
// Copies the draft (and the brief, when given) into a new folder under
// <root>/combat-writing/runs/<run-id>/, writes seats.json with two fresh readers (Part 87), and
// opens log.jsonl. Prints the run folder path on stdout, and nothing else. On the first run
// inside a git repository it also writes <root>/combat-writing/.gitignore with exactly two
// lines, runs/ and inbox/ (issue 36), never overwriting a file already there,
// and logs gitignore.written so the short form says so once. With neither --draft nor --brief
// the project's brief, when it exists, makes a brief-only run (issue 72: strategy with a brief
// update alone stores the updated brief); with no project brief either, the call is refused:
// strategy may store a brief alone (any stage may be skipped, the order is the
// person's choice), and sparring or battle then brings the draft into the same run through
// add-draft.js, which writes draft.md when there is none. --stage names the command that made
// the run; the record and the board say where the run started.
//
// The crew (Part 87; seat-1's default since issue 189): two fresh readers by default, seat-1 and
// seat-2. Seat-1 starts on the session's own model: the host passes no model at start and names
// the session's model with --session-model, which is the name the seat record carries; --model
// for seat-1 is a pick alone. Seat-2 starts on the second model the host's own agent tool lists
// (--model-2, the name the host passes; the list is the host's, so the seat moves with it and no
// model name is written here), plus one seat per
// outside model the crew add-on has a key for; the add-on's crew_register appends those and,
// when it seats at least one, drops the fresh seat-2 that no round has read, so the second chair
// is the outside seats' (Qwen as seat-2 and gpt-oss as seat-3 on a Groq key). --readers 1 seats
// one fresh reader, for a host whose agent tool offers one model; run.created says so. Never
// padded beyond that: a --seats flag is refused, and packet.js refuses a fresh reader past the
// second. A person's pick for a reader (seats.js --set) is read by the host before this runs and
// arrives here as the model name (--model for seat-1, --model-2 for seat-2). Each seat record
// carries start: session (no model passed at start) or named (the host passes the model), and
// run.created carries session_model, so every result can name a reader that is not on the
// session's own model (lib.modelsLine).
//
// The run id is the UTC date and time plus the slug: 2026-10-08-1930-board-letter.
// The slug comes from --name, else from the draft's file name.
//
// Seats: every seat is named by model and company. The model name is what the host
// knows about the agent it will run (--session-model, --model, --model-2); when the host cannot tell, the seat
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
if(args.draft===true)lib.die('--draft takes a file path');
if(args.brief===true)lib.die('--brief takes a file path');
if(hasDraft&&!fs.existsSync(args.draft))lib.die('draft not found: '+args.draft);
if(hasBrief&&!fs.existsSync(args.brief))lib.die('brief not found: '+args.brief);
var hasReader=args.reader!==undefined;
if(args.reader===true)lib.die('--reader takes a file path');
if(hasReader&&!fs.existsSync(args.reader))lib.die('reader not found: '+args.reader);
if(noBrief&&hasBrief)lib.die('--no-brief and --brief together: one or the other');
var briefName=null;
if(args['brief-name']!==undefined){
  if(args['brief-name']===true)lib.die('--brief-name takes a name: one word, lower case letters, digits, dashes or underscores');
  briefName=String(args['brief-name']).trim().toLowerCase();
  if(!lib.isBriefName(briefName))lib.die('not a brief name: '+args['brief-name']+' (one word, lower case letters, digits, dashes or underscores, 40 characters at most, never update)');
  if(noBrief)lib.die('--no-brief and --brief-name together: one or the other');
  if(!hasBrief&&!fs.existsSync(lib.briefNamePath(root,briefName))){
    var saved=lib.listBriefs(root).map(function(b){return b.name;});
    lib.die('no saved brief named '+briefName+(saved.length?' (saved: '+saved.join(', ')+')':' (none saved yet)')+'; save one with brief '+briefName+': <text>');
  }
}
if(args.keep!==undefined)lib.die('--keep is gone (issue 72): every brief given with --brief is the project\'s; pass --brief alone');
var STAGES=['strategy','sparring','battle'];
var stage=null;
if(args.stage!==undefined){
  if(args.stage===true||STAGES.indexOf(String(args.stage).toLowerCase())<0)lib.die('--stage must be strategy, sparring or battle');
  stage=String(args.stage).toLowerCase();
}

// The guard reads briefName, so it stands after the block that sets it (the watchman caught it read before its declaration).
if(!hasDraft&&!hasBrief&&!projectBriefThere&&!briefName)lib.die('--draft <file> or --brief <file> is required (a brief alone is allowed: the draft joins the run later through add-draft.js)');

if(args.seats!==undefined)lib.die('--seats is not an option: the crew is two fresh readers, seat-1 and seat-2 (--readers 1 for one), plus the outside seats the add-on registers, which take the second chair; never padded (Part 87)');
var readers=lib.MAX_FRESH_READERS;
if(args.readers!==undefined){
  readers=parseInt(String(args.readers),10);
  if(args.readers===true||!(readers===1||readers===2))lib.die('--readers takes 1 or 2: two fresh readers by default, one when the host\'s agent tool offers one model');
}
function given(v){ return v&&v!==true&&String(v).trim()?String(v).trim():null; }
var sessionModel=given(args['session-model']);
var pick1=given(args.model), pick2=given(args['model-2']);
// Seat-1 with no --model is on the session's own model; a model named for it is a pick, unless it is the session's own.
function sameModel(a,b){ return !!a&&!!b&&a.toLowerCase()===b.toLowerCase(); }
if(sameModel(pick1,sessionModel))pick1=null;
var model=pick1||sessionModel||lib.MODEL_UNREPORTED;
// Seat-2 with no model named starts with none passed, so it too is on the session's own model.
var model2=pick2||sessionModel||lib.MODEL_UNREPORTED;
if(args['model-2']!==undefined&&readers===1)lib.die('--model-2 names the second fresh reader, and --readers 1 seats one');
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
// The ignore file (issue 36): on the first run inside a git repository,
// combat-writing/.gitignore with runs/ and inbox/, never overwriting a file already there,
// nothing outside a repository. Logged so the short form says so once.
var ignore=lib.writeGitignore(root);

var draft=null;
if(hasDraft){draft=fs.readFileSync(args.draft);fs.writeFileSync(path.join(runDir,'draft.md'),draft);}
// The brief: the file given, else the project's when it exists and --no-brief was not said.
var briefFile=hasBrief?path.resolve(args.brief):null;
if(!briefFile&&briefName)briefFile=lib.briefNamePath(root,briefName);
if(!briefFile&&projectBriefThere)briefFile=lib.projectBriefPath(root);
var briefHash=null, briefSource=null, kept=null;
if(briefFile){
  var brief=fs.readFileSync(briefFile);
  fs.writeFileSync(path.join(runDir,'brief.md'),brief);
  briefHash=lib.sha256(brief);
  briefSource=lib.briefSourceOf(briefFile,root);
  if(briefSource.source==='named')briefName=briefSource.from;
  // A brief given with a name is saved by that name (Part 86), the unnamed default untouched;
  // a brief given with none is the project's (issue 72): written unless it is that file, logged when it changed.
  if(briefName&&briefSource.source!=='named'){
    var nb=lib.briefNamePath(root,briefName);
    var beforeN=fs.existsSync(nb)?lib.sha256(fs.readFileSync(nb)):null;
    fs.mkdirSync(path.dirname(nb),{recursive:true});
    fs.writeFileSync(nb,brief);
    if(beforeN!==briefHash)kept={file:lib.BRIEFS_DIR_REL.split(path.sep).join('/')+'/'+briefName+'.md',name:briefName,sha256:briefHash,replaced:beforeN};
  }else if(!briefName&&briefSource.source!=='project'){
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

var SOURCE_NAMED='agent configuration (model: inherit, the model named at start winning over it); the model name was supplied by the host from the list its agent tool offers or the person\'s pick, not read from an API field';
var SOURCE_SESSION='agent configuration (model: inherit, no model passed at start, so the seat runs on the session\'s own model); the model name was supplied by the host as the model its session runs on, not read from an API field';
var seats=[{id:'seat-1',model:model,company:company,start:pick1?'named':'session',source:pick1?SOURCE_NAMED:SOURCE_SESSION}];
if(readers===2)seats.push({id:'seat-2',model:model2,company:company,start:pick2?'named':'session',source:pick2?SOURCE_NAMED:SOURCE_SESSION});
fs.writeFileSync(path.join(runDir,'seats.json'),JSON.stringify({seats:seats},null,2)+'\n');

lib.appendLog(runDir,{event:'run.created',run:path.basename(runDir),stage:stage,
  draft:draft?Object.assign({file:'draft.md',sha256:lib.sha256(draft)},lib.draftFacts(draft.toString('utf8'))):null,
  brief:briefHash?{file:'brief.md',sha256:briefHash,source:briefSource.source,from:briefSource.source==='named'?null:briefSource.from,name:briefName}:null,
  reader:reader,
  seats:seats.map(function(s){return {id:s.id,model:s.model,company:s.company,start:s.start};}),
  session_model:sessionModel,
  readers:readers,
  crew_note:(readers===2?'two fresh readers, seat-1 on the session\'s own model unless a pick names another and seat-2 on the second model the host\'s agent tool lists':'one fresh reader, seat-1: the host\'s agent tool offers one model')+', every seat is '+company+'\'s models until the crew add-on registers outside seats, which take the second chair; the plugin never fakes a seat and never pads the crew'});
if(ignore.state==='written')lib.appendLog(runDir,{event:'gitignore.written',file:path.join('combat-writing',lib.GITIGNORE_FILE).split(path.sep).join('/'),lines:lib.GITIGNORE_LINES});
if(kept)lib.appendLog(runDir,{event:'brief.kept',file:kept.file,name:kept.name||null,sha256:kept.sha256,replaced:kept.replaced});
process.stdout.write(runDir+'\n');
