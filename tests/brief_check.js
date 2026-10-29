// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// brief_check.js: the brief travels (issue 65, 2026-10-26), the brief typed is the project's and
// grows by update (issue 72, the same day), and battle starts a run for the next piece. The
// founder's words: "upload a brief, send a card through rounds and then after sending it, load
// another prospect email without reuploading the brief"; "anytime i type in brief: it overrides
// the previous brief. And, brief update: followed by a line just adds to the brief."
//
// What it pins, with the REAL scripts in a temporary project, the founder's own paste of
// 2026-10-26 as the fixture:
//   - new-run.js logs the brief's source as it reads it from the path (lib.briefSourceOf): a file
//     elsewhere is `given`; another run's brief.md under combat-writing/runs/ is `last` with the run
//     id; a file in combat-writing/inbox/ is `pasted`; the project's combat-writing/brief.md is
//     `project`. The Started-at line and the short form's Brief line name each.
//   - Every brief given with --brief is the project's: combat-writing/brief.md written byte for byte,
//     brief.kept logged with the sha256 and the sha it replaced, the kept line printed once and never
//     again; a brief equal to the project's logs nothing; the project's own path writes nothing; a
//     later run with no --brief carries the project's brief (source project) and its packet carries
//     the text; --no-brief means none for that run and leaves the project's alone; --keep refuses by
//     name; with neither --draft nor --brief and a project brief there, a brief-only run from it.
//   - brief.js --update appends one dated paragraph to the project's brief and to the run's when
//     --run is given, after a blank line, logs brief.updated, prints one line; a run with rounds then
//     builds its next packet with the update inside the Context brief; with no project brief the
//     update becomes the brief; a second update stays below the first; the refusals.
//   - The short form prints the Brief line on a run WITH rounds, between the scoreboard and the Board
//     line, naming the source and the newest dated update, and on a run with none.
//   - In a git repository, after a brief is given, git status shows combat-writing/.gitignore and
//     combat-writing/brief.md and nothing else (the project brief rides with the project).
//   - The next piece: with a run that already holds a draft and a round, a new run made by
//     new-run.js --stage battle is its own folder, the old run gains no draft-2.md, and the new
//     run's first SN packet carries the first-round line and the brief.
//   - The skill text: battle says a pasted draft with no draft: starts a new run and the picker
//     offers New run on draft-shaped text; battle, sparring, strategy, the rules skill, the help,
//     the plugin README and CLAUDE.md say the brief typed is the project's and name `brief update:`;
//     none of them offers `keep`, `brief: same` or `brief: last` any more.
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
function sha(s){ return require('crypto').createHash('sha256').update(s).digest('hex'); }

// The founder's paste of 2026-10-26, the prospect round, as the fixture (the names invented).
var draftText='Hi,\n\nYour June post on the million-dollar warehouse says that on paper the inventory still looked like it might be worth something. Combat Writing sends a draft past more than one AI model in turn and lists the misses, the reviewer\'s objections first. Run the next post through it before it goes up:\n\nhttps://combatwriting.learningproducers.com\n';
var briefText='I am Israel Hernandez, founder of Learning Producers Inc., sending cold emails to prospects about Combat Writing.\n\nRules. A greeting, then at most five sentences, then one ask. The ask may end in a colon with the link alone on the next line; that link is inside the ask.\n\nCurrent prospect is Examplecorp, with this article as the main reference: https://blog.example.com/the-post/\n';
var updateText='new prospect is Examplehub, main reference https://example.com/products/draft-studio/\n';
var oldBrief='I am the CEO. Purpose: a yes on the LOI this week. Stakes: the deal.\n';
var shortText='Dana,\n\nYour June post says the inventory still looked like it might be worth something.\n';
fs.writeFileSync(path.join(proj,'old-brief.md'),oldBrief);
fs.writeFileSync(path.join(proj,'draft.md'),draftText);
fs.writeFileSync(path.join(proj,'short.md'),shortText);
fs.mkdirSync(path.join(proj,'combat-writing','inbox'),{recursive:true});
fs.writeFileSync(path.join(proj,'combat-writing','inbox','hi-your-june-post.brief.md'),briefText);
fs.writeFileSync(path.join(proj,'combat-writing','inbox','examplehub.brief-update.md'),updateText);
fs.writeFileSync(path.join(proj,'sn.md'),'is this email ready to send?\n');

