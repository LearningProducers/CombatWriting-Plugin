<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Privacy: the Combat Writing plugin and its add-on

Last updated: 2026-11-24

Learning Producers Inc. makes two plugins for Claude Code: the Combat Writing plugin, named `cw`, and an add-on to it, named `combat-writing-crew`. This page says what each one sends off your machine and to whom, what each one stores and where, where an API key is kept, and what Learning Producers receives. It covers the two plugins and nothing else. Their source is in this repository, where each statement here about the plugins' own code can be checked. Where a statement rests on what another program does (Claude Code, your browser, your operating system, a provider), the page says so and speaks for the plugins' own code alone.

## What Learning Producers receives

Nothing from the software. Neither the plugin nor the add-on makes a network call to Learning Producers, and neither holds telemetry, analytics or crash reporting. Neither asks you for an account with Learning Producers. The software sends Learning Producers no draft, no brief, no result and no key. What you send yourself, in a support message or in an issue on this repository, is yours to send.

## The plugin (cw): what leaves your machine

The plugin runs inside your Claude Code session. Its scripts and hooks make no network call of their own. The plugin holds no API key and reads none.

The plugin's own readers are Claude agents that your Claude Code session starts. Each reads a packet that holds your draft, your brief, your description of the reader, the round's task and, in some rounds, earlier answers. So that text goes to the model each reader runs on: the first reader on the session's own model, the second, by default, on the next most capable model your Claude Code session offers, when that is not the session's own. How it travels there is Claude Code's. The plugin's code sends it nowhere else.

The plugin's hooks and the add-on's tools also hand the session lines of their own. Among them: whether the add-on is installed and which voices were found, a fixed line after a round's scripts, a refusal that names a path on your machine, and, in a tool's result, model ids, an answer file's path, a provider's error text after the scrub described below, the name of a key's prompt field and the key file's path. Those lines go to the session's model with the rest of its work.

One command leads to a web address being opened. When you record a published piece with a link (`/cw:champion shipped` and an address), the plugin's instructions tell Claude Code to fetch that address once (a fetch from the shell follows the address's own redirects), to check that the page is live and matches your final draft. What comes back is saved in `combat-writing/inbox` in your project. No script of the plugin opens an address.

Besides Node, which runs its own scripts, the plugin starts three programs that are not its own: `claude plugin list`, to see whether the add-on is installed; on a Mac, `say`, to read the list of voices and to make the audio; and your system's file opener, to open the board (a flag of the opener's script names another opener; no command of the plugin passes it). What each of those does is its maker's.

## The plugin (cw): what its hooks are handed

Claude Code hands a plugin's hooks more than the plugin's own work. One hook of the plugin is handed the name and the input of every Read and Write call and every start of an agent, in a session in which the plugin is on. Another is handed every shell command of that session and its output, and every start of an agent with what the host returned for it. Each tells the plugin's own calls from the rest by name: an agent of the type `seat`, or a shell command that names one of the plugin's scripts. Neither writes, sends or keeps anything from the rest.

## The plugin (cw): what it stores, and where

In your project, in the folder `combat-writing`:

- a folder for each run, under `combat-writing/runs`. Among its files: your draft and its revisions, the draft as shipped, the brief, your description of the reader when you gave one, the list of seats, every packet sent to a seat, every answer, a question you put to one seat, a timestamped log, a record, a board page and, on a Mac with a Premium or Enhanced voice installed, recordings of each answer read aloud, up to four voices for a seat;
- under `combat-writing/inbox`, the text you paste into a command, saved whole before the plugin reads it, the pieces cut from it, and the page saved for a shipped link;
- your briefs, the insight vault, your choice of a model for a seat, your choice of a voice, and the switch for the picker that ends a round;
- a `.gitignore` of two lines, `runs/` and `inbox/`, written when a run starts inside a git repository and no such file is there. It is never written over a file already there.

Neither plugin deletes a run or an inbox file. A recording is removed only when its render failed or it holds no sound. Whether any of these files is committed or shared is your decision. Where the plugin wrote the ignore file, it names the runs and the inbox alone: your briefs, the vault and your choices are not in it, and a line of the vault and the picker's switch each carry a run folder's name.

The record holds your brief, your description of the reader and every answer in full. The log holds no draft and no answer in full; among what it holds: counts, hashes, file names, model ids, voice names, one quoted line of an answer where a seat changed its rating, the lines you typed as a result or an insight, and the link and the words you gave with `shipped`, which can name a person.

The board page is a local file. As the plugin writes it, it loads nothing from the internet, and the plugin never publishes it. The Read aloud button on a seat's answer plays a recording when the Mac made one and it plays, and otherwise speaks through your browser's own voices; the one on the shipped draft speaks through the browser every time. What a browser's voice does with the text it speaks is the browser's; the plugin's code does not hold it to a voice on your machine. The board keeps your choice of a voice for a seat in your browser's storage. Its Copy button puts the shipped draft on your clipboard, and its Download button saves it as a text file where your browser saves downloads.

Outside your project, the plugin's scripts and hooks write in two places:

