"use client"

import { useRef, useCallback, useEffect, useState } from "react"

interface RippleEffect {
  id: string
  x: number
  y: number
  timestamp: number
}

interface ParticleEffect {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
}

interface SpringConfig {
  tension: number
  friction: number
  mass: number
}

export function useAnimationEffects() {
  const [ripples, setRipples] = useState<RippleEffect[]>([])
  const [particles, setParticles] = useState<ParticleEffect[]>([])
  const animationFrameRef = useRef<number>()
  const springValuesRef = useRef<Map<string, { value: number; velocity: number }>>(new Map())

  // リップル効果の作成
  const createRipple = useCallback((x: number, y: number, containerId?: string) => {
    const ripple: RippleEffect = {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y,
      timestamp: Date.now(),
    }

    setRipples((prev) => [...prev, ripple])

    // 1秒後にリップルを削除
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id))
    }, 1000)

    return ripple.id
  }, [])

  // パーティクル効果の作成
  const createParticles = useCallback((x: number, y: number, count = 8, color = "#3b82f6") => {
    const newParticles: ParticleEffect[] = []

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 3
      const life = 60 + Math.random() * 30

      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size: 2 + Math.random() * 3,
      })
    }

    setParticles((prev) => [...prev, ...newParticles])
  }, [])

  // スプリングアニメーション
  const animateSpring = useCallback(
    (
      key: string,
      targetValue: number,
      config: SpringConfig = { tension: 170, friction: 26, mass: 1 },
      onUpdate?: (value: number) => void,
    ) => {
      const springValue = springValuesRef.current.get(key) || { value: 0, velocity: 0 }

      const animate = () => {
        const { tension, friction, mass } = config
        const displacement = springValue.value - targetValue
        const springForce = -tension * displacement
        const dampingForce = -friction * springValue.velocity
        const acceleration = (springForce + dampingForce) / mass

        springValue.velocity += acceleration * 0.016 // 60fps
        springValue.value += springValue.velocity * 0.016

        springValuesRef.current.set(key, springValue)
        onUpdate?.(springValue.value)

        // 停止条件
        if (Math.abs(displacement) < 0.01 && Math.abs(springValue.velocity) < 0.01) {
          springValue.value = targetValue
          springValue.velocity = 0
          springValuesRef.current.set(key, springValue)
          onUpdate?.(targetValue)
          return
        }

        requestAnimationFrame(animate)
      }

      animate()
    },
    [],
  )

  // パーティクルアニメーション
  useEffect(() => {
    if (particles.length === 0) return

    const animate = () => {
      setParticles((prev) =>
        prev
          .map((particle) => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vx: particle.vx * 0.98, // 空気抵抗
            vy: particle.vy * 0.98 + 0.1, // 重力
            life: particle.life - 1,
          }))
          .filter((particle) => particle.life > 0),
      )

      if (particles.length > 0) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [particles.length])

  // シェイクアニメーション
  const shake = useCallback((element: HTMLElement, intensity = 10, duration = 500) => {
    const originalTransform = element.style.transform
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = elapsed / duration

      if (progress >= 1) {
        element.style.transform = originalTransform
        return
      }

      const amplitude = intensity * (1 - progress)
      const x = (Math.random() - 0.5) * amplitude
      const y = (Math.random() - 0.5) * amplitude

      element.style.transform = `${originalTransform} translate(${x}px, ${y}px)`
      requestAnimationFrame(animate)
    }

    animate()
  }, [])

  // グロー効果
  const createGlow = useCallback((element: HTMLElement, color = "#3b82f6", duration = 300) => {
    element.style.transition = `box-shadow ${duration}ms ease-out`
    element.style.boxShadow = `0 0 20px ${color}80, 0 0 40px ${color}40`

    setTimeout(() => {
      element.style.boxShadow = ""
    }, duration)
  }, [])

  // モーフィングアニメーション
  const morph = useCallback((element: HTMLElement, fromPath: string, toPath: string, duration = 500) => {
    const svg = element.querySelector("svg")
    const path = svg?.querySelector("path")

    if (!path) return

    path.setAttribute("d", fromPath)

    const animation = path.animate([{ d: fromPath }, { d: toPath }], {
      duration,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
      fill: "forwards",
    })

    animation.onfinish = () => {
      path.setAttribute("d", toPath)
    }
  }, [])

  return {
    ripples,
    particles,
    createRipple,
    createParticles,
    animateSpring,
    shake,
    createGlow,
    morph,
  }
}

// カスタムイージング関数
export const easings = {
  easeOutElastic: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  easeOutBack: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  easeOutBounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  easeInOutQuart: "cubic-bezier(0.77, 0, 0.175, 1)",
  easeOutQuart: "cubic-bezier(0.25, 1, 0.5, 1)",
}

// アニメーション用のCSS変数
export const animationVariables = {
  "--ripple-duration": "600ms",
  "--spring-duration": "400ms",
  "--glow-duration": "300ms",
  "--particle-duration": "1000ms",
  "--shake-duration": "500ms",
}
