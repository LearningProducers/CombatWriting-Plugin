// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// board_check.js: board.html is the result (2026-10-14): one self-contained page that opens
// with the newest draft, the verdict across the page, one framed quote per seat, and folds the
// full reads and the scoreboard of every round under a click; it averages nothing and fetches
// nothing.
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
//     <iframe>; the only href is the relative link to record.md.
//   - The newest draft is on the page in full, escaped, named as a revision when it is one,
//     above the verdict.
//   - The round strip (ruled 2026-10-15): the latest round's task in words at the top of the
//     page, from the packet (the prompt itself for SN, SFQ, N and FQ; the seat lines with each
//     note; the final reads), whether a rating was asked, and how many seats answered; the same
//     line for every round in the history under the scoreboard; the record's round line carries
//     the same task, never the inbox file name.
//   - The verdict box, only over a number (ruled 2026-10-15): SEND when every rated seat's
//     latest rating is 8 or more; BACK TO THE DRAWING BOARD when any seat's is 6 or less,
//     naming that seat and its number; the band lists every rated seat's latest number, never
//     an average; a failed read counts for nothing; FINAL READS over each seat's S/N and
//     red-flag numbers when the run holds final reads and no rating; no box at all with no
//     number, on a run with no round and on a run whose rounds asked for no rating.
//   - One frame per seat, in seat order, from the seat's latest turn: the rating or its state
//     (Critique, Failed read, Missing, Not yet read) on the frame with the flip or Stand mark,
//     the one-line verdict (the first sentence after the first line, cut at a sentence end
//     before 200 characters), the citation to the model by name and company with the round,
//     and the seat's own note only when that seat was asked something different (a seat line),
//     the final reads' numbers when a final round exists, and the full read folded under a
//     <details>; a missing seat has no fold; a seat's words are escaped, never markup.
//   - Folded: the scoreboard of every round (one column per round, the legend, a valid flip
//     with the earlier number kept and the cited seat, an invalid flip marked INVALID, Stand,
//     missing, a failed read, a no-rating round's critique cell and its RATING-line failure,
//     the final round's S/N and red-flag cells, the Latest column), the final reads table and
//     their full reads, and the run details (the crew line, the seat key, the drafts, the
//     Started-at line, the record.md link).
//   - A round put to one seat only shows "not asked" for the others in the table, never
//     "missing", and their frames cite their latest earlier round.
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
// The crew is one fresh reader, never padded (ruled 2026-10-09, enforced 2026-10-12): the extra
// seats a test needs are written into seats.json the way the add-on's crew_register writes an
// outside seat (a provider field), so packet.js seats them; a second fresh reader it refuses.
function seatMore(run,n,model,company){ var f=path.join(run,'seats.json'); var sj=JSON.parse(fs.readFileSync(f,'utf8')); for(var i=sj.seats.length+1;i<=n;i++)sj.seats.push({id:'seat-'+i,model:model,company:company||'Anthropic',provider:'test-fixture',source:'test fixture: an outside seat as the add-on would register it'}); fs.writeFileSync(f,JSON.stringify(sj,null,2)+'\n'); return run; }

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
var run=seatMore(node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','board','--model','Test Model']).stdout.trim(),3,'Test Model');
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
check(!/<link\b/i.test(html)&&!/<script[^>]+src=/i.test(html)&&!/<img\b/i.test(html)&&!/<iframe\b/i.test(html)&&!/@import/i.test(html)&&!/url\(/i.test(html)&&!/\bfetch\(/.test(html)&&!/XMLHttpRequest/.test(html),'board: a fetched resource or a request appears');
var hrefs=html.match(/href="[^"]*"/g)||[];
check(hrefs.length===1&&hrefs[0]==='href="record.md"','board: hrefs are '+JSON.stringify(hrefs)+', expected only record.md');

// The draft, in full, above the verdict.
check(/<h2>The draft · draft-2\.md, a revision<\/h2>/.test(html),'board: the newest draft must be named as a revision');
check(/<div class="paper"><p>Dear board, buy the company\.<\/p><\/div>/.test(html),'board: the draft text is not on the page in full');
check(html.indexOf('<div class="paper">')<html.indexOf('<section class="verdict'),'board: the draft must come before the verdict');

// The verdict: seat-1's latest is 8 (03-battle), seat-2's is 4, seat-3 has no sound rating.
check(/<section class="verdict back"[^>]*><p class="word">BACK TO THE DRAWING BOARD<\/p>/.test(html),'board: the verdict should be BACK TO THE DRAWING BOARD');
check(/<p class="why">Test Model \(Anthropic\), seat-2 rated it 4\/10: a problem document by that seat&#39;s own number\. Nothing is averaged; one seat at 6 or less sends it back\.<\/p>/.test(html.replace(/'/g,'&#39;')),'board: the verdict line must name seat-2 and its 4/10; got '+(/<p class="why">[^<]*/.exec(html)||[''])[0]);
check(/<ul class="numbers"><li><b>8\/10<\/b>Test Model \(Anthropic\), seat-1<\/li><li><b>4\/10<\/b>Test Model \(Anthropic\), seat-2<\/li><\/ul>/.test(html),'board: the verdict band must list the two rated seats\' latest numbers and no third');

// One frame per seat, from the seat's latest turn (04-battle for all three).
var frames=html.match(/<figure class="frame[^"]*" data-seat="seat-\d"/g)||[];
check(frames.length===3&&frames[0].indexOf('seat-1')>0&&frames[1].indexOf('seat-2')>0&&frames[2].indexOf('seat-3')>0,'board: expected one frame per seat in seat order, got '+JSON.stringify(frames));
var f1=/<figure class="frame critique" data-seat="seat-1">([\s\S]*?)<\/figure>/.exec(html);
check(!!f1&&/<span class="badge critique">Critique · no rating asked<\/span>/.test(f1[1]),'board: seat-1\'s frame should carry the critique badge');
check(!!f1&&/<blockquote>The close is the problem, as seat-2 said\.<\/blockquote>/.test(f1[1]),'board: seat-1\'s frame should quote its verdict sentence');
check(!!f1&&/<figcaption>— Test Model \(Anthropic\), seat-1 <span class="seat">· round 04-battle<\/span><\/figcaption>/.test(f1[1]),'board: seat-1\'s citation is wrong');
check(!!f1&&/<p class="final">05-final: S\/N 70% · 1 red flag<\/p>/.test(f1[1]),'board: seat-1\'s frame should carry its final numbers');
check(!!f1&&/<details><summary>Read the full critique \(8 words\)<\/summary><div class="read"><p>The close is the problem, as seat-2 said\.<\/p><\/div><\/details>/.test(f1[1]),'board: seat-1\'s full read should be folded under a click');
var f2=/<figure class="frame missing" data-seat="seat-2">([\s\S]*?)<\/figure>/.exec(html);
check(!!f2&&/<span class="badge missing">Missing<\/span>/.test(f2[1])&&/<blockquote>No answer this round\. Nothing stands in for it\.<\/blockquote>/.test(f2[1])&&f2[1].indexOf('<details>')<0,'board: seat-2\'s frame should say missing with no fold');
check(!!f2&&/<p class="final">05-final: S\/N 55% · no red flags<\/p>/.test(f2[1]),'board: seat-2\'s frame should carry its final numbers');
var f3=/<figure class="frame failed" data-seat="seat-3">([\s\S]*?)<\/figure>/.exec(html);
check(!!f3&&/<span class="badge failed">Failed read<\/span>/.test(f3[1])&&/<blockquote>Failed read: this round asked for no rating; remove the RATING line and open with your critique\.<\/blockquote>/.test(f3[1]),'board: seat-3\'s frame should say failed read with the reason');
check(!!f3&&/<details><summary>The failed read \(4 words\)<\/summary><div class="read failed">/.test(f3[1]),'board: seat-3\'s failed read should be folded under a click');
check(!!f3&&/<p class="final">05-final: S\/N missing · red flags missing<\/p>/.test(f3[1]),'board: seat-3\'s frame should say its final reads are missing');

// Folded: every round, the scoreboard.
check(/<details class="fold"><summary>Every round: the scoreboard<\/summary>/.test(html),'board: the scoreboard must be folded under "Every round"');
check(/<p class="note">Every number is one seat's own\. Nothing here is averaged\./.test(html),'board: the legend is missing from the fold');
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
check(/<summary>Test Model \(Anthropic\), seat-1 · 05-final · S\/N read \(4 words\)<\/summary><div class="read"><p>S\/N RATIO: 70%<br>Signal\.<\/p><\/div>/.test(html),'board: the final reads should be folded in full');

// Run details.
check(/<details class="fold"><summary>Run details<\/summary>/.test(html),'board: no run details fold');
check(/<p class="meta"><strong>Seat key:<\/strong> seat-1 Test Model · seat-2 Test Model · seat-3 Test Model<\/p>/.test(html),'board: the seat key line is missing or wrong');
check(/<strong>Started at:<\/strong> /.test(html)&&/<strong>Crew:<\/strong> /.test(html)&&/<strong>Drafts:<\/strong> draft\.md, draft-2\.md\./.test(html),'board: the run details are incomplete');

// No chart; nothing averaged; light and dark; a toggle.
check(!/<svg/.test(html)&&!/class="series"/.test(html)&&!/class="pt /.test(html),'board: the chart should be gone');
var prose=textOnly.join(' ');
check(!/\b(average|averaged|mean|overall rating|consensus|total)\b/i.test(prose.replace(/Nothing (here )?is averaged|never averaged/g,'')),'board: an averaging word appears');
check(!/\d\.\d+\/10/.test(html),'board: a fractional rating appears');
check(/@media \(prefers-color-scheme: dark\)/.test(html)&&/:root\[data-theme="dark"\]/.test(html)&&/:root:not\(\[data-theme="light"\]\)/.test(html),'board: light and dark not both defined with a toggle scope');
check(/<button type="button" id="theme"/.test(html),'board: no theme toggle');

// The round strip and the history (2026-10-15).
check(/<p class="round"><b>Round 05-final<\/b> · final reads: S\/N ratio and red flags · 2 of 3 seats answered<\/p>/.test(html),'board: the round strip should name the latest round and its task; got '+(/<p class="round">[^]*?<\/p>/.exec(html)||[''])[0]);
check(html.indexOf('<p class="round">')<html.indexOf('<h2>The draft'),'board: the round strip must sit above the draft');
var hist=/<ul class="rounds">([^]*?)<\/ul>/.exec(html);
check(!!hist&&(hist[1].match(/<li>/g)||[]).length===5,'board: the history should list five rounds');
check(!!hist&&/<li><b>Round 02-battle<\/b> · the default prompt: “Read the other seats' latest answers\. Where do your interpretations overlap and where do they diverge\? Give a new critique and a new rating of the draft\.” · a new rating asked · 3 of 3 seats answered<\/li>/.test(hist[1]),'board: the history line for 02-battle is wrong');
check(!!hist&&/<li><b>Round 04-battle<\/b> · the default prompt: “[^”]*” · no rating asked · 2 of 3 seats answered<\/li>/.test(hist[1]),'board: the history line for 04-battle should say no rating asked and 2 of 3');
check(html.indexOf('<ul class="rounds">')>html.indexOf('Every round: the scoreboard'),'board: the history belongs in the scoreboard fold');
check(!/<span class="note-line">/.test(html),'board: no seat was asked something different, so no frame carries a note');

// A run with no round: no box; the no-rounds line under the draft heading.
var fresh=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','fresh','--stage','strategy','--model','Test Model']).stdout.trim();
node('render-board.js',['--run',fresh]);
var freshHtml=fs.readFileSync(path.join(fresh,'board.html'),'utf8');
check(!/class="verdict/.test(freshHtml)&&!/NO RATING/.test(freshHtml),'board (no rounds): there must be no verdict box at all');
check(/<h2>The draft<\/h2>\s*<p class="meta">No rounds yet\. The draft and the brief are stored; no seat has read it\. Next: \/cw:sparring for the first reads and ratings, or \/cw:battle to start with the discussion\.<\/p>/.test(freshHtml),'board (no rounds): the no-rounds line should sit under the draft heading');
check(!/<p class="round">/.test(freshHtml),'board (no rounds): no round strip');

// A run whose one round asked for no rating (a first battle round with an SN): no box, the
// strip carries the SN and the count; then final reads with still no rating: a FINAL READS box.
var nr=seatMore(node('new-run.js',['--draft','draft.md','--name','norating','--stage','battle','--model','Test Model']).stdout.trim(),3,'Test Model');
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
check(/<section class="verdict final"[^>]*><p class="word">FINAL READS<\/p><p class="why">No seat has rated this draft\. These are the final reads of round 02-final, each seat's own S\/N ratio and red-flag count\. Nothing is averaged\.<\/p>\s*<ul class="numbers"><li><b>S\/N 60% · no red flags<\/b>Test Model \(Anthropic\), seat-1<\/li><li><b>S\/N missing · red flags missing<\/b>Test Model \(Anthropic\), seat-2<\/li>/.test(nrfHtml),'board (final reads, no rating): the box should be FINAL READS over each seat\'s two numbers; got '+(/<section class="verdict[^>]*>[^]*?<\/ul>/.exec(nrfHtml)||[''])[0].slice(0,400));
check(/<p class="round"><b>Round 02-final<\/b> · final reads: S\/N ratio and red flags · 1 of 3 seats answered<\/p>/.test(nrfHtml),'board (final reads): the strip should name the final round');
check(!/<figure class="frame/.test(freshHtml)&&!/Every round: the scoreboard/.test(freshHtml),'board (no rounds): no frames and no scoreboard fold');
check(/<h2>The draft<\/h2>/.test(freshHtml)&&/<div class="paper"><p>Dear board, buy the company\.<\/p><\/div>/.test(freshHtml),'board (no rounds): the draft is still on the page');

// A round of seat lines alone: round 2 goes to seat-2 only, with rerate. After round 1 every
// seat is at 8: SEND. After round 2 seat-2 is at 6: BACK, and the other frames cite round 1.
var so=seatMore(node('new-run.js',['--draft','draft.md','--name','seatonly','--model','Test Model']).stdout.trim(),3,'Test Model');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',so,'--round','01-sparring','--seat',s]); write(path.join(so,'rounds','01-sparring',s+'.answer.md'),'RATING: 8/10\nRound one. It ships as is.\n'); node('check-answer.js',[path.join(so,'rounds','01-sparring',s+'.answer.md'),'--run',so]); });
node('render-board.js',['--run',so]);
var sendHtml=fs.readFileSync(path.join(so,'board.html'),'utf8');
check(/<section class="verdict send"[^>]*><p class="word">SEND<\/p><p class="why">Every rated seat put it at 8 or more: a working document by each seat's own number\. Nothing is averaged\.<\/p>/.test(sendHtml),'board (all 8): the verdict should be SEND; got '+(/<p class="word">[^<]*/.exec(sendHtml)||[''])[0]);
check((sendHtml.match(/<li><b>8\/10<\/b>/g)||[]).length===3,'board (all 8): the band should list three 8/10');
write(path.join(proj,'q2.md'),'Does the close ask for the vote?\n');
node('packet.js',['--run',so,'--round','02-battle','--seat','seat-2','--question','q2.md','--rerate']);
write(path.join(so,'rounds','02-battle','seat-2.answer.md'),'RATING: 6/10\nNot in so many words. <script>alert(1)</script> is text, not markup.\n');
node('check-answer.js',[path.join(so,'rounds','02-battle','seat-2.answer.md'),'--run',so]);
node('check-flip.js',['--run',so,'--round','02-battle','--seat','seat-2']);
node('render-board.js',['--run',so]);
var soHtml=fs.readFileSync(path.join(so,'board.html'),'utf8');
check((soHtml.match(/<span class="missing" title="the round was put to other seats only">not asked<\/span>/g)||[]).length===2,'board: a seat-only round should show two not-asked cells');
check(!/<span class="missing">missing<\/span>/.test(soHtml)&&!/class="frame missing"/.test(soHtml),'board: an unasked seat must not be shown as missing in the table or a frame');
check(/<p class="word">BACK TO THE DRAWING BOARD<\/p><p class="why">Test Model \(Anthropic\), seat-2 rated it 6\/10: a problem document/.test(soHtml),'board (seat-only round): seat-2 at 6 should send it back');
check(/data-seat="seat-1">[\s\S]*?· round 01-sparring<\/span>/.test(soHtml)&&/data-seat="seat-2">[\s\S]*?· round 02-battle<\/span>/.test(soHtml),'board (seat-only round): the unasked seats cite round 1, seat-2 cites round 2');
check(/<span class="badge">Rating 6\/10<span class="mark">flip from 8, INVALID<\/span><\/span>/.test(soHtml),'board: the frame badge should carry the rating and the flip mark');
check(/<blockquote>Not in so many words\. &lt;script&gt;alert\(1\)&lt;\/script&gt; is text, not markup\.<\/blockquote>/.test(soHtml)&&soHtml.indexOf('<script>alert')<0,'board: a seat\'s words must be escaped, never markup');
check(/<p class="round"><b>Round 02-battle<\/b> · seat lines to seat-2 \(“Does the close ask for the vote\?”\) · a new rating asked · 1 of 1 seat answered<\/p>/.test(soHtml),'board (seat-only round): the strip should name the seat and its note; got '+(/<p class="round">[^]*?<\/p>/.exec(soHtml)||[''])[0]);
check(/data-seat="seat-2">[^]*?<span class="note-line">· your note: “Does the close ask for the vote\?”<\/span>/.test(soHtml)&&(soHtml.match(/<span class="note-line">/g)||[]).length===1,'board (seat-only round): only seat-2\'s frame carries the note');

// The log and a refusal.
var log=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){return JSON.parse(l);});
check(log.some(function(e){return e.event==='board.rendered'&&e.file==='board.html'&&e.rounds===5;}),'log: board.rendered missing');
var bad=path.join(proj,'nothing'); fs.mkdirSync(bad);
check(node('render-board.js',['--run',bad]).status===2,'render-board: a folder with no seats.json should exit 2');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'board_check: '+failures.length+' failure(s), ':'board_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
