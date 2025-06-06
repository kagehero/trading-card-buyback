"use client"

import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

interface FilterStatusProps {
  filters: {
    title: string | null
    region: string | null
    date: string | null
  }
  onClearFilter: (filterType: "title" | "region" | "date") => void
}

export function FilterStatus({ filters, onClearFilter }: FilterStatusProps) {
  const hasActiveFilters = filters.title || filters.region || filters.date

  if (!hasActiveFilters) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <span className="text-sm text-muted-foreground self-center">適用中のフィルター:</span>

      {filters.title && (
        <Badge variant="secondary" className="flex items-center gap-1">
          タイトル: {filters.title}
          <button
            onClick={() => onClearFilter("title")}
            className="ml-1 rounded-full hover:bg-muted p-0.5"
            aria-label={`${filters.title}フィルターを解除`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.region && (
        <Badge variant="secondary" className="flex items-center gap-1">
          地域: {filters.region}
          <button
            onClick={() => onClearFilter("region")}
            className="ml-1 rounded-full hover:bg-muted p-0.5"
            aria-label={`${filters.region}フィルターを解除`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {filters.date && (
        <Badge variant="secondary" className="flex items-center gap-1">
          掲載日: {filters.date}
          <button
            onClick={() => onClearFilter("date")}
            className="ml-1 rounded-full hover:bg-muted p-0.5"
            aria-label={`${filters.date}フィルターを解除`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
    </div>
  )
}
