export interface Box {
  id: string
  storeName: string // 店舗名を追加
  name: string // BOX名
  location: string // 都道府県
  cardType: string // カードタイプ
  imageUrl: string
  imageUrls?: string[]
  date: string
  order: number
  detailUrl?: string // URL
  description?: string
  keywords?: string[]
  createdAt?: string
  updatedAt?: string
  is_hot?: boolean // ホットバッジの状態
}
