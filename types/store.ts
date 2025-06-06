// Store型に複数画像のフィールドを追加
export interface Store {
  id: string
  name: string
  location: string
  cardType: string
  imageUrl: string
  imageUrls?: string[] // 複数画像のURLを保存するフィールドを追加
  date: string
  order: number // 表示順序を追加
  isOutdated?: boolean
  detailUrl?: string
  cardNames?: string[] // 取り扱いカード名
  keywords?: string[] // 検索用キーワード
  description?: string // 店舗説明
  createdAt?: string // 作成日時を追加
  updatedAt?: string // 更新日時を追加
  is_hot?: boolean // ホットバッジの状態
}
