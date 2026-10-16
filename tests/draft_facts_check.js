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
//
// Run from the repo root:   node tests/draft_facts_check.js
// Exit 0 on pass; exit 1 on any failure.

var path=require('path');
var lib=require(path.join(__dirname,'..','plugins','combat-writing','scripts','lib.js'));
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function same(a,b){ return JSON.stringify(a)===JSON.stringify(b); }

var one=new Array(81).join('word ').trim()+'\n';
var f1=lib.draftFacts(one);
check(same(f1,{words:80,lines:1,paragraphs:1}),'one line: '+JSON.stringify(f1));
check(lib.oneLineWarning(f1)==='The draft arrived as one line of 80 words; if it had paragraph breaks, paste it again.','one line: the warning is missing or worded differently: '+lib.oneLineWarning(f1));
check(lib.draftFactsLine(f1)==='80 words · 1 paragraph · 1 line','one line: the line reads '+lib.draftFactsLine(f1));

var three='Dear board,\n\nBuy the company. It is cheap.\n\nYours.\n';
var f3=lib.draftFacts(three);
check(same(f3,{words:9,lines:3,paragraphs:3})&&lib.oneLineWarning(f3)===null,'three paragraphs: '+JSON.stringify(f3));
check(lib.draftFactsLine(f3)==='9 words · 3 paragraphs · 3 lines','three paragraphs: the line reads '+lib.draftFactsLine(f3));

var soft='Dear board,\nBuy the company.\nIt is cheap.\nYours.\n';
var fs_=lib.draftFacts(soft);
check(same(fs_,{words:9,lines:4,paragraphs:1})&&lib.oneLineWarning(fs_)===null,'single newlines: '+JSON.stringify(fs_));

var messy='\uFEFF  Dear board,\r\n\r\n   Buy the company.\r\n\r\n\r\n\r\nYours.\r\n\r\n\r\n';
check(same(lib.draftFacts(messy),{words:6,lines:3,paragraphs:3}),'CRLF, BOM and blank runs: '+JSON.stringify(lib.draftFacts(messy)));
check(same(lib.draftFacts(''),{words:0,lines:0,paragraphs:0})&&lib.oneLineWarning(lib.draftFacts(''))===null,'empty text: '+JSON.stringify(lib.draftFacts('')));
check(lib.draftFactsLine({words:1,paragraphs:1,lines:1})==='1 word · 1 paragraph · 1 line','singulars wrong');
var short=lib.draftFacts(new Array(61).join('word ').trim());
check(short.words===60&&lib.oneLineWarning(short)===null&&lib.ONE_LINE_WORDS===60,'a one-line draft of 60 words gets no warning; 61 does: '+JSON.stringify(short));
check(lib.oneLineWarning(lib.draftFacts(new Array(62).join('word ').trim()))!==null,'a one-line draft of 61 words should warn');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'draft_facts_check: '+failures.length+' failure(s), ':'draft_facts_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
