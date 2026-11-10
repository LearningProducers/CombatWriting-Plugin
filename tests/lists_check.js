// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// lists_check.js: the board shows the numbers a seat wrote (issue 189). A seat that left a blank
// line between its numbered items had every item shown as "1.": lib.renderLite split the answer on
// blank lines and built a list per block, so each spaced item became its own one-item list and the
// number the seat wrote was dropped. board_check.js fed renderLite two numbered lines with no blank
// line between them, the one shape that never broke.
//
// What it pins, on made-up answers in the shapes real answers take (never a real answer):
//   - lib.renderLite: four numbered items separated by blank lines read 1, 2, 3, 4 back, in one
//     list; a paragraph between items 2 and 3 and the next item still reads 3; items that open
//     with bold, the shape seats write most; a list that opens at 3 reads 3, 4; a second list
//     after a heading restarts at the number the seat wrote; "1)" items; spaced bullets stay one
//     list; a paragraph line right under an item is a paragraph; nothing is a one-item list unless
//     the seat wrote one item; the text is escaped as before.
//   - render-board.js, the REAL script on a temporary run: the seat's card carries the four
//     numbers and no one-item numbered list.
//
// Run from the repository root:   node tests/lists_check.js
// Exit 0 on pass, 1 on any failure, one line per failure.

var fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
var root=path.resolve(__dirname,'..');
var scripts=path.join(root,'plugins','combat-writing','scripts');
var lib=require(path.join(scripts,'lib.js'));
var failures=[], checks=0;
function check(ok,msg){ checks+=1; if(!ok)failures.push(msg); }

// The numbers a browser shows for the numbered items in a piece of rendered HTML, list by list:
// an item's value when it carries one, else one more than the item before it, a list opening at 1.
function lists(html){
  return (html.match(/<ol[^>]*>[\s\S]*?<\/ol>/g)||[]).map(function(ol){
    var k=1, shown=[];
    (ol.match(/<li[^>]*>/g)||[]).forEach(function(li){ var v=/value="(\d+)"/.exec(li); if(v)k=parseInt(v[1],10); shown.push(k); k+=1; });
    return shown;
  });
}
function shown(html){ return [].concat.apply([],lists(html)).join(','); }
function oneItemLists(html){ return lists(html).filter(function(l){return l.length===1;}).length; }

// 1. Four numbered items separated by blank lines.
var spaced='What blocks it.\n\n1. The ask is buried.\n\n2. The date is missing.\n\n3. The close is soft.\n\n4. The subject line is vague.\n\nHold until these are fixed.';
var h=lib.renderLite(spaced);
check(shown(h)==='1,2,3,4','spaced items: should read 1,2,3,4, got '+shown(h));
check(lists(h).length===1&&oneItemLists(h)===0,'spaced items: one list of four, got '+JSON.stringify(lists(h)));
check(h.indexOf('<p>What blocks it.</p><ol>')===0&&/<\/ol><p>Hold until these are fixed\.<\/p>$/.test(h),'spaced items: the paragraphs before and after stay paragraphs, got '+h);

// 2. A paragraph between items 2 and 3: the next item still reads 3.
var between='1. First.\n\n2. Second.\n\nA paragraph the seat put between them.\n\n3. Third.\n\n4. Fourth.';
var hb=lib.renderLite(between);
check(shown(hb)==='1,2,3,4','a paragraph between 2 and 3: should read 1,2,3,4, got '+shown(hb));
check(JSON.stringify(lists(hb))==='[[1,2],[3,4]]'&&hb.indexOf('</ol><p>A paragraph the seat put between them.</p><ol>')>0,'a paragraph between 2 and 3: two lists around the paragraph, got '+hb);

// 3. The shape seats write most: each item opens with bold, a blank line between items.
var bold='**What blocks it.**\n\n1. **The ask is buried.** It sits in the third paragraph.\n\n2. **The date is missing.** No reader can act on "soon".\n\n3. **The close is soft.** It thanks and does not ask.';
var hd=lib.renderLite(bold);
check(shown(hd)==='1,2,3'&&oneItemLists(hd)===0,'bold items: should read 1,2,3 in one list, got '+JSON.stringify(lists(hd)));
check(hd.indexOf('<li value="2"><strong>The date is missing.</strong> No reader can act on &quot;soon&quot;.</li>')>0,'bold items: the item keeps its bold and is escaped, got '+hd);

