// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// plan_check.js: where each part of the plan is read (issue 249). PLAN.md is the only memory
// between build sessions, and every file in the tree but an image or a font is held under
// 256 KiB (license_check.js),
// so the plan is split when it reaches that size and its older parts move to an archive file,
// byte for byte. This test holds the three files to each other:
//
//   1. PLAN_ARCHIVE.md holds the parts numbered 1 to 90 and no other, 84 headings, each
//      once. Nine numbers never had a part of their own (30 to 35, 77, 78, 80), three parts
//      carry a number with a point (76.1, 81.1, 81.2), and the parts stand in the order they
//      were written, which is not the order of their numbers.
//   2. PLAN_ARCHIVE_2.md holds Parts 91 to 140, each heading once, under the Shield
//      header, one title and one opening paragraph. From its first part's heading to its end
//      it is the bytes PLAN.md held for those parts when they moved: one sha256, written
//      below. A change to a moved byte fails here; the opening is held to its shape and three
//      phrases, not to a hash.
//   3. PLAN.md holds Part 141 onward, each heading once, with no whole number left out, and
//      its opening names both archive files. A part may carry a number with a point (145.1),
//      as three parts of the first archive do. The last part is not held to be there: a
//      test cannot know the newest part's number.
//   4. No part's heading stands in two of the three files.
//   5. The root README names the three files, and CLAUDE.md's standing rule and layout name
//      the second archive and say PLAN.md holds Part 141 onward.
//
//   node tests/plan_check.js        (from the repository root; exit 0 pass, 1 fail)

var fs=require('fs'), path=require('path'), crypto=require('crypto');
var root=path.join(__dirname,'..');
var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }
function read(rel){ var p=path.join(root,rel); return fs.existsSync(p)?fs.readFileSync(p,'utf8'):null; }
function parts(text){ var out=[], re=/^## Part (\d+)(\.\d+)? /gm, m; while((m=re.exec(text||''))!==null)out.push(Number(m[1])+(m[2]?Number(m[2]):0)); return out; }
function range(a,b){ var out=[]; for(var i=a;i<=b;i++)out.push(i); return out; }
function sorted(a){ return a.slice().sort(function(x,y){return x-y;}); }
var SHIELD='<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->\n';
// Parts 91 to 140 as PLAN.md held them when they moved, from "## Part 91 " to the last byte before "## Part 141 ".
var MOVED_SHA256='e34ef40b3c47516ee26f3e8244345e057612d9cccac24e21c3b768b872225c4d', MOVED_BYTES=198218;

var first=read('PLAN_ARCHIVE.md'), second=read('PLAN_ARCHIVE_2.md'), plan=read('PLAN.md');
var firstParts=sorted(parts(first));
check(first!==null&&firstParts.length===84&&firstParts[0]===1&&firstParts[83]===90&&firstParts.every(function(n,i){ return n!==firstParts[i-1]; }),'PLAN_ARCHIVE.md: must hold the parts numbered 1 to 90, 84 headings, each once; it holds '+firstParts.length+', from '+firstParts[0]+' to '+firstParts[firstParts.length-1]);

check(second!==null,'PLAN_ARCHIVE_2.md: missing');
if(second!==null){
  check(second.indexOf(SHIELD)===0,'PLAN_ARCHIVE_2.md: must open with the Shield header');
  check(sorted(parts(second)).join()===range(91,140).join(),'PLAN_ARCHIVE_2.md: must hold Parts 91 to 140, each heading once; it holds '+parts(second).length+' headings, from '+sorted(parts(second))[0]+' to '+sorted(parts(second)).slice(-1)[0]);
  var at=second.indexOf('## Part 91 '), moved=at>=0?Buffer.from(second.slice(at),'utf8'):Buffer.alloc(0);
  check(moved.length===MOVED_BYTES&&crypto.createHash('sha256').update(moved).digest('hex')===MOVED_SHA256,'PLAN_ARCHIVE_2.md: from its first part to its end it must be the bytes PLAN.md held for Parts 91 to 140 ('+MOVED_BYTES+' bytes); it holds '+moved.length+', or a byte differs');
  var opening=at>=0?second.slice(SHIELD.length,at):'';
  check(/Parts 91 to 140/.test(opening)&&/byte for byte/.test(opening)&&/issue 249/.test(opening)&&opening.split('\n').filter(function(l){return /^#/.test(l);}).length===1&&opening.split('\n').filter(function(l){return l.trim()!=='';}).length===2,'PLAN_ARCHIVE_2.md: its opening must be one title and one paragraph, which says Parts 91 to 140 moved here byte for byte (issue 249)');
}

var mine=sorted(parts(plan)), whole=mine.filter(function(n){ return n===Math.floor(n); });
check(plan!==null&&mine.length>0&&mine[0]===141&&mine.every(function(n,i){ return n!==mine[i-1]; })&&whole.join()===range(141,Math.floor(mine[mine.length-1])).join(),'PLAN.md: must hold Part 141 onward, each heading once, no whole number left out; its lowest part is Part '+mine[0]+', it holds '+mine.length+' headings, and its whole numbers read '+whole.join(', '));
var planOpening=plan!==null&&plan.indexOf('## Part ')>=0?plan.slice(0,plan.indexOf('## Part ')):'';
check(/PLAN_ARCHIVE\.md/.test(planOpening)&&/PLAN_ARCHIVE_2\.md/.test(planOpening)&&/Part 141 onward/.test(planOpening),'PLAN.md: its opening must name PLAN_ARCHIVE.md and PLAN_ARCHIVE_2.md and say this file holds Part 141 onward');

var seen={}, twice=[];
[first,second,plan].forEach(function(t){ parts(t).forEach(function(n){ if(seen[n])twice.push(n); seen[n]=1; }); });
check(twice.length===0,'a part\'s heading stands in two of the plan\'s files: Part '+twice.slice(0,5).join(', '));

var readme=read('README.md')||'';
check(/\[PLAN\.md\]\(PLAN\.md\)/.test(readme)&&/\[PLAN_ARCHIVE\.md\]\(PLAN_ARCHIVE\.md\)/.test(readme)&&/\[PLAN_ARCHIVE_2\.md\]\(PLAN_ARCHIVE_2\.md\)/.test(readme),'README.md: must name PLAN.md, PLAN_ARCHIVE.md and PLAN_ARCHIVE_2.md, each as a link');

var law=read('CLAUDE.md')||'';
check(/PLAN_ARCHIVE_2\.md/.test(law)&&/PLAN\.md holds Part 141 onward/.test(law)&&!/Part 91 onward/.test(law),'CLAUDE.md: must name PLAN_ARCHIVE_2.md, say PLAN.md holds Part 141 onward, and not say Part 91 onward');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log(failures.length?'plan_check: '+failures.length+' of '+(passes+failures.length)+' checks failed':'plan_check: all passed, '+passes+' checks');
process.exit(failures.length?1:0);