// 1. A brief given as a path elsewhere: source given, today's wording kept; it is the project's from now on.
check(!fs.existsSync(lib.projectBriefPath(proj)),'no project brief before the first run');
var rA=node('new-run.js',['--draft','short.md','--brief','old-brief.md','--stage','battle','--name','first','--model','Test Model']);
check(rA.status===0,'run A: exit '+rA.status+' '+rA.stderr);
var runA=rA.stdout.trim();
var cA=created(runA);
check(cA.brief&&cA.brief.file==='brief.md'&&cA.brief.source==='given'&&cA.brief.from===null,'run A: run.created should log the brief with source given, got '+JSON.stringify(cA.brief));
check(fs.existsSync(lib.projectBriefPath(proj))&&read(lib.projectBriefPath(proj))===oldBrief,'run A: a brief given by path must become the project\'s, byte for byte');
var keptA=logOf(runA).filter(function(e){return e.event==='brief.kept';});
check(keptA.length===1&&keptA[0].file==='combat-writing/brief.md'&&keptA[0].sha256===sha(oldBrief)&&keptA[0].replaced===null,'run A: one brief.kept line with the file, the sha256 and replaced null, got '+JSON.stringify(keptA));
var sA1=short(runA).stdout, sA2=short(runA).stdout;
check(/^Started at: battle: the run was made from a pasted draft, with no strategy stage \(a brief came with it\)\. No round yet\.$/m.test(sA1),'run A: the Started-at wording for a given brief must stand, got '+sA1);
check(/^Brief: brief\.md, stored\.$/m.test(sA1),'run A: the short form must print the Brief line for a given brief, got '+sA1);
check(sA1.indexOf(lib.PROJECT_BRIEF_KEPT_LINE)>=0&&sA2.indexOf(lib.PROJECT_BRIEF_KEPT_LINE)<0,'run A: the kept line must print once and never again');
check(/^This brief is now the project's: combat-writing\/brief\.md serves every new run in this project that brings none, until the next brief: replaces it or brief update: adds to it/.test(lib.PROJECT_BRIEF_KEPT_LINE)&&/rides with the project in git, as the vault does; add brief\.md to combat-writing\/\.gitignore if it must not\.$/.test(lib.PROJECT_BRIEF_KEPT_LINE),'the kept line must say the brief is the project\'s until replaced or added to, and name the ignore file');
check(logOf(runA).some(function(e){return e.event==='brief.kept.printed';}),'run A: brief.kept.printed must be logged');

