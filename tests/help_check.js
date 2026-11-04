// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// help_check.js: a bare /cw:help is the card and a picker, nothing between them, not the whole
// guide (issue 74, 2026-10-26; issue 160, 2026-11-04); `all` is the guide in one screen (issue 158,
// 2026-11-04). The founder's shape for the card: one line what Combat Writing is, one line per
// stage, the line to begin with. Issue 160, measured on Claude Code 2.1.318 with cw 0.8.40: the bare
// rule put one tool call between the card and the picker (a live "Right now" line under the card,
// measured with the crew_list tool or `claude plugin list`), and the host printed a one-line
// summary of the card in its place; in 0.8.39 the rule called no tool and the card rendered in
// full. So the bare rule is the card as the turn's text with only the picker after it, and the
// live line lives in the guide, under The crew, where 0.8.39 kept it. The guide also opens with
// the motto and the card's one-liner, which 0.8.40 had dropped.
// Issue 158: the card and the guide mixed rules, sample commands and a slogan in one voice, so a
// first-time reader could not tell a rule from an example, and a 17-row word table mixed what you
// paste, how a round runs and where you are. Measured the same day: the guide printed 962 words.
//
// What it pins, in the skill text and the README (no script runs: the card is host-printed):
//   - help/SKILL.md holds the card between <!-- THE CARD BEGIN --> and <!-- THE CARD END -->,
//     the twelve lines below, verbatim: the motto, the one-liner, four stage bullets each naming
//     its command, the Begin line, the credit line with the site. No slogan, no command skeleton.
//   - The bare rule: print the card exactly, "call no tool and read nothing", no Right now line
//     anywhere in it; then the picker with the four options in order, one text prompt per stage,
//     then the stage's command as if typed.
//   - The guide between <!-- THE GUIDE BEGIN --> and <!-- THE GUIDE END -->: at most 400 words,
//     a word being a token that carries a letter or digit (a pipe, a rule line, a heading mark or a
//     bullet is markup, not a word); its first three lines: the motto, bold, equal to the card's
//     first line, the card's one-liner verbatim, then the seat sentence; the four stage bullets in
//     order; the Also line naming /cw:briefs, /cw:runs and /cw:help; three tables with their rows
//     in order; the rating sentence verbatim; one bracketed live "[Right now: ...]" line, under The
//     crew and nowhere else (not in the card, not in the bare rule), which the `all` paragraph says
//     it fills, measured by the `crew_list` tool, else `claude plugin list`, and changes nothing
//     else; the credit line last, equal to the card's.
//   - Nothing in the card or the guide is an example: no line is a bare code span, no "ruled", no
//     date, and every code span is a word that runs, or the placeholder form of one (the allow list below).
//   - The plugin README's card, between its markers, is the skill's card with its markdown
//     stripped (bold and code spans), line for line, and its /cw:help bullet names the card, all
//     with the live line, and a topic; no sentence in it says a line prints under the card.
//   - The manifest description names the card; CLAUDE.md names issue 74 and the markers.
//
// Run from the repo root:   node tests/help_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path');
var root=path.join(__dirname,'..');
var plugin=path.join(root,'plugins','combat-writing');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(p){ return fs.readFileSync(p,'utf8'); }
function words(text){ return text.split(/\s+/).filter(function(w){ return /[A-Za-z0-9]/.test(w); }).length; }

var CREDIT='Combat Writing — Learning Producers Inc., Israel Hernandez, founder · combatwriting.learningproducers.com';
var CARD=[
  '**Reading is Peace. Writing is War.**',
  '',
  '**Combat Writing:** a crew of AI models reads your draft before it ships, each on its own, and tells you what it found.',
  '',
  '- **Strategy** `/cw:strategy` stores your draft and your brief (who you are, what you want, the stakes).',
  '- **Sparring** `/cw:sparring` every seat reads the draft alone and rates it, 1 to 10, 7 forbidden, with its critique.',
  '- **Battle** `/cw:battle` the seats discuss structure and content, read each other when you share them, and rate again on `rerate`.',
  '- **Champion** `/cw:champion` the piece went out: `shipped`, `result:`, `insight:`.',
  '',
  'Begin with any stage: paste a draft into `/cw:sparring` or `/cw:battle`. `/cw:help all` is the guide; `/cw:help <topic>` one section.',
  '',
  CREDIT
];
// Every code span in the card or the guide is one of these: a thing a person types that does something.
var RUNS=['/cw:strategy','/cw:sparring','/cw:battle','/cw:champion','/cw:briefs','/cw:runs','/cw:help','/cw:help all','/cw:help <topic>',
  'rerate','shipped','result:','insight:','brief:','reader:','sparring:','battle:','fq:','question:','n:','sn:','sfq:',
  'draft:','seat-N:','seat-1:','seat-2:','cold','debate','final','run:','brief <name>:','brief: <name>','brief update:'];

