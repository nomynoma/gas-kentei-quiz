function doGet(e) {
  // goukakuパラメータがある場合は合格証画像表示画面を返す
  if (e.parameter && e.parameter.goukaku) {
    var template = HtmlService.createTemplateFromFile('certificate_view');
    template.uuid = e.parameter.goukaku;
    return template.evaluate()
      .setTitle('合格証')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // 通常のクイズ画面
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('クイズアプリ')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * セクションごとの問題を取得（キャッシュ対応版）
 * @param {string} genreName - "ジャンル1" ～ "ジャンル6"
 * @param {string} level - "初級", "中級", "上級"
 * @returns {Array} ランダム10問
 */
function getQuestions(genreName, level) {
  try {
    var startTime = new Date().getTime();
    Logger.log('開始: genreName=' + genreName + ', level=' + level);

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var cache = CacheService.getScriptCache();
    var cacheKey = 'sheet_' + genreName;
    var cachedData = cache.get(cacheKey);

    var data;
    if (cachedData) {
      Logger.log('キャッシュヒット: ' + genreName);
      data = JSON.parse(cachedData);
    } else {
      Logger.log('キャッシュミス: スプレッドシートから読み込み');
      var sheet = ss.getSheetByName(genreName);
      if (!sheet) throw new Error(genreName + 'シートが見つかりません');

      data = sheet.getDataRange().getValues();
      try {
        cache.put(cacheKey, JSON.stringify(data), 21600);
      } catch (e) {
        Logger.log('キャッシュ保存エラー: ' + e);
      }
    }

    // 該当レベルの行インデックスを収集
    var matchingRowIndices = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === level && data[i][4]) {
        matchingRowIndices.push(i);
      }
    }

    if (matchingRowIndices.length < 10) {
      throw new Error(genreName + 'の' + level + 'は問題が10問未満です');
    }

    // インデックスをシャッフル
    for (var i = matchingRowIndices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = matchingRowIndices[i];
      matchingRowIndices[i] = matchingRowIndices[j];
      matchingRowIndices[j] = tmp;
    }

    var selectedQuestions = [];
    for (var i = 0; i < 10; i++) {
      var row = data[matchingRowIndices[i]];

      var selectionType = (row[2] || 'single').toString().trim().toLowerCase();

      var q = {
        id: row[0],
        level: row[1] || '',
        selectionType: selectionType,
        displayType: (row[3] || 'text').toString().trim().toLowerCase(),
        question: row[4] || '',
        choiceA: row[5] || '',
        choiceB: row[6] || '',
        choiceC: row[7] || '',
        choiceD: row[8] || ''
      };

      selectedQuestions.push(q);
    }

    // 入力問題以外は選択肢をシャッフル（正解情報なし）
    if (q.selectionType !== 'input') {
      var choices = [q.choiceA, q.choiceB, q.choiceC, q.choiceD];

      for (var k = choices.length - 1; k > 0; k--) {
        var l = Math.floor(Math.random() * (k + 1));
        var tmp = choices[k];
        choices[k] = choices[l];
        choices[l] = tmp;
      }

      q.choiceA = choices[0];
      q.choiceB = choices[1];
      q.choiceC = choices[2];
      q.choiceD = choices[3];
    }

    Logger.log('問題取得完了（10問）');
    return selectedQuestions;

  } catch (error) {
    Logger.log('エラー: ' + error.toString());
    throw new Error('問題の読み込みに失敗しました: ' + error.toString());
  }
}

/**
 * 合格証データをスプレッドシートに保存
 * @param {Object} data - {uuid, genre, level, nickname, date, imageData}
 */
function saveCertificateData(data) {
  try {
    var SPREADSHEET_ID = '1Xycd1Wtq0ZNiQyhEIscRKndbyEeYt0H26wih9OXDJr8';
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 「合格者一覧」シートを取得または作成
    var sheet = ss.getSheetByName('合格者一覧');
    if (!sheet) {
      sheet = ss.insertSheet('合格者一覧');
      // ヘッダー行を追加
      sheet.appendRow(['UUID', 'ジャンル', 'クリアレベル', 'ニックネーム', '年月日', '画像RAWデータ']);
      sheet.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#eeeeee');
    }

    // サーバー側でUUIDを生成（ニックネーム + タイムスタンプのSHA256ハッシュ）
    var timestamp = new Date().getTime();
    var hashSource = data.nickname + timestamp;
    var uuid = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, hashSource)
      .map(function(byte) {
        var v = (byte < 0) ? 256 + byte : byte;
        return ('0' + v.toString(16)).slice(-2);
      })
      .join('');

    // データを追加
    sheet.appendRow([
      uuid,
      data.genre,
      data.level,
      data.nickname,
      data.date,
      data.imageData
    ]);

    Logger.log('合格証データを保存しました: UUID=' + uuid);
    return { success: true, uuid: uuid };

  } catch (error) {
    Logger.log('合格証データ保存エラー: ' + error.toString());
    throw new Error('合格証データの保存に失敗しました: ' + error.toString());
  }
}

