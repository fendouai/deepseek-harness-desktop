/** VRM Animation mixer and original task-state motion library. */
import * as THREE from 'three'
import { VRMAnimation, createVRMAnimationClip } from '@pixiv/three-vrm-animation'
import { VRMHumanBoneName, type VRM } from '@pixiv/three-vrm'
import type { AvatarActivity } from './AvatarOverlay.tsx'

/** Named full-body motions available to the Avatar state machine. */
export type AvatarMotionName = AvatarActivity | 'speaking'

interface RotationKeyframe {
  time: number
  x?: number
  y?: number
  z?: number
}

function rotationTrack(animation: VRMAnimation, bone: VRMHumanBoneName, keyframes: RotationKeyframe[]): void {
  const values = keyframes.flatMap(({ x = 0, y = 0, z = 0 }) => {
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'))
    return quaternion.toArray()
  })
  animation.humanoidTracks.rotation.set(
    bone,
    new THREE.QuaternionKeyframeTrack('', keyframes.map(keyframe => keyframe.time), values),
  )
}

function createMotion(duration: number, tracks: Array<[VRMHumanBoneName, RotationKeyframe[]]>): VRMAnimation {
  const animation = new VRMAnimation()
  animation.duration = duration
  animation.restHipsPosition.set(0, 1, 0)
  for (const [bone, keyframes] of tracks) rotationTrack(animation, bone, keyframes)
  return animation
}

function motionLibrary(): Record<AvatarMotionName, VRMAnimation> {
  const symmetric = (time: number, z: number): RotationKeyframe => ({ time, z })
  return {
    idle: createMotion(8, [
      [VRMHumanBoneName.Spine, [
        { time: 0, x: -0.015 }, { time: 2, x: 0.02, z: 0.025 }, { time: 4, x: -0.01 },
        { time: 6, x: 0.02, z: -0.025 }, { time: 8, x: -0.015 },
      ]],
      [VRMHumanBoneName.Head, [
        { time: 0, y: -0.04 }, { time: 2, y: 0.1, z: 0.025 }, { time: 4, y: 0.02 },
        { time: 6, y: -0.11, z: -0.02 }, { time: 8, y: -0.04 },
      ]],
      [VRMHumanBoneName.LeftUpperArm, [symmetric(0, -1.03), symmetric(4, -0.98), symmetric(8, -1.03)]],
      [VRMHumanBoneName.RightUpperArm, [symmetric(0, 1.03), symmetric(4, 0.98), symmetric(8, 1.03)]],
    ]),
    working: createMotion(4, [
      [VRMHumanBoneName.Spine, [
        { time: 0, x: 0.04 }, { time: 1, x: 0.07, z: 0.018 }, { time: 2, x: 0.04 },
        { time: 3, x: 0.07, z: -0.018 }, { time: 4, x: 0.04 },
      ]],
      [VRMHumanBoneName.Head, [
        { time: 0, x: 0.09, y: -0.04 }, { time: 1, x: 0.04, y: 0.04 }, { time: 2, x: 0.1 },
        { time: 3, x: 0.04, y: -0.04 }, { time: 4, x: 0.09, y: -0.04 },
      ]],
      [VRMHumanBoneName.LeftUpperArm, [symmetric(0, -0.72), symmetric(2, -0.68), symmetric(4, -0.72)]],
      [VRMHumanBoneName.RightUpperArm, [symmetric(0, 0.72), symmetric(2, 0.68), symmetric(4, 0.72)]],
      [VRMHumanBoneName.LeftLowerArm, [
        { time: 0, y: -0.7 }, { time: 0.5, y: -0.88 }, { time: 1, y: -0.7 },
        { time: 1.5, y: -0.86 }, { time: 2, y: -0.7 }, { time: 2.5, y: -0.88 },
        { time: 3, y: -0.7 }, { time: 3.5, y: -0.86 }, { time: 4, y: -0.7 },
      ]],
      [VRMHumanBoneName.RightLowerArm, [
        { time: 0, y: 0.86 }, { time: 0.5, y: 0.7 }, { time: 1, y: 0.88 },
        { time: 1.5, y: 0.7 }, { time: 2, y: 0.86 }, { time: 2.5, y: 0.7 },
        { time: 3, y: 0.88 }, { time: 3.5, y: 0.7 }, { time: 4, y: 0.86 },
      ]],
    ]),
    complete: createMotion(3.2, [
      [VRMHumanBoneName.Spine, [
        { time: 0, x: 0 }, { time: 0.45, x: -0.08, z: 0.06 }, { time: 1.2, x: 0.02, z: -0.04 },
        { time: 2.2, x: 0 }, { time: 3.2, x: 0 },
      ]],
      [VRMHumanBoneName.Head, [
        { time: 0 }, { time: 0.4, x: -0.1, z: 0.04 }, { time: 0.9, x: 0.03, z: -0.04 },
        { time: 1.5, x: -0.04 }, { time: 3.2 },
      ]],
      [VRMHumanBoneName.RightUpperArm, [
        { time: 0, z: 1.02 }, { time: 0.35, z: 0.28 }, { time: 2.2, z: 0.28 }, { time: 3.2, z: 1.02 },
      ]],
      [VRMHumanBoneName.RightLowerArm, [
        { time: 0, y: 0.2 }, { time: 0.35, y: 0.55 }, { time: 0.7, y: 0.1 }, { time: 1.05, y: 0.62 },
        { time: 1.4, y: 0.1 }, { time: 1.75, y: 0.55 }, { time: 2.2, y: 0.2 }, { time: 3.2, y: 0.2 },
      ]],
      [VRMHumanBoneName.LeftUpperArm, [
        symmetric(0, -1.02), symmetric(0.45, -0.72), symmetric(1.5, -0.86), symmetric(3.2, -1.02),
      ]],
    ]),
    speaking: createMotion(3.6, [
      [VRMHumanBoneName.Spine, [
        { time: 0, z: -0.02 }, { time: 0.9, x: -0.025, z: 0.045 }, { time: 1.8, z: -0.035 },
        { time: 2.7, x: -0.02, z: 0.04 }, { time: 3.6, z: -0.02 },
      ]],
      [VRMHumanBoneName.Head, [
        { time: 0, y: -0.04 }, { time: 0.9, x: -0.06, y: 0.08 }, { time: 1.8, y: -0.07 },
        { time: 2.7, x: -0.045, y: 0.06 }, { time: 3.6, y: -0.04 },
      ]],
      [VRMHumanBoneName.LeftUpperArm, [
        symmetric(0, -0.92), symmetric(0.9, -0.68), symmetric(1.8, -0.85),
        symmetric(2.7, -0.62), symmetric(3.6, -0.92),
      ]],
      [VRMHumanBoneName.RightUpperArm, [
        symmetric(0, 0.92), symmetric(0.9, 0.76), symmetric(1.8, 0.6),
        symmetric(2.7, 0.82), symmetric(3.6, 0.92),
      ]],
      [VRMHumanBoneName.LeftLowerArm, [
        { time: 0, y: -0.3 }, { time: 0.9, y: -0.72 }, { time: 1.8, y: -0.38 },
        { time: 2.7, y: -0.8 }, { time: 3.6, y: -0.3 },
      ]],
      [VRMHumanBoneName.RightLowerArm, [
        { time: 0, y: 0.3 }, { time: 0.9, y: 0.48 }, { time: 1.8, y: 0.76 },
        { time: 2.7, y: 0.42 }, { time: 3.6, y: 0.3 },
      ]],
    ]),
  }
}

