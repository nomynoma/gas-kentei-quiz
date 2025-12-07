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
function getQuestions(genre, level) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'q_' + genre + '_' + level;

  var cached = cache.get(cacheKey);
  if (!cached) {
    throw new Error('question cache not found: ' + cacheKey);
  }

  var questions = JSON.parse(cached);

  // シャッフル（Fisher–Yates）
  for (var i = questions.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = questions[i];
    questions[i] = questions[j];
    questions[j] = tmp;
  }

  // 必要数に制限（例：10問）
  var LIMIT = 10;
  if (questions.length > LIMIT) {
    questions = questions.slice(0, LIMIT);
  }

  return questions;
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
 * 全ジャンル・レベルのキャッシュをクリアして即座に再読み込み
 */
function reloadQuestionCache() {
  var startTime = new Date().getTime();
  var cache = CacheService.getScriptCache();

  var genres = ['ジャンル1', 'ジャンル2', 'ジャンル3', 'ジャンル4', 'ジャンル5', 'ジャンル6'];
  var levels = ['初級', '中級', '上級'];

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'キャッシュをリロード中...',
    'キャッシュリロード',
    3
  );

  for (var g = 0; g < genres.length; g++) {
    var genreName = genres[g];
    var sheet = ss.getSheetByName(genreName);
    if (!sheet) continue;

    var data = sheet.getDataRange().getValues();

    for (var l = 0; l < levels.length; l++) {
      var level = levels[l];

      var questions = [];
      var answerMap = {};

      for (var r = 1; r < data.length; r++) {
        if (data[r][1] !== level) continue;

        // ---- 出題用（正解なし） ----
        questions.push({
          id: data[r][0],
          level: data[r][1],
          selectionType: (data[r][2] || 'single').toLowerCase(),
          displayType: (data[r][3] || 'text').toLowerCase(),
          question: data[r][4],
          choiceA: data[r][5],
          choiceB: data[r][6],
          choiceC: data[r][7],
          choiceD: data[r][8]
        });

        // ---- 判定用 ----
        var id = data[r][0];
        var ans = data[r][9];
        if (!id || ans === '') continue;

        var selectionType = data[r][2];
        if (selectionType !== 'input') {
          var correctLabels = ans.toString().trim().toUpperCase().split(',');
          var labelToText = {
            A: data[r][5],
            B: data[r][6],
            C: data[r][7],
            D: data[r][8]
          };

          answerMap[id] = correctLabels
            .map(function(c) { return labelToText[c]; })
            .filter(Boolean);
        } else {
          answerMap[id] = ans.toString().trim().toUpperCase();
        }
      }

      cache.put(
        'q_' + genreName + '_' + level,
        JSON.stringify(questions),
        21600
      );

      cache.put(
        'a_' + genreName + '_' + level,
        JSON.stringify(answerMap),
        21600
      );
    }
  }

  var endTime = new Date().getTime();
  var totalTime = ((endTime - startTime) / 1000).toFixed(2);

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'キャッシュを再構築しました（' + totalTime + '秒）',
    'キャッシュリロード完了',
    5
  );

  return 'キャッシュリロード完了（' + totalTime + '秒）';
}

/**
 * キャッシュをクリアのみ（リロードなし）
 * 軽量版：クリアだけして次回アクセス時に自動読み込み
 */
