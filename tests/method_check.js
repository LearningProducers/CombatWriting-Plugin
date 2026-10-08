// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// method_check.js: the step text shipped in the plugin is the app's text, kept as
// written, and any change to it is deliberate.
//
// What it pins:
//   - plugins/combat-writing/method/combat-writing.md carries the app's text from
//     "## Discovery in Publishing" up to "## Where the plugin departs from the
//     steps" (the intro, the key questions, the four stage sections with Step 1
//     to Step 19, and the pre-session tips), and the SHA-256 of that span equals
//     the hash pinned below. When the span changes, this check fails and prints
//     the new hash, so the session that changed the steps updates the pin on
//     purpose and says so in its report.
//   - The span holds exactly 19 bolded step headings, Step 1 to Step 19 in order,
//     under the four stage headings in order.
//   - The file has the departures heading after the span and at least one
//     numbered departure under it.
//   - The file does not pin an app version number in its intro (the text is kept
//     as written; the version is this check's business, not the prose's).
//
// Run from the repo root:   node tests/method_check.js
// Exit 0 on pass; exit 1 on any failure.

var fs=require('fs'), path=require('path'), crypto=require('crypto');
var file=path.join(__dirname,'..','plugins','combat-writing','method','combat-writing.md');
var PINNED_SHA256='b2dd2c706511c4fc5234e2b5645502850c1d7f7864fe90b710443d5612c9a156';
var START='## Discovery in Publishing';
var END='## Where the plugin departs from the steps';

var failures=[], passes=0;
function check(cond,msg){ if(cond)passes++; else failures.push(msg); }

var text=fs.readFileSync(file,'utf8');
var a=text.indexOf(START), b=text.indexOf(END);
check(a>=0,'method: "'+START+'" heading missing');
check(b>a,'method: "'+END+'" heading missing or before the steps');
var span=(a>=0&&b>a)?text.slice(a,b):'';
var hash=crypto.createHash('sha256').update(span).digest('hex');
check(hash===PINNED_SHA256,'method: the step text changed. New SHA-256 of the span is '+hash+'. If the change is deliberate, update PINNED_SHA256 in tests/method_check.js and say so in the session report.');

var steps=[]; var re=/\*\*Step (\d+)/g, m;
while((m=re.exec(span)))steps.push(parseInt(m[1],10));
check(steps.length===19&&steps.every(function(n,i){return n===i+1;}),'method: expected Step 1 to Step 19 in order, found '+JSON.stringify(steps));
var stages=['## Strategy stage','## Sparring stage','## Battle stage','## Champion stage'];
var pos=stages.map(function(s){return span.indexOf(s);});
check(pos.every(function(p,i){return p>=0&&(i===0||p>pos[i-1]);}),'method: the four stage headings are missing or out of order: '+JSON.stringify(pos));
check(/\n1\. \*\*/.test(text.slice(b)),'method: no numbered departure under the departures heading');
check(!/v\d+\.\d+/.test(text.slice(0,a>=0?a:text.length)),'method: the intro pins an app version number');

failures.forEach(function(f){console.log('FAIL '+f);});
console.log((failures.length?'method_check: '+failures.length+' failure(s), ':'method_check: all passed, ')+passes+' checks');
process.exit(failures.length?1:0);
