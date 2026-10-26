// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// brief_check.js: the brief travels, and battle starts a run for the next piece (issue 65,
// 2026-10-26). The founder's words: "upload a brief, send a card through rounds and then after
// sending it, load another prospect email without reuploading the brief."
//
// What it pins, with the REAL scripts in a temporary project:
//   - new-run.js logs the brief's source as it reads it from the path (lib.briefSourceOf): a file
//     elsewhere is `given`; another run's brief.md under combat-writing/runs/ is `last` with the run
//     id; a file in combat-writing/inbox/ is `pasted`; the project's combat-writing/brief.md is
//     `project`. The Started-at line and the short form's Brief line name each.
//   - --keep copies the run's brief to combat-writing/brief.md byte for byte, logs brief.kept with
//     the sha256, and the short form prints the kept line once and never again; a later run with no
//     --brief carries the project's brief (source project) and its packet carries the text; --no-brief
//     means none (no brief.md, Brief: none); --keep without --brief and --no-brief with --brief refuse.
//   - In a git repository, after --keep, git status shows combat-writing/.gitignore and
//     combat-writing/brief.md and nothing else (the project brief rides with the project).
//   - The next piece: with a run that already holds a draft and a round, a new run made by
//     new-run.js --stage battle is its own folder, the old run gains no draft-2.md, and the new
//     run's first SN packet carries the first-round line and the brief.
//   - The skill text: battle says a pasted draft with no draft: starts a new run and the picker
//     offers New run on draft-shaped text; sparring, strategy, the rules skill and the help name
//     brief: same, keep and the project's brief; CLAUDE.md names the fifth write location.
//
// Run from the repo root:   node tests/brief_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var lib=require(path.join(scripts,'lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function skill(name){ return read(path.join(plugin,'skills',name,'SKILL.md')); }

var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-brief-'));
function node(script,args,cwd){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:cwd||proj,encoding:'utf8'}); }
function logOf(run){ return read(path.join(run,'log.jsonl')).trim().split('\n').map(function(l){return JSON.parse(l);}); }
function created(run){ return logOf(run).filter(function(e){return e.event==='run.created';})[0]; }
function short(run,cwd){ return node('render-record.js',['--run',run,'--short'],cwd); }

var draftText='Dear board,\n\nI would like a vote this week on the letter of intent.\n';
var briefText='I am the CEO. Purpose: a yes on the LOI this week. Stakes: the deal.\n';
var jeffText='Jeff,\n\nYour June post says the inventory still looked like it might be worth something.\n';
fs.writeFileSync(path.join(proj,'draft.md'),draftText);
fs.writeFileSync(path.join(proj,'brief.md'),briefText);
fs.writeFileSync(path.join(proj,'jeff.md'),jeffText);
fs.mkdirSync(path.join(proj,'combat-writing','inbox'),{recursive:true});
fs.writeFileSync(path.join(proj,'combat-writing','inbox','mav.brief.md'),briefText);

// 1. A brief given as a path elsewhere: source given, today's wording kept.
var rA=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','battle','--name','mav','--model','Test Model']);
check(rA.status===0,'run A: exit '+rA.status+' '+rA.stderr);
var runA=rA.stdout.trim();
var cA=created(runA);
check(cA.brief&&cA.brief.file==='brief.md'&&cA.brief.source==='given'&&cA.brief.from===null,'run A: run.created should log the brief with source given, got '+JSON.stringify(cA.brief));
var sA=short(runA).stdout;
check(/^Started at: battle: the run was made from a pasted draft, with no strategy stage \(a brief came with it\)\. No round yet\.$/m.test(sA),'run A: the Started-at wording for a given brief must stand, got '+sA);
check(/^Brief: brief\.md, stored\.$/m.test(sA),'run A: the short form must print the Brief line for a given brief, got '+sA);

