"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import type { Session, User } from "@supabase/supabase-js"

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
  sessionExpiry: Date | null
  refreshSession: () => Promise<boolean>
  lastActivity: Date | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// セッション有効期限の警告時間（分）
const SESSION_WARNING_MINUTES = 5
// 自動ログアウト時間（分）
const AUTO_LOGOUT_MINUTES = 30

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpiry, setSessionExpiry] = useState<Date | null>(null)
  const [lastActivity, setLastActivity] = useState<Date | null>(null)

  // タイマーの参照
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const activityTimeout = useRef<NodeJS.Timeout | null>(null)
  const warningShown = useRef(false)

  // アクティビティを更新する関数
  const updateActivity = useCallback(() => {
    setLastActivity(new Date())
    warningShown.current = false

    // 自動ログアウトタイマーをリセット
    if (activityTimeout.current) {
      clearTimeout(activityTimeout.current)
    }

    if (isAuthenticated) {
      activityTimeout.current = setTimeout(
        () => {
          console.log("Auto logout due to inactivity")
          logout()
        },
        AUTO_LOGOUT_MINUTES * 60 * 1000,
      )
    }
  }, [isAuthenticated])

  // セッション情報を更新する関数
  const updateSessionInfo = useCallback(
    (newSession: Session | null) => {
      setSession(newSession)
      setUser(newSession?.user || null)
      setIsAuthenticated(!!newSession)

      if (newSession) {
        // セッション有効期限を設定
        const expiryTime = new Date(newSession.expires_at! * 1000)
        setSessionExpiry(expiryTime)
        updateActivity()
      } else {
        setSessionExpiry(null)
        setLastActivity(null)
      }
    },
    [updateActivity],
  )

  // セッションを手動で更新する関数
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error("Session refresh error:", error)
        return false
      }

      if (data.session) {
        updateSessionInfo(data.session)
        console.log("Session refreshed successfully")
        return true
      }

      return false
    } catch (error) {
      console.error("Unexpected error refreshing session:", error)
      return false
    }
  }, [updateSessionInfo])

  // セッション有効期限をチェックする関数
  const checkSessionExpiry = useCallback(async () => {
    if (!session || !sessionExpiry) return

    const now = new Date()
    const timeUntilExpiry = sessionExpiry.getTime() - now.getTime()
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60))

    // セッション有効期限の警告
    if (minutesUntilExpiry <= SESSION_WARNING_MINUTES && minutesUntilExpiry > 0 && !warningShown.current) {
      warningShown.current = true
      const shouldRefresh = confirm(
        `セッションが${minutesUntilExpiry}分後に期限切れになります。セッションを延長しますか？`,
      )

      if (shouldRefresh) {
        const refreshed = await refreshSession()
        if (!refreshed) {
          alert("セッションの更新に失敗しました。再度ログインしてください。")
          logout()
        }
      }
    }

    // セッションが期限切れの場合
    if (timeUntilExpiry <= 0) {
      console.log("Session expired, logging out")
      alert("セッションが期限切れになりました。再度ログインしてください。")
      logout()
    }
  }, [session, sessionExpiry, refreshSession])

  // ページ読み込み時にログイン状態を確認
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const supabase = createClientSupabaseClient()
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Auth check error:", error)
          updateSessionInfo(null)
        } else {
          updateSessionInfo(session)
        }
      } catch (error) {
        console.error("Unexpected auth check error:", error)
        updateSessionInfo(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthStatus()

    // 認証状態の変更を監視
    const supabase = createClientSupabaseClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, !!session)

      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        updateSessionInfo(session)
      } else if (event === "SIGNED_IN") {
        updateSessionInfo(session)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateSessionInfo])

  // セッション監視タイマーを設定
  useEffect(() => {
    if (isAuthenticated && session) {
      // 1分ごとにセッション有効期限をチェック
      sessionCheckInterval.current = setInterval(checkSessionExpiry, 60 * 1000)

      return () => {
        if (sessionCheckInterval.current) {
          clearInterval(sessionCheckInterval.current)
        }
      }
    }
  }, [isAuthenticated, session, checkSessionExpiry])

  // アクティビティ監視を設定
  useEffect(() => {
    if (isAuthenticated) {
      // マウス移動、キーボード入力、クリックを監視
      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"]

      const handleActivity = () => {
        updateActivity()
      }

      events.forEach((event) => {
        document.addEventListener(event, handleActivity, true)
      })

      // 初期アクティビティを設定
      updateActivity()

      return () => {
        events.forEach((event) => {
          document.removeEventListener(event, handleActivity, true)
        })

        if (activityTimeout.current) {
          clearTimeout(activityTimeout.current)
        }
      }
    }
  }, [isAuthenticated, updateActivity])

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
      if (activityTimeout.current) {
        clearTimeout(activityTimeout.current)
      }
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const supabase = createClientSupabaseClient()

      // Supabaseで認証を試行
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Supabase auth error:", error)
        return false
      }

      if (data.session) {
        // 認証状態を即座に更新
        updateSessionInfo(data.session)
        console.log("Login successful")
        return true
      }

      return false
    } catch (error) {
      console.error("Login error:", error)
      return false
    }
  }

  const logout = async (): Promise<void> => {
    try {
      // タイマーをクリア
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current)
      }
      if (activityTimeout.current) {
        clearTimeout(activityTimeout.current)
      }

      const supabase = createClientSupabaseClient()
      await supabase.auth.signOut()

      // 状態をクリア
      updateSessionInfo(null)
      warningShown.current = false

      console.log("Logout successful")
    } catch (error) {
      console.error("Logout error:", error)
      // エラーが発生してもローカル状態はクリア
      updateSessionInfo(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        session,
        login,
        logout,
        loading,
        sessionExpiry,
        refreshSession,
        lastActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
