/** Three.js VRM renderer with text-synchronous visemes, expressions, and body motion. */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  VRMExpressionPresetName, VRMHumanBoneName, VRMLoaderPlugin, VRMUtils, type VRM,
} from '@pixiv/three-vrm'
import type { AvatarActivity } from './AvatarOverlay.tsx'
import css from './AvatarOverlay.module.css'

const MOUTH_PRESETS = [
  VRMExpressionPresetName.Aa,
  VRMExpressionPresetName.Ih,
  VRMExpressionPresetName.Ou,
  VRMExpressionPresetName.Ee,
  VRMExpressionPresetName.Oh,
] as const

/** Map the latest generated character onto a stable VRM mouth preset. */
export function visemeForText(text: string): typeof MOUTH_PRESETS[number] {
  const value = text.trimEnd().at(-1)?.toLowerCase() ?? ''
  if ('a啊呀哈吧怕妈发'.includes(value)) return VRMExpressionPresetName.Aa
  if ('iiy一衣以你里'.includes(value)) return VRMExpressionPresetName.Ih
  if ('uuw五无不木'.includes(value)) return VRMExpressionPresetName.Ou
  if ('e诶欸诶'.includes(value)) return VRMExpressionPresetName.Ee
  return VRMExpressionPresetName.Oh
}

interface VrmAvatarProps {
  activity: AvatarActivity
  speechText: string
}

/** Render and animate the bundled VRM character. */
export function VrmAvatar({ activity, speechText }: VrmAvatarProps) {
  const canvas = useRef<HTMLCanvasElement | null>(null)
  const activityRef = useRef(activity)
  const speechRef = useRef(speechText)
  const speechPulse = useRef(0)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')

  activityRef.current = activity
  if (speechRef.current !== speechText) {
    speechRef.current = speechText
    speechPulse.current = 1
  }

  useEffect(() => {
    const target = canvas.current
    if (target === null) return
    const renderer = new THREE.WebGLRenderer({ canvas: target, alpha: true, antialias: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20)
    camera.position.set(0, 1.3, 3.85)
    camera.lookAt(0, 1.02, 0)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x334466, 2.3))
    const key = new THREE.DirectionalLight(0xffffff, 2.8)
    key.position.set(1.6, 2.2, 2.4)
    scene.add(key)

    let disposed = false
    let frame = 0
    let vrm: VRM | undefined
    const clock = new THREE.Clock()
    const loader = new GLTFLoader()
    loader.register(parser => new VRMLoaderPlugin(parser))
    void loader.loadAsync('/avatars/avatar-sample-a.vrm').then((gltf) => {
      if (disposed) return
      vrm = gltf.userData.vrm as VRM
      VRMUtils.removeUnnecessaryVertices(vrm.scene)
      VRMUtils.combineSkeletons(vrm.scene)
      vrm.scene.traverse((object) => { object.frustumCulled = false })
      scene.add(vrm.scene)
      setLoadState('ready')
    }).catch(() => { if (!disposed) setLoadState('error') })

    const resize = (): void => {
      const { width, height } = target.getBoundingClientRect()
      const nextWidth = Math.max(1, Math.round(width))
      const nextHeight = Math.max(1, Math.round(height))
      renderer.setSize(nextWidth, nextHeight, false)
      camera.aspect = nextWidth / nextHeight
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(target)
    resize()

    const animate = (): void => {
      frame = requestAnimationFrame(animate)
      const delta = Math.min(clock.getDelta(), 0.05)
      const elapsed = clock.elapsedTime
      const model = vrm
      if (model !== undefined) {
        const expressions = model.expressionManager
        if (expressions !== undefined) {
          for (const preset of MOUTH_PRESETS) expressions.setValue(preset, 0)
          speechPulse.current = Math.max(0, speechPulse.current - delta * 2.4)
          if (speechRef.current !== '' && activityRef.current === 'working') {
            const openness = (0.28 + 0.72 * Math.abs(Math.sin(elapsed * 13))) * (0.35 + 0.65 * speechPulse.current)
            expressions.setValue(visemeForText(speechRef.current), openness)
          }
          expressions.setValue(VRMExpressionPresetName.Happy, activityRef.current === 'complete' ? 0.78 : 0)
          expressions.setValue(VRMExpressionPresetName.Relaxed, activityRef.current === 'idle' ? 0.32 : 0)
          expressions.setValue(VRMExpressionPresetName.Surprised, activityRef.current === 'complete' ? Math.max(0, 0.35 - elapsed % 4) : 0)
          const blinkPhase = elapsed % 4.6
          expressions.setValue(VRMExpressionPresetName.Blink, blinkPhase > 4.42 ? Math.sin((blinkPhase - 4.42) / 0.18 * Math.PI) : 0)
        }

        const humanoid = model.humanoid
        const head = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head)
        const spine = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Spine)
        const leftArm = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftUpperArm)
        const rightArm = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightUpperArm)
        const leftForearm = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.LeftLowerArm)
        const rightForearm = humanoid?.getNormalizedBoneNode(VRMHumanBoneName.RightLowerArm)
        if (head !== null && head !== undefined) {
          head.rotation.y = Math.sin(elapsed * 0.55) * 0.055
          head.rotation.x = activityRef.current === 'working' ? 0.08 + Math.sin(elapsed * 2.5) * 0.025 : Math.sin(elapsed * 0.7) * 0.02
        }
        if (spine !== null && spine !== undefined) spine.rotation.z = Math.sin(elapsed * 0.8) * 0.018
        const working = activityRef.current === 'working'
        if (leftArm !== null && leftArm !== undefined) leftArm.rotation.z = working ? -0.72 : -1.05
        if (rightArm !== null && rightArm !== undefined) rightArm.rotation.z = working ? 0.72 : 1.05
        if (leftForearm !== null && leftForearm !== undefined) {
          leftForearm.rotation.y = working ? -0.78 + Math.sin(elapsed * 5) * 0.05 : -0.2
        }
        if (rightForearm !== null && rightForearm !== undefined) {
          rightForearm.rotation.y = working ? 0.78 - Math.sin(elapsed * 5) * 0.05 : 0.2
        }
        model.update(delta)
      }
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.dispose()
      vrm?.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          for (const material of materials) material.dispose()
        }
      })
    }
  }, [])

  return (
    <>
      <canvas className={css.vrmCanvas} ref={canvas} aria-label="Animated 3D VRM character" />
      {loadState !== 'ready' && <span className={css.vrmNotice}>{loadState === 'loading' ? 'Loading 3D character…' : '3D character could not be loaded.'}</span>}
    </>
  )
}