// 2. brief: same, resolved by the host to run A's brief.md: source last with the run id.
var rB=node('new-run.js',['--draft','jeff.md','--brief',path.join(runA,'brief.md'),'--stage','battle','--name','jeff','--model','Test Model']);
check(rB.status===0,'run B: exit '+rB.status+' '+rB.stderr);
var runB=rB.stdout.trim();
var cB=created(runB);
check(cB.brief&&cB.brief.source==='last'&&cB.brief.from===path.basename(runA)&&read(path.join(runB,'brief.md'))===briefText,'run B: the brief from another run should log source last with that run id, got '+JSON.stringify(cB.brief));
var sB=short(runB).stdout;
check(new RegExp('^Started at: battle: the run was made from a pasted draft, with no strategy stage \\(the brief from run '+path.basename(runA)+' came with it\\)\\. No round yet\\.$','m').test(sB),'run B: the Started-at line should name the run the brief came from, got '+sB);
check(new RegExp('^Brief: from run '+path.basename(runA)+'\\.$','m').test(sB),'run B: the Brief line should name the run, got '+sB);
check(!fs.existsSync(path.join(runA,'draft-2.md'))&&fs.readdirSync(path.join(proj,'combat-writing','runs')).length===2,'run B: a new run must be its own folder and leave run A with no draft-2.md');

// 3. A pasted brief from the inbox with keep: source pasted; the project brief written; said once.
check(!fs.existsSync(lib.projectBriefPath(proj)),'no project brief before keep');
var rC=node('new-run.js',['--draft','draft.md','--brief',path.join('combat-writing','inbox','mav.brief.md'),'--stage','strategy','--name','kept','--keep','--model','Test Model']);
check(rC.status===0,'run C (keep): exit '+rC.status+' '+rC.stderr);
var runC=rC.stdout.trim();
var cC=created(runC);
check(cC.brief&&cC.brief.source==='pasted','run C: an inbox brief should log source pasted, got '+JSON.stringify(cC.brief));
check(fs.existsSync(lib.projectBriefPath(proj))&&read(lib.projectBriefPath(proj))===briefText,'run C: --keep must write combat-writing/brief.md byte for byte');
var kept=logOf(runC).filter(function(e){return e.event==='brief.kept';});
check(kept.length===1&&kept[0].file==='combat-writing/brief.md'&&kept[0].sha256===cC.brief.sha256,'run C: one brief.kept line with the file and the sha256, got '+JSON.stringify(kept));
var sC1=short(runC).stdout, sC2=short(runC).stdout;
check(sC1.indexOf(lib.PROJECT_BRIEF_KEPT_LINE)>=0&&sC2.indexOf(lib.PROJECT_BRIEF_KEPT_LINE)<0,'run C: the kept line must print once and never again');
check(/^Started at: strategy: the draft and the brief pasted stored first\. No round yet\.$/m.test(sC1)&&/^Brief: stored, pasted with the draft\.$/m.test(sC1),'run C: the Started-at and Brief lines for a pasted brief, got '+sC1);
check(/rides with the project in git, as the vault does; add brief\.md to combat-writing\/\.gitignore if it must not\.$/.test(lib.PROJECT_BRIEF_KEPT_LINE),'the kept line must say the file rides with the project and name the ignore file');
check(logOf(runC).some(function(e){return e.event==='brief.kept.printed';}),'run C: brief.kept.printed must be logged');

