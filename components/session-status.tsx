"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, RefreshCw, User, Calendar } from "lucide-react"

export function SessionStatus() {
  const { isAuthenticated, user, session, sessionExpiry, refreshSession, lastActivity } = useAuth()
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>("")
  const [timeSinceActivity, setTimeSinceActivity] = useState<string>("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 時間の差を計算する関数
  const formatTimeDifference = (date: Date): string => {
    const now = new Date()
    const diff = Math.abs(date.getTime() - now.getTime())
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}日${hours % 24}時間`
    if (hours > 0) return `${hours}時間${minutes % 60}分`
    return `${minutes}分`
  }

  // セッション有効期限までの時間を更新
  useEffect(() => {
    if (!sessionExpiry) return

    const updateTimer = () => {
      const now = new Date()
      const diff = sessionExpiry.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeUntilExpiry("期限切れ")
      } else {
        const minutes = Math.floor(diff / (1000 * 60))
        const hours = Math.floor(minutes / 60)

        if (hours > 0) {
          setTimeUntilExpiry(`${hours}時間${minutes % 60}分`)
        } else {
          setTimeUntilExpiry(`${minutes}分`)
        }
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // 1分ごとに更新

    return () => clearInterval(interval)
  }, [sessionExpiry])

  // 最後のアクティビティからの時間を更新
  useEffect(() => {
    if (!lastActivity) return

    const updateActivityTimer = () => {
      setTimeSinceActivity(formatTimeDifference(lastActivity))
    }

    updateActivityTimer()
    const interval = setInterval(updateActivityTimer, 60000) // 1分ごとに更新

    return () => clearInterval(interval)
  }, [lastActivity])

  const handleRefreshSession = async () => {
    setIsRefreshing(true)
    try {
      const success = await refreshSession()
      if (success) {
        alert("セッションが更新されました")
      } else {
        alert("セッションの更新に失敗しました")
      }
    } finally {
      setIsRefreshing(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          セッション状態
        </CardTitle>
        <CardDescription>現在のログインセッション情報</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ユーザー情報 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">ユーザー:</span>
          <Badge variant="secondary">{user?.email}</Badge>
        </div>

        {/* セッション有効期限 */}
        {sessionExpiry && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />
              有効期限:
            </span>
            <Badge variant={timeUntilExpiry === "期限切れ" ? "destructive" : "outline"}>{timeUntilExpiry}</Badge>
          </div>
        )}

        {/* 最後のアクティビティ */}
        {lastActivity && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              最終活動:
            </span>
            <Badge variant="outline">{timeSinceActivity}前</Badge>
          </div>
        )}

        {/* セッション更新ボタン */}
        <Button variant="outline" size="sm" onClick={handleRefreshSession} disabled={isRefreshing} className="w-full">
          {isRefreshing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              更新中...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              セッション更新
            </>
          )}
        </Button>

        {/* セッション詳細情報（開発時のみ） */}
        {process.env.NODE_ENV === "development" && session && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">詳細情報</summary>
            <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
              <div>セッションID: {session.access_token.slice(0, 20)}...</div>
              <div>作成日時: {new Date(session.created_at).toLocaleString("ja-JP")}</div>
              {sessionExpiry && <div>期限: {sessionExpiry.toLocaleString("ja-JP")}</div>}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  )
}
