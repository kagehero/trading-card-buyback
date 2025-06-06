import { createClientSupabaseClient } from "@/lib/supabase"

// バケットが存在するかチェックする関数
export async function checkBucketExists(bucketName: string): Promise<boolean> {
  const supabase = createClientSupabaseClient()

  try {
    // バケットの存在確認方法を変更
    // 直接バケット内のファイルを一覧取得してみる
    const { data, error } = await supabase.storage.from(bucketName).list()

    if (error) {
      console.error("Error checking bucket:", error)
      return false
    }

    // データが取得できればバケットは存在する
    return true
  } catch (error) {
    console.error("Error checking bucket existence:", error)
    return false
  }
}

// 安全なファイル名を生成する関数
function generateSafeFileName(originalName: string): string {
  // タイムスタンプを追加
  const timestamp = new Date().getTime()

  // 拡張子を取得
  const extension = originalName.split(".").pop() || "png"

  // ランダムな文字列を生成
  const randomString = Math.random().toString(36).substring(2, 10)

  // 安全なファイル名を返す
  return `${timestamp}-${randomString}.${extension}`
}

// 画像をリサイズする関数を追加
function resizeImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    img.onload = () => {
      // 元のサイズを取得
      let { width, height } = img

      // アスペクト比を保持しながらリサイズ
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      // 画像を描画
      ctx?.drawImage(img, 0, 0, width, height)

      // Blobに変換
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            console.log(`Image resized: ${file.size} -> ${resizedFile.size} bytes`)
            resolve(resizedFile)
          } else {
            resolve(file) // リサイズに失敗した場合は元のファイルを返す
          }
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => {
      console.error("Failed to load image for resizing")
      resolve(file) // エラーの場合は元のファイルを返す
    }

    img.src = URL.createObjectURL(file)
  })
}

// 画像ファイルをアップロードする関数
export async function uploadImage(file: File, path: string): Promise<string> {
  const supabase = createClientSupabaseClient()
  const bucketName = "trading-cards"

  try {
    console.log("Original file info:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // 大きな画像の場合はリサイズ
    let processedFile = file
    if (file.size > 2 * 1024 * 1024) {
      // 2MB以上の場合
      console.log("Resizing large image...")
      processedFile = await resizeImage(file, 1920, 1080, 0.8)
    }

    // 安全なファイル名を生成
    const safeFileName = generateSafeFileName(processedFile.name)
    const fullPath = `${path}/${safeFileName}`

    console.log("Attempting to upload file:", {
      path: fullPath,
      size: processedFile.size,
      type: processedFile.type,
    })

    // Supabaseストレージにアップロード
    const { data, error } = await supabase.storage.from(bucketName).upload(fullPath, processedFile, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      console.error("Upload error details:", error)

      // エラーの種類に応じて処理
      if (error.message.includes("Bucket not found")) {
        console.warn("Bucket not found during upload, using placeholder image")
        return "/placeholder.svg?height=400&width=600&query=trading card price list"
      } else if (error.message.includes("The resource already exists")) {
        // ファイル名を変更して再試行
        const retryFileName = generateSafeFileName(processedFile.name)
        const retryPath = `${path}/${retryFileName}`

        console.log("Retrying upload with new filename:", retryPath)

        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucketName)
          .upload(retryPath, processedFile, {
            cacheControl: "3600",
            upsert: false,
          })

        if (retryError) {
          console.error("Retry upload failed:", retryError)
          return "/placeholder.svg?height=400&width=600&query=trading card price list"
        }

        const { data: retryPublicUrlData } = supabase.storage.from(bucketName).getPublicUrl(retryData.path)
        console.log("Upload successful (retry):", retryPublicUrlData.publicUrl)
        return retryPublicUrlData.publicUrl
      } else {
        console.error("Upload error, using placeholder:", error.message)
        return "/placeholder.svg?height=400&width=600&query=trading card price list"
      }
    }

    // 公開URLを取得
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(data.path)
    console.log("Upload successful:", publicUrlData.publicUrl)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error("Unexpected error uploading image:", error)
    return "/placeholder.svg?height=400&width=600&query=trading card price list"
  }
}

// 画像を削除する関数
export async function deleteImage(url: string): Promise<void> {
  const supabase = createClientSupabaseClient()
  const bucketName = "trading-cards"

  try {
    // URLからパスを抽出
    const urlObj = new URL(url)
    const pathWithBucket = urlObj.pathname.split("/storage/v1/object/public/")[1]

    if (!pathWithBucket) {
      console.warn("Invalid image URL format, cannot delete:", url)
      return
    }

    const path = pathWithBucket.replace(`${bucketName}/`, "")

    // Supabaseストレージから削除
    const { error } = await supabase.storage.from(bucketName).remove([path])

    if (error) {
      console.error("Error deleting image:", error)
      // 削除エラーは致命的ではないので、ログに記録するだけ
      console.warn(`画像の削除に失敗しました: ${error.message}`)
    }
  } catch (error) {
    console.error("Unexpected error deleting image:", error)
    // 削除エラーは致命的ではないので、ログに記録するだけ
  }
}

// 画像をリサイズするオプションを追加したURLを生成する関数
export function getResizedImageUrl(url: string, width?: number, height?: number): string {
  if (!url) return url

  // プレースホルダー画像の場合はそのまま返す
  if (url.includes("/placeholder.svg")) {
    return url
  }

  // Supabaseの画像変換パラメータを追加
  const transformOptions = []

  if (width) {
    transformOptions.push(`width=${width}`)
  }

  if (height) {
    transformOptions.push(`height=${height}`)
  }

  if (transformOptions.length === 0) {
    return url
  }

  // 既存のURLにクエリパラメータを追加
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}${transformOptions.join("&")}`
}
