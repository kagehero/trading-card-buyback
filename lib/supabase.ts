import { createClient } from "@supabase/supabase-js"

// クライアントサイド用のSupabaseクライアント（シングルトンパターン）
let clientSupabaseClient: ReturnType<typeof createClient> | null = null

export const createClientSupabaseClient = () => {
  // ブラウザ環境でのみシングルトンを使用
  if (typeof window !== "undefined" && clientSupabaseClient) {
    return clientSupabaseClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables:", {
      url: !!supabaseUrl,
      key: !!supabaseKey,
    })
    throw new Error("Missing Supabase environment variables")
  }

  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      // 同じストレージキーの競合を避けるため、一意のキーを設定
      storageKey: "sb-auth-token",
      // 自動リフレッシュを有効にして重複インスタンスを防ぐ
      autoRefreshToken: true,
      // セッション永続化を有効にする
      persistSession: true,
      // デバッグモードを無効にして警告を減らす
      debug: false,
    },
  })

  // ブラウザ環境でのみシングルトンとして保存
  if (typeof window !== "undefined") {
    clientSupabaseClient = client
  }

  return client
}

// サーバーサイド用のSupabaseクライアント
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      // サーバーサイドでは異なるストレージキーを使用
      storageKey: "sb-server-auth-token",
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