// 4. A list that opens past 1, and a second list that restarts where the seat restarted it.
check(shown(lib.renderLite('3. Third.\n4. Fourth.'))==='3,4','a list opening at 3: should read 3,4');
var two='# Problems\n\n1. One.\n\n2. Two.\n\n3. Three.\n\n# Fixes\n1. Fix one.\n2. Fix two.';
var ht=lib.renderLite(two);
check(JSON.stringify(lists(ht))==='[[1,2,3],[1,2]]','two lists under two headings: should read 1,2,3 then 1,2, got '+JSON.stringify(lists(ht)));
check(shown(lib.renderLite('1) One.\n\n2) Two.'))==='1,2','items written 1) and 2): should read 1,2');

// 5. Bullets, paragraphs and the one-item list a seat did write.
var hu=lib.renderLite('- First point.\n\n- Second point.\n\n* Third point.');
check(hu==='<ul><li>First point.</li><li>Second point.</li><li>Third point.</li></ul>','spaced bullets: one list, no value, got '+hu);
check(lib.renderLite('1. Only item.\nA line under it.')==='<ol><li value="1">Only item.</li></ol><p>A line under it.</p>','a line under an item: a paragraph after the list');
check(lib.renderLite('One line.\nA second line.\n\nA new paragraph.')==='<p>One line.<br>A second line.</p><p>A new paragraph.</p>','paragraphs: a single newline is a break, a blank line a new paragraph');
check(lib.renderLite('1. One.\n\n- A bullet.\n\n2. Two.')==='<ol><li value="1">One.</li></ol><ul><li>A bullet.</li></ul><ol><li value="2">Two.</li></ol>','a bullet between two numbered items: the second still reads 2');
check(lib.renderLite('1. a\n2. b\n\n1. x\n2. y')==='<ol><li value="1">a</li><li value="2">b</li><li value="1">x</li><li value="2">y</li></ol>','two lists with only a blank line between them: one list, each item its own number');
check(lib.renderLite('12345678901. Not an item.')==='<p>12345678901. Not an item.</p>','a number past nine digits is text, never an item');
check(lib.renderLite('')===''&&lib.renderLite('  \n\n ')==='','empty text renders nothing');

// 6. The real board on a temporary run: the seat's card carries the four numbers.
var proj=fs.mkdtempSync(path.join(os.tmpdir(),'cw-lists-'));
function node(script,args){ return cp.spawnSync(process.execPath,[path.join(scripts,script)].concat(args),{cwd:proj,encoding:'utf8'}); }
fs.writeFileSync(path.join(proj,'draft.md'),'Dana,\n\nBuy the company before the quarter closes.\n');
fs.writeFileSync(path.join(proj,'n.md'),'Is this ready to send?\n');
var mk=node('new-run.js',['--draft','draft.md','--name','lists','--stage','battle','--no-brief','--session-model','Test Session Model','--readers','1']);
check(mk.status===0,'new-run: '+mk.stderr);
var run=mk.stdout.trim();
var pk=node('packet.js',['--run',run,'--round','01-battle','--seat','seat-1','--n','n.md']);
check(pk.status===0,'packet: '+pk.stderr);
fs.writeFileSync(path.join(run,'rounds','01-battle','seat-1.answer.md'),'Not yet. The ask is buried.\n\n'+spaced+'\n');
var ck=node('check-answer.js',[path.join(run,'rounds','01-battle','seat-1.answer.md'),'--run',run]);
check(ck.status===0,'check-answer: '+ck.stdout+ck.stderr);
var rb=node('render-board.js',['--run',run]);
check(rb.status===0,'render-board: '+rb.stderr);
var html=fs.readFileSync(path.join(run,'board.html'),'utf8');
var card=/<figure class="frame[^"]*" data-seat="seat-1">([^]*?)<\/figure>/.exec(html);
check(!!card&&shown(card[1])==='1,2,3,4'&&oneItemLists(card[1])===0,'board: the card should read 1,2,3,4 in one list, got '+(card?JSON.stringify(lists(card[1])):'no card'));

if(failures.length){ failures.forEach(function(f){console.log('FAIL '+f);}); console.log('lists_check: '+failures.length+' failure(s), '+checks+' checks'); process.exit(1); }
console.log('lists_check: ok, '+checks+' checks');
