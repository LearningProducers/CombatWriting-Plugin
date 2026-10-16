// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// draft_facts_check.js: the draft's counts measured by code (2026-10-15, Part 22): lib.draftFacts
// gives words, lines (non-blank) and paragraphs (blank-line separated blocks); draftFactsLine
// prints them; oneLineWarning fires only for a draft of more than 60 words on one line.
//
// What it pins, on invented texts:
//   - One line of 80 words: 1 paragraph, 1 line, the warning.
//   - Three blank-line paragraphs: 3 paragraphs, 3 lines, no warning.
//   - Single newlines without blank lines: 1 paragraph, 4 lines, no warning (the breaks are there).
//   - CRLF, a BOM, trailing blank lines and leading spaces do not change the counts.
//   - An empty text: all zeros.
//   - The line's wording and its plurals.
//   - Part 21: sentences by the stated rule, exact when no abbreviation or decimal is present and
//     "about" otherwise; em and en dashes and double hyphens; each link by paragraph, line,
//     alone-on-its-line, last-in-draft and in-sentence, never its address; the full line's wording.
//
// Run from the repo root:   node tests/draft_facts_check.js
// Exit 0 on pass; exit 1 on any failure.

var path=require('path');
var lib=require(path.join(__dirname,'..','plugins','combat-writing','scripts','lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function same(a,b){ return JSON.stringify(a)===JSON.stringify(b); }
function three(f){ return {words:f.words,lines:f.lines,paragraphs:f.paragraphs}; }

var one=new Array(81).join('word ').trim()+'\n';
var f1=lib.draftFacts(one);
check(same(three(f1),{words:80,lines:1,paragraphs:1}),'one line: '+JSON.stringify(f1));
check(lib.oneLineWarning(f1)==='The draft arrived as one line of 80 words; if it had paragraph breaks, paste it again.','one line: the warning is missing or worded differently: '+lib.oneLineWarning(f1));
check(lib.draftFactsLine(f1)==='80 words · 1 paragraph · 1 line','one line: the line reads '+lib.draftFactsLine(f1));

var threePara='Dear board,\n\nBuy the company. It is cheap.\n\nYours.\n';
var f3=lib.draftFacts(threePara);
check(same(three(f3),{words:9,lines:3,paragraphs:3})&&lib.oneLineWarning(f3)===null,'three paragraphs: '+JSON.stringify(f3));
check(lib.draftFactsLine(f3)==='9 words · 3 paragraphs · 3 lines','three paragraphs: the line reads '+lib.draftFactsLine(f3));

var soft='Dear board,\nBuy the company.\nIt is cheap.\nYours.\n';
var fs_=lib.draftFacts(soft);
check(same(three(fs_),{words:9,lines:4,paragraphs:1})&&lib.oneLineWarning(fs_)===null,'single newlines: '+JSON.stringify(fs_));

var messy='\uFEFF  Dear board,\r\n\r\n   Buy the company.\r\n\r\n\r\n\r\nYours.\r\n\r\n\r\n';
check(same(three(lib.draftFacts(messy)),{words:6,lines:3,paragraphs:3}),'CRLF, BOM and blank runs: '+JSON.stringify(lib.draftFacts(messy)));
check(same(three(lib.draftFacts('')),{words:0,lines:0,paragraphs:0})&&lib.oneLineWarning(lib.draftFacts(''))===null,'empty text: '+JSON.stringify(lib.draftFacts('')));
check(lib.draftFactsLine({words:1,paragraphs:1,lines:1})==='1 word · 1 paragraph · 1 line','singulars wrong');
var short=lib.draftFacts(new Array(61).join('word ').trim());
check(short.words===60&&lib.oneLineWarning(short)===null&&lib.ONE_LINE_WORDS===60,'a one-line draft of 60 words gets no warning; 61 does: '+JSON.stringify(short));
check(lib.oneLineWarning(lib.draftFacts(new Array(62).join('word ').trim()))!==null,'a one-line draft of 61 words should warn');


// Part 21: sentences by the stated rule, exact or about; dashes; each link by position, never its address.
var email='Hi,\nThe doc you wrote is read by people. What was obvious to you is where a new hire loses the thread, and you cannot see where. It puts a doc in front of models that attack it. Run that doc through it.\nhttps://example.invalid/x\n';
var fe=lib.draftFacts(email);
check(fe.sentences===4&&fe.sentences_exact===true&&fe.em_dashes===0&&fe.en_dashes===0&&fe.double_hyphens===0,'email: 4 exact sentences and no dash: '+JSON.stringify(fe));
check(fe.links.length===1&&same(fe.links[0],{paragraph:1,line:3,alone_on_line:true,last_in_draft:true,in_sentence:false}),'email: one link alone on the last line: '+JSON.stringify(fe.links));
var full=lib.draftFactsFull(fe);
check(full==='44 words · 1 paragraph · 3 lines · 4 sentences · 0 em dashes, 0 en dashes, 0 double hyphens · 1 link: link 1 in paragraph 1, line 3, alone on its line, the last thing in the draft','email: the full line reads '+full);
check(full.indexOf('example.invalid')<0,'email: the address must never be in the facts');
var abbr='Dr. Smith paid 3.5 million. See e.g. the U.S. data at https://example.invalid/a. Done!\n\nNext — and this — is it -- really?\n';
var fa=lib.draftFacts(abbr);
check(fa.sentences_exact===false&&fa.em_dashes===2&&fa.en_dashes===0&&fa.double_hyphens===1,'abbreviations: the count is about, two em dashes, one double hyphen: '+JSON.stringify(fa));
check(/about \d+ sentences \(the rule may miscount abbreviations or decimals\)/.test(lib.draftFactsFull(fa)),'abbreviations: the full line should say about');
check(fa.links.length===1&&fa.links[0].alone_on_line===false&&fa.links[0].in_sentence===true&&fa.links[0].last_in_draft===false&&fa.links[0].paragraph===1,'abbreviations: the link sits inside a sentence in paragraph 1: '+JSON.stringify(fa.links));
var enDash='Pages 3–5 cover it. A link inside: see https://example.invalid/b and then more.\n\nLast line. https://example.invalid/c\n';
var fn=lib.draftFacts(enDash);
check(fn.en_dashes===1&&fn.em_dashes===0&&fn.sentences===3&&fn.sentences_exact===true,'en dash: one en dash, three exact sentences: '+JSON.stringify(fn));
check(fn.links.length===2&&fn.links[0].in_sentence===true&&fn.links[0].alone_on_line===false&&fn.links[1].alone_on_line===false&&fn.links[1].last_in_draft===true&&fn.links[1].paragraph===2&&fn.links[1].line===2,'en dash: two links, the second last in the draft but not alone on its line: '+JSON.stringify(fn.links));
check(lib.draftFacts('One line no end\n').sentences===0&&/0 sentences · /.test(lib.draftFactsFull(lib.draftFacts('One line no end\n')))&&/ · no link$/.test(lib.draftFactsFull(lib.draftFacts('One line no end\n'))),'no end mark: zero sentences, no link');
check(lib.draftFacts('Ask him. "Really?" she said. Yes!\n').sentences===4,'an end mark before a closing quote counts, by the stated rule');
check(lib.FACTS_HEADING==='Measured by code (facts, not a judgment)','the heading changed');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'draft_facts_check: '+failures.length+' failure(s), ':'draft_facts_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
