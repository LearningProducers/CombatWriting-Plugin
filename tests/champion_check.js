// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// champion_check.js: the Champion stage is a command (ruled 2026-10-19, issue 13): `shipped`
// freezes the newest draft as canon with the time, the channel and the page's match; `result`
// is one dated line in the record; `insight` is one dated, run-tagged line in the project's
// vault. champion.js is the only writer, reads the words from a file, and fetches nothing.
//
// Runs the REAL new-run.js, add-draft.js, packet.js, check-answer.js, champion.js,
// render-record.js, render-board.js and open-board.js from plugins/combat-writing/scripts as
// child processes in a temporary project (never a re-implementation; no vault lands in the tree).
//
// What it pins:
//   - shipped with an address, channel words and a page holding both paragraphs (straight
//     quotes, doubled spaces, against curly quotes in the draft): exit 0, the Shipped line exact,
//     canon.md byte-equal to the newest draft, the log line's fields (canon_new, draft, host,
//     channel, live true, match 2 of 2, at from --at).
//   - record.md: a ## Champion section after the Next line and before ## Answers, the Shipped
//     line with the full address; --short carries neither Shipped nor the address and still
//     ends with the seat key.
//   - board.html: the Shipped strip before the draft heading, the heading clause "shipped as
//     canon.md", the Champion fold, no //host.tld on the page, the stripped address as text,
//     one href.
//   - A second shipped, "email to Dana Ruiz", no flags: no canon-2.md, canon's hash unchanged,
//     canon_new false, "canon.md again (draft-2.md) · no page to check", two Shipped lines.
//   - draft-3.md then shipped with a page holding one paragraph: canon-2.md from draft-3.md,
//     "1 of 2 paragraphs found", the board heading naming canon-2.md; then --live no ("not
//     live", live false); then an address with no flag ("not checked", live null); then a page
//     holding none of the canon ("not found").
//   - result twice, the second "Silence." with --at: the log lines, two dated Result lines,
//     stdout exact; result on a run with no canon is accepted and the section opens "Shipped:
//     not recorded".
//   - insight with a three-line text: the vault created at <project>/combat-writing/
//     insight-vault.md with the heading, the one explanatory line and the entry on one line,
//     first true; a second appends one line and no second heading, first false; the record and
//     the board's fold show both; no file under combat-writing/ carries the credit line.
//   - After shipped the open step runs: open-board.js --dry-run on the shipped run exits 0 and
//     logs board.opened; the champion skill runs open-board.js after shipped and says result and
//     insight do not open the board.
//   - Refusals, each exit 2 with a line on stderr and nothing written: an unknown kind, no
//     --file, an empty file, --page with no address, --live yes, --live no with --page, a missing
//     page file, --at not a date, shipped on a brief-only run, insight on a run copied outside
//     combat-writing/runs/, --page on result.
//   - The source: champion.js builds its address pattern from lib.URL_RE and holds no https?:
//     literal, comments included (the network, fetch and child_process bans for every script are
//     pinned by marketplace_check.js and open_board_check.js).
//
// Run from the repo root:   node tests/champion_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var scripts=path.join(plugin,'scripts');
var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-champion-'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function node(script,args,cwd){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:cwd||proj,encoding:'utf8'}); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function write(p,t){ fs.writeFileSync(p,t); }
function sha(p){ return require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function logOf(run){ return read(path.join(run,'log.jsonl')).split('\n').filter(Boolean).map(function(l){return JSON.parse(l);}); }
function champLines(run){ return logOf(run).filter(function(e){return /^champion\./.test(e.event);}); }
function seatMore(run,n,model,company){ var f=path.join(run,'seats.json'); var sj=JSON.parse(read(f)); for(var i=sj.seats.length+1;i<=n;i++)sj.seats.push({id:'seat-'+i,model:model,company:company||'Anthropic',provider:'test-fixture',source:'test fixture: an outside seat as the add-on would register it'}); fs.writeFileSync(f,JSON.stringify(sj,null,2)+'\n'); return run; }
var inbox=path.join(proj,'combat-writing','inbox');
fs.mkdirSync(inbox,{recursive:true});
function inboxFile(name,text){ var p=path.join(inbox,name); write(p,text); return path.relative(proj,p); }

// The fixture: a two-paragraph draft, a brief, two seats, one checked sparring answer, a revision
// with curly quotes in one paragraph.
var P1='Dear board, buy the company.', P2='The numbers are in the appendix.';
write(path.join(proj,'draft.md'),P1+'\n\n'+P2+'\n');
write(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
var run=seatMore(node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','champion','--stage','sparring','--model','Test Model']).stdout.trim(),2,'Test Model');
['seat-1','seat-2'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
write(path.join(run,'rounds','01-sparring','seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
node('check-answer.js',[path.join(run,'rounds','01-sparring','seat-1.answer.md'),'--run',run]);
var P2Q='The \u201cnumbers\u201d are in the appendix.';
write(path.join(proj,'rev.md'),P1+'\n\n'+P2Q+'\n');
check(node('add-draft.js',['--run',run,'--file','rev.md','--stage','battle']).stdout.trim()==='draft-2.md','fixture: draft-2.md expected');

// (1) shipped with an address, channel words and a live page.
var ship1=inboxFile('linkedin.shipped.md','https://www.linkedin.com/posts/dana-ruiz_board-letter-abc123. LinkedIn post\n');
var page1=inboxFile('linkedin.page.md','Posted by Dana Ruiz\n\nDear board,  buy the company.\n\nThe "numbers" are  in the appendix.\n\n12 comments\n');
var s1=node('champion.js',['--run',run,'--kind','shipped','--file',ship1,'--page',page1,'--at','2026-10-19T14:02:00Z']);
check(s1.status===0,'shipped (1): exit '+s1.status+' '+s1.stderr);
check(s1.stdout.trim()==='Shipped 2026-10-19 14:02 UTC · linkedin.com (LinkedIn post) · canon.md froze draft-2.md · live: matches canon','shipped (1): the line is '+JSON.stringify(s1.stdout.trim()));
check(fs.existsSync(path.join(run,'canon.md'))&&sha(path.join(run,'canon.md'))===sha(path.join(run,'draft-2.md')),'shipped (1): canon.md must be byte-equal to draft-2.md');
var e1=champLines(run).pop();
check(e1&&e1.event==='champion.shipped'&&e1.at==='2026-10-19T14:02:00.000Z'&&e1.canon==='canon.md'&&e1.canon_new===true&&e1.draft==='draft-2.md'&&e1.sha256===sha(path.join(run,'draft-2.md'))&&e1.url==='https://www.linkedin.com/posts/dana-ruiz_board-letter-abc123'&&e1.host==='linkedin.com'&&e1.channel==='LinkedIn post'&&e1.page==='linkedin.page.md'&&e1.live===true&&e1.match&&e1.match.found===2&&e1.match.of===2&&e1.match.status==='matches'&&e1.source==='linkedin.shipped.md','shipped (1): log line wrong: '+JSON.stringify(e1));
check(logOf(run).filter(function(e){return e.event==='champion.shipped';}).length===1,'shipped (1): exactly one champion.shipped line');

// (2) The record.
check(node('render-record.js',['--run',run]).status===0,'render-record after shipped: exit not 0');
var rec=read(path.join(run,'record.md'));
var iNext=rec.indexOf('**Next:**'), iChamp=rec.indexOf('## Champion'), iAns=rec.indexOf('## Answers');
check(iNext>0&&iChamp>iNext&&iAns>iChamp,'record: ## Champion must sit after the Next line and before ## Answers; got '+iNext+' '+iChamp+' '+iAns);
check(/\n\*\*Shipped:\*\* 2026-10-19 14:02 UTC · linkedin\.com \(LinkedIn post\) · canon\.md froze draft-2\.md · live: matches canon · https:\/\/www\.linkedin\.com\/posts\/dana-ruiz_board-letter-abc123\n/.test(rec),'record: the Shipped line with the full address is missing; got '+((rec.match(/\*\*Shipped:\*\*[^\n]*/)||[''])[0]));
check(/measured by code against the page text the host saved, never by a seat\./.test(rec),'record: the lead sentence of the Champion section is missing');
var sh=node('render-record.js',['--run',run,'--short']);
check(sh.status===0&&sh.stdout.indexOf('Shipped')<0&&sh.stdout.indexOf('linkedin')<0&&sh.stdout.trim().split('\n').pop()==='Seat key: seat-1 Test Model · seat-2 Test Model','--short: must carry neither Shipped nor the address and end with the seat key; got '+JSON.stringify(sh.stdout));

// (3) The board.
check(node('render-board.js',['--run',run]).status===0,'render-board after shipped: exit not 0');
var html=read(path.join(run,'board.html'));
check(html.indexOf('<p class="round shipped">')>0&&html.indexOf('<p class="round shipped">')<html.indexOf('<h2>The draft'),'board: the Shipped strip must sit above the draft heading');
check(/<p class="round shipped"><b>Shipped<\/b> · 2026-10-19 14:02 UTC · linkedin\.com \(LinkedIn post\) · canon\.md froze draft-2\.md · live: matches canon · www\.linkedin\.com\/posts\/dana-ruiz_board-letter-abc123 · 0 results · 0 insights<\/p>/.test(html),'board: the Shipped strip is wrong; got '+(/<p class="round shipped">[^]*?<\/p>/.exec(html)||[''])[0]);
check(/<h2>The draft · draft-2\.md, a revision · shipped as canon\.md, which froze draft-2\.md<\/h2>/.test(html),'board: the heading clause; got '+(/<h2>The draft[^<]*<\/h2>/.exec(html)||[''])[0]);
check(/<details class="fold"><summary>Champion: shipped, results, insights<\/summary>/.test(html),'board: the Champion fold is missing');
check(!/\b(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(html),'board: an address with its scheme appears');
check(html.indexOf('www.linkedin.com/posts/dana-ruiz_board-letter-abc123')>0,'board: the stripped address must be on the page as text');
var hrefs=html.match(/href="[^"]*"/g)||[];
check(hrefs.length===1&&hrefs[0]==='href="record.md"','board: hrefs are '+JSON.stringify(hrefs));

// (4) A second shipped with no new draft: a channel line, canon untouched.
var canonSha=sha(path.join(run,'canon.md'));
var ship2=inboxFile('email.shipped.md','email to Dana Ruiz\n');
var s2=node('champion.js',['--run',run,'--kind','shipped','--file',ship2]);
check(s2.status===0&&/^Shipped \d{4}-\d\d-\d\d \d\d:\d\d UTC · email to Dana Ruiz · canon\.md again \(draft-2\.md\) · no page to check$/.test(s2.stdout.trim()),'shipped (4): the line is '+JSON.stringify(s2.stdout.trim())+' '+s2.stderr);
check(!fs.existsSync(path.join(run,'canon-2.md'))&&sha(path.join(run,'canon.md'))===canonSha,'shipped (4): no canon-2.md and canon.md unchanged');
var e2=champLines(run).pop();
check(e2.canon_new===false&&e2.canon==='canon.md'&&e2.draft==='draft-2.md'&&e2.url===null&&e2.host===null&&e2.channel==='email to Dana Ruiz'&&e2.live===null&&e2.match===null&&e2.page===null,'shipped (4): log line wrong: '+JSON.stringify(e2));
node('render-record.js',['--run',run]);
check((read(path.join(run,'record.md')).match(/\*\*Shipped:\*\* /g)||[]).length===2,'record: two Shipped lines after two shipped');

// (5) A revised draft, shipped again: canon-2.md; the live marks.
write(path.join(proj,'rev3.md'),P1+'\n\nThe numbers are in the appendix, page 4.\n');
check(node('add-draft.js',['--run',run,'--file','rev3.md','--stage','battle']).stdout.trim()==='draft-3.md','fixture: draft-3.md expected');
var page5=inboxFile('site.page.md','Dear board, buy the company.\n\nSomething else entirely.\n');
var ship5=inboxFile('site.shipped.md','posted at https://example.invalid/letter\n');
var s5=node('champion.js',['--run',run,'--kind','shipped','--file',ship5,'--page',page5,'--at','2026-10-21T09:00:00Z']);
check(s5.status===0&&s5.stdout.trim()==='Shipped 2026-10-21 09:00 UTC · example.invalid (posted at) · canon-2.md froze draft-3.md · live: 1 of 2 paragraphs found','shipped (5): the line is '+JSON.stringify(s5.stdout.trim())+' '+s5.stderr);
check(fs.existsSync(path.join(run,'canon-2.md'))&&sha(path.join(run,'canon-2.md'))===sha(path.join(run,'draft-3.md'))&&sha(path.join(run,'canon.md'))===canonSha,'shipped (5): canon-2.md from draft-3.md, canon.md untouched');
var e5=champLines(run).pop();
check(e5.canon==='canon-2.md'&&e5.canon_new===true&&e5.draft==='draft-3.md'&&e5.match.found===1&&e5.match.of===2&&e5.match.status==='partial','shipped (5): log line wrong: '+JSON.stringify(e5));
node('render-board.js',['--run',run]);
var html5=read(path.join(run,'board.html'));
check(/<h2>The draft · draft-3\.md, a revision · shipped as canon-2\.md, which froze draft-3\.md<\/h2>/.test(html5),'board (5): the heading must name canon-2.md; got '+(/<h2>The draft[^<]*<\/h2>/.exec(html5)||[''])[0]);
check(/Canon: canon-2\.md froze draft-3\.md/.test(html5)&&/<div id="canon-text" hidden>Dear board, buy the company\.\n\nThe numbers are in the appendix, page 4\.\n<\/div>/.test(html5),'board (5): the controls must sit on canon-2.md with its text in the page');
var sNo=node('champion.js',['--run',run,'--kind','shipped','--file',ship5,'--live','no']);
check(sNo.status===0&&/· canon-2\.md again \(draft-3\.md\) · not live: the address gave no page$/.test(sNo.stdout.trim())&&champLines(run).pop().live===false&&champLines(run).pop().match===null,'shipped (--live no): got '+JSON.stringify(sNo.stdout.trim())+' '+JSON.stringify(champLines(run).pop()));
var sNone=node('champion.js',['--run',run,'--kind','shipped','--file',ship5]);
check(sNone.status===0&&/· not checked: no page text reached the script$/.test(sNone.stdout.trim())&&champLines(run).pop().live===null&&champLines(run).pop().url==='https://example.invalid/letter','shipped (no flag): got '+JSON.stringify(sNone.stdout.trim()));
var pageNone=inboxFile('none.page.md','A page about something else.\n');
var sNot=node('champion.js',['--run',run,'--kind','shipped','--file',ship5,'--page',pageNone]);
check(sNot.status===0&&/· live: not found$/.test(sNot.stdout.trim())&&champLines(run).pop().match.status==='not-found','shipped (page with none of the canon): got '+JSON.stringify(sNot.stdout.trim()));
check(!fs.existsSync(path.join(run,'canon-3.md')),'shipped (5): no canon-3.md: the draft did not change');

// A revised draft after the canon: the heading says the revision is not shipped.
write(path.join(proj,'rev4.md'),P1+'\n\nThe numbers are in the appendix, page 5.\n');
node('add-draft.js',['--run',run,'--file','rev4.md','--stage','battle']);
node('render-board.js',['--run',run]);
check(/<h2>The draft · draft-4\.md, a revision · canon-2\.md froze draft-3\.md; this revision is not shipped<\/h2>/.test(read(path.join(run,'board.html'))),'board: a revision after the canon must say it is not shipped; got '+(/<h2>The draft[^<]*<\/h2>/.exec(read(path.join(run,'board.html')))||[''])[0]);

// (6) result, twice; and on a run with no canon.
var r1=node('champion.js',['--run',run,'--kind','result','--file',inboxFile('r1.result.md','Two replies in a day,\none asking for the appendix.\n')]);
check(r1.status===0&&/^Result recorded \d{4}-\d\d-\d\d: Two replies in a day, one asking for the appendix\.$/.test(r1.stdout.trim()),'result (1): got '+JSON.stringify(r1.stdout.trim())+' '+r1.stderr);
var r2=node('champion.js',['--run',run,'--kind','result','--file',inboxFile('r2.result.md','Silence.\n'),'--at','2026-10-28']);
check(r2.status===0&&r2.stdout.trim()==='Result recorded 2026-10-28: Silence.','result (2): got '+JSON.stringify(r2.stdout.trim()));
var results=champLines(run).filter(function(e){return e.event==='champion.result';});
check(results.length===2&&results[0].text==='Two replies in a day,\none asking for the appendix.'&&results[1].text==='Silence.'&&results[1].at==='2026-10-28T00:00:00.000Z'&&results[1].source==='r2.result.md','result: log lines wrong: '+JSON.stringify(results));
node('render-record.js',['--run',run]);
var rec6=read(path.join(run,'record.md'));
check(/\*\*Result:\*\* \d{4}-\d\d-\d\d · Two replies in a day, one asking for the appendix\.\n/.test(rec6)&&/\*\*Result:\*\* 2026-10-28 · Silence\.\n/.test(rec6),'record: the two dated Result lines');
check(!/\*\*Shipped:\*\* not recorded/.test(rec6),'record: a shipped run must not say Shipped: not recorded');
var bare=node('new-run.js',['--draft','draft.md','--name','bare','--stage','battle','--model','Test Model']).stdout.trim();
var rb=node('champion.js',['--run',bare,'--kind','result','--file',inboxFile('rb.result.md','One reply.\n')]);
check(rb.status===0,'result on a run with no canon: must be accepted; got '+rb.status+' '+rb.stderr);
node('render-record.js',['--run',bare]);
check(/## Champion\n\n[^\n]*\n\n\*\*Shipped:\*\* not recorded\.\n\n\*\*Result:\*\* /.test(read(path.join(bare,'record.md'))),'record (no canon): the section must open with Shipped: not recorded');

// (7) insight: the vault.
var vault=path.join(proj,'combat-writing','insight-vault.md');
check(!fs.existsSync(vault),'vault: must not exist before the first insight');
var i1=node('champion.js',['--run',run,'--kind','insight','--file',inboxFile('i1.insight.md','Signal first,\ncontext second:\nthe seats punished every opener that explained itself.\n'),'--at','2026-10-19T15:00:00Z']);
check(i1.status===0&&i1.stdout.trim()==='Insight recorded 2026-10-19 in combat-writing/insight-vault.md: Signal first, context second: the seats punished every opener that explained itself.','insight (1): got '+JSON.stringify(i1.stdout.trim())+' '+i1.stderr);
check(fs.existsSync(vault),'vault: must be created at <project>/combat-writing/insight-vault.md');
var v1=fs.existsSync(vault)?read(vault):'';
var runId=path.basename(run);
check(v1==='# Insight Vault\n\nWhat the Combat Writing runs in this project revealed: insights and lexicon, one dated line per entry, tagged with the run that produced it (step 19). Appended by /cw:champion insight; nothing already here is changed by the plugin.\n\n- 2026-10-19 · '+runId+' · Signal first, context second: the seats punished every opener that explained itself.\n','vault (first): the file is '+JSON.stringify(v1));
var ie1=champLines(run).pop();
check(ie1.event==='champion.insight'&&ie1.first===true&&ie1.vault==='combat-writing/insight-vault.md'&&ie1.text==='Signal first, context second: the seats punished every opener that explained itself.','insight (1): log line wrong: '+JSON.stringify(ie1));
var i2=node('champion.js',['--run',run,'--kind','insight','--file',inboxFile('i2.insight.md','"the ask" is the one sentence the reader can say yes to; lead with it.\n'),'--at','2026-10-20']);
check(i2.status===0,'insight (2): exit '+i2.status+' '+i2.stderr);
var v2=read(vault);
check(v2===v1+'- 2026-10-20 · '+runId+' · "the ask" is the one sentence the reader can say yes to; lead with it.\n'&&(v2.match(/^# Insight Vault$/mg)||[]).length===1,'vault (second): one line appended, no second heading; got '+JSON.stringify(v2));
check(champLines(run).pop().first===false,'insight (2): first must be false');
node('render-record.js',['--run',run]); node('render-board.js',['--run',run]);
var rec7=read(path.join(run,'record.md')), html7=read(path.join(run,'board.html'));
check(/\*\*Insight:\*\* 2026-10-19 · Signal first, context second: the seats punished every opener that explained itself\. · combat-writing\/insight-vault\.md\n/.test(rec7)&&/\*\*Insight:\*\* 2026-10-20 · "the ask" is the one sentence/.test(rec7),'record: the two Insight lines');
check(/<strong>Insight:<\/strong> 2026-10-19 · Signal first, context second: the seats punished every opener that explained itself\. · combat-writing\/insight-vault\.md<\/p>/.test(html7)&&/<strong>Insight:<\/strong> 2026-10-20 · &quot;the ask&quot; is the one sentence/.test(html7),'board: the fold must show both insights, escaped');
check(/· 2 results · 2 insights<\/p>/.test(html7),'board: the strip must count the results and the insights; got '+(/<p class="round shipped">[^]*?<\/p>/.exec(html7)||[''])[0]);
var hits=[]; (function walk(d){ fs.readdirSync(d).forEach(function(n){ var p=path.join(d,n); if(fs.statSync(p).isDirectory())walk(p); else if(read(p).indexOf(CREDIT)>=0)hits.push(path.relative(proj,p)); }); })(path.join(proj,'combat-writing'));
check(hits.length===0,'credit line found under combat-writing/: '+hits.join(', '));

// After shipped the open step runs: the opener on the shipped run, and the skill's text.
var dry=node('open-board.js',['--run',run,'--dry-run']);
check(dry.status===0&&/^would run: /.test(dry.stdout)&&logOf(run).some(function(e){return e.event==='board.opened'&&e.dry_run===true;}),'open-board after shipped: must run and log board.opened; got '+dry.status+' '+dry.stdout+dry.stderr);
var skill=read(path.join(plugin,'skills','champion','SKILL.md'));
var sLines=skill.split('\n');
check(sLines[0]==='---'&&/^name: champion$/m.test(skill)&&/^argument-hint: shipped \[<url> \| email to <recipient> \| <channel>\] \| result: <text> \| insight: <text> \[run: <folder>\]$/m.test(skill)&&sLines[sLines.indexOf('---',1)+1]==='<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->','champion skill: the front matter, the argument-hint or the SPDX line');
check(/After `shipped`, run the third too \(ruled 2026-10-19\): the board opens/.test(skill)&&/After `result` and `insight` the board is rebuilt and its path printed, not opened\./.test(skill),'champion skill: shipped must open the board and result and insight must not');
check(/open-board\.js --run <folder>/.test(skill)&&/champion\.js --run <folder> --kind shipped --file/.test(skill),'champion skill: must run champion.js and open-board.js');
check(/\*\*Shipped\*\* \(the piece went out; the link, or email to whom\); \*\*Result\*\* \(what came back, silence included\); \*\*Insight\*\* \(what you learned, or a term and what it means\)/.test(skill)&&/\(best guess\)/.test(skill)&&/a lone address is Shipped/.test(skill),'champion skill: the picker with the best-guess rule');
check(/"Other", that cannot be suppressed/.test(skill)&&/Text typed there goes through the same best-guess rule/.test(skill),'champion skill: must say what text typed into the Other row does');
check(/Three lines on screen after a `shipped`: the Shipped line, the opener's line, the Next line\./.test(skill),'champion skill: must name the three lines after a shipped');
check(/\.paste\.md/.test(skill)&&/Parse only after that file exists/.test(skill)&&/<slug>\.shipped\.md/.test(skill)&&/<slug>\.result\.md/.test(skill)&&/<slug>\.insight\.md/.test(skill)&&/<slug>\.page\.md/.test(skill),'champion skill: the inbox cut');
check(/Never a second fetch, never any other address, never a fetch for `result` or `insight`\./.test(skill),'champion skill: one fetch, by the host, for shipped alone');
check(skill.indexOf(CREDIT)<0&&!/\bClaude\b/.test(skill)&&/the host/.test(skill),'champion skill: no credit line, no product name for the host');
check(skill.split('/cw:help for the full guide.').length>=3,'champion skill: every question to the person must end with the help line');
check(/champion closes like strategy, with the text Next line, not the picker/i.test(skill)&&/Next: \/cw:champion shipped <link, or email to whom>/.test(skill),'champion skill: closes with the text Next line');

// (8) Refusals: exit 2, a line on stderr, nothing written.
var before=champLines(run).length, vaultBefore=read(vault);
function refused(args,why,cwd){ var r=node('champion.js',args,cwd); check(r.status===2&&/^error: /.test(r.stderr),'refusal ('+why+'): expected exit 2 with a reason, got '+r.status+' '+JSON.stringify(r.stderr)+' '+JSON.stringify(r.stdout)); }
var empty=inboxFile('empty.result.md','\n\n');
refused(['--run',run,'--kind','bogus','--file',ship1],'unknown kind');
refused(['--run',run,'--kind','result'],'no --file');
refused(['--run',run,'--kind','result','--file',empty],'empty file');
refused(['--run',run,'--kind','shipped','--file',ship2,'--page',page1],'--page with no address');
refused(['--run',run,'--kind','shipped','--file',ship1,'--live','yes'],'--live yes');
refused(['--run',run,'--kind','shipped','--file',ship1,'--live','no','--page',page1],'--live no with --page');
refused(['--run',run,'--kind','shipped','--file',ship1,'--page',path.join(inbox,'no-such.page.md')],'missing page file');
refused(['--run',run,'--kind','result','--file',ship1,'--at','not-a-date'],'--at not a date');
var briefOnly=node('new-run.js',['--brief','brief.md','--name','briefonly','--stage','strategy','--model','Test Model']).stdout.trim();
var nd=node('champion.js',['--run',briefOnly,'--kind','shipped','--file',ship1]);
check(nd.status===2&&/no draft in this run; nothing to ship/.test(nd.stderr),'refusal (shipped on a brief-only run): got '+nd.status+' '+nd.stderr);
var outside=path.join(proj,'elsewhere',path.basename(run)); fs.mkdirSync(path.dirname(outside),{recursive:true}); fs.cpSync(run,outside,{recursive:true});
var oi=node('champion.js',['--run',outside,'--kind','insight','--file',inboxFile('o.insight.md','Lost.\n')]);
check(oi.status===2&&/not under combat-writing\/runs\//.test(oi.stderr),'refusal (insight on a run outside combat-writing/runs/): got '+oi.status+' '+oi.stderr);
refused(['--run',run,'--kind','result','--file',ship1,'--page',page1],'--page on result');
refused(['--run',run,'--kind','insight','--file',ship1,'--live','no'],'--live on insight');
check(champLines(run).length===before&&read(vault)===vaultBefore&&!fs.existsSync(path.join(run,'canon-3.md')),'refusals: nothing may be written');

// (9) The source.
var src=read(path.join(scripts,'champion.js'));
check(/lib\.URL_RE/.test(src)&&!/https?:/.test(src)&&!/www\./.test(src),'champion.js: must build its address pattern from lib.URL_RE and hold no address literal, comments included');
check(!/require\(['"](https?|net|dgram|child_process)['"]\)/.test(src)&&!/\bfetch\(/.test(src),'champion.js: must fetch nothing and spawn nothing');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'champion_check: '+failures.length+' failure(s), ':'champion_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
