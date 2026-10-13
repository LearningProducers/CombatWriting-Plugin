// SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0
// crew-state.js: records why a run has no outside seat when the add-on's tools are absent.
//
//   node crew-state.js --run <run folder> --state absent|down
//
// Ruled 2026-10-13: when the crew has fewer seats than the person expects, every result names
// the reason and the exact next command. Three states. The add-on itself records the third
// (running, no key) in the crew.registered log line. The host records the other two here, since
// no add-on tool is there to do it: `absent`, the add-on is not installed; `down`, it is
// installed but its server is not running in this session. The record, the board and the short
// form then print the state's sentence under the crew line. Prints the sentence logged.

var path=require('path');
var lib=require('./lib.js');
var args=lib.parseArgs(process.argv.slice(2));
['run','state'].forEach(function(k){ if(!args[k]||args[k]===true)lib.die('--'+k+' is required'); });
var runDir=path.resolve(args.run);
lib.readSeats(runDir);
var state=String(args.state).trim().toLowerCase();
if(!lib.ADDON_STATE[state])lib.die('--state must be absent or down (the add-on records the no-key state itself); got '+args.state);
lib.appendLog(runDir,{event:'addon.state',state:state,by:'host',crew_list_tool:false});
process.stdout.write(lib.ADDON_STATE[state]+'\n');
