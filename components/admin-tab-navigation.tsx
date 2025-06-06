"use client"
import { Button } from "@/components/ui/button"
import { Package, CreditCard } from "lucide-react"

interface AdminTabNavigationProps {
  activeTab: "trading-cards" | "boxes"
  onTabChange: (tab: "trading-cards" | "boxes") => void
}

export function AdminTabNavigation({ activeTab, onTabChange }: AdminTabNavigationProps) {
  return (
    <div className="flex gap-1 sm:gap-2 p-1 bg-muted rounded-lg w-full sticky top-[70px] sm:top-[75px] md:top-[80px] z-30 backdrop-blur-sm">
      <Button
        variant={activeTab === "trading-cards" ? "default" : "ghost"}
        size="default"
        onClick={() => onTabChange("trading-cards")}
        className={`flex-1 flex items-center justify-center gap-2 transition-all duration-200 ${
          activeTab === "trading-cards" ? "bg-slate-200 font-medium shadow-sm text-black" : "hover:bg-background/50"
        }`}
      >
        <CreditCard className="h-4 w-4" />
        <span className="hidden sm:inline">トレカ管理</span>
        <span className="sm:hidden">トレカ</span>
      </Button>
      <Button
        variant={activeTab === "boxes" ? "default" : "ghost"}
        size="default"
        onClick={() => onTabChange("boxes")}
        className={`flex-1 flex items-center justify-center gap-2 transition-all duration-200 ${
          activeTab === "boxes" ? "bg-slate-200 font-medium shadow-sm text-black" : "hover:bg-background/50"
        }`}
      >
        <Package className="h-4 w-4" />
        <span className="hidden sm:inline">BOX管理</span>
        <span className="sm:hidden">BOX</span>
      </Button>
    </div>
  )
}
