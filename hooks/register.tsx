// A panel beside the chat with two lists:
//   - "To do": the person's action items. They tick one off; Claude sees it.
//   - "Questions": what Claude needs from them. They pick an option or type an
//     answer; it reaches Claude as a message.
// Claude fills it with three tools and reads it back with a fourth.

import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Item } from '../types'

const PANE = 'follow-ups'
const TITLE = 'To do & questions'
const items = atom({ plugin: 'follow-ups', key: 'items' } as const, [], { shape: 'items-1' })
const isBandHidden = atom({ plugin: 'follow-ups', key: 'isBandHidden' } as const, false)

// The tool's own fields sit on the event itself, beside `tool` and `tool_use_id`.
const args = (e: unknown) => e as Record<string, unknown>

const now = () => new Date().toISOString()
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

function nextId(list: Item[], kind: Item['kind']) {
  const prefix = kind === 'todo' ? 'T' : 'Q'
  const n = list.filter(i => i.kind === kind).length + 1
  return `${prefix}${n}`
}

const GUIDE = `## The follow-ups panel

The person follows this session in a panel titled "${TITLE}". Use it so nothing gets buried in the chat:
- Each thing the person must do (click, send, decide outside this chat, check), add it with add_todo: one short imperative line, the detail (click path, exact text) in "detail".
- Each question you need answered, add it with ask_question: the question in one line, the context in "detail", at most 3 "options", and "recommended" when you have a pick. Do not also ask it in the chat; one short line saying it is in the panel is enough.
- When you no longer need a question, or you did a to-do yourself, close it with close_item.
- Answers arrive as a message starting with "Answer to Q". Ticked to-dos show in list_items; read it before you say what is left.
- Do not add your own work items, only the person's.`

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'follow-ups', description: 'Open the to-do and questions panel' })

    await $.tool.register({
      name: 'add_todo',
      isDeferred: false,
      description: "Add an action item for the person to the follow-ups panel. One short imperative line; put click paths or exact text in detail. Returns the item's id (T1, T2, ...).",
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The action, short, e.g. "Lock the rob-bornett Worker"' },
          detail: { type: 'string', description: 'Optional: how to do it, click path, text to paste' },
        },
        required: ['text'],
      },
    })
    await $.tool.register({
      name: 'ask_question',
      isDeferred: false,
      description: "Ask the person a question in the follow-ups panel instead of burying it in the chat. The answer comes back as a message \"Answer to Q<n>: ...\". Returns the question's id (Q1, Q2, ...).",
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The question in one line' },
          detail: { type: 'string', description: 'Optional: the context the person needs to decide fast' },
          options: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'Optional: up to 3 answers to pick from' },
          recommended: { type: 'string', description: 'Optional: the option you would pick (must be one of options)' },
        },
        required: ['text'],
      },
    })
    await $.tool.register({
      name: 'close_item',
      isDeferred: false,
      description: 'Close a to-do or a question in the follow-ups panel: a question no longer needed, or a to-do you did yourself.',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'T1, Q2, ...' } }, required: ['id'] },
    })
    await $.tool.register({
      name: 'list_items',
      isDeferred: false,
      description: 'Read the follow-ups panel: every to-do (done or not) and every question with its answer.',
      inputSchema: { type: 'object', properties: {} },
    })

    await $.tool.register({
      name: 'panel_status',
      isDeferred: false,
      description: 'Check whether the follow-ups panel is drawn, and why not. For fixing the panel only.',
      inputSchema: { type: 'object', properties: {} },
    })

    void $.ui.open({ id: PANE, title: TITLE })
    return next(e)
  })

  on('command.run', { command: 'follow-ups' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Panel opened.' }
  })

  // The guide only where a surface can draw the panel: in a session no app draws
  // (a cloud session followed in the desktop app), questions must stay in the chat.
  on('prompt.compose', async ($, e, next) => {
    const result = await next(e)
    if (!(await $.session.surfaces()).length) return result
    return { sections: [...result.sections, { id: 'follow-ups', text: GUIDE, scope: 'session' as const }] }
  })

  on('tool.run', { tool: 'mcp__follow-ups__add_todo' }, async ($, e) => { try {
    const text = str(args(e).text, 200)
    if (!text) return { deny: 'text is needed.' }
    let id = ''
    await update($, items, list => {
      id = nextId(list, 'todo')
      const item: Item = { id, kind: 'todo', text, detail: str(args(e).detail, 2000) || undefined, isDone: false, createdAt: now() }
      return [...list, item]
    })
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    await update($, isBandHidden, () => false)
    return { result: `Added ${id}.` + (opened.isPlaced ? '' : ' The person cannot see the panel in this session (no app draws it): say this in the chat too, or ask with AskUserQuestion.') }
    } catch (error) { return { deny: `The panel failed: ${String(error)}` } }
  })

  on('tool.run', { tool: 'mcp__follow-ups__ask_question' }, async ($, e) => { try {
    const text = str(args(e).text, 300)
    if (!text) return { deny: 'text is needed.' }
    const options = Array.isArray(args(e).options) ? (args(e).options as unknown[]).map(o => str(o, 120)).filter(Boolean).slice(0, 3) : []
    const recommended = str(args(e).recommended, 120)
    let id = ''
    await update($, items, list => {
      id = nextId(list, 'question')
      const item: Item = {
        id, kind: 'question', text,
        detail: str(args(e).detail, 2000) || undefined,
        options: options.length ? options : undefined,
        recommended: recommended && options.includes(recommended) ? recommended : undefined,
        isDone: false, createdAt: now(),
      }
      return [...list, item]
    })
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    await update($, isBandHidden, () => false)
    return { result: `Asked ${id}. The answer arrives as a message "Answer to ${id}: ...".` + (opened.isPlaced ? '' : ' The person cannot see the panel in this session (no app draws it): say this in the chat too, or ask with AskUserQuestion.') }
    } catch (error) { return { deny: `The panel failed: ${String(error)}` } }
  })

  on('tool.run', { tool: 'mcp__follow-ups__close_item' }, async ($, e) => { try {
    const id = str(args(e).id, 10).toUpperCase()
    let found = false
    await update($, items, list => list.map(i => {
      if (i.id !== id) return i
      found = true
      return { ...i, isDone: true, doneAt: now() }
    }))
    return found ? { result: `Closed ${id}.` } : { deny: `No item ${id}.` }
    } catch (error) { return { deny: `The panel failed: ${String(error)}` } }
  })

  on('tool.run', { tool: 'mcp__follow-ups__list_items' }, async $ => { try {
    const list = await read($, items)
    if (!list.length) return { result: 'The panel is empty.' }
    const line = (i: Item) => i.kind === 'todo'
      ? `${i.id} [${i.isDone ? 'done' : 'open'}] ${i.text}`
      : `${i.id} [${i.answer ? `answered: ${i.answer}` : i.isDone ? 'closed' : 'open'}] ${i.text}`
    return { result: list.map(line).join('\n') }
    } catch (error) { return { deny: `The panel failed: ${String(error)}` } }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => draw($, e, false))

  // The same list above the message box, for apps that show no side panel.
  // Hidden while the panel is drawn, and when the list has nothing open.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, items)
    const open = list.filter(i => !i.isDone).length
    const isPaneUp = (await $.ui.panes()).some(p => p.id === PANE && p.isPlaced)
    if (!open || isPaneUp || (await read($, isBandHidden))) return next(e)
    return draw($, e, true)
  })

  on('tool.run', { tool: 'mcp__follow-ups__panel_status' }, async ($, e) => { try {
    const opened = await $.ui.open({ id: PANE, title: TITLE })
    const panes = await $.ui.panes()
    return { result: JSON.stringify({ surface: (e as { surface?: unknown }).surface ?? null, opened, panes }) }
    } catch (error) { return { deny: `The panel failed: ${String(error)}` } }
  })
}

