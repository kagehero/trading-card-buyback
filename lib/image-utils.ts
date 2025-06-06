// 画像ユーティリティ関数

export interface ImageDimensions {
  width: number
  height: number
  aspectRatio: number
}

// 画像の寸法を取得する関数
export function getImageDimensions(src: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
      })
    }

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`))
    }

    img.src = src
  })
}

// 画像が読み込み可能かチェックする関数
export function checkImageAvailability(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)

    // タイムアウトを設定（5秒）
    setTimeout(() => resolve(false), 5000)

    img.src = src
  })
}

// 画像URLを検証する関数
export function validateImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false

  // 空文字列や無効な文字列をチェック
  if (url.trim() === "" || url.includes("undefined") || url.includes("null")) {
    return false
  }

  // 基本的なURL形式をチェック
  try {
    new URL(url)
    return true
  } catch {
    // 相対パスの場合もチェック
    return url.startsWith("/") || url.startsWith("./") || url.startsWith("../")
  }
}

// 画像のプリロード関数
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!validateImageUrl(src)) {
      reject(new Error(`Invalid image URL: ${src}`))
      return
    }

    const img = new Image()

    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`))

    img.src = src
  })
}

// 複数画像のプリロード関数
export async function preloadImages(urls: string[]): Promise<void> {
  const validUrls = urls.filter(validateImageUrl)

  try {
    await Promise.all(validUrls.map(preloadImage))
  } catch (error) {
    console.warn("Some images failed to preload:", error)
  }
}

// レスポンシブ画像サイズを計算する関数
export function calculateResponsiveSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight

  let width = originalWidth
  let height = originalHeight

  // 最大幅を超える場合
  if (width > maxWidth) {
    width = maxWidth
    height = width / aspectRatio
  }

  // 最大高さを超える場合
  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  return { width: Math.round(width), height: Math.round(height) }
}

// 画像の最適化されたURLを生成する関数
export function getOptimizedImageUrl(originalUrl: string, width?: number, height?: number, quality = 80): string {
  if (!validateImageUrl(originalUrl)) {
    return "/placeholder.svg?height=400&width=600&query=invalid image url"
  }

  // プレースホルダー画像の場合はそのまま返す
  if (originalUrl.includes("/placeholder.svg")) {
    return originalUrl
  }

  // Supabaseの画像変換を使用
  if (originalUrl.includes("supabase")) {
    const url = new URL(originalUrl)
    const params = new URLSearchParams()

    if (width) params.set("width", width.toString())
    if (height) params.set("height", height.toString())
    params.set("quality", quality.toString())
    params.set("format", "webp")

    if (params.toString()) {
      url.search = params.toString()
    }

    return url.toString()
  }

  return originalUrl
}
