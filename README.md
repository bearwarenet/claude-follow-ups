# follow-ups

This repo holds the studio's Follow-ups tools, one copy each:

- `skills/follow-ups/SKILL.md`: the rule every Claude session follows (upload it to the Claude account; projects only point to it).
- `page/index.html`: the Follow-ups page, a private claude.ai artifact, for cloud sessions.
- The plugin below: the same list as a panel, for local sessions.

## The panel plugin

A panel beside the chat in Claude Code, with two lists:

- **To do**: your action items. Tap one to tick it off; Claude sees it.
- **Questions**: what Claude needs from you, each with up to 3 options; Claude's pick has a ★. Tap an option or type an answer; it reaches Claude as a message.

Claude fills the panel with four tools (`add_todo`, `ask_question`, `close_item`, `list_items`). Each session has its own list. Type `/follow-ups` to reopen the panel.

## Where it works

Sessions that run on your own computer: a terminal session, or a local session of the desktop app's Code tab. It does not show in cloud sessions followed in the desktop app: no app draws mod panels there. In such a session the tools tell Claude so, and Claude asks in the chat instead.

## Install

This repository is private. Installing needs read access to it on GitHub, and a git credential for github.com on your computer (an SSH key, or `gh auth login` then `gh auth setup-git`).

At the prompt of a terminal session:

```
/plugin install follow-ups --marketplace bearwarenet/claude-follow-ups
```

From a shell:

```
claude plugin install follow-ups --marketplace bearwarenet/claude-follow-ups
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `bearwarenet/claude-follow-ups`, then **Add plugin**.

## Develop

`claude plugin validate .` checks it; `claude plugin test .` runs `hooks/follow-ups.test.tsx`.
