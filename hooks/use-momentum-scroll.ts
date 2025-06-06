"use client"

import { useRef, useCallback, useEffect } from "react"

interface MomentumScrollOptions {
  friction?: number
  bounceStiffness?: number
  bounceDamping?: number
  minVelocity?: number
  maxVelocity?: number
  onUpdate?: (position: number, velocity: number) => void
  onComplete?: () => void
  bounds?: { min: number; max: number }
}

interface TouchPoint {
  x: number
  y: number
  time: number
}

export function useMomentumScroll(options: MomentumScrollOptions = {}) {
  const {
    friction = 0.95,
    bounceStiffness = 0.1,
    bounceDamping = 0.8,
    minVelocity = 0.1,
    maxVelocity = 50,
    onUpdate,
    onComplete,
    bounds,
  } = options

  const animationRef = useRef<number>()
  const velocityRef = useRef(0)
  const positionRef = useRef(0)
  const touchHistoryRef = useRef<TouchPoint[]>([])
  const isAnimatingRef = useRef(false)

  // 速度計算
  const calculateVelocity = useCallback(
    (touchHistory: TouchPoint[], direction: "x" | "y" = "x") => {
      if (touchHistory.length < 2) return 0

      const recent = touchHistory.slice(-3) // 最新の3点を使用
      if (recent.length < 2) return 0

      const first = recent[0]
      const last = recent[recent.length - 1]
      const timeDiff = last.time - first.time

      if (timeDiff === 0) return 0

      const distance = direction === "x" ? last.x - first.x : last.y - first.y
      const velocity = distance / timeDiff

      return Math.max(-maxVelocity, Math.min(maxVelocity, velocity))
    },
    [maxVelocity],
  )

  // 慣性アニメーション
  const animate = useCallback(() => {
    if (!isAnimatingRef.current) return

    let { current: velocity } = velocityRef
    let { current: position } = positionRef

    // 境界チェックとバウンス効果
    if (bounds) {
      if (position < bounds.min) {
        const overshoot = bounds.min - position
        velocity += overshoot * bounceStiffness
        velocity *= bounceDamping
        position = bounds.min - overshoot * 0.5
      } else if (position > bounds.max) {
        const overshoot = position - bounds.max
        velocity -= overshoot * bounceStiffness
        velocity *= bounceDamping
        position = bounds.max + overshoot * 0.5
      }
    }

    // 摩擦適用
    velocity *= friction

    // 位置更新
    position += velocity

    // 最小速度チェック
    if (Math.abs(velocity) < minVelocity) {
      // 境界内に収束
      if (bounds) {
        if (position < bounds.min) {
          position = bounds.min
        } else if (position > bounds.max) {
          position = bounds.max
        }
      }

      isAnimatingRef.current = false
      velocityRef.current = 0
      positionRef.current = position
      onUpdate?.(position, 0)
      onComplete?.()
      return
    }

    velocityRef.current = velocity
    positionRef.current = position

    onUpdate?.(position, velocity)

    animationRef.current = requestAnimationFrame(animate)
  }, [friction, bounceStiffness, bounceDamping, minVelocity, bounds, onUpdate, onComplete])

  // 慣性スクロール開始
  const startMomentum = useCallback(
    (initialVelocity: number, initialPosition = 0) => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      velocityRef.current = initialVelocity
      positionRef.current = initialPosition
      isAnimatingRef.current = true

      animate()
    },
    [animate],
  )

  // タッチ履歴追加
  const addTouchPoint = useCallback((x: number, y: number) => {
    const now = Date.now()
    const point = { x, y, time: now }

    touchHistoryRef.current.push(point)

    // 古い履歴を削除（100ms以上前）
    touchHistoryRef.current = touchHistoryRef.current.filter((p) => now - p.time < 100)
  }, [])

  // タッチ終了時の慣性開始
  const handleTouchEnd = useCallback(
    (direction: "x" | "y" = "x", currentPosition = 0) => {
      const velocity = calculateVelocity(touchHistoryRef.current, direction)
      touchHistoryRef.current = []

      if (Math.abs(velocity) > minVelocity) {
        startMomentum(velocity, currentPosition)
      }
    },
    [calculateVelocity, minVelocity, startMomentum],
  )

  // 停止
  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    isAnimatingRef.current = false
    velocityRef.current = 0
    touchHistoryRef.current = []
  }, [])

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return {
    addTouchPoint,
    handleTouchEnd,
    startMomentum,
    stop,
    isAnimating: isAnimatingRef.current,
    currentVelocity: velocityRef.current,
    currentPosition: positionRef.current,
  }
}
