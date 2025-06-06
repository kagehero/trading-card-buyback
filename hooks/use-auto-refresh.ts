"use client"

import { useEffect, useState } from "react"

/**
 * 指定された間隔で自動的に再レンダリングを促すフック
 * Newバッジの自動消去に使用
 */
export function useAutoRefresh(intervalMinutes = 5) {
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const interval = setInterval(
      () => {
        setRefreshKey((prev) => prev + 1)
      },
      intervalMinutes * 60 * 1000,
    ) // 分を秒に変換

    return () => clearInterval(interval)
  }, [intervalMinutes])

  return refreshKey
}
