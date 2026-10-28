// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// draft_parts_check.js: THE LABELED DRAFT (Part 79, issue 116, 2026-10-28). lib.draftParts measures
// a draft into greeting, opening sentence, body and closer by position, and draftPartsLines
// renders them with the first words only, so a task that says "opening line" lands on one
// sentence for every seat and never on the greeting.
//
// What it pins, on invented texts:
//   - A four-block email with a bare link last: greeting paragraph 1; opening paragraph 2
//     sentence 1; body paragraph 2 from sentence 2; closer paragraphs 3 to 4 (the link folded
//     into the block before it).
//   - "Hi Amer," and "Dear Dr. Smith:" are greetings; a first line that is a sentence is not.
//   - A one-paragraph email of three sentences: no greeting; opening sentence 1; body sentence 2;
//     closer sentence 3 of paragraph 1.
//   - A draft of one sentence: opening only, no body, no closer.
//   - A blog post with no greeting and two paragraphs: opening paragraph 1; closer paragraph 2.
//   - The run of 2026-10-28: a greeting, one paragraph of three sentences, a bare link: the closer
//     is the paragraph's last sentence with the link, the body the sentence between.
//   - An address inside the opening sentence does not end it.
//   - The rendered lines name parts by position and carry at most eight words of each, with an
//     ellipsis when the sentence runs longer; an empty draft renders every part as none.
//
// Run from the repo root:   node tests/draft_parts_check.js
// Exit 0 on pass; exit 1 on any failure.

