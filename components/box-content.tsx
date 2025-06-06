"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { BoxCard } from "@/components/box-card"
import { FilterBar } from "@/components/filter-bar"
import { FilterStatus } from "@/components/filter-status"
import { SearchBar } from "@/components/search-bar"
import { AnimatedButton } from "@/components/animated-button"
import { Pagination } from "@/components/pagination"
import { useBoxes } from "@/contexts/box-context"
import { Loader2, ChevronUp, Package } from "lucide-react"
import { useAnimationEffects } from "@/hooks/use-animation-effects"

const ITEMS_PER_PAGE = 20

export function BoxContent() {
  const { boxes, loading, error } = useBoxes()
  const [filters, setFilters] = useState({
    title: null as string | null,
    region: null as string | null,
    date: "新しい順" as string | null, // デフォルトで新しい順を設定
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const mainRef = useRef<HTMLElement>(null)

  const { createParticles, particles } = useAnimationEffects()

  // ハプティックフィードバック
  const triggerHapticFeedback = useCallback((intensity: "light" | "medium" | "heavy" = "light") => {
    if ("vibrate" in navigator) {
      const patterns = {
        light: 30,
        medium: 50,
        heavy: 100,
      }
      navigator.vibrate(patterns[intensity])
    }
  }, [])

  // スクロール監視
  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    setShowScrollTop(scrollTop > 300)
  }, [])

  // スクロールイベントリスナー
  useEffect(() => {
    let ticking = false

    const optimizedHandleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener("scroll", optimizedHandleScroll, { passive: true })
    return () => window.removeEventListener("scroll", optimizedHandleScroll)
  }, [handleScroll])

  // トップへスクロール（慣性付き）
  const scrollToTop = useCallback(() => {
    triggerHapticFeedback("medium")
    createParticles(window.innerWidth - 100, window.innerHeight - 100, 8, "#3b82f6")

    const startPosition = window.pageYOffset
    const startTime = Date.now()
    const duration = 800

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

    const animateScroll = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)

      const currentPosition = startPosition * (1 - easedProgress)
      window.scrollTo(0, currentPosition)

      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      }
    }

    animateScroll()
  }, [triggerHapticFeedback, createParticles])

  // 検索ロジック
  const searchBoxes = (boxes: typeof boxes, query: string) => {
    if (!query.trim()) return boxes

    const lowercaseQuery = query.toLowerCase()

    return boxes.filter((box) => {
      if (box.name.toLowerCase().includes(lowercaseQuery)) return true
      if (box.storeName && box.storeName.toLowerCase().includes(lowercaseQuery)) return true
      if (box.cardType.toLowerCase().includes(lowercaseQuery)) return true
      if (box.location.toLowerCase().includes(lowercaseQuery)) return true
      if (box.keywords?.some((keyword) => keyword.toLowerCase().includes(lowercaseQuery))) return true
      if (box.description?.toLowerCase().includes(lowercaseQuery)) return true
      if(box.createAt) return true
      if(box.updateAt) return true
      return false
    })
  }

  // フィルタリングロジック
  const filteredBoxes = boxes.filter((box) => {
    if (filters.title && box.cardType !== filters.title) return false
    if (filters.region && !box.location.includes(filters.region)) return false
    return true
  })

  const searchedBoxes = searchBoxes(filteredBoxes, searchQuery)

  const sortedBoxes = [...searchedBoxes].sort((a, b) => {
    if (filters.date === "新しい順") {
      // 新しい順：更新日時 > 作成日時 > 掲載日の順で比較
      const getLatestDate = (box: typeof a) => {
        const dates = [
          box.updatedAt ? new Date(box.updatedAt).getTime() : 0,
          box.createdAt ? new Date(box.createdAt).getTime() : 0,
          new Date(box.date.replace(/\./g, "-")).getTime(),
        ].filter((date) => date > 0)
        return Math.max(...dates)
      }

      return getLatestDate(b) - getLatestDate(a)
    } else if (filters.date === "古い順") {
      // 古い順：作成日時 > 掲載日の順で比較
      const getEarliestDate = (box: typeof a) => {
        const dates = [
          box.createdAt ? new Date(box.createdAt).getTime() : 0,
          new Date(box.date.replace(/\./g, "-")).getTime(),
        ].filter((date) => date > 0)
        return Math.min(...dates)
      }

      return getEarliestDate(a) - getEarliestDate(b)
    }

    // デフォルトは新しい順
    const getLatestDate = (box: typeof a) => {
      const dates = [
        box.updatedAt ? new Date(box.updatedAt).getTime() : 0,
        box.createdAt ? new Date(box.createdAt).getTime() : 0,
        new Date(box.date.replace(/\./g, "-")).getTime(),
      ].filter((date) => date > 0)
      return Math.max(...dates)
    }

    return getLatestDate(b) - getLatestDate(a)
  })

  // ページネーション計算
  const totalPages = Math.ceil(sortedBoxes.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentBoxes = sortedBoxes.slice(startIndex, endIndex)

  const handleFilterChange = (newFilters: { title: string | null; region: string | null; date: string | null }) => {
    setFilters(newFilters)
    setCurrentPage(1) // フィルター変更時は1ページ目に戻る
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // 検索時は1ページ目に戻る
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // ページ変更時にトップにスクロール
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // フィルターや検索が変更された時にページをリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, searchQuery])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">データを読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 ">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">エラーが発生しました</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2">ページを再読み込みするか、しばらく経ってからお試しください。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full">
      {/* パーティクル効果レンダリング */}
      {particles.map((particle) => {
        const opacity = particle.life / particle.maxLife
        const scale = 1 - (1 - opacity) * 0.5

        return (
          <div
            key={particle.id}
            className="fixed rounded-full pointer-events-none z-50"
            style={{
              left: particle.x - particle.size / 2,
              top: particle.y - particle.size / 2,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity,
              transform: `scale(${scale})`,
            }}
          />
        )
      })}

      {/* フィルタ選択時のページ縮こまりを防ぐために、最小高さを設定 */}
      <div className="space-y-1 sm:space-y-2 mt-2 sm:mt-4">
        <div className="flex flex-col gap-1 items-start">
          <SearchBar onSearch={handleSearch} placeholder="BOX名、店舗名、カードタイプで検索..." />
          <div className="text-sm text-muted-foreground">{searchQuery && `"${searchQuery}" の検索結果`}</div>
        </div>

        <FilterBar onFilterChange={handleFilterChange} />

        <FilterStatus
          filters={filters}
          onClearFilter={(filterType) => {
            setFilters({
              ...filters,
              [filterType]: null,
            })
          }}
        />
      </div>

      {/* 結果表示 - 最小高さを設定してレイアウトシフトを防止 */}
      <div className="mt-1 sm:mt-2 ">
        {boxes.length === 0 ? (
          <div className="mt-8 sm:mt-12 text-center px-1 sm:px-0 min-h-[400px] flex flex-col items-center justify-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground mb-4">まだBOX買取表が登録されていません</p>
            <p className="text-muted-foreground">管理者によってBOX買取表が追加されるまでお待ちください。</p>
          </div>
        ) : sortedBoxes.length === 0 ? (
          <div className="mt-8 sm:mt-12 text-center px-1 sm:px-0 min-h-[400px] flex flex-col items-center justify-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">
              {searchQuery
                ? `"${searchQuery}" に一致するBOX買取表が見つかりませんでした。`
                : "条件に一致するBOX買取表が見つかりませんでした。"}
            </p>
            <p className="mt-2">
              {searchQuery ? "別のキーワードで検索するか、" : ""}フィルター条件を変更してお試しください。
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-1 sm:gap-4">
              {currentBoxes.map((box, index) => (
                <div key={box.id} className="">
                  <BoxCard box={box} />
                </div>
              ))}
            </div>

            {/* ページネーション */}
            {sortedBoxes.length > ITEMS_PER_PAGE && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={sortedBoxes.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
          </div>
        )}
      </div>

      {/* ページ情報 - 下部固定表示 */}
      {sortedBoxes.length > ITEMS_PER_PAGE && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-2 shadow-lg pointer-events-auto">
            <span className="text-sm font-medium text-gray-700">
              {currentPage} / {totalPages}
            </span>
          </div>
        </div>
      )}

      {/* トップへ戻るボタン */}
      {showScrollTop && (
        <AnimatedButton
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 rounded-full w-12 h-12 shadow-lg"
          size="icon"
          enableParticles={true}
          enableGlow={true}
          particleColor="#3b82f6"
          glowColor="#3b82f6"
        >
          <ChevronUp className="h-5 w-5" />
        </AnimatedButton>
      )}
    </div>
  )
}