/**
 * UUIDで合格証画像データを取得
 * @param {string} uuid
 * @returns {Object} 合格証データ
 */
function getCertificateByUUID(uuid) {
  try {
    var SPREADSHEET_ID = '1Xycd1Wtq0ZNiQyhEIscRKndbyEeYt0H26wih9OXDJr8';
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('合格者一覧');

    if (!sheet) {
      throw new Error('合格者一覧シートが見つかりません');
    }

    var data = sheet.getDataRange().getValues();
    Logger.log('検索UUID: [' + uuid + '] 文字数: ' + uuid.length);
    Logger.log('データ行数: ' + data.length);

    // UUIDで検索（ヘッダー行をスキップして2行目から）
    for (var i = 1; i < data.length; i++) {
      var cellUuid = data[i][0].toString().trim();
      Logger.log('行' + i + ' UUID: [' + cellUuid + '] 文字数: ' + cellUuid.length);
      Logger.log('比較: [' + cellUuid + '] === [' + uuid + '] = ' + (cellUuid === uuid));

      // 文字列として比較（トリムして比較）
      if (cellUuid === uuid.toString().trim()) {
        Logger.log('一致しました！行番号: ' + i);

        try {
          Logger.log('返却データ - UUID: ' + data[i][0]);
        } catch (e) {
          Logger.log('UUID取得エラー: ' + e);
        }

        try {
          Logger.log('返却データ - genre: ' + data[i][1]);
        } catch (e) {
          Logger.log('genre取得エラー: ' + e);
        }

        try {
          Logger.log('返却データ - level: ' + data[i][2]);
        } catch (e) {
          Logger.log('level取得エラー: ' + e);
        }

        try {
          Logger.log('返却データ - nickname: ' + data[i][3]);
        } catch (e) {
          Logger.log('nickname取得エラー: ' + e);
        }

        try {
          Logger.log('返却データ - date: ' + data[i][4]);
        } catch (e) {
          Logger.log('date取得エラー: ' + e);
        }

        try {
          var imageDataLength = data[i][5] ? data[i][5].length : 0;
          Logger.log('返却データ - imageData 文字数: ' + imageDataLength);
          if (imageDataLength > 0) {
            Logger.log('返却データ - imageData 先頭50文字: ' + data[i][5].substring(0, 50));
          }
        } catch (e) {
          Logger.log('imageData取得エラー: ' + e);
        }

        try {
          // DateオブジェクトをJSON送信可能な形式に変換
          var dateValue = data[i][4];
          var dateString = '';
          if (dateValue instanceof Date) {
            // Dateオブジェクトの場合は文字列に変換
            dateString = dateValue.toString();
          } else {
            // それ以外の場合はそのまま文字列化
            dateString = dateValue ? dateValue.toString() : '';
          }

          var result = {
            uuid: data[i][0].toString(),
            genre: data[i][1].toString(),
            level: data[i][2].toString(),
            nickname: data[i][3].toString(),
            date: dateString,
            imageData: data[i][5].toString()
          };

          Logger.log('返却オブジェクト作成完了');
          Logger.log('resultオブジェクト: ' + JSON.stringify({
            uuid: result.uuid,
            genre: result.genre,
            level: result.level,
            nickname: result.nickname,
            date: result.date,
            imageDataLength: result.imageData ? result.imageData.length : 0
          }));

          return result;
        } catch (e) {
          Logger.log('オブジェクト作成エラー: ' + e);
          throw e;
        }
      }
    }

    Logger.log('すべての行を検索しましたが一致しませんでした');
    throw new Error('指定されたUUIDの合格証が見つかりません。UUID=' + uuid);

  } catch (error) {
    Logger.log('合格証取得エラー: ' + error.toString());
    throw new Error('合格証の取得に失敗しました: ' + error.toString());
  }
}

/**
 * WebアプリのデプロイURLを取得
 * @returns {string} デプロイURL
 */
function getDeploymentUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * キャッシュをリロード（問題を更新した時に実行）
 * スプレッドシートのボタンから実行可能
 * 全ジャンルのキャッシュをクリアして即座に再読み込み
 */
