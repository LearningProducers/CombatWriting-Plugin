// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// new-run.js: creates the run folder for one Combat Writing session.
//
//   node new-run.js [--draft <file>] [--brief <file>] [--stage strategy|sparring|battle]
//                   [--name <slug>] [--model "<model name>"] [--company "<company>"] [--root <dir>]
//
// Copies the draft (and the brief, when given) into a new folder under
// <root>/combat-writing/runs/<run-id>/, writes seats.json with one fresh reader, and
// opens log.jsonl. Prints the run folder path on stdout. At least one of --draft and --brief
// is required: strategy may store a brief alone (2026-10-14: any stage may be skipped, the
// order is the person's choice), and sparring or battle then brings the draft into the same
// run through add-draft.js, which writes draft.md when there is none. --stage names the
// command that made the run; the record and the board say where the run started.
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
if(!hasDraft&&!hasBrief)lib.die('--draft <file> or --brief <file> is required (a brief alone is allowed: the draft joins the run later through add-draft.js)');
if(args.draft===true)lib.die('--draft takes a file path');
if(args.brief===true)lib.die('--brief takes a file path');
if(hasDraft&&!fs.existsSync(args.draft))lib.die('draft not found: '+args.draft);
if(hasBrief&&!fs.existsSync(args.brief))lib.die('brief not found: '+args.brief);
var STAGES=['strategy','sparring','battle'];
var stage=null;
if(args.stage!==undefined){
  if(args.stage===true||STAGES.indexOf(String(args.stage).toLowerCase())<0)lib.die('--stage must be strategy, sparring or battle');
  stage=String(args.stage).toLowerCase();
}

var root=path.resolve(args.root&&args.root!==true?args.root:process.cwd());
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

var draft=null;
if(hasDraft){draft=fs.readFileSync(args.draft);fs.writeFileSync(path.join(runDir,'draft.md'),draft);}
var briefHash=null;
if(hasBrief){var brief=fs.readFileSync(args.brief);fs.writeFileSync(path.join(runDir,'brief.md'),brief);briefHash=lib.sha256(brief);}

var seats=[{id:'seat-1',model:model,company:company,
  source:'agent configuration (model: inherit); the model name was supplied by the host from what it knows about the agent it runs, not read from an API field'}];
fs.writeFileSync(path.join(runDir,'seats.json'),JSON.stringify({seats:seats},null,2)+'\n');

lib.appendLog(runDir,{event:'run.created',run:path.basename(runDir),stage:stage,
  draft:draft?{file:'draft.md',sha256:lib.sha256(draft),words:lib.wordCount(draft.toString('utf8'))}:null,
  brief:briefHash?{file:'brief.md',sha256:briefHash}:null,
  seats:seats.map(function(s){return {id:s.id,model:s.model,company:s.company};}),
  crew_note:'one fresh reader, every seat is '+company+'\'s models until the crew add-on registers outside seats; the plugin never fakes a seat and never pads the crew'});
process.stdout.write(runDir+'\n');
