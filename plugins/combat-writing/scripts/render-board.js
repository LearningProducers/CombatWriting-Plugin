// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// render-board.js: writes board.html for a run, a single self-contained page.
//
//   node render-board.js --run <run folder>
//
// The page holds, in order: the credit line, the motto, the crew line, the drafts and
// the brief, the scoreboard (one row per seat, one column per round, every rating on
// its own, flips marked valid or invalid with the earlier number kept, Stand, missing,
// failed reads), a line chart of each seat's rating across rounds as inline SVG with
// a legend, direct labels at the line ends and a hover readout, the final reads' S/N
// and red-flag counts when a final round exists, and a link to record.md. Light and
// dark follow the system setting, with a toggle. No external request of any kind: no
// script, style, font or image is fetched. Nothing is averaged. The page is rebuilt
// after every round from the files and log.jsonl, like record.md.
//
// Prints the page's path on stdout and appends board.rendered to the log.

var fs=require('fs'), path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
if(!args.run||args.run===true)lib.die('--run is required');
var runDir=path.resolve(args.run);
var seats=lib.readSeats(runDir).seats;
var log=lib.readLog(runDir);
var rounds=lib.listRounds(runDir);
var ratingRounds=rounds.filter(function(r){return !lib.isFinalRound(r);});
var finalRounds=rounds.filter(lib.isFinalRound);
var drafts=lib.listDrafts(runDir);

function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function lastLog(pred){ for(var i=log.length-1;i>=0;i--){ if(pred(log[i]))return log[i]; } return null; }

// One seat in one rating round, from the files with the log's verdicts where it has them.
function cell(seat,round){
  var p=path.join(runDir,'rounds',round,seat.id+'.answer.md');
  if(!fs.existsSync(p))return {kind:'missing',text:'missing',rating:null};
  var text=lib.readText(p);
  var logged=lastLog(function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&(!e.contract||e.contract==='rating');});
  var check=lib.checkAnswer(text,logged?logged.word_cap:null,'rating');
  if(!check.ok)return {kind:'failed',text:'failed read',title:check.reasons.join('; '),rating:null};
  var flip=lastLog(function(e){return e.event==='flip.checked'&&e.round===round&&e.seat===seat.id;});
  if(!flip){var inputs=lib.flipInputs(runDir,seat,round,seats);flip=lib.checkFlip(text,seat,inputs.own?inputs.own.text:null,inputs.prevAnswers);}
  var kind={first:'first',stand:'stand',held:'held','flip-valid':'flip-valid','flip-invalid':'flip-invalid',unrated:'first'}[flip.status]||'first';
  var mark={first:'',stand:'Stand',held:'held, no Stand','flip-valid':'flip from '+flip.from+', valid','flip-invalid':'flip from '+flip.from+', INVALID'}[kind]||'';
  var title={'flip-valid':'quoted '+flip.cited,'flip-invalid':flip.reason||'quote not found'}[kind]||'';
  return {kind:kind,rating:check.rating,text:check.rating+'/10',mark:mark,title:title,from:flip.from};
}
function finalCell(seat,round){
  return ['sn','redflag'].map(function(c){
    var p=path.join(runDir,'rounds',round,seat.id+'.'+c+'.answer.md');
    if(!fs.existsSync(p))return {c:c,missing:true};
    var logged=lastLog(function(e){return e.event==='answer.checked'&&e.round===round&&e.seat===seat.id&&e.contract===c;});
    var r=lib.checkAnswer(lib.readText(p),logged?logged.word_cap:null,c);
    return {c:c,ok:r.ok,value:r.value};
  });
}

var grid={}; seats.forEach(function(s){grid[s.id]={};ratingRounds.forEach(function(r){grid[s.id][r]=cell(s,r);});});

// The chart: x = rating rounds in order, y = 1 to 10, one series per seat (categorical, fixed order).
var LIGHT=['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#008300','#4a3aa7','#e34948'];
var DARK=['#3987e5','#d95926','#199e70','#c98500','#d55181','#008300','#9085e9','#e66767'];
var W=720, H=300, PL=44, PR=150, PT=20, PB=40;
var plotW=W-PL-PR, plotH=H-PT-PB;
function x(i){ return ratingRounds.length<=1?PL+plotW/2:PL+plotW*i/(ratingRounds.length-1); }
function y(v){ return PT+plotH*(10-v)/9; }

