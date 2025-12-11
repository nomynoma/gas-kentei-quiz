# 設定ガイド - config.js 一元管理

**すべての設定は `config.js` で一元管理されています！**

このドキュメントでは、`config.js` を使った設定変更方法を説明します。

---

## 🎯 重要：すべての設定はconfig.jsに集約

以下の**すべての設定**が `config.js` ファイル1つで管理されています：

- ✅ ホスティング先URL
- ✅ Google Apps Script デプロイURL
- ✅ Favicon / OGP画像のURL
- ✅ 合格証明書背景画像のURL（全18パターン）

**config.jsを編集するだけで、すべてのURLを一括変更できます！**

---

## 目次

1. [クイックスタート](#クイックスタート)
2. [デプロイ手順](#デプロイ手順)
3. [ホスティング先を変更する](#ホスティング先を変更する)
4. [GASデプロイURLを変更する](#gasデプロイurlを変更する)
5. [ジャンル名を変更する](#ジャンル名を変更する)
6. [個別の画像URLをカスタマイズする](#個別の画像urlをカスタマイズする)
7. [GoogleDrive共有リンクの使い方](#googledrive共有リンクの使い方)
8. [キャッシュとパフォーマンス](#キャッシュとパフォーマンス)
9. [トラブルシューティング](#トラブルシューティング)

---

## クイックスタート

### config.js の構造

```javascript
// ========================================
// 基本設定
// ========================================
const HOSTING_BASE_URL = 'https://your-hosting.com';
const GAS_DEPLOYMENT_URL = 'https://script.google.com/macros/s/.../exec';

// ========================================
// ジャンル設定
// ========================================
const GENRE_NAMES = ['ジャンル1', 'ジャンル2', ...];

// ========================================
// 画像URL設定
// ========================================
const IMAGE_URLS = { ... };
const CERTIFICATE_BG_IMAGE_MAP = { ... };
const CERTIFICATE_BASE_URL = HOSTING_BASE_URL + '/certificate/';
```

### 最小限の変更（ホスティング先のみ変更）

`config.js` の1行目を変更するだけでOK：

```javascript
const HOSTING_BASE_URL = 'https://new-hosting.com';  // ← ここだけ変更
```

これだけで、全ての画像URLが自動的に新しいホスティング先を参照します！

---

## 📖 仕組みの説明

### config.js の読み込み方法

このプロジェクトでは、**単一の `config.js` ファイル**をすべての場所から参照しています：

#### 🌐 GitHub Pages（index.html）
```html
<script src="config.js"></script>
```
通常の JavaScript として読み込み

#### ⚙️ GAS（gas/index.html）
```html
<script>
<?!= getConfigFromGitHub(); ?>
</script>
```
GAS が GitHub Pages の `config.js` を動的に取得して埋め込み

### メリット
✅ **単一の真実の情報源**: `config.js` を編集するだけでOK
✅ **自動同期**: GitHub Pages にプッシュすれば、GAS も最新版を取得
✅ **ファイル重複なし**: コピーやシンボリックリンク不要

### 必要な権限

GAS が GitHub Pages から `config.js` を取得するため、以下の権限が必要です：

**`gas/appsscript.json`:**
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

この権限により、GAS が `UrlFetchApp.fetch()` で外部 URL にアクセスできます。

---

## デプロイ手順

変更をデプロイする際は、**必ず以下の順序で実行**してください。

### 📦 標準デプロイ手順

```bash
# 1. GitHubにプッシュ（GitHub Pagesにデプロイ）
git add .
git commit -m "設定更新"
git push origin main

# 2. GitHub Pagesの反映を待つ（通常1-2分）
# ブラウザで https://nomynoma.github.io/gas-kentei-quiz/config.js にアクセスして確認

# 3. GASにプッシュ（gas/ディレクトリをGASにアップロード）
cd gas
clasp push
```

### ⚠️ 重要：デプロイの順序

**必ず GitHub → GAS の順番でデプロイしてください！**

理由：
- `gas/index.html` は GitHub Pages の `script.js` を読み込んでいる
- 先に GitHub Pages にファイルがないと、GAS からアクセスできずエラーになる

### 🚀 ワンライナーでデプロイ

プロジェクトルートで以下を実行：

```bash
git add . && git commit -m "設定更新" && git push origin main && timeout /t 60 /nobreak && cd gas && clasp push && cd ..
```

**Windowsの場合（PowerShell）:**
```powershell
git add .; git commit -m "設定更新"; git push origin main; Start-Sleep -Seconds 60; cd gas; clasp push; cd ..
```

**Mac/Linuxの場合:**
```bash
git add . && git commit -m "設定更新" && git push origin main && sleep 60 && cd gas && clasp push && cd ..
```

※ `timeout /t 60` (Windows) / `sleep 60` (Mac/Linux) は、GitHub Pagesの反映を待つための60秒待機です

### 📝 デプロイ後の確認

1. ブラウザのキャッシュをクリア（`Ctrl+Shift+R` / `Cmd+Shift+R`）
2. GASアプリを開いて動作確認
3. ブラウザのコンソール（F12）でエラーがないか確認

---

## ホスティング先を変更する

### 簡単3ステップ

#### ステップ1: config.js を編集

```javascript
// ホスティング先のベースURL（末尾にスラッシュ不要）
const HOSTING_BASE_URL = 'https://nomynoma.github.io/gas-kentei-quiz';

// Google Apps Script デプロイURL
// GASで「ウェブアプリとして導入」で取得したURLをここに設定
const GAS_DEPLOYMENT_URL = 'https://script.google.com/macros/s/YOUR_GAS_DEPLOYMENT_ID/exec';
```

**HOSTING_BASE_URL の変更例:**
- Netlify: `https://your-app.netlify.app`
- Vercel: `https://your-app.vercel.app`
- Cloudflare Pages: `https://your-app.pages.dev`
- カスタムドメイン: `https://quiz.example.com`

**GAS_DEPLOYMENT_URL の取得方法:**
1. Google Apps Scriptのエディタを開く
2. 右上の「デプロイ」→「新しいデプロイ」
3. 「ウェブアプリ」を選択
4. 「デプロイ」をクリック
5. 表示されたURLをコピーして、`GAS_DEPLOYMENT_URL` に設定

#### ステップ2: 新しいホスティング先にファイルをアップロード

以下のファイルとフォルダを全てアップロードしてください：

```
gas-kentei-quiz/
├── config.js           ← 必ず最新版！
├── script.js
├── style.css
├── imgs/               ← フォルダごと全て
│   ├── favicon.svg
│   ├── favicon_certificate.svg
│   ├── ogp-image.png
│   └── frame_hyousyoujyou_*.jpg (全18ファイル)
└── certificate/        ← フォルダごと全て
    ├── index.html
    ├── script.js
    └── style.css
```

#### ステップ3: GASのHTMLファイルを更新（GASを使用する場合のみ）

`gas/index.html` の読み込みURLを変更します：

```html
<!-- 変更前 -->
<link rel="stylesheet" href="https://nomynoma.github.io/gas-kentei-quiz/style.css">
<script src="https://nomynoma.github.io/gas-kentei-quiz/config.js"></script>
<script src="https://nomynoma.github.io/gas-kentei-quiz/script.js"></script>

<!-- 変更後（例: Netlifyの場合）-->
<link rel="stylesheet" href="https://your-app.netlify.app/style.css">
<script src="https://your-app.netlify.app/config.js"></script>
<script src="https://your-app.netlify.app/script.js"></script>
```

**これだけで完了！** 全ての画像URLが自動的に新しいホスティング先を参照します。

---

## GASデプロイURLを変更する

Google Apps Scriptを再デプロイした場合や、別のGASプロジェクトに移行する場合は、`config.js` の `GAS_DEPLOYMENT_URL` を変更するだけでOKです。

### 手順

#### 1. 新しいGASデプロイURLを取得

1. Google Apps Scriptエディタを開く
2. 右上の「デプロイ」→「デプロイを管理」
3. デプロイURLをコピー（例: `https://script.google.com/macros/s/AKfyc.../exec`）

#### 2. config.js を編集

```javascript
// GAS_DEPLOYMENT_URL を新しいURLに変更
const GAS_DEPLOYMENT_URL = 'https://script.google.com/macros/s/NEW_DEPLOYMENT_ID/exec';
```

#### 3. 変更後の影響範囲

以下のファイルが自動的に新しいGAS URLを参照します：

- `index.html` - トップページのiframe
- `certificate/script.js` - 合格証ページからのGAS呼び出し

**GASのコードは変更不要**です。`config.js` を更新するだけで、全ての参照が自動更新されます。

---

## ジャンル名を変更する

ジャンル名は `config.js` の `GENRE_NAMES` 配列で一元管理されています。この配列を変更すると、すべての箇所で自動的に反映されます。

### 重要：スプレッドシートのシート名と一致させる

**ジャンル名はGoogleスプレッドシートのシート名と完全に一致させる必要があります。**

### 手順

#### 1. Googleスプレッドシートのシート名を確認

問題データが格納されているスプレッドシートで、各シートの名前を確認します。

例：
- シート名: `JavaScript入門`
- シート名: `HTML基礎`
- シート名: `CSS応用`
- ...

#### 2. config.js の GENRE_NAMES を変更

`config.js` の `GENRE_NAMES` 配列を、スプレッドシートのシート名と同じにします：

```javascript
// 変更前
const GENRE_NAMES = [
  'ジャンル1',
  'ジャンル2',
  'ジャンル3',
  'ジャンル4',
  'ジャンル5',
  'ジャンル6'
];

// 変更後（例：プログラミング言語の問題集の場合）
const GENRE_NAMES = [
  'JavaScript入門',
  'HTML基礎',
  'CSS応用',
  'React実践',
  'Node.js入門',
  'TypeScript基礎'
];
```

#### 3. 変更後の影響範囲

以下が自動的に更新されます：

- ✅ **ジャンル選択画面のボタン** - 新しいジャンル名が表示される
- ✅ **GASへのリクエスト** - 新しいジャンル名でスプレッドシートを検索
- ✅ **合格証明書** - 新しいジャンル名が表示される
- ✅ **SNS共有テキスト** - 新しいジャンル名が使用される

#### 4. GAS側の対応（必要に応じて）

`gas/code.js` では、配列を使用している箇所があります。必要に応じて更新してください：

```javascript
// gas/code.js の clearAllCache() 関数などで使用
var genres = ['ジャンル1', 'ジャンル2', ...];
```

これを `config.js` の `GENRE_NAMES` と同じ内容に変更するか、GAS側でも動的に対応するように修正してください。

### 注意点

- ジャンル数を変更する場合は、合格証明書の背景画像も対応する数だけ用意してください
- ジャンル数を減らす場合は、`CERTIFICATE_BG_IMAGE_MAP` からも不要なキーを削除してください
- ジャンル数を増やす場合は、`CERTIFICATE_BG_IMAGE_MAP` に新しいキーと画像URLを追加してください

---

## 個別の画像URLをカスタマイズする

特定の画像だけGoogleDriveの共有リンクを使いたい場合など、個別にカスタマイズできます。

**重要**: すべての画像設定は `config.js` にあります。

### 共通画像のカスタマイズ

`config.js` の `IMAGE_URLS` を編集：

```javascript
// デフォルト（HOSTING_BASE_URLから自動生成）
const IMAGE_URLS = {
  favicon: HOSTING_BASE_URL + '/imgs/favicon.svg',
  faviconCertificate: HOSTING_BASE_URL + '/imgs/favicon_certificate.svg',
  ogpImage: HOSTING_BASE_URL + '/imgs/ogp-image.png'
};

// 一部だけカスタマイズする例
const IMAGE_URLS = {
  favicon: HOSTING_BASE_URL + '/imgs/favicon.svg',  // これは通常のURL
  faviconCertificate: 'https://drive.google.com/uc?export=view&id=YOUR_FILE_ID',  // これだけGoogleDrive
  ogpImage: HOSTING_BASE_URL + '/imgs/ogp-image.png'
};
```

### 合格証明書背景画像のカスタマイズ

`config.js` の `CERTIFICATE_BG_IMAGE_MAP` を編集：

```javascript
// デフォルト（HOSTING_BASE_URLから自動生成）
const CERTIFICATE_BG_IMAGE_MAP = {
  '1-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-1.jpg',
  '1-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-2.jpg',
  // ... 全18パターン
};

// 一部だけカスタマイズする例
const CERTIFICATE_BG_IMAGE_MAP = {
  '1-1': 'https://drive.google.com/uc?export=view&id=YOUR_FILE_ID_1',  // カスタムURL
  '1-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-2.jpg',  // 通常のURL
  '2-1': 'https://cdn.example.com/custom-image.jpg',     // 別のCDN
  // ... 残りも同様
};
```

**キーの形式**: `"{ジャンル番号}-{級番号}"`
- `"1-1"` = ジャンル1の初級
- `"3-2"` = ジャンル3の中級
- `"6-3"` = ジャンル6の上級

---

## GoogleDrive共有リンクの使い方

### 手順

#### 1. GoogleDriveに画像をアップロード
画像ファイルをGoogleDriveにアップロードします。

#### 2. 共有設定
- 画像ファイルを右クリック → 「共有」
- 「一般的なアクセス」を **「リンクを知っている全員」** に変更
- リンクをコピー

#### 3. URLを変換

GoogleDriveの共有リンクは以下の形式です：
```
https://drive.google.com/file/d/1ABC123xyz456/view?usp=sharing
```

これを、以下の形式に変換します：
```
https://drive.google.com/uc?export=view&id=1ABC123xyz456
```

**変換方法**: `/file/d/` と `/view` の間の文字列（FILE_ID）を抽出し、`uc?export=view&id=FILE_ID` の形式にする

#### 4. 設定ファイルに記述

変換したURLを `script.js` の該当箇所に記述します：

```javascript
const CERTIFICATE_BG_IMAGE_MAP = {
  '1-1': 'https://drive.google.com/uc?export=view&id=1ABC123xyz456',
  // ...
};
```

### 注意点

- **帯域制限**: GoogleDriveの無料プランには帯域制限があります。アクセス数が多い場合は注意してください
- **CORS**: 基本的に問題ありませんが、まれにCORSエラーが発生する可能性があります
- **推奨**: 本番環境では、CDNやGitHub Pages/Netlify/Vercelなどの専用ホスティングサービスの使用を推奨します

---

## キャッシュとパフォーマンス

### 現在の構成（推奨）

このプロジェクトは、パフォーマンスを最適化するため、以下の構成を採用しています：

- ✅ **CSS/JSは外部ファイルとして読み込み** - GASのHTML内に埋め込まず、ホスティング先から読み込む
- ✅ **ブラウザキャッシュが効く** - 2回目以降のアクセスが超高速
- ✅ **CDN配信** - GitHub Pages/Netlify/Vercelなどは自動的にCDN経由で配信
- ✅ **GASの実行時間を節約** - GASの6分制限に影響しない

### メリット

1. **高速化**: ブラウザキャッシュにより、2回目以降のアクセスが爆速
2. **転送量削減**: 画像・CSS・JSがキャッシュされるため、サーバー負荷も軽減
3. **グローバル配信**: CDNにより世界中どこからでも高速アクセス可能

### キャッシュクリアが必要な場合

ファイルを更新した際、ユーザーのブラウザにキャッシュが残る場合があります。
必要に応じて「強制リロード」を案内してください：

- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

---

## トラブルシューティング

### 画像が表示されない

#### 1. URLが正しいか確認
ブラウザで直接URLにアクセスして、画像が表示されるか確認してください。

#### 2. GoogleDriveの共有設定を確認（GoogleDrive使用時）
「リンクを知っている全員」に設定されているか確認してください。

#### 3. ブラウザのコンソールを確認
- `F12` キーを押して開発者ツールを開く
- **Console** タブでエラーメッセージを確認
- 404エラー → URLが間違っている
- CORSエラー → 共有設定やURL形式を確認

#### 4. パスの確認
`config.js` の `HOSTING_BASE_URL` が正しく設定されているか確認してください。
末尾にスラッシュ `/` は **不要** です。

```javascript
// ✅ 正しい
const HOSTING_BASE_URL = 'https://your-app.netlify.app';

// ❌ 間違い（末尾にスラッシュ）
const HOSTING_BASE_URL = 'https://your-app.netlify.app/';
```

### 合格証明書が生成されない

#### 1. 背景画像URLを確認
ブラウザのコンソールで以下のエラーが出ていないか確認：
```
合格証明書の背景画像が見つかりません: X-Y
```

このエラーが出ている場合は、`CERTIFICATE_BG_IMAGE_MAP` のキー `X-Y` に対応する画像URLが設定されていません。

#### 2. キーの形式を確認
キーは必ず `"ジャンル番号-級番号"` の形式（例: `"1-1"`, `"2-3"`）である必要があります。

---

## 動作確認チェックリスト

設定変更後、以下を確認してください：

- [ ] ブラウザのキャッシュをクリア（Ctrl+Shift+R / Cmd+Shift+R）
- [ ] アプリを開いて、各画面で画像が表示されるか
- [ ] 合格証明書が正しく生成されるか
- [ ] ブラウザのコンソールにエラーが出ていないか
- [ ] 別のブラウザでも動作するか（Chrome、Firefox、Safariなど）

---

## まとめ

**すべての設定は `config.js` に集約されています！**

- ✅ **ホスティング変更**: `HOSTING_BASE_URL` を変更
- ✅ **GAS URL変更**: `GAS_DEPLOYMENT_URL` を変更
- ✅ **ジャンル名変更**: `GENRE_NAMES` 配列を編集（スプレッドシートのシート名と一致させる）
- ✅ **画像URL変更**: `IMAGE_URLS` と `CERTIFICATE_BG_IMAGE_MAP` を編集
- ✅ **個別カスタマイズ**: `config.js` 内で直接編集
- ✅ **GoogleDrive使用時**: 共有リンクを `uc?export=view&id=` 形式に変換
- ❓ **困ったら**: トラブルシューティングセクションを参照

**config.js 1ファイルを編集するだけで、すべての設定が完了します！**
