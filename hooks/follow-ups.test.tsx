import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'follow-ups',
  component: 'Pane',
  requestId: 'follow-ups',
  props: {
    title: 'To do & questions',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

async function start($: any, on: any, submitted: string[]) {
  on('command.register', () => ({ value: { command: 'follow-ups' } }))
  on('tool.register', (_: unknown, e: { name: string }) => ({ value: { tool: `mcp__follow-ups__${e.name}` } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  on('prompt.submit', (_: unknown, e: { text: string }) => { submitted.push(e.text); return { text: e.text } })
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
}

test('a to-do shows, ticks off, and Claude reads it back, on every surface', async ($, on) => {
  await start($, on, [])
  await $.tool.call({ tool: 'mcp__follow-ups__add_todo', text: 'Lock the Worker', detail: 'Access tab' } as any)

  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Access tab/ }))?.text).toBe('Access tab')
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.press({ key: 't-T1' })
  expect((await ui.find({ type: 'Text', text: /All clear/ }))?.text).toBe('All clear')
  await ui.press({ key: 'done-toggle' })
  expect(await ui.find({ type: 'Button', key: 'd-T1' })).toBeDefined()
  await ui.unmount()

  const listed = await $.tool.call({ tool: 'mcp__follow-ups__list_items' } as any)
  expect(JSON.stringify(listed)).toContain('T1 [done] Lock the Worker')
})

test('a question answered by an option reaches Claude as a message', async ($, on) => {
  const submitted: string[] = []
  await start($, on, submitted)
  await $.tool.call({ tool: 'mcp__follow-ups__ask_question', text: 'Text or email by default?', options: ['Text', 'Email', 'Both'], recommended: 'Text' } as any)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect((await ui.find({ type: 'Button', key: 'o-Q1-0' }))?.text).toBe('★ Text')
  expect((await ui.find({ type: 'Button', key: 'o-Q1-1' }))?.text).toBe('Email')
  await ui.press({ key: 'o-Q1-2' })
  await ui.unmount()

  expect(submitted).toEqual(['Answer to Q1 ("Text or email by default?"): Both'])
  const listed = await $.tool.call({ tool: 'mcp__follow-ups__list_items' } as any)
  expect(JSON.stringify(listed)).toContain('answered: Both')
})

test('a typed answer works too, and an empty one is ignored', async ($, on) => {
  const submitted: string[] = []
  await start($, on, submitted)
  await $.tool.call({ tool: 'mcp__follow-ups__ask_question', text: 'Which day?' } as any)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await ui.input({ key: 'a-Q1', text: '   ' })
  expect(submitted).toEqual([])
  await ui.input({ key: 'a-Q1', text: 'Friday' })
  await ui.unmount()
  expect(submitted).toEqual(['Answer to Q1 ("Which day?"): Friday'])
})

test('with no side panel drawn, the list shows above the message box', async ($, on) => {
  on('ui.panes', () => ({ value: [] }))
  await start($, on, [])
  await $.tool.call({ tool: 'mcp__follow-ups__add_todo', text: 'Lock the Worker' } as any)
  const band = await $.ui.mount({ plugin: 'follow-ups', component: 'AbovePrompt', surface: 'desktop', props: {} } as any)
  expect((await band.find({ type: 'Button', text: /Lock the Worker/ }))?.text).toContain('Lock the Worker')
  await band.press({ key: 'band-hide' })
  expect(await band.find({ type: 'Button', text: /Lock the Worker/ })).toBeUndefined()
  await band.unmount()
})

test('where no app draws the panel, the tool tells Claude to ask in the chat', async ($, on) => {
  on('command.register', () => ({ value: { command: 'follow-ups' } }))
  on('tool.register', (_: unknown, e: { name: string }) => ({ value: { tool: `mcp__follow-ups__${e.name}` } }))
  on('ui.open', () => ({ value: { isPlaced: false, reason: 'no-surface' } }))
  on('session.start', (_: unknown, e: { cwd: string }) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const asked = await $.tool.call({ tool: 'mcp__follow-ups__ask_question', text: 'Which day?' } as any)
  expect(JSON.stringify(asked)).toContain('cannot see the panel')
})

test('question cards draw on every surface', async ($, on) => {
  await start($, on, [])
  await $.tool.call({ tool: 'mcp__follow-ups__ask_question', text: 'Text or email?', detail: 'Rob pays for texts.', options: ['Text', 'Email', 'Both'], recommended: 'Text' } as any)
  await $.tool.call({ tool: 'mcp__follow-ups__add_todo', text: 'Lock the Worker', detail: 'Access tab' } as any)
  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /Rob pays/ }))?.text).toBe('Rob pays for texts.')
    expect(await ui.find({ type: 'Button', key: 'o-Q1-2' })).toBeDefined()
    await ui.unmount()
  }
})
