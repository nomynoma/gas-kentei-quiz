// ========================================
// 設定ファイル - すべてのURL設定を一元管理
// ========================================
// このファイルを編集するだけで、全てのURL設定を変更できます

// ========================================
// 基本設定
// ========================================

// ホスティングのベースURL（末尾にスラッシュ不要）
const HOSTING_BASE_URL = 'https://nomynoma.github.io/gas-kentei-quiz';

// Google Apps Script デプロイURL
// GASで「ウェブアプリとして導入」で取得したURLをここに設定
const GAS_DEPLOYMENT_URL = 'https://script.google.com/macros/s/AKfycbztUS7zsecQG169l3bWc5UJdkFiu1bGhpuZKop_V2Yief1YpKniYDUt8ydJ4bToT8br/exec';

// ========================================
// ジャンル設定
// ========================================
// ⚠️ 重要：この配列の値は、Googleスプレッドシートのシート名と完全に一致させる必要があります！
//
// ジャンル名の配列（表示名とスプレッドシートのシート名を一致させる）
// この配列を変更すると、以下が自動的に反映されます：
//   - ジャンル選択画面のボタン表示
//   - GASへのリクエスト（スプレッドシートのシート名として使用）
//   - 合格証明書の表示
//   - SNS共有テキスト
//
// 例：スプレッドシートのシート名が "JavaScript入門" の場合
//     GENRE_NAMES = ['JavaScript入門', 'HTML基礎', ...];
const GENRE_NAMES = [
  'ジャンル1',
  'ジャンル2',
  'ジャンル3',
  'ジャンル4',
  'ジャンル5',
  'ジャンル6'
];

// ジャンル名からジャンル番号を取得する関数
function getGenreNumber(genreName) {
  const index = GENRE_NAMES.indexOf(genreName);
  return index >= 0 ? (index + 1).toString() : '1';
}

// ========================================
// 画像URL設定
// ========================================
// GoogleDriveの共有リンクなど、個別にカスタマイズしたい場合は以下を編集してください

// 共通画像
const IMAGE_URLS = {
  // Favicon
  favicon: HOSTING_BASE_URL + '/imgs/favicon.svg',
  faviconCertificate: HOSTING_BASE_URL + '/imgs/favicon_certificate.svg',

  // OGP画像
  ogpImage: HOSTING_BASE_URL + '/imgs/ogp-image.png'
};

// 合格証明書背景画像URLマッピング
// Key: "ジャンル番号-級番号" (例: "1-1"は ジャンル1の初級, "1-4"は ジャンル1の超級)
// Value: 背景画像のフルURL
const CERTIFICATE_BG_IMAGE_MAP = {
  // ジャンル1
  '1-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-1.jpg',
  '1-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-2.jpg',
  '1-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-3.jpg',
  '1-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_1-3.jpg', // 超級（仮で上級の画像を使用）
  // ジャンル2
  '2-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-1.jpg',
  '2-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-2.jpg',
  '2-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-3.jpg',
  '2-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_2-3.jpg', // 超級（仮で上級の画像を使用）
  // ジャンル3
  '3-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-1.jpg',
  '3-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-2.jpg',
  '3-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-3.jpg',
  '3-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_3-3.jpg', // 超級（仮で上級の画像を使用）
  // ジャンル4
  '4-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-1.jpg',
  '4-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-2.jpg',
  '4-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-3.jpg',
  '4-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_4-3.jpg', // 超級（仮で上級の画像を使用）
  // ジャンル5
  '5-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-1.jpg',
  '5-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-2.jpg',
  '5-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-3.jpg',
  '5-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_5-3.jpg', // 超級（仮で上級の画像を使用）
  // ジャンル6
  '6-1': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-1.jpg',
  '6-2': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-2.jpg',
  '6-3': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-3.jpg',
  '6-4': HOSTING_BASE_URL + '/imgs/frame_hyousyoujyou_6-3.jpg'  // 超級（仮で上級の画像を使用）
};

// 合格証ページベースURL
const CERTIFICATE_BASE_URL = HOSTING_BASE_URL + '/certificate/';
