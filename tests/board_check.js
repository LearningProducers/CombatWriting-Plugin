// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// board_check.js: board.html is one self-contained page that shows every seat and every
// round, marks flips and missing seats, averages nothing, and fetches nothing.
//
// Runs the REAL new-run.js, packet.js, check-answer.js, check-flip.js, add-draft.js and
// render-board.js from plugins/combat-writing/scripts as child processes in a temporary
// project (never a re-implementation).
//
// What it pins:
//   - The first visible text in the page is the credit line, before the motto and the title.
//   - The page makes no external request: no http://, https:// or protocol-relative URL
//     in any src, href, url(), @import or fetch; no <link>, <script src>, <img src> or
//     <iframe>; the only href is the relative link to record.md.
//   - Every seat is named by model and company in the scoreboard, the legend and the chart;
//     every round is a scoreboard column; the chart has one series per seat with one point
//     per rated round.
//   - A valid flip is marked with the earlier number kept visible; an invalid flip is
//     marked INVALID; Stand is marked; a missing seat reads "missing" in the table and
//     has a missing marker in the chart; a failed read is marked as such.
//   - The final round's S/N and red-flag numbers appear per seat.
//   - No averaged number: no "average", "mean", "overall", "consensus" or "total" rating,
//     no fractional rating.
//   - Light and dark are both defined (a prefers-color-scheme block and a data-theme
//     scope), the page carries the ten-step y axis with the 7 line, and a legend.
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