- The data folder Claude Code names for the plugin. One small file there records that the first-session check ran: the time, whether the add-on was found, and the voices found. The hook that holds each reader to its own files keeps its records there too, in a folder named by the session's id: one small file for each start of a reader, named for the agent once a reader takes it, holding a version number, the seat's id, the time, and the absolute paths of the run folder, the packet and the answer file. Those paths carry your project's path and the run folder's name, which is the date, the time and a few words made from the first words of a pasted draft or brief, or from a file's name. Every session start, and every later start of a reader, removes the records of sessions in which no reader was started or first placed for 30 days, twenty sessions at one start at the most; a start of a reader never removes those of the session it runs in. They stay on only while no session starts with the plugin on.
- Nothing in the system's temporary folder. On a Mac, the text to be spoken goes to the speech engine directly, and no file of it is written. An earlier version wrote it to one file for each seat there while the audio was made, and a step stopped early left the files; each later voice step removes such a file once it is fifteen minutes old.

## The plugin (cw): what it reads outside your project

- When a session starts, a hook checks whether the add-on is installed: it starts `claude plugin list`, or, when that cannot run, looks in Claude Code's plugin cache folder. On a Mac it also reads the list of installed voices. It does both at the first start and records the result. At a later start it makes the data folder when that is missing and looks only for that record, unless the record could not be kept or a check did not come back; then it checks again. Some commands also tell Claude Code to run `claude plugin list`, and on a Mac each round reads the list of voices again.
- When a run starts, the plugin looks for a `.git` entry in your project folder and in each folder above it, to decide whether to write the ignore file.
- A draft, a brief or a description of the reader given as a file path is read from where it is.
- Before every Read and Write call and every start of an agent, one hook's command runs: a filter first, which ends it unless the call holds the name of the plugin's reader or a character written as an escape, and only then the hook itself. For the plugin's own readers it reads its records, and the run's list of seats when a reader is started. It opens no transcript. When Node is not on your PATH, or the `node` there does not run, the hook cannot run: nothing of your own work is stopped, with two exceptions: a call of your own one of whose values is exactly the reader's name, `cw:seat`, or ends with that name right after a double quote, is refused as the reader's own would be, and on a machine that also has no `grep` a Read, a Write and a start of an agent are refused; no reader of the plugin is started, and the session start says in one line that Node is missing. The plugin's reader has one name, `cw:seat`, the name Claude Code reports for it: an agent of your own named `seat` is yours, and the fence never judges it.
- When the host starts one of the plugin's own Claude readers, another hook records which model the reader started on. It reads no transcript and no file Claude Code keeps of your session. It is handed the start, and reads four things of it: the reader's type; the line of the task that names the reader's packet, which the plugin's own command wrote, to learn the seat and the round; the model choice passed; and the model the host resolved for the reader. It also reads the working folder the host names on every hook call, to place a packet's path. It writes a line to the run's log when that model is not the one last logged for that reader and round. The line's fields, all of them: the time, the line's kind (`seat.model`), the seat, the round, the model's id, the choice passed, that it was read at the start, that the hook wrote it, and, when a choice was passed that is no model id, a mark that the choice could not be read. Whatever else the start carries, the rest of the task and the reader's reply when the host waited for it, the hook does not read, and it keeps none of that text: each value it writes from the start is a model id or one of the plugin's own words.
- After a round, that hook opens the run's own board page in your browser with your system's file opener, when the session's shell could not, or when the round's output was hidden and the log's last line on the board does not say the shell opened it in the last two minutes. Before it opens the page it runs the plugin's own script that writes the board again, and it adds a line to the run's log that says whether the board opened, or that the opener was started and was still running three seconds later. When the round's output was hidden, it also runs the script that writes the record. When the session's shell silenced the speech engine on a Mac, or the round's voice step left no record, it runs the one that makes the recordings.

The plugin's code names two environment variables: the one in which Claude Code names the plugin's data folder, and `HOME`, to find the plugin cache folder. Its hook commands and its skills name the plugin's own folder as Claude Code gives it. The programs it starts are found by name on your `PATH`, and the temporary folder it clears an earlier version's files from is the one your system names.

## The add-on (combat-writing-crew): what leaves your machine, and to whom

The add-on is a local server that Claude Code starts on your machine. It seats models of other companies as extra readers, with your own API key for each provider. It calls a provider only when you have given it a key for that provider. The one exception is the local Ollama seat, which needs no key and is called once a model is named for it.

For each seat, the add-on sends the seat's packet to that seat's provider, over HTTPS; the local Ollama seat is called over plain HTTP, at `localhost`. The packet is the file the add-on finds in the run folder the tool call names; it does not check who wrote that file. A packet holds your draft, your brief, your description of the reader when you gave one, the task for the round, the names of the crew's models, the seat's own earlier answer, and the other seats' answers when the round shares them. With the packet go a system line (the seat's name, the shape of its first line, its word limit), the model's id, a limit on the reply's length and a few settings of the request. Your key for that provider goes in the request's `Authorization` header. The same packet is sent again when a provider answers that a limit was reached, and when a failed check sends the seat back; then a note on what failed goes after it.

