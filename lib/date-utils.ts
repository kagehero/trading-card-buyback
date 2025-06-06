/**
 * 指定された日時が24時間以内かどうかを判定する
 */
export function isWithin24Hours(dateString: string | undefined): boolean {
  if (!dateString) return false

  try {
    const targetDate = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - targetDate.getTime()) / (1000 * 60 * 60)

    return diffInHours <= 24 && diffInHours >= 0
  } catch (error) {
    console.error("Error parsing date:", error)
    return false
  }
}

/**
 * 作成日時または更新日時のいずれかが24時間以内かどうかを判定する
 */
export function isNewOrUpdated(createdAt: string | undefined, updatedAt: string | undefined): boolean {
  return isWithin24Hours(createdAt) || isWithin24Hours(updatedAt)
}

/**
 * 残り時間を計算する（デバッグ用）
 */
export function getTimeUntilExpiry(dateString: string | undefined): string {
  if (!dateString) return ""

  try {
    const targetDate = new Date(dateString)
    const expiryDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000) // 24時間後
    const now = new Date()
    const diffInMinutes = Math.max(0, Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60)))

    if (diffInMinutes === 0) return "期限切れ"

    const hours = Math.floor(diffInMinutes / 60)
    const minutes = diffInMinutes % 60

    return `${hours}時間${minutes}分後に消える`
  } catch (error) {
    return ""
  }
}