fs.writeFileSync(path.join(proj,'draft.md'),'Dear board, buy the company.\n');
fs.writeFileSync(path.join(proj,'brief.md'),'CEO. Get a yes.\n');
var run=node('new-run.js',['--draft','draft.md','--brief','brief.md','--name','board','--model','Test Model']).stdout.trim();
var S2LINE='The board will ask for numbers and find none.';
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','01-sparring','--seat',s]); });
var r1=path.join(run,'rounds','01-sparring');
write(path.join(r1,'seat-1.answer.md'),'RATING: 8/10\nThe ask lands in the first line.\n');
write(path.join(r1,'seat-2.answer.md'),'RATING: 4/10\n'+S2LINE+'\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(r1,s+'.answer.md'),'--run',run]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','02-battle','--seat',s]); });
var r2=path.join(run,'rounds','02-battle');
write(path.join(r2,'seat-1.answer.md'),'RATING: 6/10\nseat-2 wrote "'+S2LINE+'" and that moved me.\n');
write(path.join(r2,'seat-2.answer.md'),'RATING: 4/10\nStand. Nothing new.\n');
write(path.join(r2,'seat-3.answer.md'),'RATING: 7/10\nHedging on purpose.\n');
['seat-1','seat-2','seat-3'].forEach(function(s){ node('check-answer.js',[path.join(r2,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','02-battle','--seat',s]); });
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','03-battle','--seat',s]); });
var r3=path.join(run,'rounds','03-battle');
write(path.join(r3,'seat-1.answer.md'),'RATING: 8/10\nseat-2 wrote "the numbers are all there" so I moved back up.\n');
write(path.join(r3,'seat-2.answer.md'),'RATING: 4/10\nStand.\n');
['seat-1','seat-2'].forEach(function(s){ node('check-answer.js',[path.join(r3,s+'.answer.md'),'--run',run]); node('check-flip.js',['--run',run,'--round','03-battle','--seat',s]); });
node('add-draft.js',['--run',run,'--file','draft.md']);
['seat-1','seat-2','seat-3'].forEach(function(s){ node('packet.js',['--run',run,'--round','04-final','--seat',s,'--final','sn']); node('packet.js',['--run',run,'--round','04-final','--seat',s,'--final','redflag']); });
var r4=path.join(run,'rounds','04-final');
write(path.join(r4,'seat-1.sn.answer.md'),'S/N RATIO: 70%\nSignal.\n');
write(path.join(r4,'seat-1.redflag.answer.md'),'RED FLAGS FOUND: 1\nOne.\n');
write(path.join(r4,'seat-2.sn.answer.md'),'S/N RATIO: 55%\nHalf.\n');
write(path.join(r4,'seat-2.redflag.answer.md'),'NO RED FLAGS\nNone.\n');
['seat-1.sn','seat-1.redflag','seat-2.sn','seat-2.redflag'].forEach(function(f){ node('check-answer.js',[path.join(r4,f+'.answer.md'),'--run',run]); });

var rb=node('render-board.js',['--run',run]);
check(rb.status===0&&rb.stdout.trim()===path.join(run,'board.html'),'render-board: exit '+rb.status+' '+rb.stderr+' '+rb.stdout);
var html=fs.readFileSync(path.join(run,'board.html'),'utf8');
var body=html.slice(html.indexOf('<body'));
var textOnly=body.replace(/<script[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,'\n').split('\n').map(function(l){return l.trim();}).filter(Boolean);
check(textOnly[0]===CREDIT,'board: first visible text is "'+textOnly[0]+'", not the credit line');
check(textOnly[1]==='Reading is Peace. Writing is War.','board: the motto does not follow the credit line');

// No external request.
check(!/\b(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(html),'board: an external URL appears');
check(!/<link\b/i.test(html)&&!/<script[^>]+src=/i.test(html)&&!/<img\b/i.test(html)&&!/<iframe\b/i.test(html)&&!/@import/i.test(html)&&!/url\(/i.test(html)&&!/\bfetch\(/.test(html)&&!/XMLHttpRequest/.test(html),'board: a tag or call that could fetch appears');
var hrefs=html.match(/href="[^"]*"/g)||[];
check(hrefs.length===1&&hrefs[0]==='href="record.md"','board: hrefs are '+JSON.stringify(hrefs)+', expected only record.md');

// Every seat, every round.
['seat-1','seat-2','seat-3'].forEach(function(s){
  var n=(html.match(new RegExp('Test Model \\(Anthropic\\), '+s,'g'))||[]).length;
  check(n>=3,'board: '+s+' named by model and company fewer than 3 times ('+n+')');
  check(new RegExp('<g class="series" data-seat="'+s+'"').test(html),'board: no chart series for '+s);
});
['01-sparring','02-battle','03-battle','04-final'].forEach(function(r){ check(new RegExp('<th>'+r+'</th>').test(html),'board: no scoreboard column for '+r); });
check((html.match(/<g class="pt /g)||[]).length===9,'board: expected 9 chart points (3 seats × 3 rating rounds), got '+(html.match(/<g class="pt /g)||[]).length);
check((html.match(/data-value="/g)||[]).length===9,'board: every point should carry a readout value');

// Marks.
check(/<td class="num flip-valid">6\/10<br><span class="mark" title="quoted seat-2">flip from 8, valid<\/span><\/td>/.test(html),'board: valid flip cell wrong');
check(/<td class="num flip-invalid">8\/10<br><span class="mark" title="[^"]*">flip from 6, INVALID<\/span><\/td>/.test(html),'board: invalid flip cell wrong');
check(/<td class="num stand">4\/10<br><span class="mark">Stand<\/span><\/td>/.test(html),'board: Stand cell wrong');
check(/<span class="missing">missing<\/span>/.test(html),'board: no missing cell');
check(/<span class="failed" title="rating is 7; 7 is forbidden[^"]*">failed read<\/span>/.test(html),'board: the 7/10 answer is not marked as a failed read');
check(/<g class="pt missing"/.test(html),'board: no missing marker in the chart');
// The missing row sits below the axis: its markers' cy is greater than the y of rating 1, and the row is labeled.
var ones=(html.match(/<circle class="ring" cx="[\d.]+" cy="([\d.]+)"/g)||[]).map(function(s){return parseFloat(/cy="([\d.]+)"/.exec(s)[1]);});
var missY=(html.match(/<g class="pt missing"[^>]*><circle cx="[\d.]+" cy="([\d.]+)"/g)||[]).map(function(s){return parseFloat(/cy="([\d.]+)"/.exec(s)[1]);});
var yOfOne=parseFloat((/<text class="tick" x="\d+" y="([\d.]+)" text-anchor="end">1<\/text>/.exec(html)||[0,'0'])[1])-4;
check(missY.length>0&&missY.every(function(v){return v>yOfOne+10;})&&ones.every(function(v){return v<=yOfOne+0.5;}),'board: missing markers must sit on their own row below the 1 line (missing y '+missY+', y of 1 '+yOfOne+')');
check(/text-anchor="end">missing<\/text>/.test(html),'board: the missing row is not labeled');
check(/<g class="pt flip-valid"[^>]*data-value="6\/10 · flip from 8, valid \(quoted seat-2\)"/.test(html),'board: valid flip point readout wrong');
check(/<text class="flag"[^>]*>✓<\/text>/.test(html)&&/<text class="flag"[^>]*>✗<\/text>/.test(html),'board: flip flags missing from the chart');
check(/S\/N 70%<br>1 red flag<\/td>/.test(html)&&/S\/N 55%<br>no red flags<\/td>/.test(html)&&/S\/N missing<\/span><br><span class="missing">red flags missing/.test(html),'board: final cells wrong');
check(/<h2>Final reads<\/h2>/.test(html)&&/<td class="num">70%<\/td><td class="num">1<\/td>/.test(html),'board: final reads table wrong');

// Nothing averaged.
var prose=textOnly.join(' ').replace('Nothing here is averaged.','').replace('never averaged','');
check(!/\b(average|averaged|mean|overall rating|consensus|total)\b/i.test(prose),'board: an averaging word appears');
check(!/\d\.\d+\/10/.test(html),'board: a fractional rating appears');

// Light and dark, the axis, the legend.
check(/@media \(prefers-color-scheme: dark\)/.test(html)&&/:root\[data-theme="dark"\]/.test(html)&&/:root:not\(\[data-theme="light"\]\)/.test(html),'board: light and dark not both defined with a toggle scope');
check(/7 is forbidden/.test(html)&&(html.match(/<text class="tick"/g)||[]).length>=13,'board: axis ticks or the 7 line missing');
check(/<div class="legend">/.test(html),'board: no legend');
check(/<button type="button" id="theme"/.test(html),'board: no theme toggle');

// The log and a refusal.
var log=fs.readFileSync(path.join(run,'log.jsonl'),'utf8').trim().split('\n').map(function(l){return JSON.parse(l);});
check(log.some(function(e){return e.event==='board.rendered'&&e.file==='board.html'&&e.rounds===4;}),'log: board.rendered missing');
var bad=path.join(proj,'nothing'); fs.mkdirSync(bad);
check(node('render-board.js',['--run',bad]).status===2,'render-board: a folder with no seats.json should exit 2');

fs.rmSync(proj,{recursive:true,force:true});
failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'board_check: '+failures.length+' failure(s), ':'board_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
