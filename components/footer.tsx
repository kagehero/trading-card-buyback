"use client"

import Link from "next/link"
import Image from "next/image"

export const Footer = () => {
  return (
    <div className="bg-gray-50 w-full">
      {/* <div className="top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500"></div> */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* ロゴとリンクを横並びに */}
        <div className="flex flex-col sm:flex-row justify-between items-center">
          {/* ロゴセクション */}
          <div className="mb-4 sm:mb-0">
            <Link href="/" className="flex items-center space-x-3">
              <Image
                src="/images/treka-compass-logo.png"
                alt="トレカコンパス"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-gray-900">トレカコンパス</span>
            </Link>
          </div>

          {/* リンクセクション - 横並び */}
          <div className="flex space-x-8">
            {/* サービス */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">サービス</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    買取価格一覧
                  </Link>
                </li>
                <li>
                  <Link href="/others/contact" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    お問い合わせ
                  </Link>
                </li>
              </ul>
            </div>

            {/* 法的情報 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">法的情報</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/others/tos" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    利用規約
                  </Link>
                </li>
                <li>
                  <Link href="/others/policy" className="text-gray-600 hover:text-gray-900 text-sm transition-colors">
                    プライバシーポリシー
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* コピーライト */}
        <div className="border-t border-gray-200 mt-4 pt-4">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} トレカコンパス. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
