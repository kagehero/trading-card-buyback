"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface FilterBarProps {
  onFilterChange: (filters: { title: string | null; region: string | null; date: string | null }) => void
}

// カードタイプの色設定
const getCardTypeColor = (cardType: string) => {
  switch (cardType) {
    case "ポケカ":
      return {
        bg: "bg-yellow-100 hover:bg-yellow-200",
        text: "text-yellow-800",
        border: "border-yellow-300",
        badgeBg: "bg-yellow-500",
        badgeText: "text-white",
      }
    case "遊戯王":
      return {
        bg: "bg-purple-100 hover:bg-purple-200",
        text: "text-purple-800",
        border: "border-purple-300",
        badgeBg: "bg-purple-500",
        badgeText: "text-white",
      }
    case "MTG":
      return {
        bg: "bg-blue-100 hover:bg-blue-200",
        text: "text-blue-800",
        border: "border-blue-300",
        badgeBg: "bg-blue-500",
        badgeText: "text-white",
      }
    case "ワンピース":
      return {
        bg: "bg-red-100 hover:bg-red-200",
        text: "text-red-800",
        border: "border-red-300",
        badgeBg: "bg-red-500",
        badgeText: "text-white",
      }
    case "デュエマ":
      return {
        bg: "bg-green-100 hover:bg-green-200",
        text: "text-green-800",
        border: "border-green-300",
        badgeBg: "bg-green-500",
        badgeText: "text-white",
      }
    default:
      return {
        bg: "bg-gray-100 hover:bg-gray-200",
        text: "text-gray-800",
        border: "border-gray-300",
        badgeBg: "bg-gray-500",
        badgeText: "text-white",
      }
  }
}

export function FilterBar({ onFilterChange }: FilterBarProps) {
  const [titleFilter, setTitleFilter] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>("新しい順")

  // ドロップダウンメニューの表示/非表示を制御する状態を追加
  // これにより、各ドロップダウンを個別に開閉できるようになります
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // ドロップダウンの開閉を制御する関数
  const handleDropdownToggle = (dropdown: string) => {
    if (openDropdown === dropdown) {
      setOpenDropdown(null)
    } else {
      setOpenDropdown(dropdown)
    }
  }

  const titles = ["ポケカ", "遊戯王", "MTG", "ワンピース", "デュエマ"]

  const titleColors = titleFilter ? getCardTypeColor(titleFilter) : null

  return (
    <div className="flex flex-row gap-2 sm:gap-4">
      <div className="relative flex-1 sm:w-60">
        <Button
          variant="outline"
          className={`w-full justify-between text-sm ${
            titleColors ? `${titleColors.bg} ${titleColors.text} ${titleColors.border}` : ""
          }`}
          onClick={() => handleDropdownToggle("title")}
        >
          <div className="flex items-center gap-2">
            {titleFilter && (
              <Badge className={`${titleColors?.badgeBg} ${titleColors?.badgeText} text-xs px-1.5 py-0.5`}>
                {titleFilter}
              </Badge>
            )}
            {!titleFilter && "タイトル"}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        {openDropdown === "title" && (
          <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
            <div className="py-1">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setTitleFilter(null)
                  onFilterChange({ title: null, region: regionFilter, date: dateFilter })
                  setOpenDropdown(null)
                }}
              >
                すべて
              </button>
              {titles.map((title) => {
                const colors = getCardTypeColor(title)
                return (
                  <button
                    key={title}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                    onClick={() => {
                      setTitleFilter(title)
                      onFilterChange({ title, region: regionFilter, date: dateFilter })
                      setOpenDropdown(null)
                    }}
                  >
                    <Badge className={`${colors.badgeBg} ${colors.badgeText} text-sm px-3 py-1`}>{title}</Badge>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="relative flex-1 sm:w-60">
        <Button
          variant="outline"
          className="w-full justify-between text-sm"
          onClick={() => handleDropdownToggle("region")}
        >
          {regionFilter || "地域"}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        {openDropdown === "region" && (
          <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
            <div className="py-1">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setRegionFilter(null)
                  onFilterChange({ title: titleFilter, region: null, date: dateFilter })
                  setOpenDropdown(null)
                }}
              >
                すべて
              </button>
              {PREFECTURES.map((prefecture) => (
                <button
                  key={prefecture}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  onClick={() => {
                    setRegionFilter(prefecture)
                    onFilterChange({ title: titleFilter, region: prefecture, date: dateFilter })
                    setOpenDropdown(null)
                  }}
                >
                  {prefecture}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="relative flex-1 sm:w-60">
        <Button
          variant="outline"
          className="w-full justify-between text-sm"
          onClick={() => handleDropdownToggle("date")}
        >
          {dateFilter || "掲載日"}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
        {openDropdown === "date" && (
          <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
            <div className="py-1">
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setDateFilter(null)
                  onFilterChange({ title: titleFilter, region: regionFilter, date: null })
                  setOpenDropdown(null)
                }}
              >
                すべて
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setDateFilter("新しい順")
                  onFilterChange({ title: titleFilter, region: regionFilter, date: "新しい順" })
                  setOpenDropdown(null)
                }}
              >
                新しい順
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                onClick={() => {
                  setDateFilter("古い順")
                  onFilterChange({ title: titleFilter, region: regionFilter, date: "古い順" })
                  setOpenDropdown(null)
                }}
              >
                古い順
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// カードタイプの色設定をエクスポート（他のコンポーネントでも使用するため）
export { getCardTypeColor }
