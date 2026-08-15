/** Current-session conversation feed and prompt controller for the Avatar. */
import type {
  ConversationSnapshot, ISessions, ObservableSnapshot, SessionFace,
} from '@deepseek-ai/dsh-client-runtime/client'

/** Text and completion facts used by the animated renderer and speech output. */
export interface AvatarMotionSnapshot {
  partialText: string
  finalText: string
  finalSeq: number | null
}

const EMPTY_MOTION: AvatarMotionSnapshot = { partialText: '', finalText: '', finalSeq: null }

/**
 * Read the visible text accumulated for the in-flight assistant response.
 * @param snapshot Current conversation snapshot, or absence before binding.
 * @returns Concatenated visible partial-response text.
 */
export function partialSpeechText(snapshot: ConversationSnapshot | undefined): string {
  return snapshot?.partial?.blocks.filter(block => block.kind === 'text').map(block => block.text).join('') ?? ''
}

/**
 * Read the latest finalized Assistant text and its stable sequence.
 * @param snapshot Current conversation snapshot, or absence before binding.
 * @returns Latest complete reply text and its sequence, or the empty marker.
 */
export function finalSpeech(snapshot: ConversationSnapshot | undefined): Pick<AvatarMotionSnapshot, 'finalText' | 'finalSeq'> {
  const node = snapshot?.nodes.findLast(candidate => candidate.kind === 'assistant')
  if (node?.kind !== 'assistant' || node.interrupted === true) return { finalText: '', finalSeq: null }
  return {
    finalText: node.blocks.filter(block => block.kind === 'text').map(block => block.text).join(''),
    finalSeq: node.seq,
  }
}

/** Observable conversation projection plus direct current-task prompt delivery. */
export interface AvatarMotionSource extends ObservableSnapshot<AvatarMotionSnapshot> {
  send(text: string): Promise<void>
  dispose(): void
}

/**
 * Project the selected Session's speech facts and expose its prompt method.
 * @param sessions Client sessions service.
 * @returns Disposable Avatar conversation controller.
 */
export function createAvatarMotionSource(sessions: ISessions): AvatarMotionSource {
  const listeners = new Set<() => void>()
  let snapshot = EMPTY_MOTION
  let session: SessionFace | undefined
  let sessionDispose: (() => void) | undefined

  const publish = (next: AvatarMotionSnapshot): void => {
    if (next.partialText === snapshot.partialText && next.finalText === snapshot.finalText && next.finalSeq === snapshot.finalSeq) return
    snapshot = next
    for (const listener of [...listeners]) listener()
  }
  const bind = (): void => {
    sessionDispose?.()
    sessionDispose = undefined
    const id = sessions.list.getSnapshot().current
    session = id === undefined ? undefined : sessions.binding(id)?.session
    if (session === undefined) { publish(EMPTY_MOTION); return }
    const boundSession = session
    const update = (): void => {
      const current = boundSession.getSnapshot()
      publish({ partialText: partialSpeechText(current), ...finalSpeech(current) })
    }
    sessionDispose = boundSession.subscribe(update)
    update()
  }
  const listDispose = sessions.list.subscribe(bind)
  bind()

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    async send(text) {
      const target = session
      if (target === undefined) throw new Error('Choose or create a task before talking to the Avatar.')
      const result = await target.prompt([{ type: 'text', text }], 'queue')
      if (!result.ok) throw new Error(result.error.message)
    },
    dispose() { listDispose(); sessionDispose?.(); listeners.clear() },
  }
}
