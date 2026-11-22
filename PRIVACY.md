<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Privacy: the Combat Writing plugin and its add-on

Last updated: 2026-11-21

Learning Producers Inc. makes two pieces of software for Claude Code: the Combat Writing plugin, named `cw`, and an add-on to it, named `combat-writing-crew`. This page says what each one sends off your machine and to whom, what each one stores and where, where an API key is kept, and what Learning Producers receives. It covers the two plugins and nothing else. The source of both is public in this repository, so each statement here can be checked against the code.

## What Learning Producers receives

Nothing from the software. Neither the plugin nor the add-on makes a network call to Learning Producers. Neither holds telemetry, analytics or crash reporting, and neither asks you to make an account. Learning Producers sees a draft, a brief, a result or a key only when you send it yourself, in a support message or in an issue on this repository.

## The plugin (cw): what leaves your machine

The plugin runs inside the Claude Code session you have open. Its scripts and hooks make no network call. The plugin holds no API key and reads none.

The plugin's own readers are Claude agents that your Claude Code session starts. Your draft, your brief and your description of the reader reach them through that session, and the plugin sends them nowhere else.

One command leads to a web address being opened. When you record a published piece with a link (`/cw:champion shipped` and an address), the plugin's instructions tell Claude Code to open that one address, once, to check that the page is live and matches your final draft. What comes back is saved in `combat-writing/inbox` in your project. No script of the plugin opens an address.

## The plugin (cw): what it stores, and where

In your project, in the folder `combat-writing`:

- a folder for each run, under `combat-writing/runs`: your draft and its revisions, the draft as shipped, the brief, the description of the reader when you gave one, every packet sent to a seat, every answer, a timestamped log, a record, a board page, and, on a Mac, a recording of each answer read aloud;
- the text you paste into a command, saved whole under `combat-writing/inbox` before the plugin reads it, and the page saved for a shipped link;
- your briefs, the insight vault, your choice of a model for a seat, your choice of a voice, and the switch for the picker that ends a round;
- a `.gitignore` of two lines, `runs/` and `inbox/`, written once, on the first run inside a git repository, and never over a file already there.

The board page is a local file. It loads nothing from the internet, and the plugin never publishes it. Whether any of these files is committed or shared is your decision.

Outside your project, in two places:

- The data folder Claude Code keeps for the plugin. One small file there records that the first-session check ran: the time, whether the add-on was found, and the voices found. The hook that holds each reader to its own files keeps its records there too: one small file for each start of a reader, holding the seat's id, the path of the run folder, the path of the packet, the path of the answer file and the time. Those paths carry the run folder's name, which is made from the first words of your draft, or of your brief when a run starts from the brief alone. A later start of a reader removes a session's records once 30 days have passed since a reader was last started or first placed in that session. With no later start, they stay.
- The system's temporary folder, on a Mac. While the answers are turned into audio, the text to be spoken stands there in one short-lived file for each seat. The files are removed once the audio is made. If that step is stopped early, they stay until the system clears the folder.

On a Mac the audio is made by the Mac's own speech program. Nothing is sent anywhere to make it.

## The plugin (cw): what it reads outside your project

- At the first session start, the plugin checks whether the add-on is installed. It runs `claude plugin list`, or, when that cannot run, looks in Claude Code's plugin cache folder. On a Mac it also reads the list of installed voices.
- Before every tool call, one hook reads its own records and the `seats.json` of the run. It opens no transcript.
- After each reader's answer is checked, another hook reads the transcript files Claude Code keeps for your session, to record which model wrote that answer. It reads the opening of each agent's transcript to find the reader's, takes the model id from that reader's replies and from the session's own latest reply, and writes one line to the run's log. It copies no text of your conversation anywhere.
- After each round, that hook opens the run's own board page in your browser with your system's file opener, when the session's shell could not.

The plugin reads two environment variables: the one in which Claude Code names the plugin's data folder, and `HOME`, to find the plugin cache folder.

## The add-on (combat-writing-crew): what leaves your machine, and to whom

The add-on is a local server that Claude Code starts on your machine. It seats models of other companies as extra readers, with your own API key for each company. It calls a provider only when you have given it a key for that provider, and it calls no one else.

For each seat, the add-on sends one packet for each read to that seat's provider, over HTTPS. A packet holds your draft, your brief, your description of the reader when you gave one, the task for the round, the seat's own earlier answer, and the other seats' answers when the round shares them. With the packet go a short system line (the seat's name, the shape of its first line, its word limit), the model's id and a limit on the reply's length. Your key for that provider goes in the request's `Authorization` header.

Before it seats a provider's models, the add-on asks that provider for its list of models. That request carries your key and nothing of your writing.

What the add-on sends a provider goes with your own key, to the provider you chose, under that provider's own terms and its own privacy policy. Learning Producers is no party to that exchange and receives no copy of it.

The addresses the add-on calls, and the only ones:

- Groq, at `api.groq.com`
- xAI, at `api.x.ai`
- Perplexity, at `api.perplexity.ai`
- OpenAI, at `api.openai.com`
- Mistral AI, at `api.mistral.ai`
- Google, at `generativelanguage.googleapis.com`
- a local Ollama model, at `localhost`, port 11434, which stays on your machine and is off until you name a model

## The add-on (combat-writing-crew): where a key is kept

The add-on writes no key to any file and no key to any log. A key reaches it from two places and no other, in this order:

1. The masked prompt Claude Code shows when you install or configure the add-on. Claude Code keeps what you type and hands it to the add-on's server when it starts it.
2. A key file you write by hand, `~/.combat-writing/keys`, read only when the prompt holds no key for that provider. The add-on reads it only when it is a regular file that you alone can read, in a folder that you alone can open. A file open to others, a link, or a line it cannot parse is refused whole, and the refusal names the problem and never a line's content. The add-on never writes this file.

A key that stands in your shell under a provider's usual name (`OPENAI_API_KEY` and the like) is not read.

## The add-on (combat-writing-crew): what it stores, and where

The add-on writes in the plugin's run folder, in your project, and nowhere else. For each answer it writes the answer file beside the packet, and adds lines to the run's log. When it seats its models it writes them into the run's `seats.json`. A log line holds the time, the provider, the model asked for and the model that answered, the word limit, whether the answer was cut, the token counts the provider reported, how long the add-on waited, and which of the two places supplied the key. It holds no key.

When a provider answers with an error, the add-on removes the key in use, account ids and strings shaped like a key from the error's text before that text is logged, shown or printed.

The add-on reads these environment variables: the seven that carry what you typed in its prompts; `OLLAMA_MODEL`, which names the local Ollama model when that prompt is empty; and `CW_CREW_KEY_FILE`, which moves the key file and exists for the add-on's tests.

## Removing your data

Everything the two plugins write is in places you control.

- Delete the folder `combat-writing` in your project.
- Delete the folder `~/.combat-writing`, if you made it.
- Uninstall the plugin and the add-on in Claude Code. The plugin's records in its data folder are small files of paths, as said above; you can delete that folder's `seat-scope` folder when no round is running.
- A key you made with a provider is managed and revoked in that provider's own console.

## Changes to this page

When a release changes what either plugin sends, stores or reads, this page and the date at its top change with it.

## Support

For a question, a problem with an install, or a privacy or security concern: `SUPPORT.md` in this repository names the address. Never send an API key, in a mail or in an issue.

Combat Writing is made by Learning Producers Inc. It is not made, reviewed or endorsed by Anthropic.