var svg=[];
// Inline SVG in HTML needs no namespace attribute, and the page carries no URL of any kind.
svg.push('<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-labelledby="chart-title chart-desc">');
svg.push('<title id="chart-title">Each seat\'s rating across rounds</title>');
svg.push('<desc id="chart-desc">One line per seat, rating 1 to 10 on the vertical axis, rounds in order on the horizontal axis. The table above holds the same numbers.</desc>');
for(var v=1;v<=10;v++){
  svg.push('<line class="grid" x1="'+PL+'" x2="'+(PL+plotW)+'" y1="'+y(v).toFixed(1)+'" y2="'+y(v).toFixed(1)+'"/>');
  svg.push('<text class="tick" x="'+(PL-8)+'" y="'+(y(v)+4).toFixed(1)+'" text-anchor="end">'+v+'</text>');
}
svg.push('<line class="seven" x1="'+PL+'" x2="'+(PL+plotW)+'" y1="'+y(7).toFixed(1)+'" y2="'+y(7).toFixed(1)+'"/>');
svg.push('<text class="tick seven-label" x="'+(PL+4)+'" y="'+(y(7)-4).toFixed(1)+'">7 is forbidden</text>');
ratingRounds.forEach(function(r,i){ svg.push('<text class="tick" x="'+x(i).toFixed(1)+'" y="'+(H-PB+18)+'" text-anchor="middle">'+esc(r)+'</text>'); });
// End labels: one per seat at its last point, nudged apart when seats end on the same rating.
var endLabels=[];
seats.forEach(function(s){
  var last=null;
  ratingRounds.forEach(function(r,i){ var c=grid[s.id][r]; if(c.rating!==null)last={i:i,v:c.rating}; });
  if(last)endLabels.push({seat:s,i:last.i,v:last.v,y:y(last.v)});
});
endLabels.sort(function(a,b){return a.y-b.y;});
for(var k=1;k<endLabels.length;k++){ if(endLabels[k].y-endLabels[k-1].y<14)endLabels[k].y=endLabels[k-1].y+14; }
var labelY={}; endLabels.forEach(function(l){labelY[l.seat.id]=l.y;});

seats.forEach(function(s,si){
  var color=si%8, pts=[];
  ratingRounds.forEach(function(r,i){ var c=grid[s.id][r]; if(c.rating!==null)pts.push({i:i,v:c.rating,c:c}); });
  var d=''; var prevI=null;
  pts.forEach(function(p){ d+=(prevI===null||p.i!==prevI+1?'M':'L')+x(p.i).toFixed(1)+' '+y(p.v).toFixed(1)+' '; prevI=p.i; });
  svg.push('<g class="series" data-seat="'+esc(s.id)+'" style="--c: var(--series-'+(color+1)+')">');
  if(d)svg.push('<path class="line" d="'+d.trim()+'"/>');
  ratingRounds.forEach(function(r,i){
    var c=grid[s.id][r];
    var cx=x(i).toFixed(1);
    if(c.rating===null){
      svg.push('<g class="pt missing" tabindex="0" data-seat="'+esc(lib.seatLabel(s))+'" data-round="'+esc(r)+'" data-value="'+esc(c.text)+'"><circle cx="'+cx+'" cy="'+y(1).toFixed(1)+'" r="7"/><line x1="'+(x(i)-4).toFixed(1)+'" x2="'+(x(i)+4).toFixed(1)+'" y1="'+(y(1)-4).toFixed(1)+'" y2="'+(y(1)+4).toFixed(1)+'"/><line x1="'+(x(i)-4).toFixed(1)+'" x2="'+(x(i)+4).toFixed(1)+'" y1="'+(y(1)+4).toFixed(1)+'" y2="'+(y(1)-4).toFixed(1)+'"/></g>');
      return;
    }
    var cls='pt '+c.kind;
    var label=c.text+(c.mark?' · '+c.mark:'');
    svg.push('<g class="'+cls+'" tabindex="0" data-seat="'+esc(lib.seatLabel(s))+'" data-round="'+esc(r)+'" data-value="'+esc(label)+(c.title?' ('+esc(c.title)+')':'')+'">');
    svg.push('<circle class="ring" cx="'+cx+'" cy="'+y(c.rating).toFixed(1)+'" r="7"/>');
    svg.push('<circle class="dot" cx="'+cx+'" cy="'+y(c.rating).toFixed(1)+'" r="5"/>');
    if(c.kind==='flip-valid')svg.push('<text class="flag" x="'+cx+'" y="'+(y(c.rating)-11).toFixed(1)+'" text-anchor="middle">✓</text>');
    if(c.kind==='flip-invalid')svg.push('<text class="flag" x="'+cx+'" y="'+(y(c.rating)-11).toFixed(1)+'" text-anchor="middle">✗</text>');
    svg.push('</g>');
  });
  if(pts.length){
    var last=pts[pts.length-1];
    svg.push('<text class="end-label" x="'+(x(last.i)+12).toFixed(1)+'" y="'+(labelY[s.id]+4).toFixed(1)+'">'+last.v+'/10 '+esc(s.id)+'</text>');
  }
  svg.push('</g>');
});
svg.push('</svg>');