/**
 * Select the highest-priority motion for the current renderer facts.
 * @param activity Coarse current-task activity.
 * @param speaking Whether streamed or synthesized speech is active.
 * @returns Motion name that should control the body.
 */
export function selectAvatarMotion(activity: AvatarActivity, speaking: boolean): AvatarMotionName {
  return speaking ? 'speaking' : activity
}

/** Cross-fading VRM Animation controller scoped to one loaded model. */
export class VrmMotionController {
  readonly #mixer: THREE.AnimationMixer
  readonly #actions: Record<AvatarMotionName, THREE.AnimationAction>
  #current: AvatarMotionName | undefined

  /** @param vrm Loaded VRM model whose normalized skeleton receives the clips. */
  constructor(vrm: VRM) {
    this.#mixer = new THREE.AnimationMixer(vrm.scene)
    const library = motionLibrary()
    this.#actions = Object.fromEntries(Object.entries(library).map(([name, animation]) => {
      const clip = createVRMAnimationClip(animation, vrm)
      clip.name = name
      const action = this.#mixer.clipAction(clip)
      if (name === 'complete') action.setLoop(THREE.LoopOnce, 1).clampWhenFinished = true
      return [name, action]
    })) as Record<AvatarMotionName, THREE.AnimationAction>
  }

  /**
   * Cross-fade to a motion unless it is already active.
   * @param name Motion that should become active.
   */
  setMotion(name: AvatarMotionName): void {
    if (name === this.#current) return
    const previous = this.#current === undefined ? undefined : this.#actions[this.#current]
    const next = this.#actions[name]
    previous?.fadeOut(0.32)
    next.reset().fadeIn(0.32).play()
    this.#current = name
  }

  /**
   * Advance every active and fading action.
   * @param delta Elapsed frame duration in seconds.
   */
  update(delta: number): void { this.#mixer.update(delta) }

  /** Stop actions and release mixer references. */
  dispose(): void { this.#mixer.stopAllAction(); this.#mixer.uncacheRoot(this.#mixer.getRoot()) }
}
