"use client"

import { useState } from "react"
import { AdminTabNavigation } from "@/components/admin-tab-navigation"
import { StoreManagement } from "@/components/store-management"
import { BoxManagement } from "@/components/box-management"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"

export default function PostPage() {
  const [activeTab, setActiveTab] = useState<"trading-cards" | "boxes">("trading-cards")

  // 5分ごとに自動リフレッシュ
  useAutoRefresh(5)

  return (
    <main className="container mx-auto px-1 sm:px-4 py-0 relative">
      {/* 虹色の線をヘッダーの下に固定 */}
      <div
        className="fixed top-[58px] sm:top-[63px] md:top-[68px] left-0 w-full h-[2px] z-40"
        style={{
          background: "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)",
        }}
      ></div>

      {/* メインコンテンツ（タブナビゲーションを含む） */}
      <div className="pt-[60px] sm:pt-[65px] md:pt-[70px] px-1 sm:px-0">
        <div className="mt-6 mb-4">
          <AdminTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* コンテンツエリア - 最小高さを設定してレイアウトシフトを防ぐ */}
        <div className="min-h-[calc(100vh-200px)] relative">
          {/* タブコンテンツを絶対配置でオーバーレイし、フェード効果を追加 */}
          <div
            className={`absolute inset-0 transition-all duration-300 ease-in-out ${
              activeTab === "trading-cards"
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <StoreManagement />
          </div>

          <div
            className={`absolute inset-0 transition-all duration-300 ease-in-out ${
              activeTab === "boxes"
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            <BoxManagement />
          </div>
        </div>
      </div>

      {/* CSS アニメーション */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  )
}
