// ========================================
// グローバル定数
// ========================================
// ⚠️ 重要: この配列は config.js の GENRE_NAMES と一致させる必要があります
var GENRES = ['ジャンル1', 'ジャンル2', 'ジャンル3', 'ジャンル4', 'ジャンル5', 'ジャンル6'];

// ⚠️ 重要: この配列は script.js の levels と一致させる必要があります
var LEVELS = ['初級', '中級', '上級'];

// 基本設定
var RATE_LIMIT_WINDOW = 60;
var RATE_LIMIT_MAX_REQUESTS = 10;

// ========================================
// 内部関数
// ========================================

/**
 * リクエストの制御
 */
function checkRateLimit(userId) {
  try {
    if (!userId) {
      Logger.log('制御エラー: ID不足');
      return false;
    }

    var cache = CacheService.getScriptCache();
    var rateLimitKey = 'rate_' + userId;
    var cachedCount = cache.get(rateLimitKey);

    if (!cachedCount) {
      cache.put(rateLimitKey, '1', RATE_LIMIT_WINDOW);
      return true;
    }

    var requestCount = parseInt(cachedCount);

    if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
      Logger.log('制御発動: ' + userId + ' (' + requestCount + '回)');
      return false;
    }

    cache.put(rateLimitKey, (requestCount + 1).toString(), RATE_LIMIT_WINDOW);
    return true;

  } catch (error) {
    Logger.log('制御エラー: ' + error);
    return true;
  }
}