// The page.
var companies=seats.map(function(s){return s.company;}).filter(function(v,i,a){return a.indexOf(v)===i;});
var html=[];
html.push('<!doctype html>');
html.push('<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">');
html.push('<title>Combat Writing board — '+esc(path.basename(runDir))+'</title>');
html.push('<style>');
html.push(':root{color-scheme:light;--surface:#fcfcfb;--surface-2:#f1f0ec;--ink:#0b0b0b;--ink-2:#52514e;--ink-3:#8a8984;--rule:#e2e1dc;--seven:#b4b3ad;--series-1:#2a78d6;--series-2:#eb6834;--series-3:#1baf7a;--series-4:#eda100;--series-5:#e87ba4;--series-6:#008300;--series-7:#4a3aa7;--series-8:#e34948;--good:#1a7f37;--bad:#c62828;}');
html.push('@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){color-scheme:dark;--surface:#1a1a19;--surface-2:#242422;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#8f8e87;--rule:#34332f;--seven:#5a5955;--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--series-4:#c98500;--series-5:#d55181;--series-6:#008300;--series-7:#9085e9;--series-8:#e66767;--good:#4caf6e;--bad:#ef6b6b;}}');
html.push(':root[data-theme="dark"]{color-scheme:dark;--surface:#1a1a19;--surface-2:#242422;--ink:#ffffff;--ink-2:#c3c2b7;--ink-3:#8f8e87;--rule:#34332f;--seven:#5a5955;--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--series-4:#c98500;--series-5:#d55181;--series-6:#008300;--series-7:#9085e9;--series-8:#e66767;--good:#4caf6e;--bad:#ef6b6b;}');
html.push('*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:0 16px 48px}main{max-width:960px;margin:0 auto}');
html.push('.credit{font-size:13px;color:var(--ink-2);margin:20px 0 4px}.motto{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3);margin:0 0 20px}h1{font-size:22px;margin:0 0 6px}h2{font-size:16px;margin:28px 0 8px}p{margin:6px 0}.meta{color:var(--ink-2)}');
html.push('.bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}button{font:inherit;font-size:13px;color:var(--ink-2);background:var(--surface-2);border:1px solid var(--rule);border-radius:6px;padding:4px 10px;cursor:pointer}');
html.push('table{border-collapse:collapse;width:100%;font-size:14px;margin-top:8px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--rule);vertical-align:top}th{color:var(--ink-2);font-weight:600}td.num{font-variant-numeric:tabular-nums;white-space:nowrap}.mark{color:var(--ink-2);font-size:12px}.flip-valid .mark{color:var(--good)}.flip-invalid .mark{color:var(--bad)}.missing,.failed{color:var(--ink-3);font-style:italic}.key{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px;vertical-align:-1px}');
html.push('.chart{width:100%;height:auto;display:block;margin-top:8px}.grid{stroke:var(--rule);stroke-width:1}.seven{stroke:var(--seven);stroke-width:1;stroke-dasharray:4 4}.tick{fill:var(--ink-3);font-size:11px}.seven-label{fill:var(--ink-3)}.line{fill:none;stroke:var(--c);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.ring{fill:var(--surface)}.dot{fill:var(--c)}.pt.missing circle{fill:var(--surface);stroke:var(--ink-3);stroke-width:1.5}.pt.missing line{stroke:var(--ink-3);stroke-width:1.5}.pt{cursor:default;outline:none}.pt:focus .dot,.pt:hover .dot{r:6}.flag{fill:var(--ink-2);font-size:12px}.end-label{fill:var(--ink-2);font-size:12px}');
html.push('.legend{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:var(--ink-2);margin:6px 0}.readout{min-height:22px;font-size:13px;color:var(--ink-2);margin:4px 0 0}.note{font-size:13px;color:var(--ink-2)}a{color:inherit}');
html.push('</style></head><body><main>');
html.push('<p class="credit">'+esc(lib.CREDIT)+'</p>');
html.push('<p class="motto">Reading is Peace. Writing is War.</p>');
html.push('<div class="bar"><h1>Combat Writing board — '+esc(path.basename(runDir))+'</h1><button type="button" id="theme" aria-label="Switch light and dark">Light / dark</button></div>');
html.push('<p class="meta"><strong>Crew:</strong> '+esc(seats.map(lib.seatLabel).join('; '))+'. '+(companies.length===1?'One company\'s models ('+esc(companies[0])+').':companies.length+' companies.')+' Seat names come from the agent configuration, not from an API field.</p>');
html.push('<p class="meta"><strong>Drafts:</strong> '+esc(drafts.join(', '))+'.'+(fs.existsSync(path.join(runDir,'brief.md'))?' <strong>Brief:</strong> '+esc(lib.readText(path.join(runDir,'brief.md')).trim()):'')+'</p>');

