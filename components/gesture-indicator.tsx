"use client"
import { useState, useEffect } from "react"
import { RotateCcw, Move, ZoomIn, Hand } from "lucide-react"

interface GestureIndicatorProps {
  gestureType: "none" | "pan" | "pinch" | "rotate" | "multi"
  scale: number
  rotation: number
  translation: { x: number; y: number }
  isVisible: boolean
  className?: string
}

export function GestureIndicator({
  gestureType,
  scale,
  rotation,
  translation,
  isVisible,
  className = "",
}: GestureIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (gestureType !== "none") {
      setShowDetails(true)
      const timer = setTimeout(() => setShowDetails(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [gestureType])

  if (!isVisible && gestureType === "none") return null

  const getGestureIcon = () => {
    switch (gestureType) {
      case "pan":
        return <Move className="h-4 w-4" />
      case "pinch":
        return <ZoomIn className="h-4 w-4" />
      case "rotate":
        return <RotateCcw className="h-4 w-4" />
      case "multi":
        return <Hand className="h-4 w-4" />
      default:
        return null
    }
  }

  const getGestureColor = () => {
    switch (gestureType) {
      case "pan":
        return "bg-orange-500/90"
      case "pinch":
        return "bg-green-500/90"
      case "rotate":
        return "bg-purple-500/90"
      case "multi":
        return "bg-blue-500/90"
      default:
        return "bg-gray-500/90"
    }
  }

  const getGestureLabel = () => {
    switch (gestureType) {
      case "pan":
        return "移動"
      case "pinch":
        return "ズーム"
      case "rotate":
        return "回転"
      case "multi":
        return "複合操作"
      default:
        return ""
    }
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      } ${className}`}
    >
      <div
        className={`${getGestureColor()} text-white rounded-full px-4 py-2 shadow-lg backdrop-blur-sm border border-white/20`}
        style={{
          animation: gestureType !== "none" ? "pulse 2s infinite" : "none",
        }}
      >
        <div className="flex items-center gap-2">
          {getGestureIcon()}
          <span className="text-sm font-medium">{getGestureLabel()}</span>
        </div>

        {showDetails && gestureType !== "none" && (
          <div className="mt-2 text-xs space-y-1 border-t border-white/20 pt-2">
            {gestureType === "pinch" || gestureType === "multi" ? (
              <div className="flex justify-between">
                <span>スケール:</span>
                <span>{(scale * 100).toFixed(0)}%</span>
              </div>
            ) : null}

            {gestureType === "rotate" || gestureType === "multi" ? (
              <div className="flex justify-between">
                <span>回転:</span>
                <span>{rotation.toFixed(0)}°</span>
              </div>
            ) : null}

            {gestureType === "pan" || gestureType === "multi" ? (
              <div className="flex justify-between">
                <span>位置:</span>
                <span>
                  {translation.x.toFixed(0)}, {translation.y.toFixed(0)}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ジェスチャーヒント */}
      {gestureType === "none" && (
        <div className="mt-2 text-center">
          <div className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
            2本指でピンチ・回転・移動
          </div>
        </div>
      )}
    </div>
  )
}
