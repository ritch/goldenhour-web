---
name: ctxhub-cli
description: >-
  Shell out to the `ctxhub` CLI for bind / doctor / login / status —
  anything that needs to read or write files on the user's machine.
  Use the MCP tools (see ctxhub-mcp) for everything that lives in the
  drive. The CLI is for the local-side seam: bindings, sessions,
  configuration.
---

# ctxhub-cli

This machine has the `ctxhub` CLI installed (it's how this skill got
here). Two ways to invoke it:

```
ctxhub <command>            # if globally installed
npx @ctxhub/cli@latest <command>   # always works
```

The CLI handles the *local-machine* seam — anything that reads or
writes files on the user's disk, or rotates credentials. The
[ctxhub-mcp](./../ctxhub-mcp/SKILL.md) skill handles the *drive-side*
seam (search, decisions, questions).

## When to shell out to `ctxhub` (vs use the MCP)

| Situation | Use |
|-----------|-----|
| "Search the drive" / "record a decision" / "answer a question" | `ctxhub-mcp` tools |
| "Bind this new monorepo subdirectory to a drive module" | `ctxhub bind` |
| "Check if my repo binding is healthy" / "verify the drive knows about this repo" | `ctxhub doctor` |
| "Open the drive in my browser" | `ctxhub open` |
| "I keep getting 401 from ctxhub MCP" | `ctxhub login` (refreshes the CLI's cached creds; the agent's MCP creds are separate) |
| "Show me my ctxhub status / drives / who I'm logged in as" | `ctxhub status` |
| "Sync this repo's binding manifest with the drive" | `ctxhub bind --force` or `ctxhub doctor --fix` |

## Useful subcommands

- `ctxhub status` — print sign-in state, drives you can reach,
  whether this repo is bound, when the CLI last phoned home. Good
  first call when the user reports anything weird.
- `ctxhub repo` — print the current binding (`.ctxhub/repo.yaml`) in
  human-readable form. Use `--json` if you want to consume the
  output.
- `ctxhub doctor [--fix]` — verify the local binding matches the
  drive. `--fix` repairs drive-side drift; requires write scope.
- `ctxhub bind <handle>/<slug>` — non-interactive bind. Useful when
  setting up a new monorepo sub-package.
- `ctxhub open [--print]` — open the bound drive in the browser.
  `--print` writes the URL to stdout for piping.
- `ctxhub init` — the full guided walk-through. Usually only run once
  per repo.
- `ctxhub login` — refresh the CLI's cached session (separate from
  the agent's MCP session).
- `ctxhub logout` — revoke + clear cached creds.

## Global flags worth knowing

- `--json` — every command emits a single JSON object on stdout.
  Always prefer this in scripts.
- `--quiet` — suppress progress chatter.
- `--cwd <path>` — run as if invoked from `<path>`.

## Style: how to invoke from inside an agent turn

- Use `--json` unless you specifically want to show the human output
  to the user.
- Surface the exit code. The CLI uses semantic exit codes (see
  `ctxhub --help` for the table); `0` = ok, `1` = soft error,
  `2` = hard error, `3` = auth, `4` = network, `64` = usage.
- If you get exit `3` (auth), tell the user to run
  `ctxhub login` and continue without the CLI for that turn.

## Common patterns

### "The user wants to know if everything is wired up"

```
ctxhub status --json
```

Parse `signedIn`, `binding`, `cliLastSeenAt`. If `signedIn` is `false`,
tell them to run `ctxhub login`. If `binding` is `null`, tell them to
run `ctxhub init`.

### "The user just added a new module to a monorepo"

```
ctxhub bind @<handle>/<slug> --module <module-name>
```

The CLI writes `<repo>/.ctxhub/repo.yaml` and PATCHes the drive's
repos list.

### "The user reports their agent isn't seeing ctxhub context anymore"

```
ctxhub doctor
```

If it reports drift, ask the user to confirm and then run with
`--fix`.

### "The user wants to know which drive they're connected to"

```
ctxhub repo
```

## Anti-patterns — don't do this

- Don't shell out to `ctxhub` for things the MCP already exposes.
  MCP is the lower-latency path and the user prefers it.
- Don't ask the user for permission for every CLI call. `ctxhub
  status`, `ctxhub repo`, `ctxhub doctor` are read-only and fast;
  invoke them freely. `ctxhub bind`, `ctxhub init`, `ctxhub
  doctor --fix`, `ctxhub login`, `ctxhub logout` *do* change state —
  always confirm with the user.
- Don't rerun `ctxhub init` if `ctxhub repo` shows a binding. It
  refuses anyway, but you'll waste a turn.

## See also

- `~/.cursor/skills/ctxhub-mcp/SKILL.md` — drive-side context tools.
- The drive itself: `ctxhub open`.