var help=read(path.join(plugin,'skills','help','SKILL.md'));
var BEGIN='<!-- THE CARD BEGIN -->', END='<!-- THE CARD END -->';
var b=help.indexOf(BEGIN), e=help.indexOf(END);
check(b>0&&e>b&&help.indexOf(BEGIN,b+1)<0&&help.indexOf(END,e+1)<0,'help: the card must stand once between its two markers');
var card=help.slice(b+BEGIN.length,e).replace(/^\n+|\n+$/g,'');
var lines=card.split('\n');
check(lines.length===CARD.length,'card: '+CARD.length+' lines, got '+lines.length);
CARD.forEach(function(l,i){ check(lines[i]===l,'card: line '+(i+1)+' must read verbatim:\n  '+l+'\ngot:\n  '+(lines[i]===undefined?'(missing)':lines[i])); });

function noExample(text,label){
  var tlines=text.split('\n');
  tlines.forEach(function(l,i){
    check(!/^`[^`]*`\.?$/.test(l.trim()),label+': line '+(i+1)+' is a bare code span, a command skeleton: '+l);
  });
  var spans=text.match(/`[^`]*`/g)||[];
  spans.forEach(function(s){ var w=s.slice(1,-1); check(RUNS.indexOf(w)>=0,label+': `'+w+'` is in backticks but is not a word that runs'); });
  check(!/\bruled\b/i.test(text),label+': carries "ruled"');
  check(!/\b20\d\d-\d\d-\d\d\b/.test(text)&&!/\b(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d\b/.test(text),label+': carries a date');
  check(!/attacks your draft/.test(text)&&!/The rating leads every result/.test(text),label+': carries the slogan');
}
noExample(card,'card');

// The bare rule: the card, then the picker, nothing between them (issue 160), the text prompts.
var rule=help.slice(help.indexOf('<!-- SPDX'),b);
check(/^\*\*Bare\*\* \(no `\$ARGUMENTS`/m.test(rule)&&/print the card between the two marker comments below, exactly as it stands, every line, with its bold and its code spans, and nothing before or after it; call no tool and read nothing/.test(rule),'help: the bare rule prints the card exactly, calls no tool and reads nothing');
check(rule.indexOf('Right now')<0&&rule.indexOf('crew_list')<0&&rule.indexOf('claude plugin list')<0,'help: the bare rule carries no live line and no measurement (issue 160: a tool call between the card and the picker makes the host summarize the card)');
check(/the card is the turn's whole text and the picker its only call, with nothing between them/.test(rule),'help: the bare rule says the card is the turn\'s whole text and the picker its only call');
check(/open the picker with the AskUserQuestion tool: one screen, one keypress, the question "Which stage\? \/cw:help all for the guide\.", four options in this order, \*\*Strategy\*\* \([^)]*\), \*\*Sparring\*\* \([^)]*\), \*\*Battle\*\* \([^)]*\), \*\*Champion\*\* \([^)]*\); mark nothing and point at no "Other"/.test(rule),'help: the picker with its four options in order, nothing marked, no Other');
['Strategy, "Paste the draft, the brief with brief:, or both."','Sparring, "Paste the draft; add question: <one question> to put it to every seat."','Battle, "Paste the draft; add sn:, n:, fq: or sfq: with your prompt, or nothing for a first critique."','Champion, "shipped <link, or email to whom>, result: <what came back>, or insight: <what you learned>."'].forEach(function(t){ check(rule.indexOf(t)>=0,'help: the text prompt must stand verbatim: '+t); });
check(/Run that stage's command with the next message as its text, exactly as if the person had typed `\/cw:<stage> <text>`/.test(rule)&&/never answer it, never shorten it/.test(rule),'help: the next message runs as the command\'s text, never answered by the host');
var after=help.slice(e);
check(/^\*\*`all`\*\* as `\$ARGUMENTS`: print the guide between the two marker comments below \(THE GUIDE BEGIN, THE GUIDE END\) exactly as it stands, with its headings, its three tables and its code spans, and nothing before or after it; call no tool and read nothing but what fills its one bracketed line/m.test(after)&&/If `\$ARGUMENTS` names one topic \(stages, order, commands, next, rounds, champion, briefs, runs, voices, files, where, crew, rating, record, privacy, method\), show only that section of the full guide below the rule/.test(after),'help: all prints the guide between its markers reading nothing but what fills its live line, a topic one section of the full guide');
check(/Fill in the one bracketed line, under "The crew" in the guide and under "Where you are running" in the full guide, with the case that applies right now \(`all` and `where` only; the card has no such line and calls nothing\)/.test(after)&&/when the `crew_list` tool is in the tool list/.test(after)&&/told installed-but-down from absent with `claude plugin list`, which reads only/.test(after)&&/That one line is all `all` fills; change nothing else\./.test(after),'help: the live line is filled on all and where, under The crew, measured by crew_list and claude plugin list, and all changes nothing else');