When it lists or seats a provider's models, the add-on asks that provider for its list of models. It keeps a good answer in memory for five minutes, and asks again after that, after a failed answer, and after the server starts again. That request carries your key and nothing of your writing.

What the add-on sends a provider goes with your own key, to the provider you chose, under that provider's own terms and its own privacy policy. Those are between you and that provider, and this page does not speak for them. Learning Producers receives no copy of what is sent.

The addresses the add-on calls, and the only ones:

- Groq, at `api.groq.com`
- xAI, at `api.x.ai`
- Perplexity, at `api.perplexity.ai`
- OpenAI, at `api.openai.com`
- Mistral AI, at `api.mistral.ai`
- Google, at `generativelanguage.googleapis.com`
- a local Ollama program, at `localhost`, port 11434. This seat is off until a model is named for it, in the add-on's prompt or in the variable `OLLAMA_MODEL`. What Ollama does with a packet is Ollama's.

## The add-on (combat-writing-crew): where a key is kept

The add-on writes no key to any file. A key reaches it from two places and no other, in this order:

1. The prompt for that key which Claude Code shows when you install or configure the add-on. The add-on marks each key option as sensitive. Claude Code holds what you type and passes it to the add-on's server in a variable the add-on reads; how Claude Code stores it, and that nothing else fills that variable, are Claude Code's.
2. A key file you write by hand, `~/.combat-writing/keys`, read when the prompt holds no key for a provider: when the add-on lists or calls its seats, and each time it scrubs a text: an error's, or its own ready line at its start. On macOS and Linux the add-on reads it only when it is a regular file whose mode gives no access to your group or to others, in a folder whose mode gives none. A file open to others, a link, or a line it cannot parse is refused whole, and the refusal names the problem and never a line's content. The add-on never writes this file.

A key that stands in your shell under a provider's usual name (`OPENAI_API_KEY` and the like) is not read.

## The add-on (combat-writing-crew): what it stores, and where

The add-on writes in the run folder the tool call names: a folder that holds a run's list of seats. It does not check where that folder is. For each answer it writes the answer file beside the packet and adds lines to the run's log. When it seats its models it writes them into the run's list of seats, and it corrects a seat's model name there when a provider answers under another id. It stores an id from a provider's list, a maker's name and the id a provider answers under only in the shape of one: a model id holds no space and no line break, and a name in another shape is not stored. Among what a log line holds: the time, the provider, the model asked for and the model that answered, the word limit, whether the answer was cut, the token counts the provider reported, when they are whole numbers from 0 to a thousand million, how long the add-on waited, which of the two places supplied the key, how many times it replaced your key in an answer that repeated it, the note sent on a retry, a provider's error text when a call failed, made one line and cut at 300 characters, and, when it seats its models, the name of a key's prompt field and the key file's path. It prints one line to its error stream when it is ready, which Claude Code may keep.

Before an error's text is logged, shown or printed, the add-on removes from it every key the add-on holds, each by its exact text, and strings of the shapes it knows for an account id and for a key. An id or a fragment of a key in another shape stays. In a provider's answer the add-on replaces every key the add-on holds, each by its exact text, before the answer is written. The shapes are not applied to an answer, because they would change a seat's own words: a key the add-on does not hold, and an account id, stay in an answer as the provider wrote them. Among what else the add-on does to an answer before it writes it: it strips a model's `<think>` blocks, trims space at its start and at the ends of its lines, and cuts an answer still over its word limit after a retry. The note sent on a retry is logged as it came, trimmed at its ends.

The add-on's code reads these from its environment: the seven variables that carry what you typed in its prompts; `OLLAMA_MODEL`; `CW_CREW_KEY_FILE`, which moves the key file and exists for the add-on's tests; and your home folder's path.

## Removing your data

What the two plugins write, and where to remove it:

- The folder `combat-writing` in your project: delete it.
- The folder `~/.combat-writing`, if you made it: delete it.
- The plugin's data folder: Claude Code names it and keeps it, so its place is Claude Code's to say. It holds the first-session file and the folder `seat-scope`, small files of paths, as said above.
- A text file an earlier version left in your system's temporary folder when a voice step was stopped early: such a name begins `cw-speak-`, and a later voice step removes it.
- Your choice of a voice for a seat, in your browser's storage.
- A shipped draft you downloaded from the board, where your browser saved it.
- A key you made with a provider is that provider's to manage. The add-on cannot revoke one.

Removing these does not remove what other programs keep: Claude Code's own record of a session, which holds whatever you pasted into it, and the key Claude Code holds from the add-on's prompt.

## Changes to this page

This page describes the two plugins as they stand at the date at its top. The page's own history is in this repository.

## Support

For a question, a problem with an install, or a privacy or security concern: `SUPPORT.md` in this repository names the address. Never send an API key, in a mail or in an issue.

Combat Writing is made by Learning Producers Inc. It is not made or endorsed by Anthropic.
