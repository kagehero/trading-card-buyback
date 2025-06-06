"use client"

import type React from "react"

import { useRef, useCallback, useState } from "react"

interface TouchPoint {
  id: number
  x: number
  y: number
  timestamp: number
}

interface GestureState {
  type: "none" | "pan" | "pinch" | "rotate" | "multi"
  scale: number
  rotation: number
  translation: { x: number; y: number }
  center: { x: number; y: number }
  velocity: { x: number; y: number; scale: number; rotation: number }
}

interface MultiTouchOptions {
  enablePan?: boolean
  enablePinch?: boolean
  enableRotation?: boolean
  minScale?: number
  maxScale?: number
  rotationThreshold?: number
  panThreshold?: number
  scaleThreshold?: number
  onGestureStart?: (gesture: GestureState) => void
  onGestureChange?: (gesture: GestureState) => void
  onGestureEnd?: (gesture: GestureState) => void
}

export function useMultiTouch(options: MultiTouchOptions = {}) {
  const {
    enablePan = true,
    enablePinch = true,
    enableRotation = true,
    minScale = 0.5,
    maxScale = 5,
    rotationThreshold = 5,
    panThreshold = 10,
    scaleThreshold = 0.1,
    onGestureStart,
    onGestureChange,
    onGestureEnd,
  } = options

  const [gestureState, setGestureState] = useState<GestureState>({
    type: "none",
    scale: 1,
    rotation: 0,
    translation: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
    velocity: { x: 0, y: 0, scale: 0, rotation: 0 },
  })

  const touchHistoryRef = useRef<TouchPoint[]>([])
  const initialStateRef = useRef<{
    distance: number
    angle: number
    center: { x: number; y: number }
    scale: number
    rotation: number
    translation: { x: number; y: number }
  } | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const isGestureActiveRef = useRef(false)

  // 2点間の距離を計算
  const getDistance = useCallback((p1: TouchPoint, p2: TouchPoint) => {
    const dx = p1.x - p2.x
    const dy = p1.y - p2.y
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // 2点間の角度を計算（ラジアン）
  const getAngle = useCallback((p1: TouchPoint, p2: TouchPoint) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x)
  }, [])

  // 2点の中心を計算
  const getCenter = useCallback((p1: TouchPoint, p2: TouchPoint) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }
  }, [])

  // 角度を正規化（-180度から180度）
  const normalizeAngle = useCallback((angle: number) => {
    let normalized = (angle * 180) / Math.PI
    while (normalized > 180) normalized -= 360
    while (normalized < -180) normalized += 360
    return normalized
  }, [])

  // 速度を計算
  const calculateVelocity = useCallback((current: GestureState, previous: GestureState, deltaTime: number) => {
    if (deltaTime === 0) return { x: 0, y: 0, scale: 0, rotation: 0 }

    return {
      x: (current.translation.x - previous.translation.x) / deltaTime,
      y: (current.translation.y - previous.translation.y) / deltaTime,
      scale: (current.scale - previous.scale) / deltaTime,
      rotation: (current.rotation - previous.rotation) / deltaTime,
    }
  }, [])

  // ジェスチャータイプを判定
  const determineGestureType = useCallback(
    (touches: TouchPoint[], initialState: any, currentState: GestureState) => {
      if (touches.length === 1) {
        const deltaX = Math.abs(currentState.translation.x)
        const deltaY = Math.abs(currentState.translation.y)
        if (deltaX > panThreshold || deltaY > panThreshold) {
          return "pan"
        }
      } else if (touches.length === 2) {
        const scaleDelta = Math.abs(currentState.scale - 1)
        const rotationDelta = Math.abs(currentState.rotation)

        if (scaleDelta > scaleThreshold && rotationDelta > rotationThreshold) {
          return "multi"
        } else if (scaleDelta > scaleThreshold) {
          return "pinch"
        } else if (rotationDelta > rotationThreshold) {
          return "rotate"
        }
      }
      return "none"
    },
    [panThreshold, scaleThreshold, rotationThreshold],
  )

  // タッチ開始
  const handleTouchStart = useCallback(
    (e: TouchEvent | React.TouchEvent) => {
      const touches = Array.from(e.touches).map((touch, index) => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      }))

      touchHistoryRef.current = touches
      lastUpdateTimeRef.current = Date.now()

      if (touches.length === 2) {
        const distance = getDistance(touches[0], touches[1])
        const angle = getAngle(touches[0], touches[1])
        const center = getCenter(touches[0], touches[1])

        initialStateRef.current = {
          distance,
          angle,
          center,
          scale: gestureState.scale,
          rotation: gestureState.rotation,
          translation: { ...gestureState.translation },
        }

        isGestureActiveRef.current = true
        onGestureStart?.(gestureState)
      } else if (touches.length === 1) {
        initialStateRef.current = {
          distance: 0,
          angle: 0,
          center: { x: touches[0].x, y: touches[0].y },
          scale: gestureState.scale,
          rotation: gestureState.rotation,
          translation: { ...gestureState.translation },
        }

        isGestureActiveRef.current = true
        onGestureStart?.(gestureState)
      }
    },
    [gestureState, getDistance, getAngle, getCenter, onGestureStart],
  )

  // タッチ移動
  const handleTouchMove = useCallback(
    (e: TouchEvent | React.TouchEvent) => {
      if (!initialStateRef.current || !isGestureActiveRef.current) return

      const touches = Array.from(e.touches).map((touch) => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      }))

      const now = Date.now()
      const deltaTime = now - lastUpdateTimeRef.current
      const previousState = { ...gestureState }

      const newState: GestureState = {
        ...gestureState,
        center: { x: 0, y: 0 },
        velocity: { x: 0, y: 0, scale: 0, rotation: 0 },
      }

      if (touches.length === 1 && enablePan) {
        // シングルタッチ - パン操作
        const touch = touches[0]
        const deltaX = touch.x - initialStateRef.current.center.x
        const deltaY = touch.y - initialStateRef.current.center.y

        newState.translation = {
          x: initialStateRef.current.translation.x + deltaX,
          y: initialStateRef.current.translation.y + deltaY,
        }
        newState.center = { x: touch.x, y: touch.y }
      } else if (touches.length === 2) {
        // マルチタッチ - ピンチ・ローテーション
        const currentDistance = getDistance(touches[0], touches[1])
        const currentAngle = getAngle(touches[0], touches[1])
        const currentCenter = getCenter(touches[0], touches[1])

        // ピンチズーム
        if (enablePinch) {
          const scaleChange = currentDistance / initialStateRef.current.distance
          newState.scale = Math.min(Math.max(initialStateRef.current.scale * scaleChange, minScale), maxScale)
        }

        // ローテーション
        if (enableRotation) {
          const angleDelta = normalizeAngle(currentAngle - initialStateRef.current.angle)
          newState.rotation = initialStateRef.current.rotation + angleDelta
        }

        // 中心点の移動
        const centerDeltaX = currentCenter.x - initialStateRef.current.center.x
        const centerDeltaY = currentCenter.y - initialStateRef.current.center.y

        newState.translation = {
          x: initialStateRef.current.translation.x + centerDeltaX,
          y: initialStateRef.current.translation.y + centerDeltaY,
        }
        newState.center = currentCenter
      }

      // ジェスチャータイプを判定
      newState.type = determineGestureType(touches, initialStateRef.current, newState)

      // 速度を計算
      if (deltaTime > 0) {
        newState.velocity = calculateVelocity(newState, previousState, deltaTime)
      }

      setGestureState(newState)
      touchHistoryRef.current = touches
      lastUpdateTimeRef.current = now

      onGestureChange?.(newState)
    },
    [
      gestureState,
      enablePan,
      enablePinch,
      enableRotation,
      minScale,
      maxScale,
      getDistance,
      getAngle,
      getCenter,
      normalizeAngle,
      determineGestureType,
      calculateVelocity,
      onGestureChange,
    ],
  )

  // タッチ終了
  const handleTouchEnd = useCallback(
    (e: TouchEvent | React.TouchEvent) => {
      const remainingTouches = Array.from(e.touches)

      if (remainingTouches.length === 0) {
        // 全てのタッチが終了
        isGestureActiveRef.current = false
        initialStateRef.current = null

        const finalState = {
          ...gestureState,
          type: "none" as const,
        }

        setGestureState(finalState)
        onGestureEnd?.(finalState)
      } else if (remainingTouches.length === 1 && touchHistoryRef.current.length === 2) {
        // 2本指から1本指に変更 - 新しいパン操作を開始
        const touch = remainingTouches[0]
        initialStateRef.current = {
          distance: 0,
          angle: 0,
          center: { x: touch.clientX, y: touch.clientY },
          scale: gestureState.scale,
          rotation: gestureState.rotation,
          translation: { ...gestureState.translation },
        }
      }

      touchHistoryRef.current = remainingTouches.map((touch) => ({
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
      }))
    },
    [gestureState, onGestureEnd],
  )

  // リセット関数
  const resetGesture = useCallback(() => {
    const resetState: GestureState = {
      type: "none",
      scale: 1,
      rotation: 0,
      translation: { x: 0, y: 0 },
      center: { x: 0, y: 0 },
      velocity: { x: 0, y: 0, scale: 0, rotation: 0 },
    }

    setGestureState(resetState)
    initialStateRef.current = null
    isGestureActiveRef.current = false
    touchHistoryRef.current = []
  }, [])

  // 状態を設定する関数
  const setGestureTransform = useCallback(
    (transform: Partial<Pick<GestureState, "scale" | "rotation" | "translation">>) => {
      setGestureState((prev) => ({
        ...prev,
        ...transform,
      }))
    },
    [],
  )

  return {
    gestureState,
    isGestureActive: isGestureActiveRef.current,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    resetGesture,
    setGestureTransform,
  }
}
