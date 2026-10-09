<!-- SPDX-License-Identifier: LicenseRef-PolyForm-Shield-1.0.0 -->
# Combat Writing™ Crew: the add-on

**Reading is Peace. Writing is War.**

The listed Combat Writing plugin seats fresh readers from one company. This add-on seats other companies' models beside them, on your own API keys, so a round can be read by more than one company. It is a local MCP server. It is **not in the Claude plugin directory**; it is installed from this repository as Learning Producers' own marketplace. The add-on is source-available under the same terms as the listed plugin.

## What it does

- `crew_list` says which outside seats are available with the keys you set, each named by the model id resolved from the provider's live catalog and by the model's maker, with the serving provider stated.
- `crew_register` adds those seats to a run's `seats.json`, so the listed plugin builds their packets like any seat's.
- `crew_answer` sends one seat's packet for one round to its provider, waits out the per-minute window, writes the answer file beside the packet, and logs the model id the API returned. The listed plugin's checks, battle, final reads, record and board then work across companies with nothing copied by hand.

A seat that fails, has no key, or whose packet is too long to send is shown as missing, never silently replaced. Nothing is faked.

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

Install the listed plugin, `combat-writing`, the same way; the add-on does nothing on its own.

## Keys and where the prompt appears

Each key goes only to its own provider. No key is ever sent to Learning Producers, written to a file, or logged. The route, in order:

1. **The masked prompt.** When you install or enable the add-on in Claude Code, a dialog asks for each key with the input masked; the value goes to Claude Code's secure credential store, not to a settings file. Reopen it any time with `/plugin configure combat-writing-crew@learning-producers`. Every key is optional: leave the ones you do not have empty.
2. **An environment variable, only when the prompt's value is empty.** `GROQ_API_KEY`, `XAI_API_KEY`, `PERPLEXITY_API_KEY`, `OPENAI_API_KEY`, `MISTRAL_API_KEY`, `GEMINI_API_KEY`. The server reads the variable from its own environment and sends it only to that provider.
3. **Never a file.** The server reads no file for a key. A `.env` or a key file beside your project is never opened.

Which surfaces show the prompt: **Claude Code** shows it (the install dialog, the VS Code extension's form, and `/plugin configure`). **Cowork** does not prompt for plugin options and ignores an option with no default, so on Cowork the environment variable is the only route. **Claude in chat** does not start local MCP servers at all, so the add-on does not run there; the crew is one seat, the host.

A crew with no paid keys is allowed: one free Groq key seats two outside models (OpenAI's open-weight line and Alibaba's Qwen line, both served by Groq) beside the listed plugin's fresh readers.

## Which models

No model id is written in the add-on. For each provider, a seat names a family and a preference, and the server resolves the id from the provider's live catalog at the start of a run: for Groq, the largest live model in OpenAI's `gpt-oss` line and the newest live model in Alibaba's `qwen/` line, excluding speech, guard, compound and embedding models and anything with a small context window, the same filter the Combat Writing app uses. Every answer's log line and the record carry the id the API actually returned.

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

- To each provider, over HTTPS: the seat's packet (the draft fenced as untrusted content, the brief, the other seats' answers from the previous round, the question) and a short system line naming the seat and its first-line contract, with your key for that provider in the request header. Nothing else.
- To your project: the answer file beside the packet, the seat's entry in `seats.json`, and one log line per event in `log.jsonl` (timestamp, provider, the model id requested and the id returned, token counts the provider reported, how long the server waited, and which key route was used, never a key).
- To Learning Producers: nothing. The add-on makes no call to any address but the provider's.

## Rate limits and size

The server keeps the Combat Writing app's call budget for each provider: an 8,000-token per-minute wall, a 1,200-token reply floor and a 2,800-token reply ceiling, with input estimated at four characters per token. A packet that leaves less than the floor for a reply is refused before anything is sent, with the app's message: "Too long to send", and how much to cut. The server tracks what it sent to each provider in the last sixty seconds and waits before a call that would cross the wall or the request limit; on a 429 it waits the provider's `Retry-After` (at most seventy seconds) and tries once more, then records the seat as missing. Calls to one provider go one at a time.

Groq's free tier, as the app documents it: 8,000 tokens and 30 requests per minute, 1,000 requests per day, and Groq counts the reply reservation as well as the input. A sparring packet costs about 3,600 tokens of window (a short input plus the 2,800 reply ceiling), so the two Groq seats fit in one minute; a battle packet carries the other seats' answers and costs about 5,300, so the second Groq seat in a battle round waits for the window, about a minute, and the final reads (two packets per seat) take two to three minutes at the wall. The server waits by itself; nothing is lost, only time.

## License

Source-available under the PolyForm Shield License 1.0.0 (`LicenseRef-PolyForm-Shield-1.0.0`); full text in LICENSE.md, notices in NOTICE. Every record it writes opens with the credit line "Combat Writing — Learning Producers Inc., Israel Hernandez, founder". Combat Writing is a brand of Learning Producers Inc.; no trademark license is granted. The models belong to their makers and the providers to themselves, under their own terms. This add-on is not made, reviewed or endorsed by Anthropic.
