---
name: ctxhub-mcp
description: >-
  Use ctxhub MCP tools to read and write your team's shared context —
  decisions, questions, follow-ups, repo bindings, indexed docs. Call
  whenever you need a fact the codebase doesn't have, want to record
  a decision that future-you will need, or are about to ask the user
  a question that's already been answered.
---

# ctxhub-mcp

This repo is connected to **ctxhub** via MCP. You have a `ctxhub`
server in your tool catalog (alongside any other MCPs). Use it.

ctxhub is your team's shared context — every decision, every question
resolved, every follow-up captured, every doc indexed from the team's
sources (GitHub, Slack, Linear, Notion, etc.). The local repo is one
input; the drive is the canonical store.

## When to use ctxhub MCP — concrete triggers

Use it without asking when **any** of these are true:

- The user asks a "why did we…" question (`why are we using Postgres?`,
  `why is this rate-limited to 60/min?`). Search the drive *before*
  guessing from the codebase.
- The user asks a "what's the status of…" question (`is the auth
  rewrite shipped?`, `did anyone follow up on the prod incident?`).
  The drive knows; the codebase doesn't.
- You're about to make a non-trivial decision (which library, which
  pattern, which API shape). Record it in ctxhub *as you make it* —
  not later. Reviewers will read your call and either agree or
  surface a tension. That round trip happens in ctxhub.
- The user mentions a person by name. Pull their context (`who is
  Olu? what have they shipped recently?`) before pattern-matching
  on their name.
- You finished a task that involved any non-obvious tradeoff. Record
  the *why* — not the code change (that's in the diff), the
  reasoning.

Do not use it for:

- Looking up code in *this* repo. The codebase is faster.
- Trivial questions whose answer is in the file you're already
  editing.

## Useful tools (call the full list with `tools/list` if you forget)

| Tool                | Use it when |
|---------------------|-------------|
| `search_drive`      | Free-text search. First call on any new question. |
| `record_decision`   | Capture a decision with provenance (you + the user) before the user moves on. |
| `open_question`     | Capture a thing the user *should* answer (or the team should). Lifecycle: open → resolved. |
| `resolve_question`  | When the user (or you) answers an open question. Stamps the answer + closes it. |
| `read_doc`          | Pull a specific document by handle/path. |
| `list_repo_links`   | Find every other repo bound to the same drive. |
| `record_followup`   | Out-of-scope work the user mentioned in passing. |

The exact tool list is server-defined and may grow; trust `tools/list`.

## Style: how to record context well

Decisions and questions are **for humans first**, agents second. Write
like an engineer wrote it, not like a bot:

- Title is the *outcome*, present tense. (`Use Postgres for sessions`
  not `Should we use Postgres for sessions?`).
- Body is 1–3 sentences on the *why*. Future you reads this; spare
  them.
- Link the PR, the chat, the design doc where applicable.
- Tag aggressively (`auth`, `sessions`, `db-choice`). Future search
  rides on tags.

If the user says something definitive in passing (`yeah let's go with
Postgres`), record it. Don't wait for "an explicit task to record it."

## Style: how to ask questions of the drive

Search first, *then* synthesize. Don't paste the raw search results at
the user — they'll skim past. Tell them the answer in one sentence,
cite the source in a second.

> *Bad*: I found 5 results, here they are: [dump]
>
> *Good*: We use Postgres for sessions (decision from Mike, 2026-04-02,
> citing Redis ops cost). Want to see the full thread?

## When to *not* use ctxhub

- The user explicitly said "don't search the drive for this."
- The question is about *this exact file* you're editing.
- The drive is empty / not yet populated. (You can detect this with
  one quick `search_drive` of a guaranteed-empty query.)

## Failure modes

- `ctxhub` MCP server returns 401 / `invalid_token` → the user's
  ctxhub session has expired. Tell them: `Your ctxhub session has
  expired. Run \`ctxhub login\` to refresh.` Then continue without
  the drive — never block the user on a re-auth.
- Search returns nothing relevant → tell the user explicitly
  ("nothing in ctxhub on this") and then answer from first
  principles. Don't pretend the drive said something it didn't.
- `read_doc` 404s → the doc may have moved. Try `search_drive` for
  the title.

## See also

- `~/.cursor/skills/ctxhub-cli/SKILL.md` — when to shell out to the
  CLI instead of using MCP.
- `ctxhub doctor` — verify this repo's binding is healthy.
- `ctxhub repo` — print the current binding (which drive this repo
  syncs into).
