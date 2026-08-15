/** One-image character overlay driven by the selected Harness session. */
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { AVATAR_PRESETS, createAvatarStore, validateAvatarImage } from './store.ts'
import { VrmAvatar } from './VrmAvatar.tsx'
import type { AvatarMotionSnapshot } from './motion.ts'
import css from './AvatarOverlay.module.css'

/** Coarse visual state derived only from authoritative session-list facts. */
export type AvatarActivity = 'idle' | 'working' | 'complete'

/** Props assembled by the shell overlay slot. */
export type AvatarOverlayProps =
  & PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createAvatarStore>>
  & {
    motion?: AvatarMotionSnapshot
    sendMessage?: (text: string) => Promise<void>
  }

interface SpeechRecognitionResultEventLike { results: { 0: { 0: { transcript: string } } } }
interface SpeechRecognitionLike {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function speechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  const candidate = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition
}

/** Map the selected session summary onto the visual state machine. */
export function avatarActivity(summary: { running: boolean; completed?: boolean } | undefined): AvatarActivity {
  if (summary?.running === true) return 'working'
  if (summary?.completed === true) return 'complete'
  return 'idle'
}

/** Persistent Avatar overlay with an inline appearance panel. */
export function AvatarOverlay({ useSessions, useStore, actions, motion, sendMessage }: AvatarOverlayProps) {
  const current = useSessions(state => state.current === undefined ? undefined : state.byId[state.current])
  const activity = avatarActivity(current)
  const preferences = useStore(state => state)
  const input = useRef<HTMLInputElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [talking, setTalking] = useState(false)
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const spokenSeq = useRef<number | null>(null)
  const recognition = useRef<SpeechRecognitionLike | null>(null)
  const sendingRef = useRef(false)
  const speakingRef = useRef(false)
  const handsFreeRef = useRef(preferences.handsFreeVoice)
  const talkingRef = useRef(talking)
  const runningRef = useRef(current?.running === true)
  const awaitingReply = useRef<{ seq: number | null } | null>(null)
  const selectedPreset = AVATAR_PRESETS.find(preset => preset.id === preferences.preset) ?? AVATAR_PRESETS[0]
  const characterImage = preferences.image ?? selectedPreset.image
  sendingRef.current = sending
  speakingRef.current = speaking
  handsFreeRef.current = preferences.handsFreeVoice
  talkingRef.current = talking
  runningRef.current = current?.running === true

  async function deliverText(text: string): Promise<void> {
    const normalized = text.trim()
    if (normalized === '' || sendMessage === undefined || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setDraft(normalized)
    awaitingReply.current = { seq: motion?.finalSeq ?? null }
    try {
      await sendMessage(normalized)
      setDraft('')
      setError(null)
    } catch (cause) {
      awaitingReply.current = null
      setError(cause instanceof Error ? cause.message : 'The message could not be sent.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  function startListening(): void {
    if (recognition.current !== null || sendingRef.current || speakingRef.current || runningRef.current) return
    if (!talkingRef.current) return
    if (new URLSearchParams(window.location.search).has('dshDesktopDebug')) {
      setError('Microphone input requires the packaged macOS app. The bare development binary cannot request Speech Recognition safely.')
      return
    }
    const SpeechRecognition = speechRecognitionConstructor()
    if (SpeechRecognition === undefined) {
      setError('Voice recognition is unavailable in this WebView. Use the text field instead.')
      return
    }
    const next = new SpeechRecognition()
    next.lang = navigator.language.startsWith('zh') ? 'zh-CN' : navigator.language
    next.interimResults = false
    next.continuous = false
    next.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setError(null)
      void deliverText(transcript)
    }
    next.onerror = () => { setError('Voice recognition failed. Check microphone permission and try again.') }
    next.onend = () => { setListening(false); recognition.current = null }
    recognition.current = next
    setListening(true)
    next.start()
  }

  useEffect(() => {
    if (!preferences.speakReplies || motion?.finalSeq === null || motion?.finalSeq === undefined || motion.finalText === '') return
    if (spokenSeq.current === motion.finalSeq || !('speechSynthesis' in window)) return
    spokenSeq.current = motion.finalSeq
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(motion.finalText)
    utterance.lang = /[\u3400-\u9fff]/u.test(motion.finalText) ? 'zh-CN' : navigator.language
    utterance.rate = 1.04
    utterance.onstart = () => { speakingRef.current = true; setSpeaking(true) }
    utterance.onend = () => {
      speakingRef.current = false
      setSpeaking(false)
      if (handsFreeRef.current) window.setTimeout(startListening, 350)
    }
    utterance.onerror = () => {
      speakingRef.current = false
      setSpeaking(false)
      if (handsFreeRef.current) window.setTimeout(startListening, 350)
    }
    window.speechSynthesis.speak(utterance)
  }, [motion?.finalSeq, motion?.finalText, preferences.speakReplies])

  useEffect(() => {
    const pending = awaitingReply.current
    if (pending === null || current?.running === true || motion?.finalSeq === pending.seq) return
    awaitingReply.current = null
    const speechOutputUnavailable = !('speechSynthesis' in window)
    if (preferences.handsFreeVoice && (!preferences.speakReplies || speechOutputUnavailable)) {
      window.setTimeout(startListening, 350)
    }
  }, [current?.running, motion?.finalSeq, preferences.handsFreeVoice, preferences.speakReplies])

  useEffect(() => {
    if (!talking || !preferences.handsFreeVoice) {
      recognition.current?.stop()
      return
    }
    window.setTimeout(startListening, 250)
  }, [talking, preferences.handsFreeVoice])

  useEffect(() => () => {
    recognition.current?.stop()
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const submitMessage = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault()
    await deliverText(draft)
  }

  const toggleListening = (): void => {
    if (listening) { recognition.current?.stop(); return }
    startListening()
  }

  const importImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file === undefined) return
    const validation = validateAvatarImage(file)
    if (validation !== null) {
      setError(validation)
      return
    }
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string' || !reader.result.startsWith('data:image/')) {
        setError('The selected image could not be read.')
        return
      }
      actions.setImage(reader.result)
      setError(null)
    }, { once: true })
    reader.addEventListener('error', () => { setError('The selected image could not be read.') }, { once: true })
    reader.readAsDataURL(file)
  }

  return (
    <aside className={css.root} data-avatar-activity={activity} data-avatar-enabled={preferences.enabled || undefined}>
      {preferences.enabled && (
        <div className={css.stage} style={{ width: preferences.size }} aria-label={`Avatar ${activity}`}>
          <div className={css.aura} aria-hidden="true" />
          {preferences.renderer === 'vrm'
            ? <VrmAvatar
              activity={activity}
              speechText={motion?.partialText || (speaking ? motion?.finalText ?? '' : '')}
              speechActive={speaking || (motion?.partialText ?? '') !== ''}
            />
            : <img className={css.character} src={characterImage} alt={preferences.image === null ? `${selectedPreset.name} Avatar character` : 'Your Avatar character'} />}
          <div className={css.status}><span className={css.statusDot} />{activity}</div>
        </div>
      )}

      <div className={css.controls}>
        <button type="button" onClick={actions.toggle} aria-label={preferences.enabled ? 'Hide Avatar' : 'Show Avatar'}>
          {preferences.enabled ? 'Hide' : 'Show'}
        </button>
        <button type="button" onClick={() => { setEditing(value => !value); setError(null) }} aria-expanded={editing}>
          Appearance
        </button>
        <button type="button" onClick={() => { setTalking(value => !value); setError(null) }} aria-expanded={talking}>
          Talk
        </button>
      </div>

      {talking && (
        <form className={css.talkPanel} aria-label="Talk to current task" onSubmit={(event) => { void submitMessage(event) }}>
          <strong>Talk to this task</strong>
          <p>Type and send, or speak once and pause to send automatically.</p>
          <div className={css.talkRow}>
            <input value={draft} onChange={(event) => { setDraft(event.target.value) }} placeholder="Ask the current task…" aria-label="Message current task" />
            <button
              type="button"
              onClick={toggleListening}
              aria-pressed={listening}
              disabled={!listening && (sending || speaking || current?.running === true)}
            >
              {listening ? 'Listening…' : 'Speak'}
            </button>
            <button type="submit" disabled={sending || draft.trim() === ''}>{sending ? 'Sending…' : 'Send'}</button>
          </div>
          <label className={css.voiceToggle}>
            <input type="checkbox" checked={preferences.speakReplies} onChange={actions.toggleSpeakReplies} />
            Read Assistant replies aloud
          </label>
          <label className={css.voiceToggle}>
            <input type="checkbox" checked={preferences.handsFreeVoice} onChange={actions.toggleHandsFreeVoice} />
            Hands-free conversation
          </label>
          {error !== null && <p className={css.error} role="alert">{error}</p>}
        </form>
      )}

      {editing && (
        <div className={css.panel} role="dialog" aria-label="Avatar appearance">
          <strong>Avatar appearance</strong>
          <p>Use the animated VRM model, a bundled character, or your own image.</p>
          <div className={css.presetGrid} aria-label="Bundled characters">
            <button
              type="button"
              className={css.preset}
              data-selected={preferences.renderer === 'vrm' || undefined}
              onClick={actions.useVrm}
              aria-pressed={preferences.renderer === 'vrm'}
            >
              <img src="/avatars/avatar-sample-a.png" alt="" />
              <span>3D VRM</span>
            </button>
            {AVATAR_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                className={css.preset}
                data-selected={preferences.renderer === 'image' && preferences.image === null && preferences.preset === preset.id || undefined}
                onClick={() => { actions.selectPreset(preset.id) }}
                aria-pressed={preferences.renderer === 'image' && preferences.image === null && preferences.preset === preset.id}
              >
                <img src={preset.image} alt="" />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
          <input ref={input} className={css.file} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={importImage} />
          <div className={css.panelActions}>
            <button type="button" onClick={() => input.current?.click()}>Choose image</button>
            {preferences.image !== null && <button type="button" onClick={() => { actions.selectPreset(preferences.preset) }}>Use preset</button>}
          </div>
          <label className={css.sizeLabel}>
            Size
            <input
              type="range"
              min="180"
              max="420"
              step="10"
              value={preferences.size}
              onChange={(event) => { actions.setSize(Number(event.target.value)) }}
            />
          </label>
          {error !== null && <p className={css.error} role="alert">{error}</p>}
        </div>
      )}
    </aside>
  )
}
