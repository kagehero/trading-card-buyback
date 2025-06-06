"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Box } from "@/types/box"
import { createClientSupabaseClient } from "@/lib/supabase"

interface BoxContextType {
  boxes: Box[]
  loading: boolean
  error: string | null
  addBox: (box: Omit<Box, "id" | "order">) => Promise<void>
  updateBox: (id: string, box: Partial<Box>) => Promise<void>
  deleteBox: (id: string) => Promise<void>
  moveBoxUp: (id: string) => Promise<void>
  moveBoxDown: (id: string) => Promise<void>
  reorderBoxes: (newOrder: Box[]) => Promise<void>
}

const BoxContext = createContext<BoxContextType | undefined>(undefined)

// UUIDを生成する簡単な関数
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c == "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function BoxProvider({ children }: { children: React.ReactNode }) {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Supabaseからデータを読み込み
  useEffect(() => {
    const fetchBoxes = async () => {
      try {
        setLoading(true)
        const supabase = createClientSupabaseClient()

        const { data, error } = await supabase.from("boxes").select("*").order("display_order", { ascending: true })

        if (error) {
          if (error.code === "PGRST116" || error.message.includes("does not exist")) {
            console.warn("Boxes table does not exist yet. Using empty array.")
            setBoxes([])
            setLoading(false)
            return
          }
          throw error
        }

        const formattedBoxes = data.map((box) => ({
          id: box.id,
          name: box.name,
          location: box.location,
          cardType: box.card_type,
          imageUrl: box.image_url || "/placeholder.svg?height=400&width=600",
          imageUrls: Array.isArray(box.image_urls) ? box.image_urls.filter((url) => url && url.trim() !== "") : [],
          date: new Date(box.date)
            .toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            .replace(/\//g, "."),
          order: box.display_order,
          detailUrl: box.detail_url,
          description: box.description,
          keywords: box.keywords,
          storeName: box.store_name || "",
          createdAt : box.created_at,
          updatedAt : box.updated_at,
          is_hot : box.is_hot
        }))

        setBoxes(formattedBoxes)
      } catch (err) {
        console.error("Error fetching boxes:", err)
        setError("BOX買取表データの取得に失敗しました")
        setBoxes([])
      } finally {
        setLoading(false)
      }
    }

    fetchBoxes()

    const supabase = createClientSupabaseClient()
    const subscription = supabase
      .channel("boxes_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "boxes" }, () => {
        fetchBoxes()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const addBox = async (boxData: Omit<Box, "id" | "order">) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      const { data: maxOrderData, error: orderError } = await supabase
        .from("boxes")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)

      if (orderError) {
        console.error("Error getting max order:", orderError)
        throw new Error(`Failed to get max order: ${orderError.message}`)
      }

      const maxOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order : -1
      const newOrder = maxOrder + 1

      // 日付の形式を変換（YYYY.MM.DD → YYYY-MM-DD）
      let dateStr = new Date().toISOString().split("T")[0] // デフォルト値として今日の日付
      if (boxData.date) {
        // 日付が "YYYY.MM.DD" 形式の場合、"-" に変換
        if (boxData.date.includes(".")) {
          dateStr = boxData.date.replace(/\./g, "-")
        } else {
          dateStr = boxData.date
        }
      }

      const insertData = {
        id: generateUUID(),
        name: boxData.name,
        location: boxData.location,
        card_type: boxData.cardType,
        image_url: boxData.imageUrl,
        image_urls: boxData.imageUrls || [],
        date: dateStr,
        display_order: newOrder,
        detail_url: boxData.detailUrl || null,
        description: boxData.description || null,
        keywords: boxData.keywords || null,
        store_name: boxData.storeName,
        is_hot : boxData.is_hot
      }

      console.log("Inserting box data:", insertData)

      const { error: insertError } = await supabase.from("boxes").insert(insertData)

      if (insertError) {
        console.error("Error inserting box:", insertError)
        throw new Error(`Failed to insert box: ${insertError.message}`)
      }

      const { data, error: fetchError } = await supabase
        .from("boxes")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        console.error("Error fetching boxes after insert:", fetchError)
        throw new Error(`Failed to fetch boxes after insert: ${fetchError.message}`)
      }

      const formattedBoxes = data.map((box) => ({
        id: box.id,
        name: box.name,
        location: box.location,
        cardType: box.card_type,
        imageUrl: box.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: box.image_urls || [],
        date: new Date(box.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "."),
        order: box.display_order,
        detailUrl: box.detail_url,
        description: box.description,
        keywords: box.keywords,
        storeName: box.store_name || "",
        is_hot : box.is_hot
      }))

      setBoxes(formattedBoxes)
    } catch (err) {
      console.error("Error adding box:", err)
      setError(err instanceof Error ? `BOX買取表の追加に失敗しました: ${err.message}` : "BOX買取表の追加に失敗しました")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateBox = async (id: string, boxData: Partial<Box>) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      const updateData: any = {}

      if (boxData.name !== undefined) updateData.name = boxData.name
      if (boxData.location !== undefined) updateData.location = boxData.location
      if (boxData.cardType !== undefined) updateData.card_type = boxData.cardType
      if (boxData.imageUrl !== undefined) updateData.image_url = boxData.imageUrl
      if (boxData.imageUrls !== undefined) updateData.image_urls = boxData.imageUrls
      if (boxData.date !== undefined) {
        // 日付の形式を変換（YYYY.MM.DD → YYYY-MM-DD）
        updateData.date = boxData.date.replace(/\./g, "-")
      }
      if (boxData.order !== undefined) updateData.display_order = boxData.order
      if (boxData.detailUrl !== undefined) updateData.detail_url = boxData.detailUrl
      if (boxData.description !== undefined) updateData.description = boxData.description
      if (boxData.keywords !== undefined) updateData.keywords = boxData.keywords
      if (boxData.storeName !== undefined) updateData.store_name = boxData.storeName

      // 更新日時を設定
      updateData.updated_at = new Date().toISOString()

      const { error } = await supabase.from("boxes").update(updateData).eq("id", id)

      if (error) {
        console.error("Error updating box:", error)
        throw new Error(`Failed to update box: ${error.message}`)
      }

      const { data, error: fetchError } = await supabase
        .from("boxes")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        console.error("Error fetching boxes after update:", fetchError)
        throw new Error(`Failed to fetch boxes after update: ${fetchError.message}`)
      }

      const formattedBoxes = data.map((box) => ({
        id: box.id,
        name: box.name,
        location: box.location,
        cardType: box.card_type,
        imageUrl: box.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: box.image_urls || [],
        date: new Date(box.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "."),
        order: box.display_order,
        detailUrl: box.detail_url,
        description: box.description,
        keywords: box.keywords,
        storeName: box.store_name || "",
        is_hot : box.is_hot
      }))

      setBoxes(formattedBoxes)
    } catch (err) {
      console.error("Error updating box:", err)
      setError(err instanceof Error ? `BOX買取表の更新に失敗しました: ${err.message}` : "BOX買取表の更新に失敗しました")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteBox = async (id: string) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      const { error } = await supabase.from("boxes").delete().eq("id", id)

      if (error) {
        console.error("Error deleting box:", error)
        throw new Error(`Failed to delete box: ${error.message}`)
      }

      const { data, error: fetchError } = await supabase
        .from("boxes")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        console.error("Error fetching boxes after delete:", fetchError)
        throw new Error(`Failed to fetch boxes after delete: ${fetchError.message}`)
      }

      const formattedBoxes = data.map((box) => ({
        id: box.id,
        name: box.name,
        location: box.location,
        cardType: box.card_type,
        imageUrl: box.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: box.image_urls || [],
        date: new Date(box.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "."),
        order: box.display_order,
        detailUrl: box.detail_url,
        description: box.description,
        keywords: box.keywords,
        storeName: box.store_name || "",
        is_hot : box.is_hot
      }))

      setBoxes(formattedBoxes)
    } catch (err) {
      console.error("Error deleting box:", err)
      setError(err instanceof Error ? `BOX買取表の削除に失敗しました: ${err.message}` : "BOX買取表の削除に失敗しました")
      throw err
    } finally {
      setLoading(false)
    }
  }

  const moveBoxUp = async (id: string) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      const currentBox = boxes.find((box) => box.id === id)
      if (!currentBox) {
        throw new Error("Box not found")
      }

      const sortedBoxes = [...boxes].sort((a, b) => a.order - b.order)
      const currentIndex = sortedBoxes.findIndex((box) => box.id === id)

      if (currentIndex <= 0) {
        setLoading(false)
        return
      }

      const prevBox = sortedBoxes[currentIndex - 1]
      const tempOrder = -1

      const { error: error1 } = await supabase
        .from("boxes")
        .update({ display_order: tempOrder })
        .eq("id", currentBox.id)

      if (error1) {
        console.error("Error updating box order (step 1):", error1)
        throw new Error(`Failed to update box order: ${error1.message}`)
      }

      const { error: error2 } = await supabase
        .from("boxes")
        .update({ display_order: currentBox.order })
        .eq("id", prevBox.id)

      if (error2) {
        console.error("Error updating box order (step 2):", error2)
        throw new Error(`Failed to update box order: ${error2.message}`)
      }

      const { error: error3 } = await supabase
        .from("boxes")
        .update({ display_order: prevBox.order })
        .eq("id", currentBox.id)

      if (error3) {
        console.error("Error updating box order (step 3):", error3)
        throw new Error(`Failed to update box order: ${error3.message}`)
      }

      const { data, error: fetchError } = await supabase
        .from("boxes")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        console.error("Error fetching boxes after reorder:", fetchError)
        throw new Error(`Failed to fetch boxes after reorder: ${fetchError.message}`)
      }

      const formattedBoxes = data.map((box) => ({
        id: box.id,
        name: box.name,
        location: box.location,
        cardType: box.card_type,
        imageUrl: box.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: box.image_urls || [],
        date: new Date(box.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "."),
        order: box.display_order,
        detailUrl: box.detail_url,
        description: box.description,
        keywords: box.keywords,
        storeName: box.store_name || "",
        is_hot : box.is_hot
      }))

      setBoxes(formattedBoxes)
    } catch (err) {
      console.error("Error moving box up:", err)
      setError(
        err instanceof Error
          ? `BOX買取表の順序変更に失敗しました: ${err.message}`
          : "BOX買取表の順序変更に失敗しました",
      )
      throw err
    } finally {
      setLoading(false)
    }
  }

  const moveBoxDown = async (id: string) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      const currentBox = boxes.find((box) => box.id === id)
      if (!currentBox) {
        throw new Error("Box not found")
      }

      const sortedBoxes = [...boxes].sort((a, b) => a.order - b.order)
      const currentIndex = sortedBoxes.findIndex((box) => box.id === id)

      if (currentIndex >= sortedBoxes.length - 1) {
        setLoading(false)
        return
      }

      const nextBox = sortedBoxes[currentIndex + 1]
      const tempOrder = -1

      const { error: error1 } = await supabase
        .from("boxes")
        .update({ display_order: tempOrder })
        .eq("id", currentBox.id)

      if (error1) {
        console.error("Error updating box order (step 1):", error1)
        throw new Error(`Failed to update box order: ${error1.message}`)
      }

      const { error: error2 } = await supabase
        .from("boxes")
        .update({ display_order: currentBox.order })
        .eq("id", nextBox.id)

      if (error2) {
        console.error("Error updating box order (step 2):", error2)
        throw new Error(`Failed to update box order: ${error2.message}`)
      }

      const { error: error3 } = await supabase
        .from("boxes")
        .update({ display_order: nextBox.order })
        .eq("id", currentBox.id)

      if (error3) {
        console.error("Error updating box order (step 3):", error3)
        throw new Error(`Failed to update box order: ${error3.message}`)
      }

      const { data, error: fetchError } = await supabase
        .from("boxes")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        console.error("Error fetching boxes after reorder:", fetchError)
        throw new Error(`Failed to fetch boxes after reorder: ${fetchError.message}`)
      }

      const formattedBoxes = data.map((box) => ({
        id: box.id,
        name: box.name,
        location: box.location,
        cardType: box.card_type,
        imageUrl: box.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: box.image_urls || [],
        date: new Date(box.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "."),
        order: box.display_order,
        detailUrl: box.detail_url,
        description: box.description,
        keywords: box.keywords,
        storeName: box.store_name || "",
      }))

      setBoxes(formattedBoxes)
    } catch (err) {
      console.error("Error moving box down:", err)
      setError(
        err instanceof Error
          ? `BOX買取表の順序変更に失敗しました: ${err.message}`
          : "BOX買取表の順序変更に失敗しました",
      )
      throw err
    } finally {
      setLoading(false)
    }
  }

  const reorderBoxes = async (newOrder: Box[]) => {
    try {
      setLoading(true)
      const supabase = createClientSupabaseClient()

      const updatePromises = newOrder.map((box, index) => {
        return supabase.from("boxes").update({ display_order: index }).eq("id", box.id)
      })

      const results = await Promise.all(updatePromises)

      const errors = results.filter((result) => result.error)
      if (errors.length > 0) {
        console.error("Error updating box orders:", errors)
        throw new Error(`Failed to update ${errors.length} boxes: ${errors[0].error?.message}`)
      }

      const { data, error: fetchError } = await supabase
        .from("boxes")
        .select("*")
        .order("display_order", { ascending: true })

      if (fetchError) {
        console.error("Error fetching boxes after reorder:", fetchError)
        throw new Error(`Failed to fetch boxes after reorder: ${fetchError.message}`)
      }

      const formattedBoxes = data.map((box) => ({
        id: box.id,
        name: box.name,
        location: box.location,
        cardType: box.card_type,
        imageUrl: box.image_url || "/placeholder.svg?height=400&width=600",
        imageUrls: box.image_urls || [],
        date: new Date(box.date)
          .toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          })
          .replace(/\//g, "."),
        order: box.display_order,
        detailUrl: box.detail_url,
        description: box.description,
        keywords: box.keywords,
        storeName: box.store_name || "",
        is_hot : box.is_hot
      }))

      setBoxes(formattedBoxes)
    } catch (err) {
      console.error("Error reordering boxes:", err)
      setError(
        err instanceof Error
          ? `BOX買取表の順序変更に失敗しました: ${err.message}`
          : "BOX買取表の順序変更に失敗しました",
      )
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <BoxContext.Provider
      value={{
        boxes,
        loading,
        error,
        addBox,
        updateBox,
        deleteBox,
        moveBoxUp,
        moveBoxDown,
        reorderBoxes,
      }}
    >
      {children}
    </BoxContext.Provider>
  )
}

export function useBoxes() {
  const context = useContext(BoxContext)
  if (context === undefined) {
    throw new Error("useBoxes must be used within a BoxProvider")
  }
  return context
}
