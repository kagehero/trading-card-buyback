"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Store } from "@/types/store"
import { createClientSupabaseClient } from "@/lib/supabase"

interface StoreContextType {
  stores: Store[]
  loading: boolean
  error: string | null
  addStore: (store: Omit<Store, "id" | "order">) => Promise<void>
  updateStore: (id: string, store: Partial<Store>) => Promise<void>
  deleteStore: (id: string) => Promise<void>
  moveStoreUp: (id: string) => Promise<void>
  moveStoreDown: (id: string) => Promise<void>
  reorderStores: (newOrder: Store[]) => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

// UUIDを生成する簡単な関数
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Supabaseからデータを読み込み
  useEffect(() => {
    const fetchStores = async () => {
      try {
        setLoading(true)
        const supabase = createClientSupabaseClient()

        // まずテーブルが存在するか確認
        const { data, error } = await supabase.from("stores").select("*").order("display_order", { ascending: true })

        if (error) {
          // テーブルが存在しない場合は空の配列を設定
          if (error.code === "PGRST116" || error.message.includes("does not exist")) {
            console.warn("Stores table does not exist yet. Using empty array.")
            setStores([])
            setLoading(false)
            return
          }
          throw error
        }

        // データベースのカラム名をフロントエンドの命名規則に変換
        const formattedStores = data.map((store) => ({
          id: store.id,
          name: store.name,
          location: store.location,
          cardType: store.card_type,
          imageUrl: store.image_url || "/placeholder.svg?height=400&width=600",
          imageUrls: Array.isArray(store.image_urls) ? store.image_urls.filter((url) => url && url.trim() !== "") : [], // 空文字列をフィルタリング
          date: new Date(store.date)
            .toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\//g, "."),
          order: store.display_order,
          isOutdated: store.is_outdated || false,
          detailUrl: store.detail_url,
          description: store.description,
          cardNames: store.card_names,
          keywords: store.keywords,
          createdAt: store.created_at, // 追加
          updatedAt: store.updated_at, // 追加
          is_hot : store.is_hot,
        }))

        setStores(formattedStores)
      } catch (err) {
        console.error("Error fetching stores:", err)
        setError("買取表データの取得に失敗しました")
        // エラーが発生しても空の配列を設定して、アプリケーションが動作するようにする
        setStores([])
      } finally {
        setLoading(false)
      }
    }

    fetchStores()

    // リアルタイム更新のサブスクリプション設定
    const supabase = createClientSupabaseClient()
    const subscription = supabase
      .channel("stores_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => {
        fetchStores()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const addStore = async (storeData: Omit<Store, "id" | "order">) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      // 最大の表示順序を取得
      const { data: maxOrderData } = await supabase
        .from("stores")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)

      const maxOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order : -1
      const newOrder = maxOrder + 1

      // 日付文字列をISO形式に変換
      const dateStr = storeData.date.replace(/\./g, "-")

      // フロントエンドの命名規則からデータベースのカラム名に変換
      const { error } = await supabase.from("stores").insert({
        id: generateUUID(),
        name: storeData.name,
        location: storeData.location,
        card_type: storeData.cardType,
        image_url: storeData.imageUrl,
        image_urls: storeData.imageUrls, // 複数画像のURLを保存
        date: dateStr,
        display_order: newOrder,
        is_outdated: storeData.isOutdated,
        detail_url: storeData.detailUrl,
        description: storeData.description,
        card_names: storeData.cardNames,
        keywords: storeData.keywords,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_hot : storeData.is_hot,
      })

      if (error) {
        throw error
      }

      // 成功したら最新データを取得
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // データベースのカラム名をフロントエンドの命名規則に変換
      const formattedStores = data.map((store) => ({
        id: store.id,
        name: store.name,
        location: store.location,
        cardType: store.card_type,
        imageUrl: store.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: store.image_urls || [], // 複数画像のURLを取得
        date: new Date(store.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
          })
          .replace(/\//g, "."),
        order: store.display_order,
        isOutdated: store.is_outdated || false,
        detailUrl: store.detailUrl,
        description: store.description,
        cardNames: store.card_names,
        keywords: store.keywords,
        createdAt: store.created_at, // 追加
        updatedAt: store.updated_at, // 追加
        is_hot : store.is_hot
      }))

      setStores(formattedStores)
    } catch (err) {
      console.error("Error adding store:", err)
      setError("買取表の追加に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const updateStore = async (id: string, storeData: Partial<Store>) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      // フロントエンドの命名規則からデータベースのカラム名に変換
      const updateData: any = {}

      if (storeData.name !== undefined) updateData.name = storeData.name
      if (storeData.location !== undefined) updateData.location = storeData.location
      if (storeData.cardType !== undefined) updateData.card_type = storeData.cardType
      if (storeData.imageUrl !== undefined) updateData.image_url = storeData.imageUrl
      if (storeData.imageUrls !== undefined) updateData.image_urls = storeData.imageUrls // 複数画像のURL
      if (storeData.date !== undefined) {
        updateData.date = storeData.date.replace(/\./g, "-")
      }
      if (storeData.order !== undefined) updateData.display_order = storeData.order
      if (storeData.isOutdated !== undefined) updateData.is_outdated = storeData.isOutdated
      if (storeData.detailUrl !== undefined) updateData.detail_url = storeData.detailUrl
      if (storeData.description !== undefined) updateData.description = storeData.description
      if (storeData.cardNames !== undefined) updateData.card_names = storeData.cardNames
      if (storeData.keywords !== undefined) updateData.keywords = storeData.keywords

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString()
      }

      const { error } = await supabase.from("stores").update(updateData).eq("id", id)

      if (error) {
        throw error
      }

      // 成功したら最新データを取得
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // データベースのカラム名をフロントエンドの命名規則に変換
      const formattedStores = data.map((store) => ({
        id: store.id,
        name: store.name,
        location: store.location,
        cardType: store.card_type,
        imageUrl: store.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: store.image_urls || [], // 複数画像のURLを取得
        date: new Date(store.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
          })
          .replace(/\//g, "."),
        order: store.display_order,
        isOutdated: store.is_outdated || false,
        detailUrl: store.detailUrl,
        description: store.description,
        cardNames: store.card_names,
        keywords: store.keywords,
        createdAt: store.created_at, // 追加
        updatedAt: store.updated_at, // 追加
      }))

      setStores(formattedStores)
    } catch (err) {
      console.error("Error updating store:", err)
      setError("買取表の更新に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const deleteStore = async (id: string) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      const { error } = await supabase.from("stores").delete().eq("id", id)

      if (error) {
        throw error
      }

      // 成功したら最新データを取得
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // データベースのカラム名をフロントエンドの命名規則に変換
      const formattedStores = data.map((store) => ({
        id: store.id,
        name: store.name,
        location: store.location,
        cardType: store.card_type,
        imageUrl: store.image_url || "/placeholder.svg?height=400&width=600",
        date: new Date(store.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
          })
          .replace(/\//g, "."),
        order: store.display_order,
        isOutdated: store.is_outdated || false,
        detailUrl: store.detail_url,
        description: store.description,
        cardNames: store.card_names,
        keywords: store.keywords,
        createdAt: store.created_at, // 追加
        updatedAt: store.updated_at, // 追加
        is_hot : store.is_hot,
      }))

      setStores(formattedStores)
    } catch (err) {
      console.error("Error deleting store:", err)
      setError("買取表の削除に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const moveStoreUp = async (id: string) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      // 現在の店舗を取得
      const currentStore = stores.find((store) => store.id === id)
      if (!currentStore) {
        throw new Error("Store not found")
      }

      // 一つ上の店舗を取得
      const sortedStores = [...stores].sort((a, b) => a.order - b.order)
      const currentIndex = sortedStores.findIndex((store) => store.id === id)

      if (currentIndex <= 0) {
        // すでに一番上なら何もしない
        setLoading(false)
        return
      }

      const prevStore = sortedStores[currentIndex - 1]

      // トランザクションを使用して順序を入れ替え
      // 一時的な値に更新して競合を避ける
      const tempOrder = -1

      // 現在の店舗を一時的な値に更新
      const { error: error1 } = await supabase
        .from("stores")
        .update({ display_order: tempOrder })
        .eq("id", currentStore.id)

      if (error1) {
        throw error1
      }

      // 前の店舗を現在の店舗の位置に更新
      const { error: error2 } = await supabase
        .from("stores")
        .update({ display_order: currentStore.order })
        .eq("id", prevStore.id)

      if (error2) {
        throw error2
      }

      // 現在の店舗を前の店舗の位置に更新
      const { error: error3 } = await supabase
        .from("stores")
        .update({ display_order: prevStore.order })
        .eq("id", currentStore.id)

      if (error3) {
        throw error3
      }

      // 成功したら最新データを取得
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // データベースのカラム名をフロントエンドの命名規則に変換
      const formattedStores = data.map((store) => ({
        id: store.id,
        name: store.name,
        location: store.location,
        cardType: store.card_type,
        imageUrl: store.image_url || "/placeholder.svg?height=400&width=600",
        date: new Date(store.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
          })
          .replace(/\//g, "."),
        order: store.display_order,
        isOutdated: store.is_outdated || false,
        detailUrl: store.detail_url,
        description: store.description,
        cardNames: store.card_names,
        keywords: store.keywords,
        createdAt: store.created_at, // 追加
        updatedAt: store.updated_at, // 追加
        is_hot : store.is_hot,
      }))

      setStores(formattedStores)
    } catch (err) {
      console.error("Error moving store up:", err)
      setError("買取表の順序変更に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const moveStoreDown = async (id: string) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      // 現在の店舗を取得
      const currentStore = stores.find((store) => store.id === id)
      if (!currentStore) {
        throw new Error("Store not found")
      }

      // 一つ下の店舗を取得
      const sortedStores = [...stores].sort((a, b) => a.order - b.order)
      const currentIndex = sortedStores.findIndex((store) => store.id === id)

      if (currentIndex >= sortedStores.length - 1) {
        // すでに一番下なら何もしない
        setLoading(false)
        return
      }

      const nextStore = sortedStores[currentIndex + 1]

      // トランザクションを使用して順序を入れ替え
      // 一時的な値に更新して競合を避ける
      const tempOrder = -1

      // 現在の店舗を一時的な値に更新
      const { error: error1 } = await supabase
        .from("stores")
        .update({ display_order: tempOrder })
        .eq("id", currentStore.id)

      if (error1) {
        throw error1
      }

      // 次の店舗を現在の店舗の位置に更新
      const { error: error2 } = await supabase
        .from("stores")
        .update({ display_order: currentStore.order })
        .eq("id", nextStore.id)

      if (error2) {
        throw error2
      }

      // 現在の店舗を次の店舗の位置に更新
      const { error: error3 } = await supabase
        .from("stores")
        .update({ display_order: nextStore.order })
        .eq("id", currentStore.id)

      if (error3) {
        throw error3
      }

      // 成功したら最新データを取得
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // データベースのカラム名をフロントエンドの命名規則に変換
      const formattedStores = data.map((store) => ({
        id: store.id,
        name: store.name,
        location: store.location,
        cardType: store.card_type,
        imageUrl: store.image_url || "/placeholder.svg?height=400&width=600",
        date: new Date(store.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
          })
          .replace(/\//g, "."),
        order: store.display_order,
        isOutdated: store.is_outdated || false,
        detailUrl: store.detail_url,
        description: store.description,
        cardNames: store.card_names,
        keywords: store.keywords,
        createdAt: store.created_at, // 追加
        updatedAt: store.updated_at, // 追加
      }))

      setStores(formattedStores)
    } catch (err) {
      console.error("Error moving store down:", err)
      setError("買取表の順序変更に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  const reorderStores = async (newOrder: Store[]) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      // バッチ更新のためのプロミス配列
      const updatePromises = newOrder.map((store, index) => {
        return supabase.from("stores").update({ display_order: index }).eq("id", store.id)
      })

      // すべての更新を並行して実行
      const results = await Promise.all(updatePromises)

      // エラーチェック
      const errors = results.filter((result) => result.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} stores: ${errors[0].error?.message}`)
      }

      // 成功したら最新データを取得
      const { data, error: fetchError } = await supabase
        .from("stores")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      // データベースのカラム名をフロントエンドの命名規則に変換
      const formattedStores = data.map((store) => ({
        id: store.id,
        name: store.name,
        location: store.location,
        cardType: store.card_type,
        imageUrl: store.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: store.image_urls || [], // 複数画像のURLを取得
        date: new Date(store.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
          })
          .replace(/\//g, "."),
        order: store.display_order,
        isOutdated: store.is_outdated || false,
        detailUrl: store.detailUrl,
        description: store.description,
        cardNames: store.card_names,
        keywords: store.keywords,
        createdAt: store.created_at, // 追加
        updatedAt: store.updated_at, // 追加
        is_hot : store.is_hot
      }))

      setStores(formattedStores)
    } catch (err) {
      console.error("Error reordering stores:", err)
      setError("買取表の順序変更に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <StoreContext.Provider
      value={{
        stores,
        loading,
        error,
        addStore,
        updateStore,
        deleteStore,
        moveStoreUp,
        moveStoreDown,
        reorderStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStores() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error("useStores must be used within a StoreProvider")
  }
  return context
}