var path=require('path');
var lib=require(path.join(__dirname,'..','plugins','combat-writing','scripts','lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function J(x){ return JSON.stringify(x); }

var email='Amer,\n\nYour Story Builder page says AI assistance, human direction: faster with AI in the loop. With no rep on the line, the page carries every objection alone.\n\nCombat Writing runs a draft through rival AI models. Put the next launch post through it:\n\nhttps://example.invalid/cw\n';
var p=lib.draftParts(email);
check(p.greeting&&p.greeting.paragraph===1&&p.greeting.text==='Amer,','email: greeting: '+J(p.greeting));
check(p.opening&&p.opening.paragraph===2&&p.opening.sentence===1&&p.opening.words==='Your Story Builder page says AI assistance, human …','email: opening: '+J(p.opening));
check(p.body&&p.body.paragraph_from===2&&p.body.sentence_from===2&&p.body.paragraph_to===2,'email: body: '+J(p.body));
check(p.closer&&p.closer.paragraph_from===3&&p.closer.paragraph_to===4&&p.closer.words==='Combat Writing runs a draft through rival AI …','email: closer folds the bare link into the block before it: '+J(p.closer));
var lines=lib.draftPartsLines(p);
check(lines[0]===lib.PARTS_HEADING+':'&&lines[1]==='- GREETING: paragraph 1, "Amer,"'&&lines[2]==='- OPENING SENTENCE: paragraph 2, sentence 1, beginning "Your Story Builder page says AI assistance, human …"'&&lines[3]==='- BODY: paragraph 2 from sentence 2 through paragraph 2'&&lines[4]==='- CLOSER: paragraphs 3 to 4, beginning "Combat Writing runs a draft through rival AI …"','email: rendered lines: '+J(lines));

check(lib.draftParts('Hi Amer,\n\nOne line.\n\nTwo.\n').greeting.text==='Hi Amer,','"Hi Amer," is a greeting');
check(lib.draftParts('Dear Dr. Smith:\n\nOne line.\n\nTwo.\n').greeting.text==='Dear Dr. Smith:','"Dear Dr. Smith:" is a greeting');
check(lib.draftParts('Your page says a lot.\n\nTwo.\n').greeting===null,'a first line that is a sentence is not a greeting');
check(lib.draftParts('This is a long first line that goes on and on,\n\nTwo.\n').greeting===null,'a long first line ending in a comma is not a greeting');

var one=lib.draftParts('Your page promises privacy. The first reader will hunt for the breach. Run the next one through Combat Writing.\n');
check(one.greeting===null&&one.opening.paragraph===1&&one.opening.sentence===1&&one.opening.words==='Your page promises privacy.','one paragraph: opening: '+J(one.opening));
check(one.body&&one.body.paragraph_from===1&&one.body.sentence_from===2&&one.body.sentence_to===2,'one paragraph: body is sentence 2: '+J(one.body));
check(one.closer&&one.closer.paragraph_from===1&&one.closer.sentence===3&&one.closer.words==='Run the next one through Combat Writing.','one paragraph: closer is sentence 3: '+J(one.closer));
var oneLines=lib.draftPartsLines(one);
check(oneLines[3]==='- BODY: paragraph 1 from sentence 2 through paragraph 1 sentence 2'&&oneLines[4]==='- CLOSER: paragraph 1, sentence 3, beginning "Run the next one through Combat Writing."','one paragraph: rendered: '+J(oneLines));

var single=lib.draftParts('Only one sentence here.\n');
check(single.opening&&single.opening.words==='Only one sentence here.'&&single.body===null&&single.closer===null,'one sentence: opening only: '+J(single));
check(lib.draftPartsLines(single)[3]==='- BODY: none (the opening sentence runs straight into the closer)'&&lib.draftPartsLines(single)[4]==='- CLOSER: none','one sentence: rendered none lines: '+J(lib.draftPartsLines(single)));

var blog=lib.draftParts('Agents read more than people now. That changes who the reader is.\n\nSo the method has to be text an agent can read.\n');
check(blog.greeting===null&&blog.opening.paragraph===1&&blog.closer.paragraph_from===2&&blog.closer.paragraph_to===2&&blog.body&&blog.body.paragraph_from===1&&blog.body.sentence_from===2,'blog: no greeting, opening paragraph 1, body sentence 2, closer paragraph 2: '+J(blog));

var linked=lib.draftParts('See https://example.invalid/a.b for the page that says it. Then the rest.\n\nClose.\n');
check(linked.opening.words==='See https://example.invalid/a.b for the page that says it.','an address inside the opening sentence does not end it: '+J(linked.opening));

var real='Amer,\n\nYour Story Builder page says AI assistance, human direction. Combat Writing runs a draft through rival AI models and a judge. Put the next launch post through it:\n\nhttps://example.invalid/cw\n';
var rp=lib.draftParts(real);
check(rp.greeting&&rp.greeting.text==='Amer,'&&rp.opening.paragraph===2&&rp.opening.sentence===1,'the run of 2026-10-28: greeting and opening: '+J(rp));
check(rp.body&&rp.body.paragraph_from===2&&rp.body.sentence_from===2&&rp.body.sentence_to===2,'the run of 2026-10-28: body is the middle sentence: '+J(rp.body));
check(rp.closer&&rp.closer.paragraph_from===2&&rp.closer.sentence===3&&rp.closer.paragraph_to===3&&rp.closer.words==='Put the next launch post through it:','the run of 2026-10-28: closer is the call to action with the link: '+J(rp.closer));
check(lib.draftPartsLines(rp)[4]==='- CLOSER: paragraph 2 from sentence 3 through paragraph 3, beginning "Put the next launch post through it:"','the run of 2026-10-28: rendered closer: '+lib.draftPartsLines(rp)[4]);
var empty=lib.draftParts('');
check(empty.greeting===null&&empty.opening===null&&empty.body===null&&empty.closer===null,'empty: every part null');
check(lib.draftPartsLines(empty).slice(1).every(function(l){return /: none/.test(l);}),'empty: every rendered part none');
check(lib.draftParts('Amer,\n').opening===null&&lib.draftParts('Amer,\n').greeting.text==='Amer,','greeting only: greeting found, no opening');
check(typeof lib.PARTS_LINE==='string'&&/OPENING SENTENCE/.test(lib.PARTS_LINE)&&/never the greeting/.test(lib.PARTS_LINE),'PARTS_LINE names the opening sentence and bars the greeting');

if(failures.length){ console.log('draft_parts_check: '+failures.length+' failure(s), '+(passes+failures.length)+' checks'); failures.forEach(function(f){console.log('  FAIL '+f);}); }
else console.log('draft_parts_check: all passed, '+passes+' checks');
process.exit(failures.length?1:0);
