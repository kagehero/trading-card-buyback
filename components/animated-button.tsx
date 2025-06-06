"use client"

import type React from "react"

import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useAnimationEffects } from "@/hooks/use-animation-effects"
import type { ButtonProps } from "@/components/ui/button"

interface AnimatedButtonProps extends ButtonProps {
  rippleColor?: string
  glowColor?: string
  particleColor?: string
  enableParticles?: boolean
  enableGlow?: boolean
  enableRipple?: boolean
  springConfig?: {
    tension: number
    friction: number
    mass: number
  }
}

export function AnimatedButton({
  children,
  rippleColor = "#ffffff40",
  glowColor = "#3b82f6",
  particleColor = "#3b82f6",
  enableParticles = false,
  enableGlow = true,
  enableRipple = true,
  springConfig = { tension: 300, friction: 30, mass: 1 },
  onClick,
  ...props
}: AnimatedButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [isPressed, setIsPressed] = useState(false)
  const [scale, setScale] = useState(1)
  const { createRipple, createParticles, animateSpring, createGlow, ripples } = useAnimationEffects()

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!buttonRef.current) return

      setIsPressed(true)

      const rect = buttonRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // リップル効果
      if (enableRipple) {
        createRipple(x, y)
      }

      // スプリングアニメーション
      animateSpring("button-scale", 0.95, springConfig, (value) => {
        setScale(value)
      })

      // グロー効果
      if (enableGlow) {
        createGlow(buttonRef.current, glowColor)
      }
    },
    [createRipple, animateSpring, createGlow, enableRipple, enableGlow, glowColor, springConfig],
  )

  const handleMouseUp = useCallback(() => {
    setIsPressed(false)

    // スプリングアニメーション（戻り）
    animateSpring("button-scale", 1, springConfig, (value) => {
      setScale(value)
    })
  }, [animateSpring, springConfig])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return

      // パーティクル効果
      if (enableParticles) {
        const rect = buttonRef.current.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        createParticles(centerX, centerY, 6, particleColor)
      }

      onClick?.(e)
    },
    [createParticles, enableParticles, particleColor, onClick],
  )

  return (
    <Button
      ref={buttonRef}
      {...props}
      className={`relative overflow-hidden transition-all duration-200 ${props.className || ""}`}
      style={{
        transform: `scale(${scale})`,
        ...props.style,
      }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      {/* リップル効果 */}
      {enableRipple &&
        ripples.map((ripple) => {
          const elapsed = Date.now() - ripple.timestamp
          const progress = Math.min(elapsed / 600, 1)
          const scale = progress * 4
          const opacity = 1 - progress

          return (
            <div
              key={ripple.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: ripple.x - 10,
                top: ripple.y - 10,
                width: 20,
                height: 20,
                backgroundColor: rippleColor,
                transform: `scale(${scale})`,
                opacity,
                transition: "none",
              }}
            />
          )
        })}

      {/* ボタンコンテンツ */}
      <span className="relative z-10">{children}</span>

      {/* プレス状態のオーバーレイ */}
      {isPressed && (
        <div
          className="absolute inset-0 bg-white/10 transition-opacity duration-150"
          style={{
            opacity: isPressed ? 1 : 0,
          }}
        />
      )}
    </Button>
  )
}
