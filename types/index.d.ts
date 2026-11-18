export type ItemKind = 'todo' | 'question'

export type Item = {
  id: string
  kind: ItemKind
  text: string
  detail?: string
  options?: string[]
  recommended?: string
  isDone: boolean
  answer?: string
  createdAt: string
  doneAt?: string
}

declare module 'claude-code' {
  interface PluginState {
    'follow-ups': { items: Shaped<Item[]>; isBandHidden: boolean; isDoneOpen: boolean }
  }
}
