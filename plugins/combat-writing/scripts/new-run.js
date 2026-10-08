// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// new-run.js: creates the run folder for one Combat Writing session.
//
//   node new-run.js --draft <file> [--brief <file>] [--name <slug>] [--seats <n>]
//                   [--model "<model name>"] [--company "<company>"] [--root <dir>]
//
// Copies the draft (and the brief, when given) into a new folder under
// <root>/combat-writing/runs/<run-id>/, writes seats.json for <n> seats (default 3),
// and opens log.jsonl with the credit line. Prints the run folder path on stdout.
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

if(!args.draft||args.draft===true)lib.die('--draft <file> is required');
if(!fs.existsSync(args.draft))lib.die('draft not found: '+args.draft);
if(args.brief&&!fs.existsSync(args.brief))lib.die('brief not found: '+args.brief);

var root=path.resolve(args.root&&args.root!==true?args.root:process.cwd());
var seatsN=parseInt(args.seats||'3',10);
if(!(seatsN>=1&&seatsN<=12))lib.die('--seats must be 1 to 12');
var model=(args.model&&args.model!==true)?String(args.model).trim():lib.MODEL_UNREPORTED;
var company=(args.company&&args.company!==true)?String(args.company).trim():lib.DEFAULT_COMPANY;

function slugOf(s){ return String(s).toLowerCase().replace(/\.[a-z0-9]+$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'draft'; }
var slug=slugOf(args.name&&args.name!==true?args.name:path.basename(args.draft));
var now=new Date();
function two(n){ return (n<10?'0':'')+n; }
var stamp=now.getUTCFullYear()+'-'+two(now.getUTCMonth()+1)+'-'+two(now.getUTCDate())+'-'+two(now.getUTCHours())+two(now.getUTCMinutes());
var runId=stamp+'-'+slug;
var runDir=path.join(root,lib.RUNS_DIR,runId);
var n=2;
while(fs.existsSync(runDir)){runDir=path.join(root,lib.RUNS_DIR,runId+'-'+(n++));}
fs.mkdirSync(path.join(runDir,'rounds'),{recursive:true});

var draft=fs.readFileSync(args.draft);
fs.writeFileSync(path.join(runDir,'draft.md'),draft);
var briefHash=null;
if(args.brief){var brief=fs.readFileSync(args.brief);fs.writeFileSync(path.join(runDir,'brief.md'),brief);briefHash=lib.sha256(brief);}

var seats=[];
for(var i=1;i<=seatsN;i++){
  seats.push({id:'seat-'+i,model:model,company:company,
    source:'agent configuration (model: inherit); the model name was supplied by the host from what it knows about the agent it runs, not read from an API field'});
}
fs.writeFileSync(path.join(runDir,'seats.json'),JSON.stringify({credit:lib.CREDIT,seats:seats},null,2)+'\n');

lib.appendLog(runDir,{credit:lib.CREDIT,event:'run.created',run:path.basename(runDir),
  draft:{file:'draft.md',sha256:lib.sha256(draft),words:lib.wordCount(draft.toString('utf8'))},
  brief:briefHash?{file:'brief.md',sha256:briefHash}:null,
  seats:seats.map(function(s){return {id:s.id,model:s.model,company:s.company};}),
  crew_note:'every seat is '+company+'\'s models; the plugin never fakes a seat'});
process.stdout.write(runDir+'\n');