// 2. The founder's paste: a pasted brief from the inbox replaces the project's (source pasted; brief.kept names the sha it replaced).
var rB=node('new-run.js',['--draft','draft.md','--brief',path.join('combat-writing','inbox','hi-your-june-post.brief.md'),'--stage','battle','--name','hi-your-june-post','--model','Test Model']);
check(rB.status===0,'run B: exit '+rB.status+' '+rB.stderr);
var runB=rB.stdout.trim();
var cB=created(runB);
check(cB.brief&&cB.brief.source==='pasted'&&read(path.join(runB,'brief.md'))===briefText,'run B: an inbox brief should log source pasted and be the run\'s, got '+JSON.stringify(cB.brief));
check(read(lib.projectBriefPath(proj))===briefText,'run B: the pasted brief must override the project\'s, byte for byte');
var keptB=logOf(runB).filter(function(e){return e.event==='brief.kept';});
check(keptB.length===1&&keptB[0].sha256===sha(briefText)&&keptB[0].replaced===sha(oldBrief),'run B: brief.kept must carry the new sha and the sha it replaced, got '+JSON.stringify(keptB));
var sB=short(runB).stdout;
check(/^Started at: battle: the run was made from a pasted draft, with no strategy stage \(the brief pasted came with it\)\. No round yet\.$/m.test(sB)&&/^Brief: stored, pasted with the draft\.$/m.test(sB),'run B: the Started-at and Brief lines for a pasted brief, got '+sB);
check(!fs.existsSync(path.join(runA,'draft-2.md'))&&fs.readdirSync(path.join(proj,'combat-writing','runs')).length===2,'run B: a new run must be its own folder and leave run A with no draft-2.md');
// A round on run B, so the Brief line's place on a round's short form is measured below.
var pB=node('packet.js',['--run',runB,'--round','01-battle','--seat','seat-1','--sn','sn.md']);
check(pB.status===0,'run B: packet exit '+pB.status+' '+pB.stderr);
var packetB=pB.status===0?read(pB.stdout.trim()):'';
check(packetB.indexOf(lib.FIRST_ROUND_LINE)>=0&&packetB.indexOf(briefText.trim())>=0&&packetB.indexOf('is this email ready to send?')>=0,'run B: the first SN packet must carry the first-round line, the brief and the prompt');
fs.writeFileSync(path.join(runB,'rounds','01-battle','seat-1.answer.md'),'Not ready: the ask holds, the middle sentence names a mechanism.\n');
node('check-answer.js',[path.join(runB,'rounds','01-battle','seat-1.answer.md'),'--run',runB]);
var sB2=short(runB).stdout.split('\n');
var briefAt=sB2.findIndex(function(l){return /^Brief: /.test(l);}), boardAt=sB2.findIndex(function(l){return /^Board: /.test(l);}), tableAt=sB2.findIndex(function(l){return l.indexOf('|')===0;});
check(briefAt>0&&boardAt>briefAt&&tableAt>0&&tableAt<briefAt&&sB2[briefAt]==='Brief: stored, pasted with the draft.','run B with a round: the short form must print the Brief line after the scoreboard and before the Board line, got\n'+sB2.join('\n'));

// 3. brief update: appended to the project's brief and to run B's, dated; the next packet carries it; the Brief line names it.
var rU=node('brief.js',['--update',path.join('combat-writing','inbox','examplehub.brief-update.md'),'--run',runB,'--at','2026-10-27T09:00:00Z']);
check(rU.status===0&&rU.stdout==='Brief updated 2026-10-27 in combat-writing/brief.md and the run\'s: new prospect is Examplehub, main reference https://example.com/products/draft-studio/\n','brief update: exit '+rU.status+' '+rU.stderr+' stdout '+JSON.stringify(rU.stdout));
var expected=briefText+'\nUpdate 2026-10-27: new prospect is Examplehub, main reference https://example.com/products/draft-studio/\n';
check(read(lib.projectBriefPath(proj))===expected,'brief update: the project brief must be the brief plus a blank line and the dated paragraph, got '+JSON.stringify(read(lib.projectBriefPath(proj))));
check(read(path.join(runB,'brief.md'))===expected,'brief update: the run\'s brief.md must carry the same paragraph');
var upd=logOf(runB).filter(function(e){return e.event==='brief.updated';});
check(upd.length===1&&upd[0].date==='2026-10-27'&&upd[0].words===7&&upd[0].project.file==='combat-writing/brief.md'&&upd[0].project.sha256===sha(expected)&&upd[0].project.created===false&&upd[0].run.file==='brief.md'&&upd[0].run.sha256===sha(expected)&&upd[0].run.created===false,'brief update: one brief.updated line with the date, the words and both files\' sha256, got '+JSON.stringify(upd));
var pB2=node('packet.js',['--run',runB,'--round','02-battle','--seat','seat-1','--sn','sn.md']);
var packetB2=pB2.status===0?read(pB2.stdout.trim()):'';
check(pB2.status===0&&packetB2.indexOf('## Context brief')>=0&&packetB2.indexOf('Update 2026-10-27: new prospect is Examplehub')>packetB2.indexOf('## Context brief')&&packetB2.indexOf('Update 2026-10-27: new prospect is Examplehub')<packetB2.indexOf('## The draft'),'brief update: the next packet must carry the update inside the Context brief, got exit '+pB2.status+' '+pB2.stderr);
var sB3=short(runB).stdout;
check(/^Brief: stored, pasted with the draft; newest update 2026-10-27: new prospect is Examplehub, main reference https:\/\/example\.com\/products\/draft-studio\/\.$/m.test(sB3),'brief update: the Brief line must name the newest update, got '+sB3);
check(lib.newestBriefUpdate(expected).date==='2026-10-27'&&lib.newestBriefUpdate(briefText)===null&&lib.briefUpdateWords(briefText)===''&&/^; newest update 2026-10-27: /.test(lib.briefUpdateWords(expected)),'newestBriefUpdate and briefUpdateWords on a brief with and without an update');
var long=lib.briefUpdateWords('Update 2026-10-27: '+new Array(30).join('word ')+'end');
check(long.length<=('; newest update 2026-10-27: ').length+lib.BRIEF_UPDATE_SHOWN+1&&/…$/.test(long),'a long update is cut at '+lib.BRIEF_UPDATE_SHOWN+' characters with an ellipsis, got '+long);

