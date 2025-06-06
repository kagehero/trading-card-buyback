"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { ExternalLink, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Store } from "@/types/store"
import { ImageModal } from "@/components/image-modal"
import { getCardTypeColor } from "@/components/filter-bar"
import { validateImageUrl } from "@/lib/image-utils"
import { isNewOrUpdated } from "@/lib/date-utils"

interface StoreCardProps {
  store: Store
}

export function StoreCard({ store }: StoreCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageLoadStates, setImageLoadStates] = useState<{ [key: number]: "loading" | "loaded" | "error" }>({})

  const cardRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // カードタイプの色を取得
  const cardTypeColors = getCardTypeColor(store.cardType)

  // 表示する画像のリスト - シンプルな検証
  const displayImages = useMemo(() => {
    let finalImages: string[] = []

    // 複数画像がある場合
    if (store.imageUrls && Array.isArray(store.imageUrls) && store.imageUrls.length > 0) {
      const validUrls = store.imageUrls.filter((url) => validateImageUrl(url))
      if (validUrls.length > 0) {
        finalImages = validUrls
      }
    }

    // フォールバック: メイン画像
    if (finalImages.length === 0 && validateImageUrl(store.imageUrl)) {
      finalImages = [store.imageUrl]
    }

    // 最終フォールバック: プレースホルダー
    if (finalImages.length === 0) {
      finalImages = ["/placeholder.svg?height=400&width=600"]
    }

    return finalImages
  }, [store.imageUrls, store.imageUrl])

  // 画像の読み込み状態を初期化
  useEffect(() => {
    const initialStates: { [key: number]: "loading" | "loaded" | "error" } = {}
    displayImages.forEach((_, index) => {
      initialStates[index] = "loading"
    })
    setImageLoadStates(initialStates)

    // 画像リストが変更されたら、インデックスをリセット
    setCurrentImageIndex(0)
  }, [displayImages])

  // 現在の画像URL
  const currentImageUrl = useMemo(() => {
    if (displayImages.length === 0) return "/placeholder.svg?height=400&width=600"

    // インデックスが範囲外の場合は0に修正
    const safeIndex = currentImageIndex >= 0 && currentImageIndex < displayImages.length ? currentImageIndex : 0

    return displayImages[safeIndex] || "/placeholder.svg?height=400&width=600"
  }, [displayImages, currentImageIndex])

  // 前の画像に移動
  const navigateToPrevious = useCallback(() => {
    if (displayImages.length <= 1) return

    setCurrentImageIndex((prevIndex) => {
      if (prevIndex <= 0) return displayImages.length - 1
      return prevIndex - 1
    })
  }, [displayImages.length])

  // 次の画像に移動
  const navigateToNext = useCallback(() => {
    if (displayImages.length <= 1) return

    setCurrentImageIndex((prevIndex) => {
      if (prevIndex >= displayImages.length - 1) return 0
      return prevIndex + 1
    })
  }, [displayImages.length])

  // 特定のインデックスに移動
  const navigateToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < displayImages.length) {
        setCurrentImageIndex(index)
      }
    },
    [displayImages.length],
  )

  // モーダルを開く
  const handleImageClick = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  // 画像エラーハンドリング
  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    // 読み込み状態を更新
    setImageLoadStates((prev) => ({ ...prev, [index]: "error" }))

    // プレースホルダーに置き換え
    e.currentTarget.src = "/placeholder.svg?height=400&width=600"
  }, [])

  // 画像読み込み成功ハンドリング
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    // 読み込み状態を更新
    setImageLoadStates((prev) => ({ ...prev, [index]: "loaded" }))
  }, [])

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return // モーダルが開いている場合は無視

      if (e.key === "ArrowLeft") {
        navigateToPrevious()
      } else if (e.key === "ArrowRight") {
        navigateToNext()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen, navigateToNext, navigateToPrevious])

  return (
    <>
      <div ref={cardRef} className="border rounded-lg overflow-hidden h-full flex flex-col relative">
        {/* ヘッダー部分 */}
        <div className="p-1.5 sm:p-4 flex-shrink-0">
          <h2 className="text-sm sm:text-2xl font-bold line-clamp-1">{store.name}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{store.location}</p>
          <div className="flex items-center gap-2 mt-1" style={{display : "flex",justifyContent: "space-between"}}>
           <div className="flex gap-4">
           <Badge
              className={`${cardTypeColors.badgeBg} ${cardTypeColors.badgeText} text-xs px-1.5 py-0.5 font-medium`}
            >
              {store.cardType}
            </Badge>

            {/* Newバッジを追加 */}
            {isNewOrUpdated(store.createdAt, store.updatedAt) && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 font-medium animate-pulse">NEW</Badge>
            )}
            </div>
            {isNewOrUpdated(store.createdAt, store.updatedAt) && store.is_hot && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 font-medium animate-pulse">HOT</Badge>
            )}
          </div>
        </div>

        {/* 画像部分 - 適切なサイズで最大限表示 */}
        <div
          ref={imageContainerRef}
          className="relative group bg-white-100 flex-shrink-0 overflow-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400"
          style={{
            width: "100%",
            height: "100%", 
          }}
        >
          {/* 画像表示エリア - 最大限表示 */}
          <div className="flex items-center justify-center bg-white p-2">
            <img
              key={currentImageIndex}
              src={currentImageUrl || "/placeholder.svg"}
              alt={`${store.name}の買取表 ${currentImageIndex + 1}`}
              className="cursor-pointer shadow-sm p-2"
              onClick={handleImageClick}
              style={{
                width: "50%",
                height: "50%",
                objectFit: "contain",
                maxWidth: "100%",
                maxHeight: "100%",
              }}
              onError={(e) => handleImageError(e, currentImageIndex)}
              onLoad={(e) => handleImageLoad(e, currentImageIndex)}
            />

            {/* 読み込み状態インジケーター */}
            {imageLoadStates[currentImageIndex] === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="text-sm text-gray-500">読み込み中...</div>
              </div>
            )}

            {/* エラー状態インジケーター */}
            {imageLoadStates[currentImageIndex] === "error" && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                <div className="text-sm text-red-500">画像の読み込みに失敗しました</div>
              </div>
            )}
          </div>

          {/* ズームアイコン */}
          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity z-30">
            <div className="bg-black/50 text-white rounded-full p-1 sm:p-2" onClick={handleImageClick}>
              <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </div>

          {/* ナビゲーションボタン - モバイルとデスクトップ共通 */}
          {displayImages.length > 1 && (
            <>
              {/* 左ボタン */}
              <button
                className="absolute left-1 sm:left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-1 sm:p-2 z-30 hover:bg-black/70 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigateToPrevious()
                }}
                aria-label="前の画像"
              >
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>

              {/* 右ボタン */}
              <button
                className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-1 sm:p-2 z-30 hover:bg-black/70 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  navigateToNext()
                }}
                aria-label="次の画像"
              >
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>

              {/* 画像インジケーター */}
              <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-30">
                {displayImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigateToIndex(index)
                    }}
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-200 ${
                      index === currentImageIndex ? "bg-white scale-125 shadow-lg" : "bg-white/50 hover:bg-white/75"
                    }`}
                    aria-label={`画像 ${index + 1} に移動`}
                  />
                ))}
              </div>
            </>
          )}

          {store.isOutdated && (
            <div className="absolute top-1 sm:top-2 left-1 sm:left-2 z-30">
              <div className="bg-red-500 text-white p-0.5 sm:p-1 rounded-full animate-pulse">
                <X className="h-3 w-3 sm:h-5 sm:w-5" />
              </div>
            </div>
          )}
        </div>

        {/* フッター部分 */}
        <div className="p-1.5 sm:p-4 flex items-center justify-between flex-shrink-0 mt-auto">
          <div className="flex items-center gap-2">
            <div className="text-xs sm:text-sm text-muted-foreground">{store.date}</div>
            {displayImages.length > 1 && (
              <Badge variant="outline" className="text-xs">
                {currentImageIndex + 1}/{displayImages.length}枚
              </Badge>
            )}
          </div>

          {store.detailUrl && (
            <a
              href={store.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-all duration-200 hover:scale-110"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
            </a>
          )}
        </div>
      </div>

      {/* 画像モーダル */}
      <ImageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        store={store}
        initialImageIndex={currentImageIndex}
      />
    </>
  )
}