function reloadQuestionCache() {
  var startTime = new Date().getTime();
  var cache = CacheService.getScriptCache();
  var genres = ['ジャンル1', 'ジャンル2', 'ジャンル3', 'ジャンル4', 'ジャンル5', 'ジャンル6'];

  // スプレッドシート取得（デフォルト: このスクリプトが紐付いているスプレッドシート）
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // カスタム: 別のスプレッドシートを使う場合は下記のコメントを外してIDを指定
  // var SPREADSHEET_ID = '1Xycd1Wtq0ZNiQyhEIscRKndbyEeYt0H26wih9OXDJr8';
  // var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 進捗通知
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'キャッシュをリロード中...',
    'キャッシュリロード',
    3
  );

  // 各ジャンルのキャッシュをクリア＆再読み込み
  for (var i = 0; i < genres.length; i++) {
    var genreName = genres[i];
    var key = 'sheet_' + genreName;

    // キャッシュクリア
    cache.remove(key);
    Logger.log('キャッシュクリア: ' + genreName);

    // スプレッドシートから再読み込み
    try {
      var sheet = ss.getSheetByName(genreName);
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        cache.put(key, JSON.stringify(data), 21600); // 6時間
        Logger.log('キャッシュ再読み込み完了: ' + genreName + ' (' + data.length + '行)');
      }
    } catch (e) {
      Logger.log('キャッシュ再読み込みエラー (' + genreName + '): ' + e);
    }
  }

  var endTime = new Date().getTime();
  var totalTime = ((endTime - startTime) / 1000).toFixed(2);

  Logger.log('全ジャンルのキャッシュをリロードしました（' + totalTime + '秒）');

  // 完了通知
  SpreadsheetApp.getActiveSpreadsheet().toast(
    '全ジャンルのキャッシュをリロードしました（' + totalTime + '秒）\n次回アクセスは高速になります。',
    'キャッシュリロード完了',
    5
  );

  return '全ジャンルのキャッシュをリロードしました（' + totalTime + '秒）';
}

/**
 * キャッシュをクリアのみ（リロードなし）
 * 軽量版：クリアだけして次回アクセス時に自動読み込み
 */
function clearQuestionCache() {
  var cache = CacheService.getScriptCache();
  var genres = ['ジャンル1', 'ジャンル2', 'ジャンル3', 'ジャンル4', 'ジャンル5', 'ジャンル6'];

  for (var i = 0; i < genres.length; i++) {
    var key = 'sheet_' + genres[i];
    cache.remove(key);
    Logger.log('キャッシュクリア: ' + genres[i]);
  }

  Logger.log('全ジャンルのキャッシュをクリアしました');

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '全ジャンルのキャッシュをクリアしました。次回アクセス時に最新データが読み込まれます。',
    'キャッシュクリア完了',
    5
  );

  return '全ジャンルのキャッシュをクリアしました';
}

/**
 * ユーザーの回答が正解かどうかを判定する
 *
 * クライアント（script.js）から送信された
 * questionId と回答内容をもとに、
 * スプレッドシート上の正解データと照合する。
 *
 * ・単一選択問題
 * ・複数選択問題
 * ・入力式問題
 *
 * すべてこの関数で共通判定する。
 *
 * @param {Object} payload 判定に必要な情報
 * @param {string|number} payload.questionId 問題ID（1列目）
 * @param {string|string[]} payload.answer ユーザーの回答
 * @return {Object} 判定結果
 * @return {boolean} return.correct true:正解 / false:不正解
 */
function judgeAnswer(payload){
  var questionId = payload.questionId;
  var userAnswer = payload.answer;

  // アクティブなスプレッドシートを取得
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();

  // 全シートを走査
  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var data = sheet.getDataRange().getValues();

    // 1行目はヘッダーなので 2行目以降を対象
    for (var i = 1; i < data.length; i++) {

      // 問題IDが一致する行を探す
      if (data[i][0] === questionId) {

        // 正解データ（大文字・前後空白除去）
        var correctAnswer = data[i][9]
          .toString()
          .trim()
          .toUpperCase();

        // ===== 複数選択問題 =====
        if (Array.isArray(userAnswer)) {
          var correct = correctAnswer
            .split(',')
            .map(a => a.trim());

          var isCorrect =
            userAnswer.length === correct.length &&
            userAnswer.every(a => correct.includes(a));

          return { correct: isCorrect };
        }

        // ===== 単一選択 / 入力式問題 =====
        return {
          correct:
            userAnswer
              .toString()
              .trim()
              .toUpperCase() === correctAnswer
        };
      }
    }
  }

  // 該当する問題IDが見つからなかった場合
  return { correct: false };
}
