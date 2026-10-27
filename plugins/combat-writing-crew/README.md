<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™ Crew: the add-on

**Reading is Peace. Writing is War.**

The listed Combat Writing plugin seats one fresh reader from one company. This add-on seats other companies' models beside it, one seat per model you hold a key for, on your own API keys, so a round can be read by more than one company. The crew is never padded: with one free Groq key it is three seats. It is a local MCP server. It is **not in the Claude plugin directory**; it is installed from this repository as Learning Producers' own marketplace. The add-on is source-available under the same terms as the listed plugin.

## What it does

- `crew_list` says which outside seats are available with the keys you set, each named by the model id resolved from the provider's live catalog and by the model's maker, with the serving provider stated.
- `crew_register` adds those seats to a run's `seats.json`, so the listed plugin builds their packets like any seat's.
- `crew_answer` sends one seat's packet for one round to its provider, with the packet's word cap and first-line contract stated in the system line, waits out the per-minute window, writes the answer file beside the packet, and logs the model id the API returned. The listed plugin's checks, battle, final reads, record and board then work across companies with nothing copied by hand.

A seat that fails, has no key, or whose packet is too long to send is shown as missing, never silently replaced. Nothing is faked.

## The word cap

Every packet states its cap: 500 words for a read alone, 600 when other seats' answers are carried, 250 for a final read. The add-on repeats the number in the system line it sends, so the outside seat knows the cap before it writes. An answer over the cap fails the listed plugin's check and the host sends the seat back once, with the reasons in `note`; the reason names the retry target, 80% of the cap, and the add-on's retry line repeats it. If that second answer is over the cap again, the add-on cuts it at the cap: the contract's first line (`RATING: X/10`, or the S/N or red-flag line) is pulled out of the reply wherever the seat put it and kept at the top, the rest is cut at the last sentence end before the cap (at a word boundary when no sentence ends in the last sixty words) so the file counts no more than the cap, and the log line says `truncated` with the word counts. The record and the board mark that read "truncated at N words" with the rating shown. A read in a round that asked for no rating is cut the same way with no line to keep. The listed plugin's checker makes the same cut for its fresh reader, so one rule holds for every seat. The answer file holds only the seat's own words; the mark lives in the log.

## Install

In Claude Code:

```
/plugin marketplace add LearningProducers/CombatWriting-Plugin
/plugin install combat-writing-crew@learning-producers
```

Or in one step, on Claude Code 2.1.275 or later:

```
/plugin install combat-writing-crew --marketplace LearningProducers/CombatWriting-Plugin
```

Install the listed plugin, `cw` (its commands are `/cw:strategy`, `/cw:sparring`, `/cw:battle` and `/cw:help`), the same way; the add-on does nothing on its own.

## Keys and where the prompt appears

Each key goes only to its own provider. No key is ever sent to Learning Producers, written to a file by the add-on, or logged. The route, in order:

1. **The masked prompt.** When you install or enable the add-on in Claude Code, a dialog asks for each key with the input masked; the value goes to Claude Code's secure credential store (the macOS Keychain, or `~/.claude/.credentials.json` where there is none), keyed by the plugin's id, not to a settings file. Reopen it any time with `/plugin configure combat-writing-crew@learning-producers`. Every key is optional: leave the ones you do not have empty. A plugin version bump keeps the stored key; the host rebuilding its credentials store does not (measured 2026-10-19 on Claude Code 2.1.303: the store was recreated at a session start after a host update, and the key went with it while the install stood). When that happens the crew says so and the key is typed in again; a save with nothing typed says "No configuration changes" and keeps nothing.
2. **An environment variable, only when the prompt's value is empty.** `GROQ_API_KEY`, `XAI_API_KEY`, `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, `MISTRAL_API_KEY`, `GEMINI_API_KEY`. The server reads the variable from its own environment and sends it only to that provider.
3. **Your own key file, only when the prompt and the variable are both empty.** One file, `~/.combat-writing/keys`, in your home folder, written by you by hand in a Terminal and never through a tool call (a key typed into a tool call lands in a transcript), holding `NAME=value` lines with the same names as the environment variables (`GROQ_API_KEY=...`), `#` comments and blank lines allowed. The server reads it only when it is a regular file that only you can read (mode 600) in a folder only you can open (mode 700); a file open to others, a symlink, or a line that is not `NAME=value` is refused whole, and the crew says why, naming the mode or the line number and never a line's content. A `.env` or a key file beside your project is still never opened. To write it on macOS, with the key on the clipboard:

