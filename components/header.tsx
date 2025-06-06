"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LogOut, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SessionStatus } from "@/components/session-status"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function Header() {
  const pathname = usePathname()
  const { isAuthenticated, logout, user } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="border-b bg-white fixed top-0 z-50 shadow-sm border-b-0 w-full">
      <div className="container mx-auto px-4 py-1 sm:py-2 flex items-center justify-between h-[58px] sm:h-[63px] md:h-[68px]">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image
            src="/images/logo-alt.png"
            alt="トレカコンパス"
            width={200}
            height={60}
            className="h-8 w-auto sm:h-10 md:h-12"
            priority
          />
        </Link>

        <div className="flex items-center gap-4">
          <nav>
            <ul className="flex items-center gap-4">
              <li>
                <Link
                  href="/"
                  className={pathname === "/" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                >
                  ホーム
                </Link>
              </li>
              {isAuthenticated && (
                <>
                  <li>
                    <Link
                      href="/post"
                      className={pathname === "/post" ? "font-medium" : "text-muted-foreground hover:text-foreground"}
                    >
                      管理
                    </Link>
                  </li>
                  <li>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          {user?.email?.split("@")[0] || "管理者"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Settings className="h-4 w-4 mr-2" />
                              セッション状態
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>セッション管理</DialogTitle>
                            </DialogHeader>
                            <SessionStatus />
                          </DialogContent>
                        </Dialog>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                          <LogOut className="h-4 w-4 mr-2" />
                          ログアウト
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
}
