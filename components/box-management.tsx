"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useBoxes } from "@/contexts/box-context"
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Loader2,
  Upload,
  X,
  AlertCircle,
} from "lucide-react"
import type { Box } from "@/types/box"
import { uploadImage, deleteImage, getResizedImageUrl } from "@/lib/storage"
import { getCardTypeColor } from "@/components/filter-bar"
import { Badge } from "@/components/ui/badge"

const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
]

export function BoxManagement() {
  const { boxes, loading, error, addBox, updateBox, deleteBox, moveBoxUp, moveBoxDown } = useBoxes()
  const [imageUrl, setImageUrl] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentBoxId, setCurrentBoxId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [boxToDelete, setBoxToDelete] = useState<string | null>(null)
  const [showOrderControls, setShowOrderControls] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    storeName: "",
    name: "",
    location: "",
    cardType: "",
    detailUrl: "",
  })
  const [operationInProgress, setOperationInProgress] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null)
  const [previewImageFiles, setPreviewImageFiles] = useState<File[]>([])
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0)
  const [hotBadgeStatus,setHotBadgeStatus] = useState(false);

  const resetForm = () => {
    setFormData({
      storeName: "",
      name: "",
      location: "",
      cardType: "",
      detailUrl: "",
    })
    setImageUrl("")
    setOriginalImageUrl(null)
    setPreviewImageFiles([])
    previewImageUrls.forEach((url) => URL.revokeObjectURL(url))
    setPreviewImageUrls([])
    setSelectedImageIndex(0)
    setIsEditing(false)
    setCurrentBoxId(null)
    setUploadError(null)
  }

  const handleEditBox = (box: Box) => {
    setIsEditing(true)
    setCurrentBoxId(box.id)
    setImageUrl(box.imageUrl)
    setOriginalImageUrl(box.imageUrl)

    if (box.imageUrls && box.imageUrls.length > 0) {
      setPreviewImageUrls(box.imageUrls)
      setPreviewImageFiles([])
      setSelectedImageIndex(0)
      setImageUrl(box.imageUrls[0])
    }

    setFormData({
      storeName: box.storeName || "",
      name: box.name,
      location: box.location,
      cardType: box.cardType,
      detailUrl: box.detailUrl || "",
    })
  }

  const handleDeleteClick = (boxId: string) => {
    setBoxToDelete(boxId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (boxToDelete) {
      setOperationInProgress(true)
      try {
        const boxToDeleteObj = boxes.find((box) => box.id === boxToDelete)
        await deleteBox(boxToDelete)

        if (boxToDeleteObj && boxToDeleteObj.imageUrl && !boxToDeleteObj.imageUrl.includes("/placeholder.svg")) {
          await deleteImage(boxToDeleteObj.imageUrl).catch((err) => {
            console.error("Failed to delete image, but box was deleted:", err)
          })
        }

        setDeleteDialogOpen(false)
        setBoxToDelete(null)
        alert("BOX買取表が削除されました")
      } catch (error) {
        console.error("Error deleting box:", error)
        alert("削除に失敗しました。もう一度お試しください。")
      } finally {
        setOperationInProgress(false)
      }
    }
  }

  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const totalImagesCount = previewImageFiles.length + fileArray.length
    if (totalImagesCount > 20) {
      setUploadError(
        `画像は最大20枚までです。現在${previewImageFiles.length}枚選択されているため、あと${20 - previewImageFiles.length}枚まで追加できます。`,
      )
      return
    }

    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: ファイルサイズが大きすぎます（10MB以下）`)
        continue
      }

      const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name}: 対応していないファイル形式です`)
        continue
      }

      const isDuplicate = previewImageFiles.some(
        (existingFile) => existingFile.name === file.name && existingFile.size === file.size,
      )
      if (isDuplicate) {
        errors.push(`${file.name}: 同じファイルが既に選択されています`)
        continue
      }

      validFiles.push(file)
    }

    if (errors.length > 0) {
      setUploadError(errors.join("\n"))
    } else {
      setUploadError(null)
    }

    if (validFiles.length > 0) {
      const newPreviewUrls = validFiles.map((file) => URL.createObjectURL(file))
      const updatedFiles = [...previewImageFiles, ...validFiles]
      const updatedUrls = [...previewImageUrls, ...newPreviewUrls]

      setPreviewImageFiles(updatedFiles)
      setPreviewImageUrls(updatedUrls)

      const newSelectedIndex = previewImageFiles.length
      setSelectedImageIndex(newSelectedIndex)
      setImageUrl(newPreviewUrls[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageUpload(e.target.files)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY

      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files)
    }
  }

  const navigateToPreviousImage = () => {
    if (previewImageUrls.length <= 1) return
    const newIndex = selectedImageIndex === 0 ? previewImageUrls.length - 1 : selectedImageIndex - 1
    setSelectedImageIndex(newIndex)
    setImageUrl(previewImageUrls[newIndex])
  }

  const navigateToNextImage = () => {
    if (previewImageUrls.length <= 1) return
    const newIndex = selectedImageIndex === previewImageUrls.length - 1 ? 0 : selectedImageIndex + 1
    setSelectedImageIndex(newIndex)
    setImageUrl(previewImageUrls[newIndex])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.storeName || !formData.location || !formData.cardType || !formData.detailUrl) {
      alert("必須項目を入力してください。")
      return
    }

    setOperationInProgress(true)

    try {
      let finalImageUrl = imageUrl
      let finalImageUrls: string[] = []

      if (previewImageFiles.length > 0) {
        setIsUploading(true)
        try {
          if (isEditing && originalImageUrl && !originalImageUrl.includes("/placeholder.svg")) {
            await deleteImage(originalImageUrl).catch((err) => {
              console.warn("Failed to delete previous image:", err)
            })
          }

          const uploadPromises = previewImageFiles.map(async (file) => {
            return await uploadImage(file, "box-images")
          })

          const uploadedUrls = await Promise.all(uploadPromises)
          finalImageUrls = uploadedUrls.filter((url) => url && url.trim() !== "" && !url.includes("undefined"))

          finalImageUrl =
            finalImageUrls[selectedImageIndex] || finalImageUrls[0] || "/placeholder.svg?height=400&width=600"
        } catch (error) {
          console.error("Error uploading images:", error)
          finalImageUrl = "/placeholder.svg?height=400&width=600"
          finalImageUrls = []
        } finally {
          setIsUploading(false)
        }
      }

      const currentDate = new Date()
        .toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, ".")

      const boxData = {
        storeName: formData.storeName,
        name: formData.name,
        location: formData.location,
        cardType: formData.cardType,
        imageUrl: finalImageUrl || "/placeholder.svg?height=400&width=600",
        imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
        date: currentDate,
        detailUrl: formData.detailUrl || undefined,
        is_hot : hotBadgeStatus,
      }

      if (isEditing && currentBoxId) {
        await updateBox(currentBoxId, boxData)
        alert(`BOX買取表が更新されました！（${finalImageUrls.length}枚の画像を保存）`)
      } else {
        await addBox(boxData)
        alert(`BOX買取表が追加されました！（${finalImageUrls.length}枚の画像を保存）`)
      }

      resetForm()
      setHotBadgeStatus(false)
    } catch (error) {
      console.error("Error submitting form:", error)
      alert("操作に失敗しました。もう一度お試しください。")
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleMoveUp = async (id: string) => {
    setOperationInProgress(true)
    try {
      await moveBoxUp(id)
    } catch (error) {
      console.error("Error moving box up:", error)
      alert("順序の変更に失敗しました。もう一度お試しください。")
    } finally {
      setOperationInProgress(false)
    }
  }

  const handleMoveDown = async (id: string) => {
    setOperationInProgress(true)
    try {
      await moveBoxDown(id)
    } catch (error) {
      console.error("Error moving box down:", error)
      alert("順序の変更に失敗しました。もう一度お試しください。")
    } finally {
      setOperationInProgress(false)
    }
  }

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
      <div className="py-16">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">エラーが発生しました</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2">ページを再読み込みするか、しばらく経ってからお試しください。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 既存のBOX買取表一覧 */}
      {boxes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">既存のBOX買取表</h2>
            <Button variant="outline" size="sm" onClick={() => setShowOrderControls(!showOrderControls)}>
              <GripVertical className="h-4 w-4 mr-2" />
              {showOrderControls ? "順序変更を終了" : "順序を変更"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boxes.map((box, index) => (
              <Card key={box.id} className="overflow-hidden">
                <div className="aspect-video overflow-hidden bg-muted relative">
                  <img
                    src={getResizedImageUrl(box.imageUrl, 400, 300) || "/placeholder.svg"}
                    alt={`${box.name}のBOX買取表`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2">
                    <Badge
                      className={`${getCardTypeColor(box.cardType).badgeBg} ${getCardTypeColor(box.cardType).badgeText} text-xs px-2 py-1 font-medium`}
                    >
                      {box.cardType}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2">{box.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">{box.storeName}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-sm text-muted-foreground">{box.location}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end ml-2">
                      <p className="text-xs text-muted-foreground">{box.date}</p>
                      {showOrderControls && <p className="text-xs text-muted-foreground mt-1">順序: {index + 1}</p>}
                    </div>
                  </div>

                  {showOrderControls ? (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveUp(box.id)}
                        disabled={index === 0 || operationInProgress}
                      >
                        {operationInProgress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMoveDown(box.id)}
                        disabled={index === boxes.length - 1 || operationInProgress}
                      >
                        {operationInProgress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditBox(box)}
                        disabled={operationInProgress}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(box.id)}
                        disabled={operationInProgress}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        削除
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {showOrderControls && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <GripVertical className="h-4 w-4 inline mr-1" />
                上下ボタンでBOX買取表の表示順序を変更できます。変更は自動的に保存されます。
              </p>
            </div>
          )}
        </div>
      )}

      {/* 新規追加/編集フォーム */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEditing ? "BOX買取表を編集" : "新しいBOX買取表を追加"}</CardTitle>
          <CardDescription>
            {isEditing
              ? "既存のBOX買取表情報を編集してください。"
              : "BOXの買取表情報を入力してください。画像はドラッグ＆ドロップでもアップロードできます。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="store-name">店舗名 *</Label>
              <Input
                id="store-name"
                placeholder="カードラボ梅田"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                required
                disabled={operationInProgress}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="box-name">BOX名</Label>
              <Input
                id="box-name"
                placeholder="ポケモンカード 拡張パック「黒炎の支配者」"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={operationInProgress}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">都道府県 *</Label>
                <Select
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                  disabled={operationInProgress}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="都道府県を選択" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {PREFECTURES.map((prefecture) => (
                      <SelectItem key={prefecture} value={prefecture}>
                        {prefecture}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="card-type">カードタイプ *</Label>
                <Select
                  value={formData.cardType}
                  onValueChange={(value) => setFormData({ ...formData, cardType: value })}
                  disabled={operationInProgress}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="カードタイプを選択">
                      {formData.cardType && (
                        <div className="flex items-center gap-2">
                          <Badge
                            className={`${getCardTypeColor(formData.cardType).badgeBg} ${getCardTypeColor(formData.cardType).badgeText} text-xs px-2 py-1`}
                          >
                            {formData.cardType}
                          </Badge>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ポケカ">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-500 text-white text-xs px-2 py-1">ポケカ</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="遊戯王">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-500 text-white text-xs px-2 py-1">遊戯王</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="MTG">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500 text-white text-xs px-2 py-1">MTG</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="ワンピース">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500 text-white text-xs px-2 py-1">ワンピース</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="デュエマ">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-500 text-white text-xs px-2 py-1">デュエマ</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="detail-url">詳細URL *</Label>
              <Input
                id="detail-url"
                placeholder="https://example.com/box-buyback-list"
                value={formData.detailUrl}
                onChange={(e) => setFormData({ ...formData, detailUrl: e.target.value })}
                required
                disabled={operationInProgress}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-upload">BOX画像</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
                  dragActive
                    ? "border-primary bg-primary/10 scale-[1.02] shadow-lg"
                    : "border-muted-foreground/20 hover:border-muted-foreground/40"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={isUploading || operationInProgress}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center gap-4">
                  {previewImageUrls.length > 0 ? (
                    <div className="w-full space-y-4">
                      <div className="relative group">
                        <div className="relative overflow-hidden rounded-lg bg-muted">
                          <img
                            src={previewImageUrls[selectedImageIndex] || "/placeholder.svg"}
                            alt="BOX買取表プレビュー"
                            className="w-full h-auto rounded-lg transition-transform duration-200 group-hover:scale-105"
                          />

                          {previewImageFiles[selectedImageIndex] && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="truncate">{previewImageFiles[selectedImageIndex].name}</span>
                                <span>{(previewImageFiles[selectedImageIndex].size / 1024 / 1024).toFixed(1)}MB</span>
                              </div>
                            </div>
                          )}

                          {dragActive && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center rounded-lg">
                              <div className="bg-white/90 rounded-full p-4">
                                <Upload className="h-8 w-8 text-primary" />
                              </div>
                            </div>
                          )}

                          {previewImageUrls.length > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={navigateToPreviousImage}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                                disabled={isUploading || operationInProgress}
                              >
                                <ChevronLeft className="h-6 w-6" />
                              </button>
                              <button
                                type="button"
                                onClick={navigateToNextImage}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none"
                                disabled={isUploading || operationInProgress}
                              >
                                <ChevronRight className="h-6 w-6" />
                              </button>
                            </>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={() => {
                            const newFiles = previewImageFiles.filter((_, index) => index !== selectedImageIndex)
                            const newUrls = previewImageUrls.filter((_, index) => index !== selectedImageIndex)

                            URL.revokeObjectURL(previewImageUrls[selectedImageIndex])

                            setPreviewImageFiles(newFiles)
                            setPreviewImageUrls(newUrls)

                            if (newFiles.length === 0) {
                              setImageUrl("")
                              setSelectedImageIndex(0)
                            } else {
                              const newIndex =
                                selectedImageIndex >= newFiles.length ? newFiles.length - 1 : selectedImageIndex
                              setSelectedImageIndex(newIndex)
                              setImageUrl(newUrls[newIndex])
                            }
                          }}
                          disabled={isUploading || operationInProgress}
                        >
                          <X className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading || operationInProgress || previewImageFiles.length >= 20}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          追加
                        </Button>
                      </div>

                      {previewImageUrls.length > 1 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={navigateToPreviousImage}
                              disabled={isUploading || operationInProgress}
                              className="h-8 w-8"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm">
                              {selectedImageIndex + 1} / {previewImageUrls.length}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={navigateToNextImage}
                              disabled={isUploading || operationInProgress}
                              className="h-8 w-8"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">← → キーでも画像を切り替えられます</p>
                        </div>
                      )}

                      {previewImageUrls.length > 1 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">画像一覧</p>
                          <div className="grid grid-cols-5 gap-2">
                            {previewImageUrls.map((url, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => {
                                  setSelectedImageIndex(index)
                                  setImageUrl(url)
                                }}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                  selectedImageIndex === index
                                    ? "border-primary ring-2 ring-primary/20"
                                    : "border-muted hover:border-muted-foreground"
                                }`}
                                disabled={isUploading || operationInProgress}
                              >
                                <img
                                  src={url || "/placeholder.svg"}
                                  alt={`プレビュー ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                {selectedImageIndex === index && (
                                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                    <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                      ✓
                                    </div>
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">選択された画像がBOX買取表として使用されます</p>
                        </div>
                      )}

                      {previewImageFiles.length < 20 && (
                        <div className="flex justify-center mt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading || operationInProgress}
                            className="transition-all hover:scale-105"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            画像を追加 ({previewImageFiles.length}/20)
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full text-center">
                      {dragActive ? (
                        <div className="animate-pulse">
                          <div className="bg-primary/20 rounded-full p-6 mx-auto w-fit mb-4">
                            <Upload className="h-12 w-12 text-primary" />
                          </div>
                          <p className="text-lg font-medium text-primary">ここにドロップしてください</p>
                          <p className="text-sm text-muted-foreground mt-1">画像ファイルを離してアップロード</p>
                        </div>
                      ) : (
                        <>
                          <div className="bg-muted rounded-full p-6 mx-auto w-fit mb-4 transition-colors hover:bg-muted/80">
                            <Upload className="h-12 w-12 text-muted-foreground" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">ここに画像をドラッグ&ドロップするか</p>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading || operationInProgress}
                              className="transition-all hover:scale-105"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              ファイルを選択
                            </Button>
                          </div>
                          <div className="mt-4 space-y-1">
                            <p className="text-xs text-muted-foreground">対応形式: JPG, PNG, GIF, WebP</p>
                            <p className="text-xs text-muted-foreground">最大サイズ: 10MB（最大20枚まで）</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {isUploading && (
                    <div className="flex items-center gap-2 text-sm bg-primary/10 text-primary px-3 py-2 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      アップロード中...
                    </div>
                  )}

                  {uploadError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-md w-full">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div className="whitespace-pre-line">{uploadError}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <label>
            <input
              type="checkbox"
              checked={hotBadgeStatus}
              onChange={(e) => setHotBadgeStatus(e.target.checked)}
            />
            Hot 
          </label>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={isUploading || operationInProgress}>
                {operationInProgress ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? "更新中..." : "追加中..."}
                  </>
                ) : isEditing ? (
                  "更新する"
                ) : (
                  "追加する"
                )}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm} disabled={operationInProgress}>
                  キャンセル
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>BOX買取表の削除</DialogTitle>
            <DialogDescription>このBOX買取表を削除してもよろしいですか？この操作は元に戻せません。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={operationInProgress}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={operationInProgress}>
              {operationInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  削除中...
                </>
              ) : (
                "削除する"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
