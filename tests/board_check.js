// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// board_check.js: board.html is the result (2026-10-14; one screen since Part 106): one
// self-contained page, the newest draft across the top beside the latest round's line, one card
// per seat in its company identity with the full read on the card, the scoreboard and the run
// details under the tabs; it averages nothing and fetches nothing (the four faces ride as data).
//
// Runs the REAL new-run.js, packet.js, check-answer.js, check-flip.js, add-draft.js and
// render-board.js from plugins/combat-writing/scripts as child processes in a temporary
// project (never a re-implementation).
//
// What it pins:
//   - The first visible text in the page is the motto, before the title; the credit line is
//     nowhere in the page (ruled 2026-10-12).
//   - The page makes no external request: no http://, https:// or protocol-relative URL
//     in any src, href, url(), @import or fetch; no <link>, <script src>, <img src> or
//     <iframe>; every url( is a data font (Part 106, the four embedded faces, one @font-face
//     each) and nothing else; the only href is the relative link to record.md.
//   - The newest draft is on the page in full, escaped, named as a revision when it is one,
//     in the draft panel above the seats; the brief and the reader on the strip's second line (Part 118).
//   - The round line (ruled 2026-10-15; beside the draft since Part 118): the latest round's task in words in the side column of the
//     page, from the packet (the prompt itself for SN, SFQ, N and FQ; the seat lines with each
//     note; the final reads), whether a rating was asked, and how many seats answered; the same
//     line for every round in the history under the scoreboard; the record's round line carries
//     the same task, never the inbox file name. The tabs Draft, Scoreboard and Run details switch
//     the top box's panel; the draft panel shows first.
//   - No verdict box on any run (issue 175): no `class="verdict"` and no `aria-label="Verdict"`
//     anywhere; the ratings are on the frames and in the scoreboard, never averaged.
//   - One card per seat, in seat order, from the seat's latest turn, in its company identity
//     (a `co-<company>` class the CSS table keys the face, the frame and the accent on): the
//     seat's own number as the corner index, the company as the suit, the rating or its state
//     (Critique, Failed read, Missing, Not yet read) with the flip or Stand mark, the one-line
//     verdict (the first sentence after the first line, cut at a sentence end before 200
//     characters), the citation to the model by name and company with the round, the seat's own
//     note only when that seat was asked something different (a seat line), the final reads'
//     numbers when a final round exists, and the full read open on the card; a missing seat has
//     no read; a seat's words are escaped, never markup.
//   - Under the tabs: the scoreboard of every round (one column per round, the legend, a valid flip
//     with the earlier number kept and the cited seat, an invalid flip marked INVALID, Stand,
//     missing, a failed read, a no-rating round's critique cell and its RATING-line failure,
//     the final round's S/N and red-flag cells, the Latest column), the final reads table and
//     their full reads, and the run details (the crew line, the seat key, the drafts, the
//     Started-at line, the record.md link).
//   - A round put to one seat only shows "not asked" for the others in the table, never
//     "missing", and their frames cite their latest earlier round.
//   - The frame (Part 106): one screen, 100dvh, rows auto 3fr 7fr auto, stacking under 1100 px;
//     no page width cap, no character cap on the draft or the read; long words wrapping; a
//     seat's read renders a markdown subset after escaping (lists, bold, italic, code, a heading
//     as bold), no link, no markup from the seat, the page's one href still record.md.
//   - The canon controls (ruled 2026-10-19): only when the run holds a canon, the draft panel
//     carries read aloud (the browser's speech synthesis, with pause and stop), copy (the
//     clipboard) and download (a .txt named for the run), the canon text in the page, the
//     Shipped strip in the strip between the title row and the brief line, the heading naming the canon and the draft it froze,
//     and the Champion heading under Run details; the page still has one href and makes no
//     outside request; a run with no canon has none of it.
//   - No chart, no chart point, no series: the board is simple (2026-10-14).
//   - No averaged number: no "average", "mean", "overall", "consensus" or "total" rating,
//     no fractional rating.
//   - Light and dark are both defined (a prefers-color-scheme block and a data-theme scope)
//     with a toggle.
//   - Rendering appends board.rendered to the log; a folder with no seats.json exits 2.
//
// Run from the repo root:   node tests/board_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var scripts=path.join(__dirname,'..','plugins','combat-writing','scripts');
var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder';
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-board-'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
function write(p,t){ fs.writeFileSync(p,t); }
// The crew is two fresh readers by default (Part 87, 2026-11-02; one from 2026-10-09 until then), never padded past that: the extra
// seats a test needs are written into seats.json the way the add-on's crew_register writes an
// outside seat (a provider field), so packet.js seats them; a fresh reader past the second it refuses.
function seatMore(run,n,model,company){ var f=path.join(run,'seats.json'); var sj=JSON.parse(fs.readFileSync(f,'utf8')); for(var i=sj.seats.length+1;i<=n;i++)sj.seats.push({id:'seat-'+i,model:model,company:company||'Anthropic',provider:'test-fixture',source:'test fixture: an outside seat as the add-on would register it'}); fs.writeFileSync(f,JSON.stringify(sj,null,2)+'\n'); return run; }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
var run=seatMore(node('new-run.js',['--readers','1','--draft','draft.md','--brief','brief.md','--name','board','--model','Test Model']).stdout.trim(),3,'Test Model');
var S2LINE='The board will ask for numbers and find none.';
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
var r1=path.join(run,'rounds','01-sparring');
write(path.join(r1,'seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
write(path.join(r1,'seat-2.answer.md'),'RATING: 4/10\n'+S2LINE+'\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(r1,s+'.answer.md'),'--run',run]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','02-battle','--seat',s,'--rerate']); });
var r2=path.join(run,'rounds','02-battle');
write(path.join(r2,'seat-1.answer.md'),'RATING: 6/10\nseat-2 wrote "'+S2LINE+'" and that moved me.\n');
write(path.join(r2,'seat-2.answer.md'),'RATING: 4/10\nStand. Nothing new.\n');
write(path.join(r2,'seat-3.answer.md'),'RATING: 7/10\nHedging on purpose.\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('check-answer.js',[path.join(r2,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','02-battle','--seat',s]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','03-battle','--seat',s,'--rerate']); });
var r3=path.join(run,'rounds','03-battle');
write(path.join(r3,'seat-1.answer.md'),'RATING: 8/10\nseat-2 wrote "the numbers are all there" so I moved back up.\n');
write(path.join(r3,'seat-2.answer.md'),'RATING: 4/10\nStand.\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(r3,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','03-battle','--seat',s]); });
// 04-battle without --rerate: a critique round. seat-1 critiques, seat-2 is missing, seat-3 writes a RATING line anyway.
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','04-battle','--seat',s]); });
var rc=path.join(run,'rounds','04-battle');
write(path.join(rc,'seat-1.answer.md'),'The close is the problem, as seat-2 said.\n');
write(path.join(rc,'seat-3.answer.md'),'RATING: 8/10\nRating anyway.\n');
['seat-1','seat-3'].forEach(function(s){ node('check-answer.js',[path.join(rc,s+'.answer.md'),'--run',run]); });
node('add-draft.js',['--run',run,'--file','draft.md']);
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','05-final','--seat',s,'--final','sn']); node('packet.js',['--run',run,'--round','05-final','--seat',s,'--final','redflag']); });
var r4=path.join(run,'rounds','05-final');
write(path.join(r4,'seat-1.sn.answer.md'),'S/N RATIO: 70%\nSignal.\n');
write(path.join(r4,'seat-1.redflag.answer.md'),'RED FLAGS FOUND: 1\nOne.\n');
write(path.join(r4,'seat-2.sn.answer.md'),'S/N RATIO: 55%\nHalf.\n');
write(path.join(r4,'seat-2.redflag.answer.md'),'NO RED FLAGS\nNone.\n');
['seat-1.sn','seat-1.redflag','seat-2.sn','seat-2.redflag'].forEach(function(f){ node('check-answer.js',[path.join(r4,f+'.answer.md'),'--run',run]); });