function clearQuestionCache() {
  var cache = CacheService.getScriptCache();
  var genres = ['ジャンル1','ジャンル2','ジャンル3','ジャンル4','ジャンル5','ジャンル6'];
  var levels = ['初級','中級','上級'];

  for (var g = 0; g < genres.length; g++) {
    for (var l = 0; l < levels.length; l++) {
      cache.remove('q_' + genres[g] + '_' + levels[l]);
      cache.remove('a_' + genres[g] + '_' + levels[l]);
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '全ジャンル・レベルのキャッシュをクリアしました',
    'キャッシュクリア完了',
    5
  );
}

/**
 * 全回答をまとめて判定する（一括採点）
 * @param {Object} payload
 * @param {string} payload.genre - ジャンル名
 * @param {string} payload.level - レベル名
 * @param {Array} payload.answers - [{questionId, answer}, ...] ユーザーの回答配列
 * @return {Array} 正誤の配列 [true, false, true, ...]
 */
function judgeAllAnswers(payload) {
  Logger.log('judgeAllAnswers payload: %s', JSON.stringify(payload));
  
  var cache = CacheService.getScriptCache();
  var cacheKey = 'a_' + payload.genre + '_' + payload.level;
  var answerMap = JSON.parse(cache.get(cacheKey) || '{}');
  
  if (Object.keys(answerMap).length === 0) {
    throw new Error('正解データが見つかりません: ' + cacheKey);
  }
  
  // 各問題の正誤を判定
  var results = payload.answers.map(function(userAnswer) {
    var correctAnswer = answerMap[userAnswer.questionId];
    
    if (correctAnswer === undefined) {
      Logger.log('警告: 問題ID ' + userAnswer.questionId + ' の正解が見つかりません');
      return false;
    }
    
    var isCorrect = checkAnswer(userAnswer.answer, correctAnswer);
    Logger.log('問題ID: %s, ユーザー回答: %s, 正解: %s, 判定: %s', 
      userAnswer.questionId, 
      JSON.stringify(userAnswer.answer), 
      JSON.stringify(correctAnswer), 
      isCorrect);
    
    return isCorrect;
  });
  
  Logger.log('採点結果: %s', JSON.stringify(results));
  return results;
}

/**
 * 回答が正解かどうかをチェックする
 * @param {string|Array} userAnswer - ユーザーの回答
 * @param {string|Array} correctAnswer - 正解
 * @return {boolean} 正解ならtrue
 */
function checkAnswer(userAnswer, correctAnswer) {
  function normalize(v) {
    if (v === null || v === undefined) return '';
    return v.toString().trim().toUpperCase();
  }
  
  // 複数選択の場合
  if (Array.isArray(userAnswer)) {
    if (!Array.isArray(correctAnswer)) {
      return false;
    }
    
    // 配列の長さが異なる場合は不正解
    if (userAnswer.length !== correctAnswer.length) {
      return false;
    }
    
    // 配列をソートして比較
    var ua = userAnswer.map(normalize).sort().join(',');
    var ca = correctAnswer.map(normalize).sort().join(',');
    return ua === ca;
  } 
  // 単一回答の場合
  else {
    // correctAnswerが配列で1要素の場合
    if (Array.isArray(correctAnswer)) {
      if (correctAnswer.length !== 1) {
        return false;
      }
      return normalize(userAnswer) === normalize(correctAnswer[0]);
    }
    // 通常の単一回答
    return normalize(userAnswer) === normalize(correctAnswer);
  }
}

// 【既存のjudgeAnswer関数は残しておく（後方互換性のため）】
// もし不要であれば削除してもOKですが、念のため残すことを推奨します

/**
 * 回答を判定する
 *
 * @param {Object} payload
 * @param {string} payload.genre
 * @param {string} payload.level
 * @param {string|number} payload.questionId
 * @param {string|string[]} payload.answer ユーザーの回答
 * @return {Object} 判定結果
 *   { correct: boolean }
 */
function judgeAnswer(payload) {
  function normalize(v) {
    return v
      .toString()
      .trim()
      .toUpperCase();
  }

  Logger.log('judgeAnswer payload: %s', JSON.stringify(payload));

  var cache = CacheService.getScriptCache();

  // ✅ レベル別 正解キャッシュ
  var cacheKey = 'a_' + payload.genre + '_' + payload.level;  // レベル情報を含める
  var answerMap = JSON.parse(cache.get(cacheKey) || '{}');

  var correctAnswer = answerMap[payload.questionId];
  if (correctAnswer === undefined) {
    throw new Error('正解データが見つかりません');
  }

  var userAnswer = payload.answer;

  var isCorrect;
  if (Array.isArray(userAnswer)) {
    // 複数選択
    if (!Array.isArray(correctAnswer)) {
      isCorrect = false;
    } else {
      var ua = userAnswer.map(normalize).sort().join(',');
      var ca = correctAnswer.map(normalize).sort().join(',');
      isCorrect = ua === ca;
    }
  } else {
    // 単一回答
    isCorrect =
      normalize(userAnswer) === normalize(correctAnswer);
  }

  return {
    correct: isCorrect
  };
}