```
mkdir -p ~/.combat-writing && chmod 700 ~/.combat-writing
(umask 077; printf 'GROQ_API_KEY=%s\n' "$(pbpaste)" > ~/.combat-writing/keys)
ls -l ~/.combat-writing/keys
```

The `ls` line must read `-rw-------`. Then start a new session; the add-on reads the file at every call.

**Where a key lives, measured (Part 36.1, 2026-10-20, Claude Code 2.1.304 through 2.1.310).** The masked prompt's value goes to the host's credentials store (on macOS a Keychain item keyed by the plugin's id) and reaches the server as an empty string when unset or dropped. The host rebuilt that store on 2026-10-16 and again on 2026-10-24, each on a Claude Code update, and the key went with it both times while the install and the manifest stood; the crew ran one seat until a board showed it. An environment variable survives the host but is visible to every process you run and is often copied into logs. The key file survives the host, is as exposed as the environment to processes running as you and no more, and is never rebuilt by anything; its permissions are the floor and the add-on refuses it when they are not owner-only. That is why the read order is prompt, then environment, then file: a key lost from the store falls through to the file and the seat stays. The add-on is a local MCP server and reads the file outside any shell sandbox; a sandboxed shell in the same session may be denied the path by its own settings, which is the point.

Which surfaces show the prompt: **Claude Code** shows it (the install dialog, the VS Code extension's form, and `/plugin configure`). **Cowork** does not prompt for plugin options and ignores an option with no default, so on Cowork the environment variable is the only route. **Claude in chat** does not start local MCP servers at all, so the add-on does not run there; the crew is one seat, the host.

A crew with no paid keys is allowed: one free Groq key seats two outside models (OpenAI's open-weight line and Alibaba's Qwen line, both served by Groq) beside the listed plugin's fresh reader, a crew of three. Every further key adds one seat.

## When a seat you expected is missing

Ruled 2026-10-13: every result of the listed plugin names the reason and the exact next command when the crew is short, in a Seats line under the crew line. Three states:

1. **Not installed.** The host has no crew tools and `claude plugin list` does not show `combat-writing-crew`. Next: `/plugin install combat-writing-crew --marketplace LearningProducers/CombatWriting-Plugin`, then `/reload-plugins` or a new session, then `/plugin configure combat-writing-crew`.
2. **Installed, server not running.** The host has no crew tools but `claude plugin list` shows the add-on. Next: `/mcp`, find `combat-writing-crew`; if it shows failed or disconnected, reconnect it there and run the command again; if it is not listed, `/plugin` to check the add-on is enabled, then `/reload-plugins`.
3. **Running, no key.** `crew_list` returns the seat as unavailable with a `reason` that names the two causes a person can hit (the key was never entered, or an update dropped it when the host rebuilt its credentials store) and the one next step, with `next` (`/plugin configure combat-writing-crew`), `field` (the option to type the key into, such as `groq_api_key`), `field_title` (as the prompt shows it, such as "Groq API key") and `key_shape` (`empty`, what the host hands for an option it does not hold; or `placeholder`, the literal `${user_config.<option>}` handed unfilled, which the server reads as no key and never sends), names only, never a value; `file` names the key file as the third route, and `key_shape` reads `file-refused`, with the reason in `reason`, when a key file is there and was refused (its permissions, or a malformed line named by number); `crew_register` logs the same, and the record prints it. A keyed provider that did not answer is listed with its error.

## Which models

No model id is written in the add-on. For each provider, a seat names a family and a preference, and the server resolves the id from the provider's live catalog at the start of a run: for Groq, the newest live model in Alibaba's `qwen/` line as the first outside seat (seat-2) and the largest live model in OpenAI's `gpt-oss` line as the second (seat-3), the Qwen seat first by the founder's reading of the rounds of 2026-10-26 (issue 86; a per-user order is not built), excluding speech, guard, compound and embedding models and anything with a small context window, the same filter the Combat Writing app uses. Every answer's log line and the record carry the id the API actually returned.

| Seat | Provider | Family | Maker named in the record |
|---|---|---|---|
| groq-a | Groq | OpenAI's open-weight line, largest live | OpenAI |
| groq-b | Groq | Alibaba's Qwen line, newest live | Alibaba |
| xai | xAI | Grok line, newest live | xAI |
| perplexity | Perplexity | Sonar line, newest live | Perplexity |
| openai | OpenAI | GPT line, newest live | OpenAI |
| mistral | Mistral AI | large line, newest live | Mistral AI |
| gemini | Google | Gemini line, newest live, through the OpenAI-compatible endpoint | Google |
| ollama | Ollama (local) | the model you name in `ollama_model` or `OLLAMA_MODEL`; off when empty | local, not reported by the server |

An Anthropic API-key seat is a stub: Claude's seat is the fresh reader inside the listed plugin and needs no key. The Messages API is a different shape from OpenAI-compatible chat, and the entry says so.

## What it sends where

- To each provider, over HTTPS: the seat's packet (the draft fenced as untrusted content, the brief, the other seats' answers from the previous round when the round shares them, the guidance or question) and a short system line naming the seat, its first-line contract and the word cap, with your key for that provider in the request header. Nothing else.
- To your project: the answer file beside the packet, the seat's entry in `seats.json`, and one log line per event in `log.jsonl` (timestamp, provider, the model id requested and the id returned, the cap and contract sent, whether the reply was truncated, token counts the provider reported, how long the server waited, and which key route was used, `prompt`, `environment` or `file`, never a key). A provider's error text is scrubbed before it lands anywhere (measured 2026-10-24: Groq's refusals name the organization the key belongs to): account-id tokens (`org_…`, `user_…`, `proj_…`, `acct_…`, `team_…`, `key_…`, and the hyphenated forms OpenAI's ids take) become `<kind>_[redacted]` and key-shaped strings (`sk-…`, `gsk_…`, `xai-…`, `pplx-…`) become `[key redacted]`, in the log line, the tool result the host reads and the server's own stderr alike; a key with no prefix is not caught by this rule, and no key reaches a provider's error text by the add-on's doing, since the key rides in a header the add-on never echoes.
- To Learning Producers: nothing. The add-on makes no call to any address but the provider's.

## Rate limits and size

The server keeps the Combat Writing app's call budget for each provider: an 8,000-token per-minute wall, a 1,200-token reply floor and a 2,800-token reply ceiling, with input estimated at four characters per token. A packet that leaves less than the floor for a reply is refused before anything is sent, with the app's message: "Too long to send", and how much to cut. The server tracks what it sent to each provider in the last sixty seconds and waits before a call that would cross the wall or the request limit; on a 429 it waits the provider's `Retry-After` (at most seventy seconds) and tries once more, then records the seat as missing. Calls to one provider go one at a time.

A 429 that names a per-request output cap is different, and the server reads it as such (measured 2026-10-24 on Groq's free tier: `on output tokens per minute (OTPM): Limit 1000, Requested 1513`, a cap on one request's expected output). No wait helps there: the same body sent again a minute later draws the same refusal. The server reads the limit and the requested count from the message, lowers `max_tokens` to the limit under a 5% margin (or by the limit-to-requested ratio when that is lower), and resends at once, once; the log line and the result carry `max_tokens_lowered` with the four numbers. The limit, not the ratio, is the number (measured 2026-10-27, issue 78): the same packet shape with `max_tokens` 2800 drew "Requested" 1513, 2055 and 1039 from Groq on three days, so its count is not `max_tokens` scaled, and a resend lowered by the ratio landed above the limit and was refused again, the seat missing twice. When the lowered value would not cover the reply the packet asks for (1.6 tokens a word plus 40 for the first line: 1,000 tokens for a 600-word cap, 840 for 500, 440 for 250), the seat is missing this round and the reason names the provider's limit and what the reply needs, so the next step is a paid tier or a smaller cap. A 429 on total tokens per minute, and any other 429, keeps the wait above.

Groq's free tier, as the app documents it: 8,000 tokens and 30 requests per minute, 1,000 requests per day, and Groq counts the reply reservation as well as the input. A sparring packet costs about 3,600 tokens of window (a short input plus the 2,800 reply ceiling), so the two Groq seats fit in one minute; an SN or SFQ packet carries the other seats' answers and costs about 5,300, so the second Groq seat in such a round waits for the window, about a minute; an N packet carries no other seat and costs about what a sparring packet does; the final reads (two packets per seat) take two to three minutes at the wall. The server waits by itself; nothing is lost, only time.

## License

Source-available under the PolyForm Shield License 1.0.0 (`LicenseRef-PolyForm-Shield-1.0.0`); full text in LICENSE.md, notices in NOTICE. Nothing it writes carries the credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder"; that line stands once, at the foot of the listed plugin's help guide. Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted. The models belong to their makers and the providers to themselves, under their own terms. This add-on is not made, reviewed or endorsed by Anthropic.