// 4. The next piece with no brief at all: the project's brief serves; its packet carries the text.
var rD=node('new-run.js',['--draft','jeff.md','--stage','battle','--name','next','--model','Test Model']);
check(rD.status===0,'run D: exit '+rD.status+' '+rD.stderr);
var runD=rD.stdout.trim();
var cD=created(runD);
check(cD.brief&&cD.brief.source==='project'&&cD.brief.from===null&&read(path.join(runD,'brief.md'))===briefText,'run D: with no --brief the project brief must serve, source project, got '+JSON.stringify(cD.brief));
var sD=short(runD).stdout;
check(/^Started at: battle: the run was made from a pasted draft, with no strategy stage \(the project's brief came with it\)\. No round yet\.$/m.test(sD)&&/^Brief: the project's \(combat-writing\/brief\.md\)\.$/m.test(sD),'run D: the Started-at and Brief lines for the project brief, got '+sD);
fs.writeFileSync(path.join(proj,'sn.md'),'is this ready to send?\n');
var pD=node('packet.js',['--run',runD,'--round','01-battle','--seat','seat-1','--sn','sn.md']);
check(pD.status===0,'run D: packet exit '+pD.status+' '+pD.stderr);
var packetD=pD.status===0?read(pD.stdout.trim()):'';
check(packetD.indexOf(lib.FIRST_ROUND_LINE)>=0&&packetD.indexOf(briefText.trim())>=0&&packetD.indexOf('is this ready to send?')>=0,'run D: the first SN packet must carry the first-round line, the project brief and the prompt');

// 5. --no-brief: none, even with the project brief there. The refusals.
var rE=node('new-run.js',['--draft','jeff.md','--no-brief','--stage','sparring','--name','cold','--model','Test Model']);
check(rE.status===0&&!fs.existsSync(path.join(rE.stdout.trim(),'brief.md'))&&created(rE.stdout.trim()).brief===null,'run E: --no-brief must store no brief, got '+rE.status+' '+rE.stderr);
check(/^Brief: none\.$/m.test(short(rE.stdout.trim()).stdout),'run E: the Brief line must read none');
var rF=node('new-run.js',['--draft','jeff.md','--keep','--stage','sparring','--model','Test Model']);
check(rF.status===2&&/--keep needs --brief/.test(rF.stderr),'--keep without --brief must refuse, got '+rF.status+' '+rF.stderr);
var rG=node('new-run.js',['--draft','jeff.md','--brief','brief.md','--no-brief','--stage','sparring','--model','Test Model']);
check(rG.status===2&&/--no-brief and --brief together/.test(rG.stderr),'--no-brief with --brief must refuse, got '+rG.status+' '+rG.stderr);
var rH=node('new-run.js',['--name','nothing','--model','Test Model']);
check(rH.status===2&&/--draft <file> or --brief <file> is required/.test(rH.stderr),'neither a draft nor a brief still refuses, project brief or not');
// The reader itself.
check(lib.briefSourceOf(path.join(proj,'brief.md'),proj).source==='given'&&lib.briefSourceOf(lib.projectBriefPath(proj),proj).source==='project'&&lib.briefSourceOf(path.join(runA,'brief.md'),proj).from===path.basename(runA)&&lib.briefSourceOf(path.join(proj,'combat-writing','inbox','x.brief.md'),proj).source==='pasted'&&lib.briefSourceOf(path.join(runA,'rounds','x.md'),proj).source==='given','briefSourceOf: the four sources by path');
check(lib.briefLine(null)==='Brief: none.'&&lib.briefWords({brief:null})===null&&lib.briefWords({brief:{source:'given'}},'a brief')==='a brief','briefLine and briefWords on no brief and a given one');

// 6. In a git repository: after keep, git status shows the ignore file and the project brief, nothing else.
var git=cp.spawnSync('git',['--version'],{encoding:'utf8'}).status===0;
if(git){
  var repo=fs.mkdtempSync(path.join(os.tmpdir(),'cw-brief-repo-'));
  cp.spawnSync('git',['init','-q'],{cwd:repo});
  fs.writeFileSync(path.join(repo,'draft.md'),draftText); fs.writeFileSync(path.join(repo,'brief.md'),briefText);
  cp.spawnSync('git',['add','-A'],{cwd:repo}); cp.spawnSync('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-q','-m','fixture'],{cwd:repo});
  var rR=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','strategy','--name','kept','--keep','--model','Test Model'],repo);
  check(rR.status===0,'repo keep: exit '+rR.status+' '+rR.stderr);
  var st=cp.spawnSync('git',['status','--porcelain','--untracked-files=all'],{cwd:repo,encoding:'utf8'}).stdout.trim().split('\n').filter(Boolean).sort();
  check(JSON.stringify(st)==='["?? combat-writing/.gitignore","?? combat-writing/brief.md"]','repo keep: git status must show the ignore file and the project brief and nothing else, got '+JSON.stringify(st));
  fs.rmSync(repo,{recursive:true,force:true});
}else console.log('note: git not on PATH; the git status check was skipped here (CI runs it)');

