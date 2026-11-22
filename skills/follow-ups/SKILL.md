---
name: follow-ups
description: The Follow-ups page, where Matt's to-dos and Claude's questions for him live instead of in the chat. Load it at the start of every Claude Code session in a Noctiluque Studio project (noctiluque, client repos), and whenever you have a to-do for Matt (a click, a message to send, a check outside the chat) or a question for him, or when a comment "Answer to Q.. [project, item, for session ..]" arrives from the page.
---

# Follow-ups

Matt follows long sessions from his phone and loses what is buried in the chat. Put what he must do or answer on one page, the Follow-ups page: https://claude.ai/artifact/D9NARv6nGVxTkiWFQiqZGp. It is an artifact with a shared database: collection `items`, read and written with the `ArtifactData` tool.

This skill is the one copy of the rule. Projects only point to it. Change it here (`bearwarenet/claude-follow-ups`, `skills/follow-ups/SKILL.md`), then Matt uploads it to his Claude account.

## At the start of a session

1. Watch the page: `ArtifactComments`, action `watch`, with its URL. Then Matt's answers wake this session.
2. Read the items of your project: `ArtifactData`, `query` on `items`, where `project` is the repo name. The page holds only open items (`open`) and answers not delivered yet (`answered`): closed items are deleted.
3. Know your session id: `get_session` (claude-code-remote), no argument.

## Add a to-do or a question

- **A to-do for Matt** (a click, a message to send, a check outside the chat): add it to the page.
- **A question for Matt:** add it to the page, not in the chat. Say in one line of the chat that it is there. Give at most 3 options and your pick.
- **No duplicates:** before you add an item, read the open items of the project. When one already covers it, update that item (its `text` and `detail`) instead of adding another. When two overlap, keep one and delete the other.
- **One item, one document:** id `<project>-t<n>` or `<project>-q<n>`, a number no item of the project has now (closed ones are gone, so a number may come back). Fields:

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
- Sent to Claude, the answer is in the comment and the page deletes the question. Not sent (the comment could not go), the page keeps it with `status` `answered` and the `answer`: read it, act on it, then delete it.

## Close and keep clean

- Matt's rule (2026-11-22): nothing closed stays on the page. It only costs every session that reads it.
- Delete an item (`ArtifactData`, `delete`, with its `version`) when it is closed: a question you no longer need, an answer you acted on, a to-do you did yourself, or a to-do whose work is done (a pull request Matt merged).
- Matt's tick deletes a to-do on the page (with Undo).
- Never touch another project's items.

## Never on the page

A secret (password, key, token), or a client's private data (email address, phone number, home address). The page is private to Matt, but data there is copied to other sessions.

## Local sessions

In a session that runs on Matt's computer, the `follow-ups` plugin from this repo shows a panel beside the chat. Cloud sessions use the page.