async function draw($: any, e: any, isBand: boolean) {
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const list: Item[] = await read($, items)
    const todos = list.filter(i => i.kind === 'todo')
    const openTodos = todos.filter(i => !i.isDone)
    const doneTodos = todos.filter(i => i.isDone)
    const openQs = list.filter(i => i.kind === 'question' && !i.isDone)
    const doneQs = list.filter(i => i.kind === 'question' && i.isDone)

    const toggle = (id: string) => update($, items, (l: Item[]) => l.map(i => (i.id === id ? { ...i, isDone: !i.isDone, doneAt: i.isDone ? undefined : now() } : i)))
    const answer = async (q: Item, value: string) => {
      const text = value.trim()
      if (!text) return
      await update($, items, (l: Item[]) => l.map(i => (i.id === q.id ? { ...i, answer: text, isDone: true, doneAt: now() } : i)))
      void $.prompt.submit({ text: `Answer to ${q.id} ("${q.text}"): ${text}` })
    }

    return (
      <Box flexDirection="column" gap={1}>
        {isBand && (
          <Box>
            <Text dimColor>{TITLE} </Text>
            <Button key="band-hide" label="Hide" plain onPress={() => update($, isBandHidden, () => true)} />
          </Box>
        )}
        <Box flexDirection="column">
          <Text bold>To do{openTodos.length ? ` (${openTodos.length})` : ''}</Text>
          {openTodos.length === 0 && <Text dimColor>Nothing for you right now.</Text>}
          {openTodos.map(i => (
            <Box key={i.id} flexDirection="column">
              <Button key={`t-${i.id}`} plain onPress={() => toggle(i.id)}>☐ {i.text}</Button>
              {i.detail && <Text dimColor>{i.detail}</Text>}
            </Box>
          ))}
        </Box>

        <Box flexDirection="column">
          <Text bold>Questions{openQs.length ? ` (${openQs.length})` : ''}</Text>
          {openQs.length === 0 && <Text dimColor>No question waiting.</Text>}
          {openQs.map(q => (
            <Box key={q.id} flexDirection="column">
              <Text>{q.id}. {q.text}</Text>
              {q.detail && <Text dimColor>{q.detail}</Text>}
              {q.options && (
                <Box flexDirection="column">
                  {q.options.map((o, n) => (
                    <Button key={`o-${q.id}-${n}`} variant={o === q.recommended ? 'primary' : 'secondary'} onPress={() => answer(q, o)}>
                      {o}{o === q.recommended ? ' (my pick)' : ''}
                    </Button>
                  ))}
                </Box>
              )}
              <Input key={`a-${q.id}`} placeholder={q.options ? 'Or type your answer' : 'Type your answer'} submitLabel="Send" onSubmit={value => answer(q, value)} />
            </Box>
          ))}
        </Box>

        {!isBand && (doneTodos.length > 0 || doneQs.length > 0) && (
          <Box flexDirection="column">
            <Text bold dimColor>Done ({doneTodos.length + doneQs.length})</Text>
            {doneTodos.map(i => (
              <Button key={`d-${i.id}`} plain dimColor onPress={() => toggle(i.id)}>☑ {i.text}</Button>
            ))}
            {doneQs.map(q => (
              <Text key={`dq-${q.id}`} dimColor>{q.id}. {q.text} → {q.answer ?? 'closed'}</Text>
            ))}
          </Box>
        )}
      </Box>
    )
}