var rb=node('render-board.js',['--run',run]);
check(rb.status===0&&rb.stdout.trim()===path.join(run,'board.html'),'render-board: exit '+rb.status+' '+rb.stderr+' '+rb.stdout);
var html=fs.readFileSync(path.join(run,'board.html'),'utf8');
var body=html.slice(html.indexOf('<body'));
var textOnly=body.replace(/<script>[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,'\n').split('\n').map(function(l){return l.trim();}).filter(Boolean);
check(textOnly[0]==='Reading is Peace. Writing is War.','board: first visible text is "'+textOnly[0]+'", not the motto');
check(html.indexOf(CREDIT)<0,'board: carries the credit line');

// No external request.
check(!/\b(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(html),'board: an external URL appears');
function onlyDataFonts(h){ return (h.match(/url\(/gi)||[]).length===(h.match(/url\(data:font\/woff2;base64,/g)||[]).length; }
check(!/<link\b/i.test(html)&&!/<script[^>]+src=/i.test(html)&&!/<img\b/i.test(html)&&!/<iframe\b/i.test(html)&&!/@import/i.test(html)&&onlyDataFonts(html)&&!/\bfetch\(/.test(html)&&!/XMLHttpRequest/.test(html),'board: a fetched resource or a request appears');
// The four faces ride as data (Part 106): one @font-face each, every url( a data font, no other.
check((html.match(/@font-face\{/g)||[]).length===4&&(html.match(/url\(data:font\/woff2;base64,/g)||[]).length===4&&['"Source Serif 4"','"Manrope"','"JetBrains Mono"','"Inter"'].every(function(f){return html.indexOf('@font-face{font-family:'+f+';')>=0;}),'board: the four faces must be embedded as data, one @font-face each');
var hrefs=html.match(/href="[^"]*"/g)||[];
check(hrefs.length===1&&hrefs[0]==='href="record.md"','board: hrefs are '+JSON.stringify(hrefs)+', expected only record.md');

// The draft, in full, above the seats.
check(/<h2>The draft · draft-2\.md, a revision<\/h2>/.test(html),'board: the newest draft must be named as a revision');
check(/<div class="paper"><p>Dear board, buy the company\.<\/p><\/div>/.test(html),'board: the draft text is not on the page in full');
check(html.indexOf('<div class="paper">')<html.indexOf('<h2 class="sr">The seats</h2>'),'board: the draft must come before the seats');
// The frame (Part 106): the strip, the top box with its three panels and the side column, the hand, the bar.
check(/<header class="strip">/.test(html)&&/<section class="top"><div class="panels">\s*<section class="panel" id="panel-draft" role="tabpanel" aria-labelledby="tab-draft">/.test(html)&&/<section class="panel" id="panel-scoreboard" role="tabpanel" aria-labelledby="tab-scoreboard" hidden>/.test(html)&&/<section class="panel" id="panel-details" role="tabpanel" aria-labelledby="tab-details" hidden>/.test(html)&&/<section class="hand" aria-label="The seats">/.test(html)&&/<footer class="bar">/.test(html),'board: the frame is the strip, the top box with three panels, the hand and the bar');
// The draft panel's own flex rule (Part 118) outranks the page's own .panel[hidden]{display:none} and the browser's [hidden] rule by specificity, so the
// panel needs its own hidden rule (Part 120): without it a tab switch leaves the draft in the box and the chosen
// panel renders under it, out of view.
check(/#panel-draft\[hidden\]\{display:none\}/.test(html),'board: the draft panel must carry its own hidden rule, #panel-draft[hidden]{display:none}, or the tabs leave the draft in the box');
check(/<div class="tabs" role="tablist"[^>]*><button type="button" role="tab" class="tab" id="tab-draft" aria-selected="true" aria-controls="panel-draft">Draft<\/button><button type="button" role="tab" class="tab" id="tab-scoreboard" aria-selected="false" aria-controls="panel-scoreboard">Scoreboard<\/button><button type="button" role="tab" class="tab" id="tab-details" aria-selected="false" aria-controls="panel-details">Run details<\/button><\/div>/.test(html)&&/tabs\[i\]\.addEventListener\("click"/.test(html),'board: the three tabs with the draft selected first, wired to the panels');
check(/<div class="context"><p><b>Brief\.<\/b> CEO\. Get a yes\.<\/p><p class="under">Measured facts, the full brief and the record are under Run details\.<\/p><\/div>/.test(html)&&/<header class="strip"><div class="row"><div class="left"><p class="motto kicker">[^]*?<\/h1><\/div><div class="right"><div class="tabs"/.test(html),'board: the strip carries the tabs on the title line and the brief with the pointer under it (Part 118)');
check(/<aside class="side" aria-label="The round">\s*<p class="round"><b>Round 05-final<\/b>/.test(html),'board: the side column carries the latest round\'s line (Part 118)');
// The draft fold (Part 118): none on a five-word draft.
check(!/class="fold draft-fold"/.test(html),'board: a short draft shows no fold button');

// No verdict box (issue 175): seat-1's latest is 8 (03-battle), seat-2's is 4, and nothing sits over them.
check(!/class="verdict/.test(html)&&!/aria-label="Verdict"/.test(html)&&!/<p class="word">/.test(html),'board: no verdict box anywhere');

// One frame per seat, from the seat's latest turn (04-battle for all three).
var frames=html.match(/<figure class="frame[^"]*" data-seat="seat-\d"/g)||[];
check(frames.length===3&&frames[0].indexOf('seat-1')>0&&frames[1].indexOf('seat-2')>0&&frames[2].indexOf('seat-3')>0,'board: expected one frame per seat in seat order, got '+JSON.stringify(frames));
var f1=/<figure class="frame critique co-anthropic" data-seat="seat-1">([\s\S]*?)<\/figure>/.exec(html);
check(!!f1&&/^<span class="suit">Anthropic<\/span><span class="badge critique">/.test(f1[1]),'board: the card opens with the company as the suit, then the badge; got '+(f1?f1[1].slice(0,120):''));
check(!!f1&&/<span class="badge critique">Critique · no rating asked<\/span>/.test(f1[1]),'board: seat-1\'s frame should carry the critique badge');
check(!!f1&&/<blockquote>The close is the problem, as seat-2 said\.<\/blockquote>/.test(f1[1]),'board: seat-1\'s frame should quote its verdict sentence');
check(!!f1&&/<figcaption>— Test Model \(Anthropic\), seat-1 <span class="seat">· round 04-battle<\/span><\/figcaption>/.test(f1[1]),'board: seat-1\'s citation is wrong');
check(!!f1&&/<p class="final">05-final: S\/N 70% · 1 red flag<\/p>/.test(f1[1]),'board: seat-1\'s frame should carry its final numbers');
check(!!f1&&/<div class="full"><div class="read"><p>The close is the problem, as seat-2 said\.<\/p><\/div><button type="button" class="fold" aria-expanded="false">\+ The full critique \(8 words\)<\/button><\/div>/.test(f1[1]),'board: seat-1\'s full read should be on the card with the fold button under it');
var f2=/<figure class="frame missing co-anthropic" data-seat="seat-2">([\s\S]*?)<\/figure>/.exec(html);
check(!!f2&&/<span class="badge missing">Missing<\/span>/.test(f2[1])&&/<blockquote>No answer this round\. Nothing stands in for it\.<\/blockquote>/.test(f2[1])&&f2[1].indexOf('class="full"')<0&&f2[1].indexOf('class="ix')<0,'board: seat-2\'s frame should say missing with no read and no index');
check(!!f2&&/<p class="final">05-final: S\/N 55% · no red flags<\/p>/.test(f2[1]),'board: seat-2\'s frame should carry its final numbers');
var f3=/<figure class="frame failed co-anthropic" data-seat="seat-3">([\s\S]*?)<\/figure>/.exec(html);
check(!!f3&&/<span class="badge failed">Failed read<\/span>/.test(f3[1])&&/<blockquote>Failed read: this round asked for no rating; remove the RATING line and open with your critique\.<\/blockquote>/.test(f3[1]),'board: seat-3\'s frame should say failed read with the reason');
check(!!f3&&/<div class="full"><div class="read failed">[^]*?<\/div><button type="button" class="fold" aria-expanded="false">\+ The failed read \(4 words\)<\/button><\/div>/.test(f3[1]),'board: seat-3\'s failed read is on the card, the fold button under it');
// The fold (Part 117): the toggle opens the card over the whole hand with the read at reading width.
check(/\.hand\{position:relative;/.test(html)&&/\.frame\.open\{position:absolute;top:0;left:0;right:0;bottom:0;height:auto;min-height:0;overflow:auto;z-index:2\}/.test(html)&&/\.frame\.open \.read\{overflow:visible;max-width:76ch/.test(html)&&/querySelectorAll\("\.frame \.fold"\)/.test(html)&&/classList\.toggle\("open",open\)/.test(html)&&/setAttribute\("aria-expanded",open\?"true":"false"\)/.test(html),'board: the fold button must open the card over the hand (the class, the CSS and the toggle)');
check(!!f3&&/<p class="final">05-final: S\/N missing · red flags missing<\/p>/.test(f3[1]),'board: seat-3\'s frame should say its final reads are missing');

// Under the Scoreboard tab: every round.
check(/<section class="panel" id="panel-scoreboard"[^>]*>\s*<h2>Every round: the scoreboard<\/h2>/.test(html),'board: the scoreboard must open the Scoreboard panel');
check(/<p class="note">Every number is one seat's own\. Nothing here is averaged\./.test(html),'board: the legend is missing from the scoreboard panel');
['01-sparring','02-battle','03-battle','04-battle','05-final'].forEach(function(r){ check(new RegExp('<th>'+r+'</th>').test(html),'board: no scoreboard column for '+r); });
check(/<th>Latest<\/th>/.test(html),'board: no Latest column');
['Test Model \\(Anthropic\\), seat-1','Test Model \\(Anthropic\\), seat-2','Test Model \\(Anthropic\\), seat-3'].forEach(function(s){
  var n=(html.match(new RegExp(s,'g'))||[]).length;
  check(n>=3,'board: '+s+' named by model and company fewer than 3 times ('+n+')');
});
check(/<td class="num critique"><span class="critique" title="this round asked for no rating">critique<\/span><\/td>/.test(html),'board: no critique cell for the no-rating round');
check(/<span class="failed" title="this round asked for no rating[^"]*">failed read<\/span>/.test(html),'board: a RATING line in a no-rating round should be a failed read');
check(/<td class="num flip-valid">6\/10<br><span class="mark" title="quoted seat-2">flip from 8, valid<\/span><\/td>/.test(html),'board: valid flip cell wrong');
check(/<td class="num flip-invalid">8\/10<br><span class="mark" title="[^"]*">flip from 6, INVALID<\/span><\/td>/.test(html),'board: invalid flip cell wrong');
check(/<td class="num stand">4\/10<br><span class="mark">Stand<\/span><\/td>/.test(html),'board: Stand cell wrong');
check(/<span class="missing">missing<\/span>/.test(html),'board: no missing cell');
check(/<span class="failed" title="rating is 7; 7 is forbidden[^"]*">failed read<\/span>/.test(html),'board: the 7/10 answer is not marked as a failed read');
check(/S\/N 70%<br>1 red flag<\/td>/.test(html)&&/S\/N 55%<br>no red flags<\/td>/.test(html)&&/S\/N missing<\/span><br><span class="missing">red flags missing/.test(html),'board: final cells wrong');
check(/<h2>Final reads<\/h2>/.test(html)&&/<td class="num">70%<\/td><td class="num">1<\/td>/.test(html),'board: final reads table wrong');
check(/<details class="fold"><summary>Test Model \(Anthropic\), seat-1 · 05-final · S\/N read \(4 words\)<\/summary><div class="read"><p>S\/N RATIO: 70%<br>Signal\.<\/p><\/div>/.test(html),'board: the final reads should be folded in full');

// Under the Run details tab.
check(/<section class="panel" id="panel-details"[^>]*>\s*<h2>Run details<\/h2>/.test(html),'board: no run details panel');
check(/<p class="meta"><strong>Seat key:<\/strong> seat-1 Test Model · seat-2 Test Model · seat-3 Test Model<\/p>/.test(html),'board: the seat key line is missing or wrong');
check(/<strong>Started at:<\/strong> /.test(html)&&/<strong>Crew:<\/strong> /.test(html)&&/<strong>Drafts:<\/strong> draft\.md \(5 words · 1 paragraph · 1 line\), draft-2\.md \(5 words · 1 paragraph · 1 line\)\./.test(html),'board: the run details are incomplete');

// No chart; nothing averaged; light and dark; a toggle.
check(!/<svg/.test(html)&&!/class="series"/.test(html)&&!/class="pt /.test(html),'board: the chart should be gone');
var prose=textOnly.join(' ');
check(!/\b(average|averaged|mean|overall rating|consensus|total)\b/i.test(prose.replace(/Nothing (here )?is averaged|never averaged/g,'')),'board: an averaging word appears');
check(!/\d\.\d+\/10/.test(html),'board: a fractional rating appears');
check(/@media \(prefers-color-scheme: dark\)/.test(html)&&/:root\[data-theme="dark"\]/.test(html)&&/:root:not\(\[data-theme="light"\]\)/.test(html),'board: light and dark not both defined with a toggle scope');
check(/<button type="button" id="theme"/.test(html),'board: no theme toggle');

// The draft's counts (2026-10-15, Part 21), under Run details since Part 106.
check(/<p class="meta facts"><strong>Measured by code \(facts, not a judgment\):<\/strong> 5 words · 1 paragraph · 1 line · 1 sentence · 0 em dashes, 0 en dashes, 0 double hyphens · no link\.<\/p>/.test(html)&&html.indexOf('<p class="meta facts">')>html.indexOf('id="panel-details"')&&html.indexOf('<p class="meta facts">')<html.indexOf('<strong>Started at:</strong>'),'board: the measured-by-code line should sit under Run details');
// The bar (Part 106): every seat's latest number in its company colour.
check(/<footer class="bar"><span class="kicker">Every round<\/span><span class="scores"><span class="score co-anthropic">seat-1 8\/10<\/span><span class="score co-anthropic">seat-2 4\/10<\/span><span class="score co-anthropic">seat-3 —<\/span><\/span>\s*<span class="kicker">Next<\/span><span class="cmd">\/cw:battle fq: a question for every seat<\/span><span class="cmd">\/cw:sparring debate<\/span><span class="cmd">\/cw:battle final<\/span><\/footer>/.test(html),'board: the bar should carry every seat\'s latest number and the next commands; got '+(/<footer class="bar">[^]*?<\/footer>/.exec(html)||[''])[0].slice(0,300));
// The round strip and the history (2026-10-15).
check(/<p class="round"><b>Round 05-final<\/b> · final reads: S\/N ratio and red flags · 2 of 3 seats answered<\/p>/.test(html),'board: the round strip should name the latest round and its task; got '+(/<p class="round">[^]*?<\/p>/.exec(html)||[''])[0]);
check(html.indexOf('<p class="round">')>html.indexOf('<div class="paper">')&&html.indexOf('<p class="round">')<html.indexOf('<h2 class="sr">The seats</h2>'),'board: the round line sits beside the draft, in the side column (Part 118)');
var hist=/<ul class="rounds">([^]*?)<\/ul>/.exec(html);
check(!!hist&&(hist[1].match(/<li>/g)||[]).length===5,'board: the history should list five rounds');
check(!!hist&&/<li><b>Round 02-battle<\/b> · the default prompt: “Read the other seats' latest answers\. Where do your interpretations overlap and where do they diverge\? Give a new critique and a new rating of the draft\.” · a new rating asked · 3 of 3 seats answered<\/li>/.test(hist[1]),'board: the history line for 02-battle is wrong');
check(!!hist&&/<li><b>Round 04-battle<\/b> · the default prompt: “[^”]*” · no rating asked · 2 of 3 seats answered<\/li>/.test(hist[1]),'board: the history line for 04-battle should say no rating asked and 2 of 3');
check(html.indexOf('<ul class="rounds">')>html.indexOf('Every round: the scoreboard'),'board: the history belongs in the scoreboard panel');
check(!/<span class="note-line">/.test(html),'board: no seat was asked something different, so no frame carries a note');

// A run with no round: no box; the no-rounds line under the draft heading.
var fresh=node('new-run.js',['--readers','1','--draft','draft.md','--brief','brief.md','--name','fresh','--stage','strategy','--model','Test Model']).stdout.trim();
node('render-board.js',['--run',fresh]);
var freshHtml=fs.readFileSync(path.join(fresh,'board.html'),'utf8');
check(!/class="verdict/.test(freshHtml)&&!/NO RATING/.test(freshHtml),'board (no rounds): there must be no verdict box at all');
check(/<h2>The draft<\/h2>\s*<p class="meta">No rounds yet\. The draft and the brief are stored; no seat has read it\. Next: \/cw:sparring for the first reads and ratings, or \/cw:battle to start with the discussion\.<\/p>/.test(freshHtml),'board (no rounds): the no-rounds line should sit under the draft heading');
check(!/<p class="round">/.test(freshHtml),'board (no rounds): no round strip');

// A run whose one round asked for no rating (a first battle round with an SN): no box, the
// strip carries the SN and the count; then final reads with still no rating: still no box.
var nr=seatMore(node('new-run.js',['--readers','1','--draft','draft.md','--name','norating','--stage','battle','--model','Test Model']).stdout.trim(),3,'Test Model');
write(path.join(proj,'sn.md'),'Is this ready to go to the board?\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',nr,'--round','01-battle','--seat',s,'--sn','sn.md']); });
write(path.join(nr,'rounds','01-battle','seat-1.answer.md'),'Not ready: the ask is buried.\n');
write(path.join(nr,'rounds','01-battle','seat-2.answer.md'),'Not ready. The close pleads.\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(nr,'rounds','01-battle',s+'.answer.md'),'--run',nr]); });
node('render-board.js',['--run',nr]);
var nrHtml=fs.readFileSync(path.join(nr,'board.html'),'utf8');
check(!/class="verdict/.test(nrHtml)&&!/NO RATING/.test(nrHtml),'board (no rating): there must be no verdict box; got '+(/<section class="verdict[^>]*>[^]*?<\/p>/.exec(nrHtml)||[''])[0]);
check(/<p class="round"><b>Round 01-battle<\/b> · SN: “Is this ready to go to the board\?” · no rating asked · 2 of 3 seats answered<\/p>/.test(nrHtml),'board (no rating): the strip should carry the SN, no rating asked and 2 of 3; got '+(/<p class="round">[^]*?<\/p>/.exec(nrHtml)||[''])[0]);
check(/<blockquote>Not ready: the ask is buried\.<\/blockquote>/.test(nrHtml)&&/<span class="badge critique">Critique · no rating asked<\/span>/.test(nrHtml),'board (no rating): the frames still carry the critiques');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',nr,'--round','02-final','--seat',s,'--final','sn']); node('packet.js',['--run',nr,'--round','02-final','--seat',s,'--final','redflag']); });
write(path.join(nr,'rounds','02-final','seat-1.sn.answer.md'),'S/N RATIO: 60%\nSome.\n');
write(path.join(nr,'rounds','02-final','seat-1.redflag.answer.md'),'NO RED FLAGS\nNone.\n');
['seat-1.sn','seat-1.redflag'].forEach(function(f){ node('check-answer.js',[path.join(nr,'rounds','02-final',f+'.answer.md'),'--run',nr]); });
node('render-board.js',['--run',nr]);
var nrfHtml=fs.readFileSync(path.join(nr,'board.html'),'utf8');
check(!/class="verdict/.test(nrfHtml)&&!/<p class="word">/.test(nrfHtml),'board (final reads, no rating): no box');
check(/<p class="round"><b>Round 02-final<\/b> · final reads: S\/N ratio and red flags · 1 of 3 seats answered<\/p>/.test(nrfHtml),'board (final reads): the strip should name the final round');
check(!/<figure class="frame/.test(freshHtml)&&!/<table/.test(freshHtml)&&/<main class="board norounds">/.test(freshHtml),'board (no rounds): no frames, no table, the frame without a hand');
check(/<h2>The draft<\/h2>/.test(freshHtml)&&/<div class="paper"><p>Dear board, buy the company\.<\/p><\/div>/.test(freshHtml),'board (no rounds): the draft is still on the page');

// A round of seat lines alone: round 2 goes to seat-2 only, with rerate. After round 1 every
// seat is at 8. After round 2 seat-2 is at 6, and the other frames cite round 1.
var so=seatMore(node('new-run.js',['--readers','1','--draft','draft.md','--name','seatonly','--model','Test Model']).stdout.trim(),3,'Test Model');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',so,'--round','01-sparring','--seat',s]); write(path.join(so,'rounds','01-sparring',s+'.answer.md'),'RATING: 8/10\nRound one. It ships as is.\n'); node('check-answer.js',[path.join(so,'rounds','01-sparring',s+'.answer.md'),'--run',so]); });
node('render-board.js',['--run',so]);
var sendHtml=fs.readFileSync(path.join(so,'board.html'),'utf8');
check(!/class="verdict/.test(sendHtml)&&(sendHtml.match(/<span class="badge sr">Rating 8\/10<\/span>/g)||[]).length===3&&(sendHtml.match(/<span class="ix tl" aria-hidden="true">8<small>of 10<\/small><\/span><span class="ix br" aria-hidden="true">8<small>of 10<\/small><\/span>/g)||[]).length===3,'board (all 8): no box; the three 8/10 are on the cards, as the badge and as the corner index');
write(path.join(proj,'q2.md'),'Does the close ask for the vote?\n');
node('packet.js',['--run',so,'--round','02-battle','--seat','seat-2','--question','q2.md','--rerate']);
write(path.join(so,'rounds','02-battle','seat-2.answer.md'),'RATING: 6/10\nNot in so many words. <script>alert(1)</script> is text, not markup.\n');
node('check-answer.js',[path.join(so,'rounds','02-battle','seat-2.answer.md'),'--run',so]);
node('check-flip.js',['--run',so,'--round','02-battle','--seat','seat-2']);
node('render-board.js',['--run',so]);
var soHtml=fs.readFileSync(path.join(so,'board.html'),'utf8');
check((soHtml.match(/<span class="missing" title="the round was put to other seats only">not asked<\/span>/g)||[]).length===2,'board: a seat-only round should show two not-asked cells');
check(!/<span class="missing">missing<\/span>/.test(soHtml)&&!/class="frame missing"/.test(soHtml),'board: an unasked seat must not be shown as missing in the table or a frame');
check(!/class="verdict/.test(soHtml),'board (seat-only round): no box over seat-2\'s 6');
check(/data-seat="seat-1">[\s\S]*?· round 01-sparring<\/span>/.test(soHtml)&&/data-seat="seat-2">[\s\S]*?· round 02-battle<\/span>/.test(soHtml),'board (seat-only round): the unasked seats cite round 1, seat-2 cites round 2');
check(/<span class="badge">Rating 6\/10<span class="mark">flip from 8, INVALID<\/span><\/span>/.test(soHtml),'board: the frame badge should carry the rating and the flip mark');
check(/<blockquote>Not in so many words\. &lt;script&gt;alert\(1\)&lt;\/script&gt; is text, not markup\.<\/blockquote>/.test(soHtml)&&soHtml.indexOf('<script>alert')<0,'board: a seat\'s words must be escaped, never markup');
check(/<p class="round"><b>Round 02-battle<\/b> · seat lines to seat-2 \(“Does the close ask for the vote\?”\) · a new rating asked · 1 of 1 seat answered<\/p>/.test(soHtml),'board (seat-only round): the strip should name the seat and its note; got '+(/<p class="round">[^]*?<\/p>/.exec(soHtml)||[''])[0]);
check(/data-seat="seat-2">[^]*?<span class="note-line">· your note: “Does the close ask for the vote\?”<\/span>/.test(soHtml)&&(soHtml.match(/<span class="note-line">/g)||[]).length===1,'board (seat-only round): only seat-2\'s frame carries the note');


// The frame and the markdown subset (Part 106). The CSS: one screen on a 100dvh grid, rows auto 3fr 7fr
// auto, the rows stacking under 1100 px; no page width cap and no character cap on the draft or the read;
// the identity table keyed by company; the tokens for light and for dark; wrapping on.
check(/main\.board\{height:100dvh;min-height:900px;[^}]*grid-template-rows:auto minmax\(0,3fr\) minmax\(0,7fr\) auto/.test(html)&&/@media \(max-width:1100px\)\{main\.board,main\.board\.norounds\{height:auto/.test(html)&&!/max-width:1360px/.test(html)&&!/\.paper\{[^}]*76ch/.test(html)&&!/70ch/.test(html)&&!/minmax\(360px/.test(html),'board: the frame CSS is wrong or the old measure survives');
check(/figure\.co-anthropic\{border:3px double var\(--c-anthropic\);border-radius:14px\}/.test(html)&&/figure\.co-alibaba\{border:2px solid var\(--c-alibaba\);border-radius:22px\}/.test(html)&&/figure\.co-openai\{border:4px solid var\(--c-openai\);border-radius:6px\}/.test(html)&&/figure\.co-anthropic blockquote\{font:600 25px\/1\.3 "Source Serif 4"/.test(html)&&/figure\.co-alibaba blockquote\{font:800 23px\/1\.3 Manrope/.test(html)&&/figure\.co-openai blockquote\{font:700 18px\/1\.4 "JetBrains Mono"/.test(html),'board: the identity table (the frame, the face and the accent per company) is missing an entry');
check(/:root\{color-scheme:light;--surface:#ECE9E1;--paper:#FFFDF8;--surface-2:#F6F3EC;--ink:#111111;/.test(html)&&/--c-anthropic:#C2410C;--c-alibaba:#1D4ED8;--c-openai:#1F2937;/.test(html)&&/:root\[data-theme="dark"\]\{color-scheme:dark;--surface:#0F1114;--paper:#1B1E24;--surface-2:#171A1F;--ink:#F3F1EA;/.test(html)&&/--c-anthropic:#F09A74;--c-alibaba:#7FB0FF;--c-openai:#C9D4DE;/.test(html),'board: the light and dark tokens are not the pinned pages\' values');
check((html.match(/overflow-wrap:anywhere/g)||[]).length>=5,'board: long words must wrap in the draft, the quote, the read, the cells and the strip');
// A read with markdown and a long address: lists, bold, italic and code render; the address stays
// text and wraps by CSS; a script tag inside bold is text; no new href; a heading is a bold paragraph.
var md=node('new-run.js',['--readers','1','--draft','draft.md','--name','markdown','--model','Test Model']).stdout.trim();
node('packet.js',['--run',md,'--round','01-sparring','--seat','seat-1']);
var LONG='https://example.invalid/a-very-long-path-segment/that-goes-on-and-on/and-on-and-on/and-never-breaks-on-its-own';
write(path.join(md,'rounds','01-sparring','seat-1.answer.md'),'RATING: 6/10\nNot ready: **the close** is *soft* and `the ask` is late.\n\n# What to fix\n\n* First point\n* Second **bold** point <script>alert(2)</script>\n\n1. Step one\n2) Step two with '+LONG+'\n\nA line\nwith a break and a [link](https://example.invalid/x) and 2 * 3 * 4 and a_snake_case_word.\n');
node('check-answer.js',[path.join(md,'rounds','01-sparring','seat-1.answer.md'),'--run',md]);
node('render-board.js',['--run',md]);
var mdHtml=fs.readFileSync(path.join(md,'board.html'),'utf8');
var mdRead=(/<div class="read">([^]*?)<\/div><button type="button" class="fold"/.exec(mdHtml)||['',''])[1];
check(mdRead.indexOf('<p>Not ready: <strong>the close</strong> is <em>soft</em> and <code>the ask</code> is late.</p>')>=0&&mdRead.indexOf('RATING:')<0,'board (markdown): bold, italic and code should render, the RATING line off the card (the index carries it); got '+mdRead.slice(0,200));
check(mdRead.indexOf('<p><strong>What to fix</strong></p>')>=0,'board (markdown): a heading line should be a bold paragraph');
check(mdRead.indexOf('<ul><li>First point</li><li>Second <strong>bold</strong> point &lt;script&gt;alert(2)&lt;/script&gt;</li></ul>')>=0,'board (markdown): bullets should be a list with the script tag as text; got '+mdRead);
check(mdRead.indexOf('<ol><li>Step one</li><li>Step two with '+LONG+'</li></ol>')>=0,'board (markdown): numbered lines should be an ordered list with the address as text');
check(mdRead.indexOf('<p>A line<br>with a break and a [link](https://example.invalid/x) and 2 * 3 * 4 and a_snake_case_word.</p>')>=0,'board (markdown): a link stays text, lone stars and underscores are left alone; got '+mdRead.slice(-200));
check(mdHtml.indexOf('<script>alert')<0&&!/<a /.test(mdRead)&&(mdHtml.match(/href=/g)||[]).length===1,'board (markdown): no markup from the seat, no new href');
check(/<blockquote>Not ready: the close is soft and the ask is late\.<\/blockquote>/.test(mdHtml),'board (markdown): the framed verdict line drops the marks');
// The canon controls (ruled 2026-10-19): only when the run holds a canon, three client-side
// controls on the draft panel, read aloud (speech synthesis with pause and stop), copy (the
// clipboard) and download (a .txt named for the run), the canon text in the page, the Shipped
// strip in the strip above the brief line, the heading naming the canon and the draft it froze, the Champion
// lines under the Run details tab; the page still has one href and makes no outside request. The fresh run above has no
// canon and none of it.
['canon-speak','canon-pause','canon-stop','canon-copy','canon-download','canon-text','round shipped','Champion: shipped'].forEach(function(id){ check(html.indexOf(id)<0&&freshHtml.indexOf(id)<0,'board (no canon): "'+id+'" must not be on the page'); });
fs.mkdirSync(path.join(proj,'combat-writing','inbox'),{recursive:true});
write(path.join(proj,'combat-writing','inbox','ship.shipped.md'),'https://www.example.invalid/posts/abc123 LinkedIn post\n');
write(path.join(proj,'combat-writing','inbox','ship.page.md'),'Dear board, buy the company.\n');
var sh=node('champion.js',['--run',run,'--kind','shipped','--file','combat-writing/inbox/ship.shipped.md','--page','combat-writing/inbox/ship.page.md','--at','2026-10-19T14:02:00Z']);
check(sh.status===0&&sh.stdout.trim()==='Shipped 2026-10-19 14:02 UTC · example.invalid (LinkedIn post) · canon.md froze draft-2.md · live: matches canon','champion shipped: exit '+sh.status+' '+sh.stdout+sh.stderr);
node('render-board.js',['--run',run]);
var shipHtml=fs.readFileSync(path.join(run,'board.html'),'utf8');
check(/<p class="round shipped"><b>Shipped<\/b> · 2026-10-19 14:02 UTC · example\.invalid \(LinkedIn post\) · canon\.md froze draft-2\.md · live: matches canon · www\.example\.invalid\/posts\/abc123 · 0 results · 0 insights<\/p>/.test(shipHtml),'board (canon): the Shipped strip is missing or wrong; got '+(/<p class="round shipped">[^]*?<\/p>/.exec(shipHtml)||[''])[0]);
check(shipHtml.indexOf('<p class="round shipped">')<shipHtml.indexOf('<div class="context">')&&shipHtml.indexOf('<p class="round shipped">')<shipHtml.indexOf('<h2>The draft'),'board (canon): the Shipped strip sits in the strip, above the brief line and the draft');
check(/<h2>The draft · draft-2\.md, a revision · shipped as canon\.md, which froze draft-2\.md<\/h2>/.test(shipHtml),'board (canon): the heading must name the canon and the draft it froze; got '+(/<h2>The draft[^<]*<\/h2>/.exec(shipHtml)||[''])[0]);
check(/<div class="canon-controls"[^>]*><span class="meta">Canon: canon\.md froze draft-2\.md<\/span> <button type="button" id="canon-speak"[^>]*>🔊 Read aloud<\/button> <button type="button" id="canon-pause"[^>]*>Pause<\/button> <button type="button" id="canon-stop"[^>]*>Stop<\/button> <button type="button" id="canon-copy"[^>]*>Copy<\/button> <button type="button" id="canon-download"[^>]*>Download \.txt<\/button>/.test(shipHtml),'board (canon): the three controls (read aloud with pause and stop, copy, download) are missing or out of order');
check(/<div id="canon-text" hidden>Dear board, buy the company\.\n<\/div>/.test(shipHtml),'board (canon): the canon text must be in the page, escaped, exactly');
check(/speechSynthesis/.test(shipHtml)&&/SpeechSynthesisUtterance/.test(shipHtml)&&/synth\.pause\(\)/.test(shipHtml)&&/synth\.resume\(\)/.test(shipHtml)&&/synth\.cancel\(\)/.test(shipHtml),'board (canon): the reading must use the browser\'s speech synthesis with pause, resume and stop');
check(/navigator\.clipboard/.test(shipHtml)&&/execCommand\("copy"\)/.test(shipHtml),'board (canon): copy must use the clipboard API with a fallback');
check(/a\.download="\d{4}-\d\d-\d\d-\d{4}-board-canon\.txt"/.test(shipHtml)&&/data:text\/plain;charset=utf-8,/.test(shipHtml),'board (canon): download must name the file for the run and build it from the text in the page');
check(/<h2>Champion: shipped, results, insights<\/h2>/.test(shipHtml)&&/<strong>Shipped:<\/strong> 2026-10-19 14:02 UTC · example\.invalid \(LinkedIn post\) · canon\.md froze draft-2\.md · live: matches canon · www\.example\.invalid\/posts\/abc123<\/p>/.test(shipHtml),'board (canon): the Champion heading must carry the Shipped line');
check(shipHtml.indexOf('Champion: shipped')>shipHtml.indexOf('id="panel-details"')&&shipHtml.indexOf('Champion: shipped')<shipHtml.indexOf('<h2>Run details</h2>'),'board (canon): the Champion heading sits under the Run details tab, before Run details');
check(!/\b(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(shipHtml)&&!/<link\b/i.test(shipHtml)&&!/<script[^>]+src=/i.test(shipHtml)&&!/<img\b/i.test(shipHtml)&&!/<iframe\b/i.test(shipHtml)&&!/@import/i.test(shipHtml)&&onlyDataFonts(shipHtml)&&!/\bfetch\(/.test(shipHtml)&&!/XMLHttpRequest/.test(shipHtml),'board (canon): the page must still make no outside request');
var shipHrefs=shipHtml.match(/href="[^"]*"/g)||[];
check(shipHrefs.length===1&&shipHrefs[0]==='href="record.md"','board (canon): hrefs are '+JSON.stringify(shipHrefs)+', expected only record.md');
check(!/<a /.test(shipHtml.replace(/<a href="record\.md">/,'')),'board (canon): the address must be text, never a link');

// The strip and the side column condense a long text (Part 117, issue 180): a 300-character SN prompt is cut at a
// sentence end before 160 with an ellipsis on the strip and kept whole in the history; a short prompt stays verbatim
// (the SN run above); a 400-character brief is condensed on the strip's brief line and whole under Run details.
var LONGSN='The first sentence asks whether the close asks for the vote. The second sentence asks whether the numbers in the second paragraph are the numbers the board will check against the deck. The third sentence asks whether the greeting is the one the chair uses in writing. The fourth sentence asks about the sign-off.';
var LONGBRIEF='Chief executive of an invented company writing to an invented board. '+'The stakes are the vote on the letter of intent at the next meeting. '.repeat(5)+'Rules: one ask, one page.';
write(path.join(proj,'longsn.md'),LONGSN+'\n'); write(path.join(proj,'longbrief.md'),LONGBRIEF+'\n');
var ln=node('new-run.js',['--readers','1','--draft','draft.md','--brief','longbrief.md','--name','longsn','--stage','battle','--model','Test Model']).stdout.trim();
node('packet.js',['--run',ln,'--round','01-battle','--seat','seat-1','--sn','longsn.md']);
write(path.join(ln,'rounds','01-battle','seat-1.answer.md'),'Not ready: the ask is buried.\n');
node('check-answer.js',[path.join(ln,'rounds','01-battle','seat-1.answer.md'),'--run',ln]);
node('render-board.js',['--run',ln]);
var lnHtml=fs.readFileSync(path.join(ln,'board.html'),'utf8');
var lnStrip=(/<p class="round">([^]*?)<\/p>/.exec(lnHtml)||['',''])[1];
check(/^<b>Round 01-battle<\/b> · SN: “The first sentence asks whether the close asks for the vote\.…” · no rating asked · 1 of 1 seat answered$/.test(lnStrip),'board (long prompt): the strip carries the prompt cut at a sentence end with an ellipsis; got '+lnStrip.slice(0,220));
check(lnHtml.indexOf('<li><b>Round 01-battle</b> · SN: “'+LONGSN+'” · no rating asked · 1 of 1 seat answered</li>')>=0,'board (long prompt): the history keeps the whole prompt');
var lnSide=(/<div class="context"><p><b>Brief\.<\/b> ([^<]*)<\/p>/.exec(lnHtml)||['',''])[1];
// The draft fold (Part 118): a 150-word draft carries the button that opens the top box over the hand.
write(path.join(proj,'longdraft.md'),('Dear board, buy the company. ').repeat(30).trim()+'\n');
var ld=node('new-run.js',['--readers','1','--draft','longdraft.md','--name','longdraft','--model','Test Model']).stdout.trim();
node('packet.js',['--run',ld,'--round','01-sparring','--seat','seat-1']);
write(path.join(ld,'rounds','01-sparring','seat-1.answer.md'),'RATING: 8/10\nIt ships.\n');
node('check-answer.js',[path.join(ld,'rounds','01-sparring','seat-1.answer.md'),'--run',ld]);
node('render-board.js',['--run',ld]);
var ldHtml=fs.readFileSync(path.join(ld,'board.html'),'utf8');
check(/<\/div>\s*<button type="button" class="fold draft-fold" aria-expanded="false">\+ The full draft \(150 words\)<\/button>/.test(ldHtml)&&/main\.board\.norounds,main\.board\.draft-open\{grid-template-rows:auto minmax\(0,1fr\) auto\}main\.board\.draft-open \.hand\{display:none\}#panel-draft\{display:flex;flex-direction:column;min-height:0;height:100%\}#panel-draft \.paper\{overflow:auto;min-height:0;flex:1 1 auto\}/.test(ldHtml)&&/querySelector\("\.draft-fold"\)/.test(ldHtml)&&/classList\.toggle\("draft-open",open\)/.test(ldHtml),'board (long draft): the fold button under the draft, the CSS and the toggle; got '+(/<button type="button" class="fold draft-fold"[^<]*/.exec(ldHtml)||['none'])[0]);
check(lnSide.length<LONGBRIEF.length&&/…$/.test(lnSide)&&lnSide.indexOf('Chief executive of an invented company')===0&&lnHtml.indexOf('<strong>Brief:</strong> '+LONGBRIEF)>=0,'board (long brief): the strip\'s brief line is condensed with an ellipsis and Run details carries the whole brief; got '+lnSide.slice(-80));
check(/<div class="context"><p><b>Brief\.<\/b> CEO\. Get a yes\.<\/p>/.test(html),'board (short brief): the strip\'s brief line stays verbatim');

// The log and a refusal.
var log=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){return JSON.parse(l);});
check(log.some(function(e){return e.event==='board.rendered'&&e.file==='board.html'&&e.rounds===5;}),'log: board.rendered missing');
var bad=path.join(proj,'nothing'); fs.mkdirSync(bad);
check(node('render-board.js',['--run',bad]).status===2,'render-board: a folder with no seats.json should exit 2');

// Read aloud on every read frame (issue 82): seat-1's critique frame carries the controls and its answer as
// plain text; the missing and failed frames carry none; the fresh run carries none; the script wires every
// frame to speech synthesis with pause, resume and stop; the page still has one href and no outside request.
check(!!f1&&/<div class="read-controls"><button type="button" class="seat-speak" aria-label="Read this seat's critique aloud">🔊 Read aloud<\/button> <button type="button" class="seat-pause"[^>]*disabled>Pause<\/button> <button type="button" class="seat-stop"[^>]*disabled>Stop<\/button> <select class="seat-voice" aria-label="Voice for this seat" hidden><option value="">Voice: automatic<\/option><\/select> <span class="meta seat-status" aria-live="polite"><\/span><\/div><div class="seat-text" hidden>The close is the problem, as seat-2 said\.<\/div><div class="full">/.test(f1[1]),'board (read aloud): seat-1\'s frame should carry the controls and the plain text before its read; got '+(f1?f1[1].slice(0,400):''));
check(!!f2&&f2[1].indexOf('seat-speak')<0&&!!f3&&f3[1].indexOf('seat-speak')<0,'board (read aloud): a missing or failed frame carries no control');
// A voice per seat (issue 101): the page picks a voice for every seat but seat-1, from the browser's list,
// the page's language first, local voices first, then by name; seat-1 keeps the default; the canon's reader sets none.
var vs=/function autoVoice\(k,all\)\{if\(!\(k>=1\)\)return null;[^]*?var pool=qualityPool\(all\);[^]*?pool\[\(k-1\)%pool\.length\][^]*?\}/.exec(html);
check(!!vs,'board (voices): autoVoice should pick every seat, seat-1 included, from the quality pool, the k-th distinct one; got '+(vs?vs[0].slice(0,120):'none'));
// THE VOICE FLOOR (issue 114): only Premium or Enhanced voices, Premium first, then the founder's order, then name; none installed means the browser default for every seat and no menu.
var qp=/function qualityPool\(all\)\{[^]*?tier\(v\)>0&&String\(v\.lang[^]*?\.slice\(0,2\)\.toLowerCase\(\)===lang[^]*?tier\(b\)-tier\(a\)\|\|rank\(a\)-rank\(b\)\|\|String\(a\.name\)\.localeCompare[^]*?return pool;\}/.exec(html);
check(!!qp&&/function tier\(v\)\{var n=String\(v\.name\|\|""\)\+" "\+String\(v\.voiceURI\|\|""\);return \/\\\(Premium\\\)\|\\\.premium\\\.\/i\.test\(n\)\?2:\(\/\\\(Enhanced\\\)\|\\\.enhanced\\\.\/i\.test\(n\)\?1:0\);\}/.test(html)&&/var ORDER=\["Ava","Nathan","Allison",/.test(html),'board (voices): the quality pool is Premium then Enhanced by name or identifier (Safari names them plainly, issue 119), Ava, Nathan, Allison first, the page language first');
check(/function chosenVoice\(f,all\)\{[^]*?var pool=qualityPool\(all\);for\(var i=0;i<pool\.length;i\+\+\)if\(voiceId\(pool\[i\]\)===id\|\|pool\[i\]\.name===id\|\|plainName\(pool\[i\]\)===plainName\(\{name:id\}\)\)return pool\[i\];if\(id\.indexOf\("\|"\)>=0\)\{store\(k,""\);/.test(html),'board (voices): a remembered browser id outside the quality pool is ignored and cleared (issue 119); a remembered voice name (a rendered voice, Part 82) is matched by name and never cleared');
check(html.indexOf('PREFERRED')<0&&html.indexOf('NOVELTY')<0&&html.indexOf('"Daniel"')<0&&html.indexOf('"Karen"')<0,'board (voices): no stock voice list survives; nothing stock is ever picked');
check(/function fillMenu\(f,all\)\{[^]*?if\(!pool\.length\)\{sel\.hidden=true;[^]*?return;\}sel\.hidden=false;/.test(html),'board (voices): the menu hides when no quality voice is installed and shows only the pool');
check(/var v=chosenVoice\(f,all\);if\(v\)\{u\.voice=v;u\.lang=v\.lang\|\|u\.lang;\}/.test(html)&&html.split('u.voice=v').length===2,'board (voices): the seat utterance takes the chosen voice and its language once, the canon none');
// Safari fills its list late (issue 111): every click waits for the list, a menu per read frame holds the person's pick, remembered in the browser, and the status line says when no other voice was found.
check(/function voicesNow\(cb\)\{[^]*?addEventListener\("voiceschanged",fire,\{once:true\}\);setTimeout\(fire,1500\);\}/.test(html)&&/say\("Finding a voice\."\);voicesNow\(function\(all\)\{var u=new SpeechSynthesisUtterance\(t\.textContent\);/.test(html),'board (voices): Read aloud waits for the browser list before it picks');
check(/function chosenVoice\(f,all\)\{[^]*?\(sel&&sel\.value\)\|\|stored\(k\)[^]*?return autoVoice\(k,all\);\}/.test(html)&&/localStorage\.getItem\("cw\.voice\.seat-"\+k\)/.test(html)&&/localStorage\.setItem\("cw\.voice\.seat-"\+k,id\)/.test(html),'board (voices): the menu pick wins, is remembered per seat in the browser, and automatic is the default');
check((html.match(/class="seat-voice"/g)||[]).length===(html.match(/class="seat-speak"/g)||[]).length&&/function fillMenu\(f,all\)/.test(html)&&/Voice: automatic/.test(html),'board (voices): one voice menu per read frame, filled from the list, automatic first');
check(/no voice named or identified as Premium or Enhanced among the "\+all\.length\+" in the list\./.test(html),'board (voices): the status line names the fallback, what was looked for, and the list size');
// THE VOICE FLOOR (issues 101, 111, 114): only Premium or Enhanced voices, seat-1 included, the stock and novelty sets never; the list primed at open.
check(/function plainName\(v\)\{var n=String\(v\.name\|\|""\);var p=n\.indexOf\(" \("\);/.test(html)&&html.indexOf('replace(/s*(.*)$/')<0,'board (voices): the preferred names rank first and the novelty voices are skipped');
check(/voicesNow\(function\(all\)\{for\(var i=0;i<frames\.length;i\+\+\)fillMenu\(frames\[i\],all\);\}\);/.test(html)&&/addEventListener\("voiceschanged",function\(\)\{pick=\{\};var all=synth\.getVoices\(\)\|\|\[\];/.test(html),'board (voices): the menus fill at open and refill, picks cleared, when the list arrives');
check(freshHtml.indexOf('class="seat-speak"')<0&&freshHtml.indexOf('class="seat-text"')<0&&freshHtml.indexOf('class="seat-voice"')<0,'board (read aloud): a run with no rounds carries no control, no voice menu and no spoken text');
check((html.match(/class="seat-speak"/g)||[]).length===1&&/querySelectorAll\("\.frame"\)/.test(html)&&/new SpeechSynthesisUtterance\(t\.textContent\)/.test(html)&&/playing\.idle\(\)/.test(html)&&(html.match(/href="[^"]*"/g)||[]).length===1,'board (read aloud): one control on the page, the script reading the seat text, one seat at a time, still one href');
var mdPlain=/<div class="seat-text" hidden>([^<]*)<\/div>/.exec(mdHtml);
check(!!mdPlain&&mdPlain[1].indexOf('**')<0&&mdPlain[1].indexOf('#')<0&&/Not ready: the close is soft and the ask is late\./.test(mdPlain[1]),'board (read aloud): the spoken text drops the markdown marks; got '+(mdPlain?mdPlain[1].slice(0,200):'none'));


// THE MAC SPEAKS THE FILES (Part 81, issue 121): with no voices.json a frame carries no file and the
// page keeps the browser path; the page's script carries the recording branch; with a round's
// voices.json and a file for one seat, that seat's frame carries the file, the voice and the rendered
// voices on disk (`data-renders`, Part 82; the installed list of Part 81 is gone), and a seat without a
// file carries none.
var h0=fs.readFileSync(path.join(run,'board.html'),'utf8');
check(h0.indexOf('data-audio=')<0,'board (files): no voices.json, no frame carries a file');
// Part 82 (issue 129): the menu on a frame with recordings lists the rendered voices, the default
// marked, a change swaps the recording and keeps the pick in the browser by seat id as the voice
// name, read back before the default on load; the "Tell the host" sentence is gone.
check(/var audioSrc=f\.getAttribute\("data-audio"\),renders=audioSrc\?rendersOf\(f\):\{\},current=f\.getAttribute\("data-voice"\)\|\|"";var kept=audioSrc\?stored\(seatNo\(f\)\):"";if\(kept&&renders\[kept\]\)\{current=kept;audioSrc=renders\[kept\]\.src;\}var au=audioSrc\?new Audio\(audioSrc\):null;/.test(h0)&&/a file the Mac rendered\./.test(h0)&&/\(n===dflt\?" \(default\)":""\)/.test(h0)&&/if\(renders\[sel\.value\]\)\{setRender\(sel\.value\);store\(seatNo\(f\),sel\.value\);say\(sel\.value\+" for this seat, kept in this browser for every run\."\);return;\}/.test(h0)&&/say\("Playing "\+\(current\|\|"the file"\)\+", a file the Mac rendered\."\)/.test(h0)&&/could not be played; reading with the browser instead/.test(h0),'board (files): the page plays the kept or default recording, the menu lists the rendered voices with the default marked, a change swaps the file and keeps the pick by seat, a failure falls back to the browser');
check(h0.indexOf('Tell the host')<0&&h0.indexOf('from the next round')<0&&h0.indexOf('data-voices')<0,'board (files): the host line and the next-round menu are gone (Part 82)');
var roundsDir=path.join(run,'rounds'), rnd=fs.readdirSync(roundsDir).sort().filter(function(r){return fs.existsSync(path.join(roundsDir,r,'seat-1.answer.md'));}).pop();
fs.writeFileSync(path.join(roundsDir,rnd,'voices.json'),JSON.stringify({engine:'macOS say',installed:['Ava (Premium)','Nathan (Enhanced)','Zoe (Premium)'],assigned:{'seat-1':'Ava (Premium)','seat-2':'Nathan (Enhanced)'},files:{'seat-1':'seat-1.m4a','seat-2':'seat-2.m4a'},seconds:{'seat-1':38.2},renders:{'seat-1':{'Ava (Premium)':{file:'seat-1.m4a',seconds:38.2},'Nathan (Enhanced)':{file:'seat-1.nathan-enhanced.m4a',seconds:40.1},'Zoe (Premium)':{file:'seat-1.zoe-premium.m4a',seconds:39}},'seat-2':{'Nathan (Enhanced)':{file:'seat-2.m4a',seconds:30}}},failed:{}}));
fs.writeFileSync(path.join(roundsDir,rnd,'seat-1.m4a'),'not audio, a stand-in');
fs.writeFileSync(path.join(roundsDir,rnd,'seat-1.nathan-enhanced.m4a'),'not audio, a stand-in');
node('render-board.js',['--run',run]);
var h1=fs.readFileSync(path.join(run,'board.html'),'utf8');
var seat1Frame=/<figure class="frame [^"]*" data-seat="seat-1" data-audio="([^"]*)" data-voice="([^"]*)" data-renders="([^"]*)">/.exec(h1);
var renders1=null; try{ renders1=JSON.parse(seat1Frame[3].replace(/&quot;/g,'"').replace(/&amp;/g,'&')); }catch(e){}
check(!!seat1Frame&&seat1Frame[1]==='rounds/'+rnd+'/seat-1.m4a'&&seat1Frame[2]==='Ava (Premium)'&&!!renders1&&JSON.stringify(renders1)===JSON.stringify({'Ava (Premium)':{src:'rounds/'+rnd+'/seat-1.m4a',seconds:38.2},'Nathan (Enhanced)':{src:'rounds/'+rnd+'/seat-1.nathan-enhanced.m4a',seconds:40.1}}),'board (files): seat-1 carries its file, its voice and the rendered voices on disk, its own first, a listed render missing on disk left out: '+(seat1Frame?seat1Frame.slice(1).join(' | '):'none'));
check((h1.match(/data-audio=/g)||[]).length===1,'board (files): a seat whose file is listed but missing on disk carries none');
fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'board_check: '+failures.length+' failure(s), ':'board_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