// The guide (issue 158): one screen, under the word ceiling, three tables, no example.
var GB='<!-- THE GUIDE BEGIN -->', GE='<!-- THE GUIDE END -->';
var gb=help.indexOf(GB), ge=help.indexOf(GE);
check(gb>e&&ge>gb&&help.indexOf(GB,gb+1)<0&&help.indexOf(GE,ge+1)<0,'guide: must stand once between its two markers, after the card');
var guide=help.slice(gb+GB.length,ge).replace(/^\n+|\n+$/g,'');
var GUIDE_CEILING=400;
var guideWords=words(guide);
check(guideWords<=GUIDE_CEILING,'guide: '+guideWords+' words, over the ceiling of '+GUIDE_CEILING);
var glines=guide.split('\n');
check(glines[0]===CARD[0]&&glines[1]==='','guide: line 1 is the motto, bold, equal to the card\'s first line; got '+glines[0]);
check(glines[2]===CARD[2]&&glines[3]==='','guide: line 3 is the card\'s one-liner verbatim; got '+glines[2]);
check(/^A seat is one model judging your draft alone\. Start at any stage, skip any\.$/.test(glines[4]),'guide: line 5 is the seat and the order in two sentences; got '+glines[4]);
check(/^- \*\*Strategy\*\*/.test(glines[6]||''),'guide: the stage bullets follow the three opening lines');
var gbullets=glines.filter(function(l){return /^- \*\*/.test(l);});
check(gbullets.length===4,'guide: four stage bullets, got '+gbullets.length);
[['Strategy','strategy'],['Sparring','sparring'],['Battle','battle'],['Champion','champion']].forEach(function(p,i){
  check((gbullets[i]||'').indexOf('- **'+p[0]+'** `/cw:'+p[1]+'` ')===0,'guide: stage bullet '+(i+1)+' is '+p[0]+' naming /cw:'+p[1]+'; got '+(gbullets[i]||'').slice(0,60));
});
check(/`rerate`/.test(gbullets[2]||'')&&/`shipped`, `result:`, `insight:`/.test(gbullets[3]||''),'guide: Battle names rerate and Champion its three words');
var also=glines.filter(function(l){return /^Also: /.test(l);});
check(also.length===1&&/Briefs \(`\/cw:briefs`\)/.test(also[0])&&/Runs \(`\/cw:runs`\)/.test(also[0])&&/Help \(`\/cw:help`\)/.test(also[0]),'guide: one Also line naming Briefs, Runs and Help with their commands');
var heads=glines.filter(function(l){return /^## /.test(l);}).map(function(l){return l.slice(3);});
check(heads.join('|')==='Start a run|Run a round|Everything else|After every round|The rating|The crew|Where files land|More','guide: the eight sections in order; got '+heads.join(' | '));
function rows(from,to){ var a=guide.indexOf('## '+from), z=to?guide.indexOf('## '+to):guide.length; return guide.slice(a,z).split('\n').filter(function(l){return /^\| `/.test(l);}).map(function(l){return l.split('|')[1].trim();}); }
check(rows('Start a run','Run a round').join(' ; ')==='`brief:` ; `reader:` ; `sparring:` / `battle:`','guide: the Start a run table, three rows in order; got '+rows('Start a run','Run a round').join(' ; '));
check(rows('Run a round','Everything else').join(' ; ')==='`fq:` (also `question:`) ; `n:` ; `sn:` ; `sfq:`','guide: the Run a round table, four rows in order; got '+rows('Run a round','Everything else').join(' ; '));
check(rows('Everything else','After every round').join(' ; ')==='`draft:` ; `rerate` ; `seat-N:` ; `cold` / `debate` ; `final` ; `run:` ; `brief <name>:` / `brief: <name>` ; `brief update:`','guide: the Everything else table, eight rows in order; got '+rows('Everything else','After every round').join(' ; '));
check((guide.match(/^\|---\|---\|$/mg)||[]).length===3,'guide: three tables');
check(/^\| `seat-N:` \| a note to one seat: `seat-1:`, `seat-2:`, or its short name \|$/m.test(guide),'guide: the seat-N row says seat-1:, seat-2: and so on, or the short name');
check(/^A keyword line opens a block that runs to the next keyword; any order, any case\.$/m.test(guide),'guide: the Start a run sentence');
check(/^In FQ and N each seat answers alone; in SN and SFQ they read each other first\.$/m.test(guide),'guide: the Run a round sentence');
check(/^The terminal prints the crew line, the scoreboard, the board's path and the seat key; the board opens in your browser\. Then the picker\.$/m.test(guide),'guide: After every round names the four lines, the browser and the picker');
check(/^Ratings are 1 to 10 with 7 forbidden, never averaged\. 8 and above is SEND, 6 and under BACK TO THE DRAWING BOARD; a changed rating quotes who moved it\.$/m.test(guide),'guide: the rating sentence, the bands and the flip rule');
check(/^Two fresh readers by default\. The add-on, named combat-writing-crew, seats other companies' models on your keys and takes the second chair\.$/m.test(guide),'guide: the crew in two sentences');
check(/^Under combat-writing\/ in your project: runs\/, inbox\/, insight-vault\.md, brief\.md, briefs\/, seats\.json, voices\.json\.$/m.test(guide),'guide: where files land');
check(/^`\/cw:help <topic>` prints one section: stages, order, commands, next; rounds, champion, briefs, runs; crew, where, voices; files, record, privacy; rating; method\.$/m.test(guide),'guide: the More line lists the topic words in groups');
var live=glines.filter(function(l){return l.indexOf('Right now')>=0;});
check(live.length===1&&/^\[Right now: [^\]]+\]$/.test(live[0]),'guide: one bracketed live line, [Right now: ...]; got '+live.length);
check(guide.indexOf('## The crew')>=0&&guide.indexOf(live[0]||'\0')>guide.indexOf('## The crew')&&guide.indexOf(live[0]||'\0')<guide.indexOf('## Where files land'),'guide: the live line stands under The crew');
check(card.indexOf('Right now')<0,'card: no live line');
check(glines[glines.length-1]===CREDIT&&lines[lines.length-1]===CREDIT,'guide and card: the credit line closes both, the same line');
noExample(guide,'guide');
var full=help.slice(ge+GE.length);
check(/^## The four stages, and the command for each$/m.test(full)&&/^## Fewer seats than you expected$/m.test(full)&&/^## Voices$/m.test(full)&&/^## The record$/m.test(full),'full guide: the sections stand behind the topic words');
check(full.split('[Right now').length===2,'full guide: one live line, under Where you are running');
check(words(full)>guideWords*3,'full guide: the detail stands after the markers, longer than the guide');
check(/^argument-hint: \[all \| topic\]$/m.test(help)&&/^description: Bare, the card and a picker to begin/m.test(help)&&/under 400 words/.test(help.split('\n---')[0]),'help: the frontmatter names all | topic, the card and the 400-word guide');
check(/^- `\/cw:help` — bare, the card and a picker to begin \(the terminal's `\/cw` completes to it\); `help all` is the short guide; `help rounds` shows one section of this one\.$/m.test(help),'help: the commands section\'s own bullet');

// The README: the card between its markers is the skill's card with its markdown stripped.
var readme=read(path.join(plugin,'README.md'));
var stripped=lines.map(function(l){return l.replace(/\*\*/g,'').replace(/`/g,'');}).join('\n');
var rb=readme.indexOf(BEGIN), re=readme.indexOf(END);
check(rb>0&&re>rb&&readme.slice(rb+BEGIN.length,re).replace(/^\n+|\n+$/g,'')==='```\n'+stripped+'\n```','README: the card between its markers must be one fenced block equal to the card with bold and code spans stripped; got\n'+readme.slice(rb+BEGIN.length,re));
check(/^- `\/cw:help` bare is the card: what Combat Writing is in one line, the four stages with their commands, the line to begin with, then one keypress picks a stage and your next message is its text \(typing `\/cw` alone completes to it\)\. `\/cw:help all` is the guide in plain words, under 400 words, with one live line naming the seats that sit right now; `\/cw:help <topic>` one section of the full guide\.$/m.test(readme),'README: the /cw:help bullet');
check(readme.indexOf('under the card')<0&&readme.indexOf('under it the seats')<0,'README: no sentence says a line prints under the card');
var manifest=JSON.parse(read(path.join(plugin,'.claude-plugin','plugin.json')));
check(/\/cw:help, bare, is the card and a picker to begin; \/cw:help all explains the method\./.test(manifest.description),'manifest: the description names the card and all');
var claude=read(path.join(root,'CLAUDE.md'));
check(/issue 74, 2026-10-26/.test(claude)&&/between its two marker comments/.test(claude)&&/pinned equal by `tests\/help_check\.js`/.test(claude),'CLAUDE.md: names issue 74, the markers and this check');
check(/issue 160/.test(claude)&&claude.indexOf('under the card one live')<0,'CLAUDE.md: names issue 160 and no longer puts the live line under the card');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'help_check: '+failures.length+' failure(s), ':'help_check: all passed, ')+passes+' checks; the guide is '+guideWords+' words, ceiling '+GUIDE_CEILING);
process.exit(failures.length?1:0);
