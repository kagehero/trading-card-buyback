import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            トップページに戻る
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">プライバシーポリシー</h1>
          <p className="text-gray-600 mt-2">最終更新日: 2025年6月1日</p>
        </div>

        {/* プライバシーポリシー内容 */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose max-w-none">
            <h2>第1条（取得する情報）</h2>
            <p>当サイトでは、以下の情報を取得する場合があります：</p>
            <ul>
              <li>利用端末の種類、ブラウザ、OS等の技術情報</li>
              <li>IPアドレス、アクセス日時、閲覧ページ等のログ情報</li>
              <li>Cookie（クッキー）等を通じた匿名データ</li>
            </ul>
            <p>なお、ユーザー登録機能はなく、氏名・メールアドレス等の個人情報は取得しておりません。</p>

            <h2>第2条（利用目的）</h2>
            <p>取得した情報は以下の目的で利用されます：</p>
            <ul>
              <li>サービスの利便性向上および機能改善</li>
              <li>アクセス解析、統計データ作成</li>
              <li>不正利用防止およびセキュリティ強化</li>
              <li>ユーザーへの有益なコンテンツ・広告の提供</li>
            </ul>

            <h2>第3条（Cookieの使用について）</h2>
            <p>
              当サイトではCookieを使用する場合があります。Cookieの使用を希望されない場合、ブラウザの設定により無効化が可能です。
            </p>

            <h2>第4条（広告およびアフィリエイトプログラムについて）</h2>
            <p>
              当サイトは、以下のアフィリエイト・広告プログラムに参加しています：
              <br />
              ・Amazonアソシエイト・プログラム
              <br />
              ・A8.net、もしもアフィリエイトなどのASP
            </p>
            <p>
              これらのプログラムによって、ユーザーがリンク経由で商品・サービスを購入した場合、当サイトが報酬を受け取ることがあります。
            </p>

            <h2>第5条（第三者サービスの利用）</h2>
            <p>当サイトでは以下の外部サービスを利用する場合があります：</p>
            <ul>
              <li>Google Analytics（アクセス解析）</li>
              <li>Google AdSense（広告配信／将来的に導入予定）</li>
            </ul>
            <p>
              これらのサービスはクッキー等を通じて情報を取得する場合があります。取扱いは各サービスのプライバシーポリシーに従います。
            </p>

            <h2>第6条（第三者提供）</h2>
            <p>当サイトは、法令に基づく場合を除き、ユーザーの同意なく情報を第三者に提供することはありません。</p>

            <h2>第7条（安全管理）</h2>
            <p>取得した情報の漏洩、滅失、毀損を防ぐため、適切な安全管理措置を講じます。</p>

            <h2>第8条（法令遵守）</h2>
            <p>当サイトは、個人情報保護に関する日本の法令およびその他の規範を遵守します。</p>

            <h2>第9条（プライバシーポリシーの変更）</h2>
            <p>
              本ポリシーは、法令改正・サービス変更に応じて、事前予告なく変更されることがあります。変更後の内容は、当サイトに掲載された時点で適用されます。
            </p>

            <h2>第10条（お問い合わせ）</h2>
            <p>
              本ポリシーに関するお問い合わせは、以下の窓口よりお願いいたします：
              <br />
              お問い合わせフォーム：
              <Link href="/others/contact" className="text-blue-600 hover:text-blue-800">
                こちら
              </Link>
              <br />
              メール：info@torekacompass.jp
            </p>

            <p className="mt-6 text-sm text-gray-500">制定日：2025年6月1日</p>
          </div>
        </div>
      </div>
    </div>
  )
}