// 7. The text.
var battle=skill('battle'), sparring=skill('sparring'), strategy=skill('strategy'), rules=skill('combat-writing'), help=skill('help');
check(/A pasted draft with no `draft:` starts a new run \(step 4\), as sparring does/.test(battle)&&/unless the newest run holds a brief alone and no round, when it joins that run as `draft\.md`/.test(battle),'battle: a pasted draft with no draft: must start a new run, the brief-only exception kept');
check(/the draft is everything before the first keyword line; a keyword's text runs to the next keyword line or the end; a draft that follows a keyword line carries `draft:`/.test(battle),'battle: the paste order must be stated');
check(/a pasted draft to `<slug>\.md`/.test(battle)&&!/<slug>\.draft\.md/.test(battle),'battle: the draft is cut to <slug>.md like sparring');
check(/the fourth option is \*\*New run\*\* in place of Final/.test(battle)&&/draft-shaped text is New run when the newest run holds a round and the text is not close to the last draft, and Revised draft when it is close to the last draft/.test(battle)&&/New run and Revised draft fire the plain round at once/.test(battle),'battle: the picker must offer New run on draft-shaped text with the best-guess rule and fire the plain round');
check(/new-run\.js --draft <draft file> \[--brief <brief file>\] --stage battle --name "<slug>" \[--no-brief\] \[--keep\]/.test(battle)&&/when the paste carries no `draft:` and the newest run already holds a draft \(the next piece, as sparring does; issue 65\)/.test(battle),'battle: step 4 must start the run for the next piece with the flags');
check(/argument-hint: .*\[<pasted draft>\].*\[brief: \.\.\.\|same\]/.test(battle),'battle: the argument-hint must show the pasted draft and brief: same');
[['sparring',sparring],['strategy',strategy]].forEach(function(p){
  check(/`brief: same` or `brief: last` means the newest run's `brief\.md`, which you pass by path/.test(p[1])&&/`keep` on the brief line is cut off the brief and becomes `--keep`/.test(p[1])&&/combat-writing\/brief\.md/.test(p[1]),p[0]+': must name brief: same, keep and the project brief');
  check(/\[--no-brief\] \[--keep\]|\[--keep\] \[--no-brief\]/.test(p[1]),p[0]+': the new-run line must carry --no-brief and --keep');
});
check(/When the project holds `combat-writing\/brief\.md` \(a brief kept earlier\), that brief serves: create the run with the draft alone, no `--no-brief`/.test(strategy)&&/create the run with the draft alone and `--no-brief`/.test(strategy),'strategy: a draft with no brief must use the project brief when it exists and pass --no-brief only when the person said there is none');
check(/battle when the paste carries no `draft:` \(issue 65/.test(rules)&&/the project's `combat-writing\/brief\.md` when it exists and none came/.test(rules)&&/the project's brief `combat-writing\/brief\.md` \(written by `new-run\.js --keep` alone/.test(rules),'the rules skill: the one rule for battle and the project brief as a write location');
check(/`brief: same` reuses the last run's brief; `keep` after a brief makes it the project's/.test(help)&&/battle starts a new run for it, with the project's brief or `brief: same`/.test(help)&&/^- `combat-writing\/brief\.md` in your project: the project's brief/m.test(help)&&/`brief: same` \(or `brief: last`\) is the last run's brief, and `keep` on a brief line makes it the project's/.test(help),'help: strategy, battle, the files list and the shortcuts must name the brief routes');
var claude=read(path.join(root,'CLAUDE.md'));
check(/The fifth and last \(issue 65, 2026-10-26\) is `combat-writing\/brief\.md`/.test(claude)&&/battle when the paste carries no `draft:` \(issue 65, 2026-10-26/.test(claude),'CLAUDE.md: the fifth write location and battle\'s new run');
fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'brief_check: '+failures.length+' failure(s), ':'brief_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
