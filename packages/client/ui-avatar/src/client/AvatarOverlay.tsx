/** One-image character overlay driven by the selected Harness session. */
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import { AVATAR_PRESETS, createAvatarStore, validateAvatarImage } from './store.ts'
import { VrmAvatar } from './VrmAvatar.tsx'
import css from './AvatarOverlay.module.css'

/** Coarse visual state derived only from authoritative session-list facts. */
export type AvatarActivity = 'idle' | 'working' | 'complete'

/** Props assembled by the shell overlay slot. */
export type AvatarOverlayProps =
  & PropsRuntime<'shell.overlay'>
  & PropsStore<ReturnType<typeof createAvatarStore>>
  & { speechText?: string }

/** Map the selected session summary onto the visual state machine. */
export function avatarActivity(summary: { running: boolean; completed?: boolean } | undefined): AvatarActivity {
  if (summary?.running === true) return 'working'
  if (summary?.completed === true) return 'complete'
  return 'idle'
}

/** Persistent Avatar overlay with an inline appearance panel. */
export function AvatarOverlay({ useSessions, useStore, actions, speechText = '' }: AvatarOverlayProps) {
  const current = useSessions(state => state.current === undefined ? undefined : state.byId[state.current])
  const activity = avatarActivity(current)
  const preferences = useStore(state => state)
  const input = useRef<HTMLInputElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedPreset = AVATAR_PRESETS.find(preset => preset.id === preferences.preset) ?? AVATAR_PRESETS[0]
  const characterImage = preferences.image ?? selectedPreset.image

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
            ? <VrmAvatar activity={activity} speechText={speechText} />
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
      </div>

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
                onClick={() => actions.selectPreset(preset.id)}
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
            {preferences.image !== null && <button type="button" onClick={() => actions.selectPreset(preferences.preset)}>Use preset</button>}
          </div>
          <label className={css.sizeLabel}>
            Size
            <input
              type="range"
              min="180"
              max="420"
              step="10"
              value={preferences.size}
              onChange={event => actions.setSize(Number(event.target.value))}
            />
          </label>
          {error !== null && <p className={css.error} role="alert">{error}</p>}
        </div>
      )}
    </aside>
  )
}
