"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { StoreCard } from "@/components/store-card"
import { FilterBar } from "@/components/filter-bar"
import { FilterStatus } from "@/components/filter-status"
import { SearchBar } from "@/components/search-bar"
import { AnimatedButton } from "@/components/animated-button"
import { Pagination } from "@/components/pagination"
import { useStores } from "@/contexts/store-context"
import { Loader2, ChevronUp, CreditCard } from "lucide-react"
import { useAnimationEffects } from "@/hooks/use-animation-effects"
import { Footer } from "@/components/footer"

const ITEMS_PER_PAGE = 20

export function TradingCardContent() {
  const { stores, loading, error } = useStores()
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
  const searchStores = (stores: typeof stores, query: string) => {                        
    if (!query.trim()) return stores

    const lowercaseQuery = query.toLowerCase()

    return stores.filter((store) => {
      if (store.name.toLowerCase().includes(lowercaseQuery)) return true
      if (store.cardType.toLowerCase().includes(lowercaseQuery)) return true
      if (store.location.toLowerCase().includes(lowercaseQuery)) return true
      if (store.cardNames?.some((card) => card.toLowerCase().includes(lowercaseQuery))) return true
      if (store.keywords?.some((keyword) => keyword.toLowerCase().includes(lowercaseQuery))) return true
      if (store.description?.toLowerCase().includes(lowercaseQuery)) return true
      return false
    })
  }

  // フィルタリングロジック
  const filteredStores = stores.filter((store) => {
    if (filters.title && store.cardType !== filters.title) return false
    if (filters.region && !store.location.includes(filters.region)) return false
    return true
  })

  const searchedStores = searchStores(filteredStores, searchQuery)

  const sortedStores = [...searchedStores].sort((a, b) => {
    if (filters.date === "新しい順") {
      // 新しい順：更新日時 > 作成日時 > 掲載日の順で比較
      const getLatestDate = (store: typeof a) => {
        const dates = [
          store.updatedAt ? new Date(store.updatedAt).getTime() : 0,
          store.createdAt ? new Date(store.createdAt).getTime() : 0,
          new Date(store.date.replace(/\./g, "-")).getTime(),
        ].filter((date) => date > 0)
        return Math.max(...dates)
      }

      return getLatestDate(b) - getLatestDate(a)
    } else if (filters.date === "古い順") {
      // 古い順：作成日時 > 掲載日の順で比較
      const getEarliestDate = (store: typeof a) => {
        const dates = [
          store.createdAt ? new Date(store.createdAt).getTime() : 0,
          new Date(store.date.replace(/\./g, "-")).getTime(),
        ].filter((date) => date > 0)
        return Math.min(...dates)
      }

      return getEarliestDate(a) - getEarliestDate(b)
    }

    // デフォルトは新しい順
    const getLatestDate = (store: typeof a) => {
      const dates = [
        store.updatedAt ? new Date(store.updatedAt).getTime() : 0,
        store.createdAt ? new Date(store.createdAt).getTime() : 0,
        new Date(store.date.replace(/\./g, "-")).getTime(),
      ].filter((date) => date > 0)
      return Math.max(...dates)
    }

    return getLatestDate(b) - getLatestDate(a)
  })

  const resultsortedStores = [...sortedStores].sort((a,b) => {
    return b.is_hot-a.is_hot;
  })

  console.log(resultsortedStores);
  

  // ページネーション計算
  const totalPages = Math.ceil(resultsortedStores.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentStores = resultsortedStores.slice(startIndex, endIndex)

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
      <div className="flex flex-col items-center justify-center py-16 min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">データを読み込み中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-16 min-h-[400px]">
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
          <SearchBar onSearch={handleSearch} placeholder="カード名、店舗名、キーワードで検索..." />
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
      <div className="mt-1 sm:mt-2">
        {stores.length === 0 ? (
          <div className="mt-8 sm:mt-12 text-center px-1 sm:px-0 min-h-[400px] flex flex-col items-center justify-center">
            <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground mb-4">まだ買取表が登録されていません</p>
            <p className="text-muted-foreground">管理者によって買取表が追加されるまでお待ちください。</p>
          </div>
        ) : resultsortedStores.length === 0 ? (
          <div className="mt-8 sm:mt-12 text-center px-1 sm:px-0 min-h-[400px] flex flex-col items-center justify-center">
            <CreditCard className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">
              {searchQuery
                ? `"${searchQuery}" に一致する買取表が見つかりませんでした。`
                : "条件に一致する買取表が見つかりませんでした。"}
            </p>
            <p className="mt-2">
              {searchQuery ? "別のキーワードで検索するか、" : ""}フィルター条件を変更してお試しください。
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 gap-1 sm:gap-4">
              {currentStores.map((store, index) => (
                <div key={store.id} className="h-full">
                  <StoreCard store={store} />
                </div>
              ))}
            </div>

            {/* ページネーション */}
            {resultsortedStores.length > ITEMS_PER_PAGE && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={resultsortedStores.length}
                itemsPerPage={ITEMS_PER_PAGE}
              />
            )}
          </div>
        )}
      </div>

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
      <Footer />
    </div>
  )
}