// 4. The next piece with no brief at all: the project's brief, update included, serves; its packet carries the text.
var rD=node('new-run.js',['--draft','short.md','--stage','battle','--name','next','--model','Test Model']);
check(rD.status===0,'run D: exit '+rD.status+' '+rD.stderr);
var runD=rD.stdout.trim();
var cD=created(runD);
check(cD.brief&&cD.brief.source==='project'&&cD.brief.from===null&&read(path.join(runD,'brief.md'))===expected,'run D: with no --brief the project brief must serve, source project, got '+JSON.stringify(cD.brief));
check(!logOf(runD).some(function(e){return e.event==='brief.kept';}),'run D: the project\'s own brief logs no brief.kept');
var sD=short(runD).stdout;
check(/^Started at: battle: the run was made from a pasted draft, with no strategy stage \(the project's brief came with it\)\. No round yet\.$/m.test(sD)&&/^Brief: the project's \(combat-writing\/brief\.md\); newest update 2026-10-27: new prospect is Examplehub, main reference https:\/\/example\.com\/products\/draft-studio\/\.$/m.test(sD)&&sD.indexOf(lib.PROJECT_BRIEF_KEPT_LINE)<0,'run D: the Started-at and Brief lines for the project brief, no kept line, got '+sD);
var pD=node('packet.js',['--run',runD,'--round','01-battle','--seat','seat-1','--sn','sn.md']);
check(pD.status===0&&read(pD.stdout.trim()).indexOf(expected.trim())>=0,'run D: the first SN packet must carry the project brief with its update');
// The project's own path as --brief: source project, nothing written, nothing logged.
var rP=node('new-run.js',['--draft','short.md','--brief',path.join('combat-writing','brief.md'),'--stage','sparring','--name','own-path','--model','Test Model']);
check(rP.status===0&&created(rP.stdout.trim()).brief.source==='project'&&!logOf(rP.stdout.trim()).some(function(e){return e.event==='brief.kept';})&&read(lib.projectBriefPath(proj))===expected,'the project brief\'s own path as --brief: source project, no brief.kept, file untouched');
// The same bytes from elsewhere: the project brief rewritten equal, nothing logged.
fs.writeFileSync(path.join(proj,'copy.md'),expected);
var rQ=node('new-run.js',['--draft','short.md','--brief','copy.md','--stage','sparring','--name','same-bytes','--model','Test Model']);
check(rQ.status===0&&!logOf(rQ.stdout.trim()).some(function(e){return e.event==='brief.kept';})&&short(rQ.stdout.trim()).stdout.indexOf(lib.PROJECT_BRIEF_KEPT_LINE)<0,'a brief equal to the project\'s logs no brief.kept and prints no kept line');
// brief: same from the old wording, resolved by a host to a run's brief.md: source last still measures.
var rL=node('new-run.js',['--draft','short.md','--brief',path.join(runA,'brief.md'),'--stage','battle','--name','last','--model','Test Model']);
var cL=created(rL.stdout.trim());
check(rL.status===0&&cL.brief.source==='last'&&cL.brief.from===path.basename(runA)&&read(lib.projectBriefPath(proj))===oldBrief,'a run\'s brief.md given as --brief: source last with the run id, and it is the project\'s now');
fs.writeFileSync(lib.projectBriefPath(proj),expected);

// 5. --no-brief: none, the project's left alone. Neither flag with a project brief: a brief-only run from it. The refusals.
var rE=node('new-run.js',['--draft','short.md','--no-brief','--stage','sparring','--name','cold','--model','Test Model']);
check(rE.status===0&&!fs.existsSync(path.join(rE.stdout.trim(),'brief.md'))&&created(rE.stdout.trim()).brief===null&&read(lib.projectBriefPath(proj))===expected,'run E: --no-brief must store no brief and leave the project\'s, got '+rE.status+' '+rE.stderr);
check(/^Brief: none\.$/m.test(short(rE.stdout.trim()).stdout),'run E: the Brief line must read none');
var rN=node('new-run.js',['--stage','strategy','--name','update-alone','--model','Test Model']);
var runN=rN.status===0?rN.stdout.trim():'';
check(rN.status===0&&runN&&fs.existsSync(path.join(runN,'brief.md'))&&!fs.existsSync(path.join(runN,'draft.md'))&&created(runN).brief.source==='project'&&created(runN).draft===null,'neither --draft nor --brief with a project brief: a brief-only run from it, got '+rN.status+' '+rN.stderr);
check(/^Started at: strategy: the project's brief stored first, the draft brought later by sparring or battle\. No round yet\.$/m.test(short(runN).stdout),'the brief-only run from the project brief: the Started-at line, got '+short(runN).stdout);
var rF=node('new-run.js',['--draft','short.md','--brief','old-brief.md','--keep','--stage','sparring','--model','Test Model']);
check(rF.status===2&&/--keep is gone \(issue 72\)/.test(rF.stderr),'--keep must refuse by name, got '+rF.status+' '+rF.stderr);
var rG=node('new-run.js',['--draft','short.md','--brief','old-brief.md','--no-brief','--stage','sparring','--model','Test Model']);
check(rG.status===2&&/--no-brief and --brief together/.test(rG.stderr),'--no-brief with --brief must refuse, got '+rG.status+' '+rG.stderr);
var rH=node('new-run.js',['--name','nothing','--no-brief','--model','Test Model']);
check(rH.status===2&&/--draft <file> or --brief <file> is required/.test(rH.stderr),'neither a draft nor a brief, with --no-brief, still refuses');
// brief.js refusals, and the update that creates the brief.
check(node('brief.js',[]).status===2&&/--update <file> is required/.test(node('brief.js',[]).stderr),'brief.js with no --update must refuse');
check(node('brief.js',['--update','missing.md']).status===2&&/update file not found/.test(node('brief.js',['--update','missing.md']).stderr),'brief.js with a missing file must refuse');
fs.writeFileSync(path.join(proj,'empty.md'),'  \n');
check(node('brief.js',['--update','empty.md']).status===2&&/empty/.test(node('brief.js',['--update','empty.md']).stderr),'brief.js with an empty file must refuse');
check(node('brief.js',['--update','combat-writing/inbox/examplehub.brief-update.md','--run','no-such-run']).status===2&&/run folder not found/.test(node('brief.js',['--update','combat-writing/inbox/examplehub.brief-update.md','--run','no-such-run']).stderr),'brief.js with a missing run must refuse');
check(node('brief.js',['--update','combat-writing/inbox/examplehub.brief-update.md','--at','yesterday-ish']).status===2,'brief.js with a bad --at must refuse');
var fresh=fs.mkdtempSync(path.join(os.tmpdir(),'cw-brief-fresh-'));
fs.writeFileSync(path.join(fresh,'u.md'),'first prospect is Acme\n');
var rX=node('brief.js',['--update','u.md','--at','2026-10-28T00:00:00Z'],fresh);
check(rX.status===0&&read(lib.projectBriefPath(fresh))==='Update 2026-10-28: first prospect is Acme\n'&&/\(created from this update\)/.test(rX.stdout),'brief.js with no project brief must create it from the update and say so, got '+rX.status+' '+rX.stderr+' '+rX.stdout);
fs.writeFileSync(path.join(fresh,'u2.md'),'second prospect is Beta\n');
node('brief.js',['--update','u2.md','--at','2026-10-29T00:00:00Z'],fresh);
check(read(lib.projectBriefPath(fresh))==='Update 2026-10-28: first prospect is Acme\n\nUpdate 2026-10-29: second prospect is Beta\n'&&lib.newestBriefUpdate(read(lib.projectBriefPath(fresh))).text==='second prospect is Beta','a second update stays below the first, dated, and is the newest');
// A run with no brief.md gets the project's, update included, on --run.
var rY=node('new-run.js',['--draft',path.join(proj,'short.md'),'--no-brief','--stage','battle','--name','nobrief','--model','Test Model'],fresh);
fs.writeFileSync(path.join(fresh,'u3.md'),'third\n');
var rZ=node('brief.js',['--update','u3.md','--run',rY.stdout.trim(),'--at','2026-10-30T00:00:00Z'],fresh);
check(rZ.status===0&&read(path.join(rY.stdout.trim(),'brief.md'))===read(lib.projectBriefPath(fresh))&&/Update 2026-10-30: third\n$/.test(read(path.join(rY.stdout.trim(),'brief.md')))&&logOf(rY.stdout.trim()).filter(function(e){return e.event==='brief.updated';})[0].run.created===true,'an update on a run with no brief.md gives it the project\'s brief, update included, logged created');
fs.rmSync(fresh,{recursive:true,force:true});
// The reader itself.
check(lib.briefSourceOf(path.join(proj,'old-brief.md'),proj).source==='given'&&lib.briefSourceOf(lib.projectBriefPath(proj),proj).source==='project'&&lib.briefSourceOf(path.join(runA,'brief.md'),proj).from===path.basename(runA)&&lib.briefSourceOf(path.join(proj,'combat-writing','inbox','x.brief.md'),proj).source==='pasted'&&lib.briefSourceOf(path.join(runA,'rounds','x.md'),proj).source==='given','briefSourceOf: the four sources by path');
check(lib.briefLine(null)==='Brief: none.'&&lib.briefWords({brief:null})===null&&lib.briefWords({brief:{source:'given'}},'a brief')==='a brief'&&lib.briefLine({brief:{source:'given'}},null)==='Brief: brief.md, stored.','briefLine and briefWords on no brief and a given one');

// 6. In a git repository: after a brief is given, git status shows the ignore file and the project brief, nothing else.
var git=cp.spawnSync('git',['--version'],{encoding:'utf8'}).status===0;
if(git){
  var repo=fs.mkdtempSync(path.join(os.tmpdir(),'cw-brief-repo-'));
  cp.spawnSync('git',['init','-q'],{cwd:repo});
  fs.writeFileSync(path.join(repo,'draft.md'),draftText); fs.writeFileSync(path.join(repo,'brief.md'),briefText);
  cp.spawnSync('git',['add','-A'],{cwd:repo}); cp.spawnSync('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid','commit','-q','-m','fixture'],{cwd:repo});
  var rR=node('new-run.js',['--draft','draft.md','--brief','brief.md','--stage','strategy','--name','kept','--model','Test Model'],repo);
  check(rR.status===0,'repo: exit '+rR.status+' '+rR.stderr);
  var st=cp.spawnSync('git',['status','--porcelain','--untracked-files=all'],{cwd:repo,encoding:'utf8'}).stdout.trim().split('\n').filter(Boolean).sort();
  check(JSON.stringify(st)==='["?? combat-writing/.gitignore","?? combat-writing/brief.md"]','repo: git status must show the ignore file and the project brief and nothing else, got '+JSON.stringify(st));
  fs.rmSync(repo,{recursive:true,force:true});
}else console.log('note: git not on PATH; the git status check was skipped here (CI runs it)');

// 7. The text.
var battle=skill('battle'), sparring=skill('sparring'), strategy=skill('strategy'), rules=skill('combat-writing'), help=skill('help');
check(/A pasted draft with no `draft:` starts a new run \(step 4\), as sparring does/.test(battle)&&/unless the newest run holds a brief alone and no round, when it joins that run as `draft\.md`/.test(battle),'battle: a pasted draft with no draft: must start a new run, the brief-only exception kept');
check(/the draft is the `battle:`, `sparring:` or `draft:` block, else the text before the first keyword line, the form of issue 65, else the text after the brief that reads as the draft/.test(battle),'battle: the paste cut must be stated (issue 76)');
check(/a pasted draft to `<slug>\.md`/.test(battle)&&!/<slug>\.draft\.md/.test(battle),'battle: the draft is cut to <slug>.md like sparring');
check(/the fourth option is \*\*New run\*\* in place of Final/.test(battle)&&/draft-shaped text is New run when the newest run holds a round and the text is not close to the last draft, and Revised draft when it is close to the last draft/.test(battle)&&/New run and Revised draft fire the plain round at once/.test(battle),'battle: the picker must offer New run on draft-shaped text with the best-guess rule and fire the plain round');
check(/new-run\.js --draft <draft file> \[--brief <brief file>\] --stage battle --name "<slug>" \[--no-brief\]/.test(battle)&&/when the paste carries no `draft:` and the newest run already holds a draft \(the next piece, as sparring does; issue 65\)/.test(battle),'battle: step 4 must start the run for the next piece with the flags');
check(/argument-hint: .*\[<pasted draft>\].*\[brief: \.\.\.\].*\[brief update: \.\.\.\]/.test(battle),'battle: the argument-hint must show the pasted draft, brief: and brief update:');
check(/brief\.js --update <update file> --run <folder>/.test(battle)&&/a brief update \(`brief update:` or `update brief:`\) to `<slug>\.brief-update\.md`/.test(battle),'battle: must cut the update to <slug>.brief-update.md and run brief.js --update with the run');
[['battle',battle],['sparring',sparring],['strategy',strategy]].forEach(function(p){
  check(/is the project's from then on/.test(p[1])&&/`brief update:` \(or `update brief:`\)/.test(p[1])&&/brief\.js --update/.test(p[1])&&/combat-writing\/brief\.md/.test(p[1]),p[0]+': must say the brief typed is the project\'s and name brief update: and brief.js');
  check(!/`keep`|brief: same|brief: last|--keep/.test(p[1].replace(/[Aa] brief line that is only `same` or `last`, or ends in `keep`, from an earlier version[^.]*\./,'')),p[0]+': must offer none of keep, brief: same, brief: last or --keep');
  check(/[Aa] brief line that is only `same` or `last`, or ends in `keep`, from an earlier version/.test(p[1]),p[0]+': must read the old words as the project\'s brief');
});
check(/When the project holds `combat-writing\/brief\.md`, that brief serves: create the run with the draft alone, no `--no-brief`/.test(strategy)&&/create the run with the draft alone and `--no-brief`/.test(strategy)&&/`new-run\.js` with neither, which makes the run from the project's brief/.test(strategy),'strategy: a draft with no brief uses the project brief, --no-brief only when the person said there is none, and an update alone makes a brief-only run');
check(/battle when the paste carries no `draft:` \(issue 65/.test(rules)&&/the project's `combat-writing\/brief\.md` when it exists and none came/.test(rules)&&/the project's brief `combat-writing\/brief\.md` \(written by `new-run\.js` from every brief given and added to by `brief\.js --update`/.test(rules)&&!/`keep`|--keep|brief: same/.test(rules),'the rules skill: the one rule for battle and the project brief as a write location, no keep');
check(/A brief you type is the project's from then on/.test(help)&&/`brief update:` adds a dated line to it/.test(help)&&/^- `combat-writing\/brief\.md` in your project: the project's brief, the last one you typed/m.test(help)&&!/`keep`|--keep|brief: same|brief: last/.test(help),'help: strategy, battle, the files list and the shortcuts must name the brief routes and none of the old words');
var readme=read(path.join(plugin,'README.md'));
check(/A brief you type is the project's from then on/.test(readme)&&/`brief update:`/.test(readme)&&!/`keep`|brief: same/.test(readme),'the plugin README: the brief typed is the project\'s, brief update:, no keep');
var claude=read(path.join(root,'CLAUDE.md'));
check(/The fifth and last \(issue 65, 2026-10-26; issue 72, the same day\) is `combat-writing\/brief\.md`/.test(claude)&&/`brief\.js`/.test(claude)&&/battle when the paste carries no `draft:` \(issue 65, 2026-10-26/.test(claude)&&!/`keep` on a brief line/.test(claude),'CLAUDE.md: the fifth write location, brief.js among the writers, battle\'s new run, no keep');
fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'brief_check: '+failures.length+' failure(s), ':'brief_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