html.push('<h2>Scoreboard</h2>');
html.push('<p class="note">Every number is one seat\'s own. Nothing here is averaged. A flip shows the earlier number beside the new one; INVALID means the quote the seat gave does not match the seat it named. Missing means the seat gave no answer in that round.</p>');
if(rounds.length){
  html.push('<table><thead><tr><th>Seat</th>'+rounds.map(function(r){return '<th>'+esc(r)+'</th>';}).join('')+'</tr></thead><tbody>');
  seats.forEach(function(s,si){
    html.push('<tr><td><span class="key" style="background:var(--series-'+(si%8+1)+')"></span>'+esc(lib.seatLabel(s))+'</td>');
    rounds.forEach(function(r){
      if(lib.isFinalRound(r)){
        var f=finalCell(s,r);
        var snT=f[0].missing?'<span class="missing">S/N missing</span>':f[0].ok?'S/N '+f[0].value+'%':'<span class="failed">S/N failed read</span>';
        var rfT=f[1].missing?'<span class="missing">red flags missing</span>':f[1].ok?(f[1].value===0?'no red flags':f[1].value+' red flag'+(f[1].value===1?'':'s')):'<span class="failed">red-flag read failed</span>';
        html.push('<td class="num">'+snT+'<br>'+rfT+'</td>');
        return;
      }
      var c=grid[s.id][r];
      if(c.kind==='missing')html.push('<td class="num"><span class="missing">missing</span></td>');
      else if(c.kind==='failed')html.push('<td class="num"><span class="failed" title="'+esc(c.title)+'">failed read</span></td>');
      else html.push('<td class="num '+c.kind+'">'+c.text+(c.mark?'<br><span class="mark"'+(c.title?' title="'+esc(c.title)+'"':'')+'>'+esc(c.mark)+'</span>':'')+'</td>');
    });
    html.push('</tr>');
  });
  html.push('</tbody></table>');
}else html.push('<p class="note">No rounds yet.</p>');

if(ratingRounds.length){
  html.push('<h2>Ratings across rounds</h2>');
  html.push('<div class="legend">'+seats.map(function(s,si){return '<span><span class="key" style="background:var(--series-'+(si%8+1)+')"></span>'+esc(lib.seatLabel(s))+'</span>';}).join('')+'</div>');
  html.push(svg.join('\n'));
  html.push('<p class="readout" id="readout" aria-live="polite">Hover or focus a point for its seat, round and mark. ✓ a valid flip, ✗ an invalid flip, × a missing seat.</p>');
}
if(finalRounds.length){
  html.push('<h2>Final reads</h2>');
  html.push('<p class="note">The S/N ratio and red-flag reads of the newest draft, one pair per seat, never averaged.</p>');
  html.push('<table><thead><tr><th>Seat</th>'+finalRounds.map(function(r){return '<th>'+esc(r)+' S/N</th><th>'+esc(r)+' red flags</th>';}).join('')+'</tr></thead><tbody>');
  seats.forEach(function(s){
    html.push('<tr><td>'+esc(lib.seatLabel(s))+'</td>'+finalRounds.map(function(r){
      var f=finalCell(s,r);
      return '<td class="num">'+(f[0].missing?'<span class="missing">missing</span>':f[0].ok?f[0].value+'%':'<span class="failed">failed read</span>')+'</td><td class="num">'+(f[1].missing?'<span class="missing">missing</span>':f[1].ok?(f[1].value===0?'none':String(f[1].value)):'<span class="failed">failed read</span>')+'</td>';
    }).join('')+'</tr>');
  });
  html.push('</tbody></table>');
}
html.push('<p class="note">The full record, every answer in full and the log of what was sent, is <a href="record.md">record.md</a> in this folder.</p>');
html.push('<script>');
html.push('(function(){var b=document.getElementById("theme");var r=document.documentElement;b.addEventListener("click",function(){var dark=r.getAttribute("data-theme")==="dark"||(r.getAttribute("data-theme")!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);r.setAttribute("data-theme",dark?"light":"dark");});');
html.push('var out=document.getElementById("readout");if(out){var pts=document.querySelectorAll(".pt");function show(e){var g=e.currentTarget;out.textContent=g.getAttribute("data-seat")+" · "+g.getAttribute("data-round")+" · "+g.getAttribute("data-value");}for(var i=0;i<pts.length;i++){pts[i].addEventListener("mouseenter",show);pts[i].addEventListener("focus",show);}}})();');
html.push('</script>');
html.push('</main></body></html>');
fs.writeFileSync(path.join(runDir,'board.html'),html.join('\n')+'\n');
lib.appendLog(runDir,{event:'board.rendered',file:'board.html',rounds:rounds.length});
process.stdout.write(path.join(runDir,'board.html')+'\n');
