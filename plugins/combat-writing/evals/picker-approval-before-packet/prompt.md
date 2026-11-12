---
description: 'The picker path (issue 202): a text taken through the picker is shown back in one dialog before anything is written to the inbox or any packet is built for it.'
expected_outcome: 'The host starts a run from the pasted draft and runs the plain round 01-battle. For the next round it takes the stated picks, Battle: everyone then FQ, and the stated text, opens one dialog that shows the text in full and asks "Is this the message you want to send to all AI crew members?" with Send and Change it, and writes no inbox file and builds no packet for that text, because nobody chooses Send in this session.'
runs: 1
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, AskUserQuestion]
---
<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
/cw:battle I am answering the picker ahead of time, in this one message. First run the plain first round on the draft below. Then take these as my answers on the Next picker: Battle: everyone, then FQ. When the picker asks for my text, the message I type is: Which sentence carries the ask, and is it early enough? draft: Dear board,

I am writing to ask for your approval to acquire Northwind Analytics before the end of the quarter.

Northwind has grown revenue every year since it was founded. Our own sales team has lost three deals to Northwind this year. If we own them, we stop losing those deals.

The price is 3x revenue. Our bank has said in principle that it would finance half. The rest comes from cash on hand.

I know some of you will want more numbers. I will have the full model ready for the meeting. What I need today is your agreement that we move forward with the letter of intent.

Thank you for your trust.

Dana
