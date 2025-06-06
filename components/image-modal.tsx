"use client"

import type React from "react"
import {useSwipeable} from 'react-swipeable'

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Share2,
  MoreVertical,
  RotateCcw,
  Maximize2,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Store } from "@/types/store"

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  store: Store
  initialImageIndex?: number
}

export function ImageModal({ isOpen, onClose, store, initialImageIndex = 0 }: ImageModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(initialImageIndex)
  const [zoom, setZoom] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)

  // スワイプ検出用の状態
  const touchStartXRef = useRef(0)
  const touchStartYRef = useRef(0)
  const touchEndXRef = useRef(0)
  const touchEndYRef = useRef(0)
  const isSwipingRef = useRef(false)
  const swipeThreshold = 25 // スワイプと判定する最小距離を少し緩く
  const lastTapTimeRef = useRef(0)
  const tapCountRef = useRef(0)

  // ピンチズーム用の状態
  const initialDistanceRef = useRef(0)
  const initialZoomRef = useRef(1)
  const initialPositionRef = useRef({ x: 0, y: 0 })
  const isPinchingRef = useRef(false)

  const imageContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()

  // 表示する画像のリスト
  const displayImages = store.imageUrls && store.imageUrls.length > 0 ? store.imageUrls : [store.imageUrl]
  const currentImageUrl = displayImages[currentImageIndex]

  // ハプティックフィードバック
  const triggerHapticFeedback = useCallback((intensity: "light" | "medium" | "heavy" = "light") => {
    if ("vibrate" in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      }
      navigator.vibrate(patterns[intensity])
    }
  }, [])

  // モバイルデバイスの検出
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || "ontouchstart" in window
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // 画像の読み込み完了時の処理
  const handleImageLoad = useCallback(() => {
    if (imageRef.current) {
      const img = imageRef.current
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
      setImageLoaded(true)
    }
  }, [])

  // 画像エラーハンドリング
  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      console.error("Modal image failed to load:", currentImageUrl)
      e.currentTarget.src = "/placeholder.svg?height=800&width=1200"
      setImageLoaded(true) // エラーでも読み込み完了として扱う
    },
    [currentImageUrl],
  )

  // 画像が変更された時の処理
  useEffect(() => {
    setImageLoaded(false)
    setZoom(1)
    setImagePosition({ x: 0, y: 0 })
  }, [currentImageIndex])

  // モーダルが開かれた時に初期値をリセット
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(initialImageIndex)
      setZoom(1)
      setImagePosition({ x: 0, y: 0 })
      setShowControls(true)
      setImageLoaded(false)

      // モバイルでのスクロール防止
      if (isMobile) {
        document.body.style.overflow = "hidden"
        document.body.style.position = "fixed"
        document.body.style.width = "100%"
        document.body.style.height = "100%"
      }
    } else {
      // スクロール復元
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
      document.body.style.height = ""
    }

    return () => {
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
      document.body.style.height = ""
    }
  }, [isOpen, initialImageIndex, isMobile])

  // コントロールの自動非表示
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }

    setShowControls(true)

    if (isMobile) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 4000) // 少し長めに設定
    }
  }, [isMobile])

  // 2点間の距離を計算
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // 2点の中心点を計算
  const getCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    }
  }, [])

  // ネイティブタッチイベントのセットアップ
  useEffect(() => {
    if (!isOpen || !imageContainerRef.current) return

    const container = imageContainerRef.current

    // タッチ開始イベント
    const handleTouchStart = (e: TouchEvent) => {
      const now = Date.now()
      resetControlsTimeout()

      if (e.touches.length === 1) {
        const touch = e.touches[0]
        touchStartXRef.current = touch.clientX
        touchStartYRef.current = touch.clientY
        isSwipingRef.current = true

        // ダブルタップ判定
        if (now - lastTapTimeRef.current < 300) {
          tapCountRef.current += 1
          if (tapCountRef.current === 2) {
            // ダブルタップでズームトグル
            triggerHapticFeedback("medium")
            if (zoom > 1) {
              resetTransform()
            } else {
              // タップ位置を中心にズーム
              const containerRect = container.getBoundingClientRect()
              const centerX = touch.clientX - containerRect.left - containerRect.width / 2
              const centerY = touch.clientY - containerRect.top - containerRect.height / 2
              setZoom(2.5)
              setImagePosition({ x: -centerX * 1.5, y: -centerY * 1.5 })
            }
            tapCountRef.current = 0
          }
        } else {
          tapCountRef.current = 1
        }
        lastTapTimeRef.current = now

        // ズーム時のドラッグ準備
        if (zoom > 1) {
          setIsDragging(true)
          setDragStart({
            x: touch.clientX - imagePosition.x,
            y: touch.clientY - imagePosition.y,
          })
        }
      } else if (e.touches.length === 2) {
        // ピンチズーム開始
        isPinchingRef.current = true
        isSwipingRef.current = false
        initialDistanceRef.current = getDistance(e.touches[0], e.touches[1])
        initialZoomRef.current = zoom
        initialPositionRef.current = { ...imagePosition }
        setIsDragging(false)
      }
    }

    // タッチ移動イベント
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault() // スクロールを防止

      if (e.touches.length === 1) {
        const touch = e.touches[0]
        touchEndXRef.current = touch.clientX
        touchEndYRef.current = touch.clientY

        // ズーム時のドラッグ
        if (zoom > 1 && isDragging) {
          setImagePosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y,
          })
        }
      } else if (e.touches.length === 2 && isPinchingRef.current) {
        // ピンチズーム処理
        const currentDistance = getDistance(e.touches[0], e.touches[1])
        const scale = currentDistance / initialDistanceRef.current
        const newZoom = Math.min(Math.max(initialZoomRef.current * scale, 1.0), 5)

        const center = getCenter(e.touches[0], e.touches[1])
        const containerRect = container.getBoundingClientRect()
        const centerX = center.x - containerRect.left - containerRect.width / 2
        const centerY = center.y - containerRect.top - containerRect.height / 2

        const zoomRatio = newZoom / zoom
        setImagePosition({
          x: initialPositionRef.current.x + (centerX - initialPositionRef.current.x) * (1 - zoomRatio),
          y: initialPositionRef.current.y + (centerY - initialPositionRef.current.y) * (1 - zoomRatio),
        })

        setZoom(newZoom)
      }
    }

    // タッチ終了イベント
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        // 全てのタッチが終了
        setIsDragging(false)
        isPinchingRef.current = false

        // スワイプ判定（ズームしていない場合のみ、複数画像がある場合）
        if (isSwipingRef.current && zoom <= 1.1 && displayImages.length > 1) {
          const diffX = touchEndXRef.current - touchStartXRef.current
          const diffY = touchEndYRef.current - touchStartYRef.current
          const absDiffX = Math.abs(diffX)
          const absDiffY = Math.abs(diffY)

          // 水平方向のスワイプ判定（垂直方向より大きい場合のみ）
          if (absDiffX > swipeThreshold && absDiffX > absDiffY) {
            triggerHapticFeedback("light")
            if (diffX > 0) {
              navigateToPrevious()
            } else {
              navigateToNext()
            }
          }
        }

        isSwipingRef.current = false
      }
    }

    // イベントリスナーの登録
    container.addEventListener("touchstart", handleTouchStart, { passive: false })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })

    // クリーンアップ
    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [
    isOpen,
    zoom,
    displayImages.length,
    isDragging,
    dragStart,
    imagePosition,
    getDistance,
    getCenter,
    triggerHapticFeedback,
    resetControlsTimeout,
  ])

  // キーボードイベントのハンドリング
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose()
          break
        case "ArrowLeft":
          navigateToPrevious()
          break
        case "ArrowRight":
          navigateToNext()
          break
        case "+":
        case "=":
          handleZoomIn()
          break
        case "-":
          handleZoomOut()
          break
        case "0":
          resetTransform()
          break
        case "f":
        case "F":
          toggleFullscreen()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, currentImageIndex, zoom])

  const navigateToPrevious = () => {
    if (displayImages.length <= 1) return
    triggerHapticFeedback("light")
    setCurrentImageIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
    resetTransform()
    resetControlsTimeout()
  }

  const navigateToNext = () => {
    if (displayImages.length <= 1) return
    triggerHapticFeedback("light")
    setCurrentImageIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
    resetTransform()
    resetControlsTimeout()
  }

  const handleZoomIn = () => {
    triggerHapticFeedback("light")
    setZoom((prev) => Math.min(prev * 1.3, 5))
    resetControlsTimeout()
  }

  const handleZoomOut = () => {
    triggerHapticFeedback("light")
    setZoom((prev) => Math.max(prev / 1.3, 1.0))
    resetControlsTimeout()
  }

  const resetTransform = () => {
    triggerHapticFeedback("medium")
    setZoom(1)
    setImagePosition({ x: 0, y: 0 })
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1 || isMobile) return
    setIsDragging(true)
    setDragStart({
      x: e.clientX - imagePosition.x,
      y: e.clientY - imagePosition.y,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1 || isMobile) return
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - imagePosition.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleDownload = () => {
    triggerHapticFeedback("medium")
    const link = document.createElement("a")
    link.href = currentImageUrl
    link.download = `${store.name}_買取表_${currentImageIndex + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = async () => {
    triggerHapticFeedback("medium")
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${store.name}の買取表`,
          text: `${store.name}（${store.location}）の${store.cardType}買取表をチェック！`,
          url: window.location.href,
        })
      } catch (error) {
        console.log("Share cancelled")
      }
    } else {
      // フォールバック: URLをクリップボードにコピー
      navigator.clipboard.writeText(window.location.href)
      alert("URLをクリップボードにコピーしました")
    }
  }

  const handleImageClick = () => {
    if (isMobile) {
      resetControlsTimeout()
    }
  }

  const handlers = useSwipeable({
    onSwipedLeft: () => navigateToPrevious(),
    onSwipedRight: () => navigateToNext(),
    // preventDefaultTouchmoveEvent: true,
    trackMouse: true // Optional: for desktop testing
  });

  // ヘッダーとフッターの高さを計算
  const headerHeight = isMobile ? 80 : 88
  const footerHeight = isMobile ? 120 : 120
  const padding = 16
  const availableHeight = isMobile
    ? `calc(100vh - ${headerHeight + footerHeight + padding * 2}px)`
    : `calc(90vh - ${headerHeight + footerHeight + padding * 2}px)`

  // ライトモード固定のスタイル設定（ダークモード削除済み）
  const glassStyles = {
    headerFooterBg: "rgba(0, 0, 0, 0.4)",
    headerFooterBorder: "rgba(255, 255, 255, 0.1)",
    textColor: "text-white",
    buttonBg: "rgba(255, 255, 255, 0.1)",
    buttonBorder: "rgba(255, 255, 255, 0.2)",
    buttonHover: "hover:bg-white/20",
    indicatorBg: "rgba(0, 0, 0, 0.4)",
    indicatorBorder: "rgba(255, 255, 255, 0.2)",
    badgeBg: "rgba(255, 255, 255, 0.2)",
    badgeBorder: "border-white/30",
    badgeText: "text-white",
    dropdownBg: "bg-black/80 backdrop-blur-xl border-white/20",
    dropdownText: "text-white",
    dropdownHover: "hover:bg-white/20",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          isMobile ? "max-w-full w-full h-full m-0 p-0 rounded-none" : "max-w-7xl w-full h-[90vh] p-0"
        } overflow-hidden border-0 bg-transparent shadow-none`}
      >
        <div className="flex flex-col h-full relative">
          {/* ヘッダー */}
          <div
            className={`${
              showControls || !isMobile ? "translate-y-0" : "-translate-y-full"
            } transition-all duration-500 ease-out flex-shrink-0 flex items-center justify-between p-4 z-30`}
            style={{
              height: `${headerHeight}px`,
              background: glassStyles.headerFooterBg,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderBottom: `1px solid ${glassStyles.headerFooterBorder}`,
              boxShadow: glassStyles.boxShadow,
            }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="min-w-0 flex-1">
                <h3
                  className={`${isMobile ? "text-base" : "text-lg"} font-semibold truncate ${glassStyles.textColor} drop-shadow-lg`}
                >
                  {store.name}
                </h3>
                <div
                  className={`flex items-center gap-2 ${isMobile ? "text-xs" : "text-sm"} ${glassStyles.textColor} opacity-90 drop-shadow-md`}
                >
                  <span className="truncate">{store.location}</span>
                  <span>•</span>
                  <span>{store.cardType}</span>
                  {!isMobile && (
                    <>
                      <span>•</span>
                      <span>{store.date}</span>
                    </>
                  )}
                </div>
              </div>
              {displayImages.length > 1 && (
                <Badge
                  variant="secondary"
                  className={`flex-shrink-0 ${glassStyles.badgeBg} ${glassStyles.badgeText} ${glassStyles.badgeBorder} backdrop-blur-sm`}
                  style={{
                    background: glassStyles.badgeBg,
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  {currentImageIndex + 1}/{displayImages.length}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1 ml-2">
              {isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`${glassStyles.textColor} ${glassStyles.buttonHover} transition-all duration-300 backdrop-blur-sm`}
                      style={{
                        background: glassStyles.buttonBg,
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: `1px solid ${glassStyles.buttonBorder}`,
                        width: "44px",
                        height: "44px",
                      }}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className={`w-48 ${glassStyles.dropdownBg} ${glassStyles.badgeBorder}`}
                    style={{
                      backdropFilter: "blur(20px) saturate(180%)",
                      WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    }}
                  >
                    <DropdownMenuItem
                      onClick={handleZoomIn}
                      disabled={zoom >= 5}
                      className={`${glassStyles.dropdownText} ${glassStyles.dropdownHover} py-3`}
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      ズームイン
                    </DropdownMenuItem>
                    {zoom > 1 && (
                      <DropdownMenuItem
                        onClick={handleZoomOut}
                        disabled={zoom <= 1.0}
                        className={`${glassStyles.dropdownText} ${glassStyles.dropdownHover} py-3`}
                      >
                        <ZoomOut className="h-4 w-4 mr-2" />
                        ズームアウト
                      </DropdownMenuItem>
                    )}
                    {zoom > 1 && (
                      <DropdownMenuItem
                        onClick={resetTransform}
                        className={`${glassStyles.dropdownText} ${glassStyles.dropdownHover} py-3`}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        リセット
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={toggleFullscreen}
                      className={`${glassStyles.dropdownText} ${glassStyles.dropdownHover} py-3`}
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      フルスクリーン
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownload}
                      className={`${glassStyles.dropdownText} ${glassStyles.dropdownHover} py-3`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      ダウンロード
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleShare}
                      className={`${glassStyles.dropdownText} ${glassStyles.dropdownHover} py-3`}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      シェア
                    </DropdownMenuItem>
                    {store.detailUrl && (
                      <DropdownMenuItem
                        asChild
                        className={`${glassStyles.dropdownText} ${glassStyles.dropdownHover} py-3`}
                      >
                        <a href={store.detailUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          詳細を見る
                        </a>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  {/* {[
                    ...(zoom > 1 ? [{ icon: ZoomOut, onClick: handleZoomOut, disabled: zoom <= 1.0 }] : []),
                    { icon: ZoomIn, onClick: handleZoomIn, disabled: zoom >= 5 },
                    { icon: Download, onClick: handleDownload, disabled: false },
                  ].map((btn, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="icon"
                      onClick={btn.onClick}
                      disabled={btn.disabled}
                      className={`${glassStyles.textColor} ${glassStyles.buttonHover} transition-all duration-300 hover:scale-105 active:scale-95`}
                      style={{
                        background: glassStyles.buttonBg,
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: `1px solid ${glassStyles.buttonBorder}`,
                      }}
                    >
                      <btn.icon className="h-4 w-4" />
                    </Button>
                  ))} */}

                  {/* <div
                    className={`text-sm min-w-[3rem] text-center ${glassStyles.textColor} px-2 py-1 rounded-md mx-1`}
                    style={{
                      background: glassStyles.buttonBg,
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      border: `1px solid ${glassStyles.buttonBorder}`,
                    }}
                  >
                    {Math.round(zoom * 100)}%
                  </div> */}

                  {store.detailUrl && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className={`${glassStyles.textColor} ${glassStyles.buttonHover} transition-all duration-300 hover:scale-105 active:scale-95`}
                      style={{
                        background: glassStyles.buttonBg,
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: `1px solid ${glassStyles.buttonBorder}`,
                      }}
                    >
                      <a href={store.detailUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className={`${glassStyles.textColor} hover:bg-red-500/30 transition-all duration-300 hover:scale-105 active:scale-95 ml-2`}
                style={{
                  background: glassStyles.buttonBg,
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: `1px solid ${glassStyles.buttonBorder}`,
                  width: isMobile ? "44px" : "auto",
                  height: isMobile ? "44px" : "auto",
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 画像表示エリア */}
          <div
            ref={imageContainerRef}
            className="relative bg-black flex items-center justify-center [&::-webkit-scrollbar-thumb]:bg-transparent overflow-scroll"
            style={{
              touchAction: "none",
              height: availableHeight,
              minHeight: availableHeight,
              maxHeight: availableHeight,
              padding: `${padding}px`,
              overflow: isMobile ? "hidden" : "auto",
              overflowY: "hidden",
              scrollbarWidth: isMobile ? "none" : "none",
              msOverflowStyle: isMobile ? "none" : "auto",
            }}
            onClick={handleImageClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoom})`,
                transformOrigin: "center",
                willChange: "transform",
                overflow: "hidden",
                width: "100%",
                height: "100%",
                transition: isDragging ? "none" : "transform 0.3s ease-out",
                touchAction: 'pan-y'
              }}
              {...handlers}
            >
              <img
                ref={imageRef}
                src={currentImageUrl || "/placeholder.svg"}
                alt={`${store.name}の買取表 ${currentImageIndex + 1}`}
                className="select-none"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "block",
                  filter: "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.3))",
                }}
                onLoad={handleImageLoad}
                onError={handleImageError}
                draggable={false}
              />
            </div>

            {/* モバイル用の大きなナビゲーションボタン */}
            {displayImages.length > 1 && isMobile && (
              <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 flex justify-between px-4 z-20 pointer-events-none">
                <Button
                  variant="secondary"
                  size="icon"
                  className={`${glassStyles.textColor} border-0 transition-all duration-300 active:scale-90 pointer-events-auto`}
                  style={{
                    background: glassStyles.indicatorBg,
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: `1px solid ${glassStyles.indicatorBorder}`,
                    boxShadow: glassStyles.boxShadow,
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                  }}
                  onClick={navigateToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className={`${glassStyles.textColor} border-0 transition-all duration-300 active:scale-90 pointer-events-auto`}
                  style={{
                    background: glassStyles.indicatorBg,
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: `1px solid ${glassStyles.indicatorBorder}`,
                    boxShadow: glassStyles.boxShadow,
                    width: "50px",
                    height: "50px",
                    borderRadius: "50%",
                  }}
                  onClick={navigateToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            )}

            {/* ナビゲーションボタン（デスクトップのみ） */}
            {displayImages.length > 1 && !isMobile && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className={`absolute left-4 top-1/2 transform -translate-y-1/2 ${glassStyles.textColor} border-0 z-20 transition-all duration-300 hover:scale-110 active:scale-95`}
                  style={{
                    background: glassStyles.indicatorBg,
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: `1px solid ${glassStyles.indicatorBorder}`,
                    boxShadow: glassStyles.boxShadow,
                  }}
                  onClick={navigateToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${glassStyles.textColor} border-0 z-20 transition-all duration-300 hover:scale-110 active:scale-95`}
                  style={{
                    background: glassStyles.indicatorBg,
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: `1px solid ${glassStyles.indicatorBorder}`,
                    boxShadow: glassStyles.boxShadow,
                  }}
                  onClick={navigateToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* モバイル用のジェスチャーガイド */}
            {isMobile && displayImages.length > 1 && showControls && (
              <div
                className={`absolute top-4 left-1/2 transform -translate-x-1/2 ${glassStyles.textColor} px-4 py-2 rounded-full text-sm z-20 text-center`}
                style={{
                  background: glassStyles.indicatorBg,
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                  border: `1px solid ${glassStyles.indicatorBorder}`,
                }}
              >
                <div>← スワイプ・ボタン・ダブルタップ →</div>
                <div className="text-xs opacity-75 mt-1">ピンチでズーム</div>
              </div>
            )}

            {/* ズーム状態インジケーター（モバイル） */}
            {isMobile && zoom > 1 && showControls && (
              <div
                className={`absolute top-4 right-4 ${glassStyles.textColor} px-3 py-2 rounded-lg text-sm z-20`}
                style={{
                  background: glassStyles.indicatorBg,
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                  border: `1px solid ${glassStyles.indicatorBorder}`,
                }}
              >
                <div className="text-center font-medium">{Math.round(zoom * 100)}%</div>
                <div className="text-xs opacity-75 text-center">ダブルタップでリセット</div>
              </div>
            )}

            {/* 画像読み込み中のインジケーター */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div
                  className={`${glassStyles.textColor} text-sm px-4 py-2 rounded-lg`}
                  style={{
                    background: glassStyles.indicatorBg,
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    border: `1px solid ${glassStyles.indicatorBorder}`,
                  }}
                >
                  読み込み中...
                </div>
              </div>
            )}
          </div>

          {/* フッター */}
          <div
            className={`${
              showControls || !isMobile ? "translate-y-0" : "translate-y-full"
            } transition-all duration-500 ease-out flex-shrink-0 p-4 z-30`}
            style={{
              minHeight: `${footerHeight}px`,
              maxHeight: `${footerHeight}px`,
              background: glassStyles.headerFooterBg,
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              borderTop: `1px solid ${glassStyles.headerFooterBorder}`,
              boxShadow: glassStyles.boxShadow,
            }}
          >
            <div className="flex items-center justify-between h-full">
              {/* モバイル用のクイックアクションボタン */}
              {isMobile && (
                <div className="flex gap-2">
                  {zoom > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetTransform}
                      className={`${glassStyles.textColor} ${glassStyles.buttonHover} transition-all duration-300 active:scale-95`}
                      style={{
                        background: glassStyles.buttonBg,
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: `1px solid ${glassStyles.buttonBorder}`,
                        height: "40px",
                        paddingLeft: "12px",
                        paddingRight: "12px",
                      }}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      リセット
                    </Button>
                  )}
                </div>
              )}

              {/* サムネイル一覧 */}
              {displayImages.length > 1 && (
                <div
                  className="flex gap-2 max-w-md overflow-x-auto ml-auto"
                  style={{
                    overflowY: "hidden",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                  }}
                >
                  {displayImages.map((imageUrl, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        triggerHapticFeedback("light")
                        setCurrentImageIndex(index)
                        resetTransform()
                        resetControlsTimeout()
                      }}
                      className={`flex-shrink-0 ${
                        isMobile ? "w-14 h-10" : "w-16 h-12"
                      } rounded border-2 overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95`}
                      style={{
                        borderColor:
                          index === currentImageIndex ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.3)",
                        boxShadow:
                          index === currentImageIndex
                            ? "0 0 20px rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)"
                            : "0 4px 15px rgba(0, 0, 0, 0.3)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }}
                    >
                      <img
                        src={imageUrl || "/placeholder.svg"}
                        alt={`サムネイル ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
