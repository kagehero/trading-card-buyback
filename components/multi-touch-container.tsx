"use client"

import type React from "react"
import { useRef, useCallback, useEffect } from "react"
import { useMultiTouch } from "@/hooks/use-multi-touch"
import { useAnimationEffects } from "@/hooks/use-animation-effects"

interface MultiTouchContainerProps {
  children: React.ReactNode
  enablePan?: boolean
  enablePinch?: boolean
  enableRotation?: boolean
  minScale?: number
  maxScale?: number
  showIndicator?: boolean
  className?: string
  onTransformChange?: (transform: {
    scale: number
    rotation: number
    translation: { x: number; y: number }
  }) => void
  onGestureStart?: () => void
  onGestureEnd?: () => void
}

export function MultiTouchContainer({
  children,
  enablePan = true,
  enablePinch = true,
  enableRotation = true,
  minScale = 0.5,
  maxScale = 3,
  showIndicator = false,
  className = "",
  onTransformChange,
  onGestureStart,
  onGestureEnd,
}: MultiTouchContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { createParticles, createRipple } = useAnimationEffects()

  const { gestureState, isGestureActive, handlers, resetGesture } = useMultiTouch({
    enablePan,
    enablePinch,
    enableRotation,
    minScale,
    maxScale,
    onGestureStart: (gesture) => {
      // ジェスチャー開始時のパーティクル効果
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2

        switch (gesture.type) {
          case "pan":
            createParticles(centerX, centerY, 4, "#f97316")
            break
          case "pinch":
            createParticles(centerX, centerY, 6, "#10b981")
            break
          case "rotate":
            createParticles(centerX, centerY, 8, "#8b5cf6")
            break
          case "multi":
            createParticles(centerX, centerY, 10, "#3b82f6")
            break
        }
      }

      onGestureStart?.()
    },
    onGestureChange: (gesture) => {
      onTransformChange?.({
        scale: gesture.scale,
        rotation: gesture.rotation,
        translation: gesture.translation,
      })

      // 高速操作時の追加パーティクル
      const velocityMagnitude = Math.sqrt(
        gesture.velocity.x ** 2 +
          gesture.velocity.y ** 2 +
          gesture.velocity.scale ** 2 +
          gesture.velocity.rotation ** 2,
      )

      if (velocityMagnitude > 5 && Math.random() > 0.8) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          createParticles(gesture.center.x - rect.left, gesture.center.y - rect.top, 2, "#fbbf24")
        }
      }
    },
    onGestureEnd: (gesture) => {
      // ジェスチャー終了時の成功パーティクル
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        createParticles(centerX, centerY, 12, "#10b981")
      }

      onGestureEnd?.()
    },
  })

  // タッチイベントハンドラー
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handlers.onTouchStart(e)

      // タッチ開始時のリップル効果
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const x = touch.clientX - rect.left
          const y = touch.clientY - rect.top
          createRipple(x, y)
        }
      }
    },
    [handlers, createRipple],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handlers.onTouchMove(e)
    },
    [handlers],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handlers.onTouchEnd(e)
    },
    [handlers],
  )

  // ダブルタップでリセット
  const handleDoubleClick = useCallback(() => {
    resetGesture()
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      createParticles(rect.width / 2, rect.height / 2, 15, "#ef4444")
    }
  }, [resetGesture, createParticles])

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        resetGesture()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [resetGesture])

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        style={{
          touchAction: "none",
          userSelect: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <div
          style={{
            transform: `translate(${gestureState.translation.x}px, ${gestureState.translation.y}px) scale(${gestureState.scale}) rotate(${gestureState.rotation}deg)`,
            transformOrigin: "center",
            transition: isGestureActive ? "none" : "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