function doGet(e) {
  // 合格証表示リクエスト
  if (e.parameter && e.parameter.key) {
    var template = HtmlService.createTemplateFromFile('certificate');
    template.key = e.parameter.key;
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
 * HTMLファイルに他のファイルを埋め込むためのヘルパー関数
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * セクションごとの問題を取得（キャッシュ対応版・自動リロード対応・マルチユーザー対応）
 * @param {string} genreName - "ジャンル1" ～ "ジャンル6"
 * @param {string} level - "初級", "中級", "上級"
 * @param {string} userId - ユーザーID（レート制限用、オプション）
 * @returns {Array} ランダム10問
 */
function getQuestions(genre, level, userId) {
  if (userId && !checkRateLimit(userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = 'q_' + genre + '_' + level;

  var cached = cache.get(cacheKey);

  // キャッシュが存在しない場合、必要な分だけリロード
  if (!cached) {
    // 特定のジャンル・レベルだけをリロード（高速化）
    reloadSingleCache(genre, level);
    cached = cache.get(cacheKey);

    if (!cached) {
      throw new Error('キャッシュの生成に失敗しました: ' + cacheKey);
    }
  }

  var questions = JSON.parse(cached);

  // 問題順をシャッフル（Fisher–Yates）
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

  // 各問題の選択肢をシャッフル（入力問題を除く）
  for (var i = 0; i < questions.length; i++) {
    var q = questions[i];

    // 入力問題の場合はスキップ
    if (q.selectionType === 'input') {
      continue;
    }

    // 選択肢を配列に格納
    var choices = [
      q.choiceA || '',
      q.choiceB || '',
      q.choiceC || '',
      q.choiceD || ''
    ];

    // 空の選択肢を除外
    var validChoices = [];
    for (var k = 0; k < choices.length; k++) {
      if (choices[k]) {
        validChoices.push(choices[k]);
      }
    }

    // 選択肢をシャッフル（Fisher–Yates）
    for (var k = validChoices.length - 1; k > 0; k--) {
      var l = Math.floor(Math.random() * (k + 1));
      var tmp = validChoices[k];
      validChoices[k] = validChoices[l];
      validChoices[l] = tmp;
    }

    // シャッフルした選択肢を再代入
    q.choiceA = validChoices[0] || '';
    q.choiceB = validChoices[1] || '';
    q.choiceC = validChoices[2] || '';
    q.choiceD = validChoices[3] || '';
  }

  return questions;
}

/**
 * WebアプリのデプロイURLを取得
 * @returns {string} デプロイURL
 */
function getDeploymentUrl() {
  return ScriptApp.getService().getUrl();
}

/**
 * 特定のジャンル・レベルのキャッシュだけをリロード（高速化版）
 * @param {string} genre - ジャンル名
 * @param {string} level - レベル名
 */
function reloadSingleCache(genre, level) {
  var cache = CacheService.getScriptCache();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(genre);

  if (!sheet) {
    throw new Error('シートが見つかりません: ' + genre);
  }

  var data = sheet.getDataRange().getValues();
  var questions = [];
  var answerMap = {};
  var hintMap = {};

  // 指定されたレベルの問題だけを抽出
  for (var r = 1; r < data.length; r++) {
    if (data[r][1] !== level) continue;

    var questionId = data[r][0];

    // ---- 出題用（正解なし） ----
    questions.push({
      id: questionId,
      level: data[r][1],
      selectionType: (data[r][2] || 'single').toLowerCase(),
      displayType: (data[r][3] || 'text').toLowerCase(),
      question: data[r][4],
      choiceA: data[r][5],
      choiceB: data[r][6],
      choiceC: data[r][7],
      choiceD: data[r][8]
    });

    // ---- ヒント情報 ----
    hintMap[questionId] = {
      question: data[r][4] || '',
      hintUrl: data[r][10] || '',
      hintText: data[r][11] || ''
    };

    // ---- 判定用 ----
    var ans = data[r][9];
    if (!questionId || ans === '') continue;

    var selectionType = data[r][2];
    if (selectionType !== 'input') {
      var correctLabels = ans.toString().trim().toUpperCase().split(',');
      var labelToText = {
        A: data[r][5],
        B: data[r][6],
        C: data[r][7],
        D: data[r][8]
      };

      answerMap[questionId] = correctLabels
        .map(function(c) { return labelToText[c]; })
        .filter(Boolean);
    } else {
      answerMap[questionId] = ans.toString().trim().toUpperCase();
    }
  }

  // キャッシュに保存（7日間）
  cache.put(
    'q_' + genre + '_' + level,
    JSON.stringify(questions),
    604800
  );

  cache.put(
    'a_' + genre + '_' + level,
    JSON.stringify(answerMap),
    604800
  );

  cache.put(
    'h_' + genre + '_' + level,
    JSON.stringify(hintMap),
    604800
  );
}

/**
 * キャッシュをリロード（問題を更新した時に実行）
 * スプレッドシートのボタンから実行可能
 * 全ジャンル・レベルのキャッシュをクリアして即座に再読み込み
 * マルチユーザー対応：ロック機構付き
 */
function reloadQuestionCache() {
  var cache = CacheService.getScriptCache();
  var lockKey = 'cache_reload_lock';

  // 既にリロード中かチェック
  var isReloading = cache.get(lockKey);
  if (isReloading) {
    Logger.log('既に他のユーザーがリロード中です。スキップします。');
    SpreadsheetApp.getActiveSpreadsheet().toast(
      '既に他のユーザーがリロード中です',
      'キャッシュリロード',
      3
    );
    return;
  }

  // ロックを取得（60秒間有効）
  cache.put(lockKey, 'loading', 60);

  try {
    var startTime = new Date().getTime();

    var genres = GENRES;
    var levels = LEVELS;

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
      var hintMap = {};

      for (var r = 1; r < data.length; r++) {
        if (data[r][1] !== level) continue;

        var questionId = data[r][0];

        // ---- 出題用（正解なし） ----
        questions.push({
          id: questionId,
          level: data[r][1],
          selectionType: (data[r][2] || 'single').toLowerCase(),
          displayType: (data[r][3] || 'text').toLowerCase(),
          question: data[r][4],
          choiceA: data[r][5],
          choiceB: data[r][6],
          choiceC: data[r][7],
          choiceD: data[r][8]
        });

        // ---- ヒント情報 ----
        hintMap[questionId] = {
          question: data[r][4] || '',
          hintUrl: data[r][10] || '',
          hintText: data[r][11] || ''
        };

        // ---- 判定用 ----
        var ans = data[r][9];
        if (!questionId || ans === '') continue;

        var selectionType = data[r][2];
        if (selectionType !== 'input') {
          var correctLabels = ans.toString().trim().toUpperCase().split(',');
          var labelToText = {
            A: data[r][5],
            B: data[r][6],
            C: data[r][7],
            D: data[r][8]
          };

          answerMap[questionId] = correctLabels
            .map(function(c) { return labelToText[c]; })
            .filter(Boolean);
        } else {
          answerMap[questionId] = ans.toString().trim().toUpperCase();
        }
      }

      cache.put(
        'q_' + genreName + '_' + level,
        JSON.stringify(questions),
        604800  // 7日間（24時間 × 7日 = 604800秒）
      );

      cache.put(
        'a_' + genreName + '_' + level,
        JSON.stringify(answerMap),
        604800  // 7日間（24時間 × 7日 = 604800秒）
      );

      cache.put(
        'h_' + genreName + '_' + level,
        JSON.stringify(hintMap),
        604800  // 7日間（24時間 × 7日 = 604800秒）
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

  } catch (error) {
    // エラー発生時もロックを解放
    Logger.log('キャッシュリロード中にエラー: ' + error);
    throw error;

  } finally {
    // 必ずロックを解放
    cache.remove(lockKey);
    Logger.log('キャッシュリロードのロックを解放しました');
  }
}

/**
 * キャッシュをクリアのみ（リロードなし）
 * 軽量版：クリアだけして次回アクセス時に自動読み込み
 */
function clearQuestionCache() {
  var cache = CacheService.getScriptCache();
  var genres = GENRES;
  var levels = LEVELS;

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
 * @param {Array} payload.questions - 問題データ（フロントから送信）
 * @param {string} payload.userId - ユーザーID（レート制限用、オプション）
 * @return {Object} { results: [true, false, ...], wrongAnswers: [{questionNumber, question, userAnswer, hintText, hintUrl}, ...] }
 */
function judgeAllAnswers(payload) {
  try {
    Logger.log('judgeAllAnswers payload: %s', JSON.stringify(payload));

    if (payload.userId && !checkRateLimit(payload.userId)) {
      throw new Error('しばらく待ってから再度お試しください');
    }

    var cache = CacheService.getScriptCache();
    var answerCacheKey = 'a_' + payload.genre + '_' + payload.level;
    var answerMap = JSON.parse(cache.get(answerCacheKey) || '{}');

    if (Object.keys(answerMap).length === 0) {
      throw new Error('正解データが見つかりません: ' + answerCacheKey);
    }

    // ヒント情報をキャッシュから取得（新しいキャッシュキー）
    var hintCacheKey = 'h_' + payload.genre + '_' + payload.level;
    var hintMap = {};

    try {
      var cachedHints = cache.get(hintCacheKey);
      if (cachedHints) {
        hintMap = JSON.parse(cachedHints);
      } else {
        // キャッシュがない場合はスプレッドシートから取得
        Logger.log('ヒントキャッシュが見つかりません。スプレッドシートから取得します');
        hintMap = loadHintsFromSheet(payload.genre, payload.level);
        // キャッシュに保存（7日間）
        cache.put(hintCacheKey, JSON.stringify(hintMap), 604800);
      }
    } catch (e) {
      Logger.log('ヒント情報の取得に失敗: ' + e);
      // ヒント情報がなくても採点は継続
    }

    // 各問題の正誤を判定
    var results = [];
    var wrongAnswers = [];

    for (var i = 0; i < payload.answers.length; i++) {
      var userAnswer = payload.answers[i];
      var correctAnswer = answerMap[userAnswer.questionId];

      if (correctAnswer === undefined) {
        Logger.log('警告: 問題ID ' + userAnswer.questionId + ' の正解が見つかりません');
        results.push(false);
        continue;
      }

      var isCorrect = checkAnswer(userAnswer.answer, correctAnswer);
      results.push(isCorrect);

      // 誤答の場合、詳細情報を追加
      if (!isCorrect) {
        var hintData = hintMap[userAnswer.questionId] || {};
        wrongAnswers.push({
          questionNumber: i + 1,
          question: hintData.question || '',
          userAnswer: formatUserAnswer(userAnswer.answer),
          hintText: hintData.hintText || '',
          hintUrl: hintData.hintUrl || ''
        });
      }

      Logger.log('問題ID: %s, ユーザー回答: %s, 正解: %s, 判定: %s',
        userAnswer.questionId,
        JSON.stringify(userAnswer.answer),
        JSON.stringify(correctAnswer),
        isCorrect);
    }

    Logger.log('採点結果: %s', JSON.stringify(results));
    Logger.log('誤答数: %s', wrongAnswers.length);

    return {
      results: results,
      wrongAnswers: wrongAnswers
    };
  } catch (error) {
    Logger.log('judgeAllAnswers エラー: ' + error);
    throw error;
  }
}

/**
 * スプレッドシートからヒント情報を読み込む
 */
function loadHintsFromSheet(genre, level) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(genre);
  var data = sheet.getDataRange().getValues();
  var hintMap = {};

  for (var r = 1; r < data.length; r++) {
    if (data[r][1] === level) {
      hintMap[data[r][0]] = {
        question: data[r][4] || '',
        hintUrl: data[r][10] || '',
        hintText: data[r][11] || ''
      };
    }
  }

  return hintMap;
}

/**
 * ユーザーの回答を表示用にフォーマット
 */
function formatUserAnswer(answer) {
  if (Array.isArray(answer)) {
    return answer.join('、');
  }
  return answer || '（未回答）';
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

// ========================================
// 超級モード専用の関数群
// ========================================

/**
 * 超級モード用: 指定ジャンルの全レベル問題を取得（ハッシュ値付き）
 * @param {string} genre - ジャンル名
 * @param {string} userId - ユーザーID（レート制限用、オプション）
 * @returns {Array} 全レベルの問題をシャッフルした配列（ハッシュ値付き）
 */
function getUltraModeQuestions(genre, userId) {
  if (userId && !checkRateLimit(userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var levels = LEVELS;
  var allQuestions = [];

  // 全レベルの問題を取得
  for (var i = 0; i < levels.length; i++) {
    var level = levels[i];
    var cacheKey = 'q_' + genre + '_' + level;
    var answerCacheKey = 'a_' + genre + '_' + level;

    var cached = cache.get(cacheKey);
    var answerCached = cache.get(answerCacheKey);

    // キャッシュがない場合は自動リロード（既存ロジックと同じ）
    if (!cached || !answerCached) {
      Logger.log('超級モード: キャッシュが見つかりません: ' + cacheKey);
      reloadQuestionCache();
      cached = cache.get(cacheKey);
      answerCached = cache.get(answerCacheKey);

      if (!cached || !answerCached) {
        throw new Error('超級モード: キャッシュの取得に失敗しました: ' + cacheKey);
      }
    }

    var questions = JSON.parse(cached);
    var answerMap = JSON.parse(answerCached);

    // 各問題にハッシュ値を追加
    for (var j = 0; j < questions.length; j++) {
      var q = questions[j];
      var correctAnswer = answerMap[q.id];

      if (correctAnswer !== undefined) {
        // 正解のハッシュ値を生成
        q.correctHash = generateAnswerHash(correctAnswer);
      }

      // 選択肢をシャッフル（入力問題を除く）
      if (q.selectionType !== 'input') {
        var choices = [
          q.choiceA || '',
          q.choiceB || '',
          q.choiceC || '',
          q.choiceD || ''
        ];

        // 空の選択肢を除外
        var validChoices = [];
        for (var k = 0; k < choices.length; k++) {
          if (choices[k]) {
            validChoices.push(choices[k]);
          }
        }

        // 選択肢をシャッフル（Fisher–Yates）
        for (var k = validChoices.length - 1; k > 0; k--) {
          var l = Math.floor(Math.random() * (k + 1));
          var tmp = validChoices[k];
          validChoices[k] = validChoices[l];
          validChoices[l] = tmp;
        }

        // シャッフルした選択肢を再代入
        q.choiceA = validChoices[0] || '';
        q.choiceB = validChoices[1] || '';
        q.choiceC = validChoices[2] || '';
        q.choiceD = validChoices[3] || '';
      }

      allQuestions.push(q);
    }
  }

  // 全問題をシャッフル（Fisher-Yates）
  for (var i = allQuestions.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = allQuestions[i];
    allQuestions[i] = allQuestions[j];
    allQuestions[j] = tmp;
  }

  Logger.log('超級モード: ' + genre + 'の問題を' + allQuestions.length + '問取得しました');
  return allQuestions;
}

/**
 * エクストラモード用：全ジャンル・全レベルの問題を取得
 * @param {string} userId - ユーザーID（レート制限用、オプション）
 * @returns {Array} 全ジャンル・全レベルの問題をシャッフルした配列（ハッシュ値付き）
 */
function getAllQuestionsForExtraMode(userId) {
  if (userId && !checkRateLimit(userId)) {
    throw new Error('しばらく待ってから再度お試しください');
  }

  var cache = CacheService.getScriptCache();
  var genres = GENRES;
  var levels = LEVELS;
  var allQuestions = [];

  // 全ジャンル・全レベルの問題を取得
  for (var g = 0; g < genres.length; g++) {
    var genre = genres[g];

    for (var i = 0; i < levels.length; i++) {
      var level = levels[i];
      var cacheKey = 'q_' + genre + '_' + level;
      var answerCacheKey = 'a_' + genre + '_' + level;

      var cached = cache.get(cacheKey);
      var answerCached = cache.get(answerCacheKey);

      // キャッシュがない場合は自動リロード
      if (!cached || !answerCached) {
        Logger.log('エクストラモード: キャッシュが見つかりません: ' + cacheKey);
        reloadQuestionCache();
        cached = cache.get(cacheKey);
        answerCached = cache.get(answerCacheKey);

        if (!cached || !answerCached) {
          Logger.log('エクストラモード: キャッシュの取得に失敗（スキップ）: ' + cacheKey);
          continue; // このジャンル・レベルをスキップして次へ
        }
      }

      var questions = JSON.parse(cached);
      var answerMap = JSON.parse(answerCached);

      // 各問題にハッシュ値を追加
      for (var j = 0; j < questions.length; j++) {
        var q = questions[j];
        var correctAnswer = answerMap[q.id];

        if (correctAnswer !== undefined) {
          // 正解のハッシュ値を生成
          q.correctHash = generateAnswerHash(correctAnswer);
        }

        // 選択肢をシャッフル（入力問題を除く）
        if (q.selectionType !== 'input') {
          var choices = [
            q.choiceA || '',
            q.choiceB || '',
            q.choiceC || '',
            q.choiceD || ''
          ];

          // 空の選択肢を除外
          var validChoices = [];
          for (var k = 0; k < choices.length; k++) {
            if (choices[k]) {
              validChoices.push(choices[k]);
            }
          }

          // 選択肢をシャッフル（Fisher–Yates）
          for (var k = validChoices.length - 1; k > 0; k--) {
            var l = Math.floor(Math.random() * (k + 1));
            var tmp = validChoices[k];
            validChoices[k] = validChoices[l];
            validChoices[l] = tmp;
          }

          // シャッフルした選択肢を再代入
          q.choiceA = validChoices[0] || '';
          q.choiceB = validChoices[1] || '';
          q.choiceC = validChoices[2] || '';
          q.choiceD = validChoices[3] || '';
        }

        allQuestions.push(q);
      }
    }
  }

  // 全問題をシャッフル（Fisher-Yates）
  for (var i = allQuestions.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = allQuestions[i];
    allQuestions[i] = allQuestions[j];
    allQuestions[j] = tmp;
  }

  Logger.log('エクストラモード: 全ジャンル・全レベルの問題を' + allQuestions.length + '問取得しました');
  return allQuestions;
}

/**
 * 正解のハッシュ値を生成
 * @param {string|Array} answer - 正解（文字列または配列）
 * @returns {string} ハッシュ値
 */
function generateAnswerHash(answer) {
  var normalized;

  if (Array.isArray(answer)) {
    // 配列の場合はソートして結合
    normalized = answer
      .map(function(a) { return a.toString().trim().toUpperCase(); })
      .sort()
      .join(',');
  } else {
    // 文字列の場合
    normalized = answer.toString().trim().toUpperCase();
  }

  // SHA-256ハッシュを生成
  var hash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalized,
    Utilities.Charset.UTF_8
  );

  // バイト配列を16進数文字列に変換
  var hashString = hash.map(function(byte) {
    var v = (byte < 0) ? 256 + byte : byte;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');

  return hashString;
}

// ========================================
// スコアランキング機能
// ========================================

/**
 * エクストラステージのスコアをスプレッドシートに保存
 * 同じbrowserIdがあれば更新、なければ新規追加
 * @param {Object} payload
 * @param {string} payload.browserId - ブラウザ識別ID
 * @param {string} payload.nickname - ニックネーム
 * @param {number} payload.score - スコア
 * @param {string} payload.genre - ジャンル名（"エクストラステージ"など）
 * @returns {Object} { success: true, rank: number } または { success: false, error: string }
 */
function saveScore(payload) {
  try {
    var browserId = payload.browserId;
    var nickname = payload.nickname;
    var score = payload.score;
    var genre = payload.genre || 'エクストラステージ';

    if (!browserId || !nickname || score === undefined) {
      return {
        success: false,
        error: '必須パラメータが不足しています'
      };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'スコアランキング';
    var sheet = ss.getSheetByName(sheetName);

    // シートが存在しない場合は作成
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // ヘッダー行を追加
      sheet.appendRow(['browserId', 'nickname', 'score', 'timestamp', 'genre']);
      sheet.getRange('A1:E1').setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;

    // 同じbrowserIdがあるか検索
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === browserId && data[i][4] === genre) {
        rowIndex = i + 1; // スプレッドシートの行番号（1-indexed）
        break;
      }
    }

    var timestamp = new Date();

    if (rowIndex > 0) {
      // 既存のレコードを更新（スコアがより高い場合のみ）
      var existingScore = data[rowIndex - 1][2];
      if (score > existingScore) {
        sheet.getRange(rowIndex, 2).setValue(nickname);
        sheet.getRange(rowIndex, 3).setValue(score);
        sheet.getRange(rowIndex, 4).setValue(timestamp);
      }
    } else {
      // 新規レコードを追加
      sheet.appendRow([browserId, nickname, score, timestamp, genre]);
    }

    // ランキングを取得して順位を返す
    var rankingData = getTopScores({ genre: genre, limit: 100 });
    var rank = -1;
    for (var i = 0; i < rankingData.rankings.length; i++) {
      if (rankingData.rankings[i].browserId === browserId) {
        rank = i + 1;
        break;
      }
    }

    return {
      success: true,
      rank: rank,
      message: 'スコアを保存しました'
    };

  } catch (error) {
    Logger.log('saveScore エラー: ' + error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * TOP N のスコアランキングを取得
 * @param {Object} payload
 * @param {string} payload.genre - ジャンル名（省略時は"エクストラステージ"）
 * @param {number} payload.limit - 取得件数（デフォルト10）
 * @returns {Object} { rankings: [{rank, nickname, score, timestamp, isCurrentUser}, ...] }
 */
function getTopScores(payload) {
  try {
    var genre = (payload && payload.genre) || 'エクストラステージ';
    var limit = (payload && payload.limit) || 10;
    var browserId = (payload && payload.browserId) || null;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('スコアランキング');

    if (!sheet) {
      return {
        rankings: []
      };
    }

    var data = sheet.getDataRange().getValues();
    var scores = [];

    // ヘッダー行をスキップして、指定ジャンルのデータを抽出
    for (var i = 1; i < data.length; i++) {
      if (data[i][4] === genre) {
        scores.push({
          browserId: data[i][0],
          nickname: data[i][1],
          score: data[i][2],
          timestamp: data[i][3]
        });
      }
    }

    // スコア降順でソート
    scores.sort(function(a, b) {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // スコアが同じ場合は古い方を上位にする
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

    // 上位N件を取得
    var topScores = scores.slice(0, limit);

    // ランキング形式に整形
    var rankings = topScores.map(function(item, index) {
      return {
        rank: index + 1,
        nickname: item.nickname,
        score: item.score,
        timestamp: Utilities.formatDate(new Date(item.timestamp), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'),
        browserId: item.browserId,
        isCurrentUser: browserId && item.browserId === browserId
      };
    });

    return {
      rankings: rankings
    };

  } catch (error) {
    Logger.log('getTopScores エラー: ' + error);
    return {
      rankings: [],
      error: error.toString()
    };
  }
}
