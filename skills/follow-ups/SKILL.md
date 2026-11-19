---
name: follow-ups
description: The Follow-ups page, where Matt's to-dos and Claude's questions for him live instead of in the chat. Load it at the start of every Claude Code session in a Noctiluque Studio project (noctiluque, client repos), and whenever you have a to-do for Matt (a click, a message to send, a check outside the chat) or a question for him, or when a comment "Answer to Q.. [project, item, for session ..]" arrives from the page.
---

# Follow-ups

Matt follows long sessions from his phone and loses what is buried in the chat. Put what he must do or answer on one page, the Follow-ups page: https://claude.ai/artifact/D9NARv6nGVxTkiWFQiqZGp. It is an artifact with a shared database: collection `items`, read and written with the `ArtifactData` tool.

This skill is the one copy of the rule. Projects only point to it. Change it here (`bearwarenet/claude-follow-ups`, `skills/follow-ups/SKILL.md`), then Matt uploads it to his Claude account.

## At the start of a session

1. Watch the page: `ArtifactComments`, action `watch`, with its URL. Then Matt's answers wake this session.
2. Read the open items of your project: `ArtifactData`, `query` on `items`, where `project` is the repo name.
3. Know your session id: `get_session` (claude-code-remote), no argument.

## Add a to-do or a question

- **A to-do for Matt** (a click, a message to send, a check outside the chat): add it to the page.
- **A question for Matt:** add it to the page, not in the chat. Say in one line of the chat that it is there. Give at most 3 options and your pick.
- **No duplicates:** before you add an item, read the open items of the project. When one already covers it, update that item (its `text` and `detail`) instead of adding another. When two overlap, keep one and close the other with `status` `done` and `mergedInto` set to the id you kept.
- **One item, one document:** id `<project>-t<n>` or `<project>-q<n>`, the next free number. Fields:

| Field | Value |
| --- | --- |
| `kind` | `todo` or `question` |
| `label` | `T3`, `Q2` |
| `project` | the repo name |
| `text` | one line |
| `detail` | context, click path, links |
| `options` | up to 3, questions only |
| `recommended` | one of the options |
| `status` | `open` |
| `createdAt` | ISO time |
| `sessionId`, `sessionTitle` | from `get_session` |

## Answers

- An answer arrives as a comment sent to Claude: "Answer to Q2 [project, item id, for session <id>]: ...".
- Every session that watches the page gets every answer. Act only on answers for your own session id: act on it, reply in the comment's thread, resolve the thread.
- An answer for another session: ignore it. No reply, no resolve.
- The page also saves each answer in the item (`answer`, `status` `done`). If no comment came, read the item.

## Close and keep clean

- Set `status` to `done` (with `doneAt`) on a question you no longer need, or a to-do you did yourself.
- Never delete Matt's items. Never touch another project's items.

## Never on the page

A secret (password, key, token), or a client's private data (email address, phone number, home address). The page is private to Matt, but data there is copied to other sessions.

## Local sessions

In a session that runs on Matt's computer, the `follow-ups` plugin from this repo shows a panel beside the chat. Cloud sessions use the page.
