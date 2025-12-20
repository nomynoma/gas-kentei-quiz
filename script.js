// ========================================
// クイズアプリ - メインスクリプト（一括採点版・完全版）
// ========================================

// ========================================
// 設定はconfig.jsで一元管理
// ========================================
// すべてのURL設定は config.js で定義されています
// このファイルより前に config.js が読み込まれている必要があります

let nickname = '';
let levels = ['初級','中級','上級'];
let currentGenre = '';
let currentLevelIndex = 0;
let questions = [];
let currentQuestion = 0;
let score = 0;
let selectedChoices = []; // 現在の問題で選択中の選択肢
let userAnswers = []; // 全問題の回答を保存 [{questionId, answer}, ...]
let isEditingNickname = false; // ニックネーム編集モードかどうか

// ローカルストレージのキー
const STORAGE_KEY_NICKNAME = 'quiz_nickname';
const STORAGE_KEY_CERTIFICATES = 'quiz_certificates';
const STORAGE_KEY_BROWSER_ID = 'quiz_browser_id';

// ========================================
// 超級モード専用の変数
// ========================================
let isUltraMode = false; // 超級モード中かどうか
let ultraQuestions = []; // 超級モード用の問題配列
let ultraCurrentQuestion = 0; // 超級モード用の現在の問題番号
let ultraTimer = null; // 超級モード用のタイマーID
let ultraTimeLeft = 10; // 超級モード用の残り時間（秒）

// エクストラステージ専用の変数
// ========================================
let isExtraMode = false; // エクストラモード中かどうか（全ジャンル・全レベル）

// 初期化：画像URLとジャンルボタンを動的に設定
function initializeApp() {
  // Faviconの設定
  const faviconLink = document.querySelector('link[rel="icon"]');
  if (faviconLink && IMAGE_URLS && IMAGE_URLS.favicon) {
    faviconLink.href = IMAGE_URLS.favicon;
  }

  // OGP画像の設定
  const ogpImageMeta = document.querySelector('meta[property="og:image"]');
  if (ogpImageMeta && IMAGE_URLS && IMAGE_URLS.ogpImage) {
    ogpImageMeta.content = IMAGE_URLS.ogpImage;
  }

  // Twitter Card画像の設定
  const twitterImageMeta = document.querySelector('meta[name="twitter:image"]');
  if (twitterImageMeta && IMAGE_URLS && IMAGE_URLS.ogpImage) {
    twitterImageMeta.content = IMAGE_URLS.ogpImage;
  }

  // ジャンルボタンを動的に生成
  initializeGenreButtons();

  // ローカルストレージからニックネームを読み込み
  loadNicknameFromStorage();
}

// ページ読み込み時に初期化を実行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// 画面切替
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const el = document.getElementById(id);
  if(el) el.classList.add('active');

  // ヘッダーエリアの表示制御
  updateHeaderArea(id);
}

// ヘッダーエリアの表示制御
function updateHeaderArea(screenId) {
  const headerWrapper = document.querySelector('.header-wrapper');
  const headerArea = document.querySelector('.header-area');
  const backBtn = document.getElementById('backToGenreButton');
  const nicknameDisplay = document.getElementById('nicknameDisplay');
  const questionNumberHeader = document.getElementById('questionNumberHeader');
  const progressIndicatorHeader = document.getElementById('progressIndicatorHeader');

  if (!headerWrapper) return;

  // ニックネーム入力画面ではヘッダー全体を非表示
  if (screenId === 'nicknameScreen') {
    headerWrapper.style.display = 'none';
    return;
  }

  // その他の画面ではヘッダーを表示
  headerWrapper.style.display = 'block';
  if (headerArea) headerArea.style.display = 'flex';

  // ジャンル選択へ戻るボタンの表示制御
  if (backBtn) {
    if (screenId === 'genreScreen') {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
    }
  }

  // 問題番号表示の制御（問題画面でのみ表示）
  if (questionNumberHeader) {
    if (screenId === 'questionScreen') {
      questionNumberHeader.classList.remove('hidden');
    } else {
      questionNumberHeader.classList.add('hidden');
    }
  }

  // インジケーターヘッダーの制御（問題画面でのみ表示）
  if (progressIndicatorHeader) {
    if (screenId === 'questionScreen') {
      progressIndicatorHeader.classList.remove('hidden');
    } else {
      progressIndicatorHeader.classList.add('hidden');
    }
  }

  // ニックネーム表示エリアは常に表示（ニックネーム入力画面以外）
  if (nicknameDisplay) {
    nicknameDisplay.style.display = 'flex';
  }
}

// ローカルストレージからニックネームを読み込み
function loadNicknameFromStorage() {
  try {
    const savedNickname = localStorage.getItem(STORAGE_KEY_NICKNAME);
    if (savedNickname) {
      nickname = savedNickname;
      // ジャンルボタンを生成してから画面遷移
      initializeGenreButtons();
      updateNicknameDisplay();
      showScreen('genreScreen');
    }
  } catch (e) {
    console.error('ローカルストレージからの読み込みに失敗:', e);
  }
}

// ローカルストレージにニックネームを保存
function saveNicknameToStorage(name) {
  try {
    localStorage.setItem(STORAGE_KEY_NICKNAME, name);
  } catch (e) {
    console.error('ローカルストレージへの保存に失敗:', e);
  }
}

// ジャンル選択画面のニックネーム表示を更新
function updateNicknameDisplay() {
  const nicknameTextEl = document.getElementById('nicknameText');
  if (nicknameTextEl && nickname) {
    nicknameTextEl.textContent = `回答者：${nickname}`;
  }
}

// ニックネーム編集ボタンをクリック
function editNickname() {
  isEditingNickname = true;
  // 警告メッセージを表示
  const warningEl = document.getElementById('nicknameWarning');
  if (warningEl) {
    warningEl.classList.remove('hidden');
  }
  // 現在のニックネームを入力欄に設定
  const inputEl = document.getElementById('nicknameInput');
  if (inputEl) {
    inputEl.value = nickname;
  }
  // ニックネーム入力画面へ
  showScreen('nicknameScreen');
}

// ニックネーム送信
function submitNickname(){
  const input = document.getElementById('nicknameInput').value.trim();
  const errorDiv = document.getElementById('nicknameError');

  // エラーメッセージをクリア
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  // バリデーション
  if(input === ''){
    errorDiv.textContent = 'ニックネームを入力してください';
    errorDiv.style.display = 'block';
    return;
  }
  if(input.length > 10){
    errorDiv.textContent = 'ニックネームは10文字以内で入力してください';
    errorDiv.style.display = 'block';
    return;
  }

  // 編集モードで名前が変更された場合、合格証をリセット
  if (isEditingNickname && input !== nickname) {
    clearCertificatesFromStorage();
    isEditingNickname = false;
  }

  nickname = input;

  // ローカルストレージに保存
  saveNicknameToStorage(nickname);

  // ニックネーム表示を更新
  updateNicknameDisplay();

  // 警告メッセージを非表示にする
  const warningEl = document.getElementById('nicknameWarning');
  if (warningEl) {
    warningEl.classList.add('hidden');
  }

  // フォームを非表示にして「問題作成中」メッセージを表示
  document.getElementById('nicknameForm').style.display = 'none';
  document.getElementById('preparingMessage').style.display = 'block';

  // 少し待ってからジャンル選択画面へ
  setTimeout(() => {
    document.getElementById('nicknameForm').style.display = 'block';
    document.getElementById('preparingMessage').style.display = 'none';
    // ジャンルボタンを生成してから画面遷移
    initializeGenreButtons();
    showScreen('genreScreen');
  }, 300);
}

// ローカルストレージから合格証データを削除
function clearCertificatesFromStorage() {
  localStorage.removeItem(STORAGE_KEY_CERTIFICATES);
}

// ジャンルと難易度を指定して開始
function selectGenreAndLevel(genre, levelIndex) {
  currentGenre = genre;
  currentLevelIndex = levelIndex;
  loadLevel(currentGenre, levels[currentLevelIndex]);
}

// 後方互換性のため残す（使用されていないが念のため）
function selectGenre(genre){
  selectGenreAndLevel(genre, 0);
}

// --- レベル別問題読み込み ---
function loadLevel(genre, level){
  // Loading画面を表示
  showScreen('loading');

  requestAnimationFrame(() => {
    setTimeout(() => {
      google.script.run
        .withSuccessHandler(function(data){
          questions = data;
          currentQuestion = 0;
          score = 0;
          selectedChoices = [];
          // userAnswersを初期化（全問題分の空配列を用意）
          userAnswers = questions.map(q => ({
            questionId: q.id,
            answer: null
          }));
          showQuestion();
        })
        .withFailureHandler(function(err){
          alert('問題の読み込みに失敗しました: '+err);
          showScreen('genreScreen');
        })
        .getQuestions(genre, level, nickname);
    }, 50);
  });
}

// --- 問題表示 ---
function showQuestion(){
  if(currentQuestion >= questions.length){
    // ここには来ないはず（採点ボタンから直接採点へ）
    return;
  }

  const q = questions[currentQuestion];
  const isMultiple = q.selectionType === 'multiple';
  const isInput = q.selectionType === 'input';
  const isImage = q.displayType === 'image';

  // 回答状況インジケーターをヘッダー下に表示
  const progressIndicatorHeader = document.getElementById('progressIndicatorHeader');
  if (progressIndicatorHeader) {
    progressIndicatorHeader.innerHTML = renderProgressIndicator();
    progressIndicatorHeader.classList.remove('hidden');
  }

  // 問題番号とレベル表示（ヘッダーに表示）
  const levelName = levels[currentLevelIndex];
  const questionNumberHeader = document.getElementById('questionNumberHeader');
  if (questionNumberHeader) {
    questionNumberHeader.textContent = levelName + '問題 ' + (currentQuestion+1) + ' / ' + questions.length;
    questionNumberHeader.classList.remove('hidden');
  }

  document.getElementById('questionText').innerHTML = DOMPurify.sanitize(q.question);
  document.getElementById('multipleInstruction').style.display = isMultiple ? 'block' : 'none';

  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = '';

  if(isInput){
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'inputAnswer';
    input.placeholder = '答えを入力してください';
    input.className = 'answer-input';

    choicesDiv.appendChild(input);

  } else {
    const choiceMap = { A: q.choiceA || '', B: q.choiceB || '', C: q.choiceC || '', D: q.choiceD || '' };
    const gridDiv = document.createElement('div');
    gridDiv.className = 'image-grid';

    Object.keys(choiceMap).forEach(label => {
      const value = choiceMap[label];
      if(!value) return; // 空の選択肢はスキップ
      
      const button = document.createElement('button');
      button.className = 'btn choice-btn' + (isImage ? ' image-choice' : '');
      button.dataset.label = label;
      button.dataset.value = value;

      if(isImage){
        button.innerHTML = `<img src="${encodeURIComponent(value)}" alt="選択肢${label}" onerror="this.src='https://via.placeholder.com/400x250?text=画像読込エラー'">
                            <div class="image-choice-label">${label}</div>`;
      } else {
        const sanitizedHtml = DOMPurify.sanitize(value);
        button.innerHTML = `<strong>${label}:</strong> ${sanitizedHtml}`;
      }

      if(isMultiple){
        button.addEventListener('click', function() {
          toggleChoiceByButton(this);
        });
      } else {
        button.addEventListener('click', function() {
          selectSingleChoice(this);
        });
      }

      gridDiv.appendChild(button);
    });

    choicesDiv.appendChild(gridDiv);
  }

  // スライダーナビゲーションボタンの状態を更新
  updateSliderNavButtons();

  // スライダーボタンを表示（ローディング後の再表示のため）
  const prevBtn = document.getElementById('prevQuestionBtn');
  const nextBtn = document.getElementById('nextQuestionBtn');
  if (prevBtn) prevBtn.style.display = 'flex';
  if (nextBtn) nextBtn.style.display = 'flex';

  // 下部ナビゲーションボタンを表示（採点ボタンのみ）
  renderNavigationButtons();

  // 以前の回答を復元
  restoreSavedAnswer();

  showScreen('questionScreen');
}

// --- 回答状況インジケーター ---
function renderProgressIndicator() {
  let html = '<div class="progress-dots">';
  for(let i = 0; i < questions.length; i++) {
    const answered = userAnswers[i] && userAnswers[i].answer !== null;
    const current = i === currentQuestion;
    const dotClass = `progress-dot ${answered ? 'answered' : 'unanswered'} ${current ? 'current' : ''}`;
    html += `<span class="${dotClass}" onclick="jumpToQuestion(${i})" title="問題${i+1}"></span>`;
  }
  html += '</div>';
  return html;
}

// --- 指定した問題番号にジャンプ ---
function jumpToQuestion(index) {
  if(index < 0 || index >= questions.length) return;
  
  // 入力問題の場合は現在の回答を保存
  const q = questions[currentQuestion];
  if(q.selectionType === 'input') {
    saveCurrentAnswer();
  }
  
  currentQuestion = index;
  showQuestion();
}

// --- スライダーナビゲーションボタンの状態更新 ---
function updateSliderNavButtons() {
  const prevBtn = document.getElementById('prevQuestionBtn');
  const nextBtn = document.getElementById('nextQuestionBtn');

  if (!prevBtn || !nextBtn) return;

  // 前へボタンの状態
  prevBtn.disabled = currentQuestion === 0;

  // 次へボタンの状態
  nextBtn.disabled = currentQuestion === questions.length - 1;
}

// --- 下部ナビゲーションボタン（採点ボタンのみ） ---
function renderNavigationButtons() {
  const navDiv = document.getElementById('navigation');
  navDiv.innerHTML = '';

  // 採点ボタン
  const submitBtn = document.createElement('button');
  submitBtn.id = 'submitAllBtn';
  submitBtn.className = 'btn submit-all-btn';
  submitBtn.textContent = '採点';
  submitBtn.onclick = submitAllAnswers;

  // 全問回答済みでなければ無効化
  if(!canSubmit()) {
    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
  }

  navDiv.appendChild(submitBtn);
}

// --- 単一選択 ---
function selectSingleChoice(button) {
  // すべての選択肢から選択状態を削除
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // クリックされた選択肢に選択状態を追加
  button.classList.add('selected');
  
  // selectedChoicesを更新
  selectedChoices = [button.dataset.value];
  
  // 回答を保存
  saveCurrentAnswer();
  
  // ナビゲーションボタンを更新（採点ボタンの有効化）
  updateSliderNavButtons();
  renderNavigationButtons();
}

// --- 複数選択の選択切替 ---
function toggleChoiceByButton(button){
  const value = button.dataset.value;
  
  const idx = selectedChoices.indexOf(value);
  if(idx > -1){
    selectedChoices.splice(idx, 1);
  } else {
    selectedChoices.push(value);
  }

  // 選択状態を反映
  updateSelectedButtons();
  
  // 回答を保存
  saveCurrentAnswer();
  
  // ナビゲーションボタンを更新（採点ボタンの有効化）
  updateSliderNavButtons();
  renderNavigationButtons();
}

function updateSelectedButtons() {
  document.querySelectorAll('.choice-btn').forEach(btn => {
    btn.classList.toggle('selected', selectedChoices.includes(btn.dataset.value));
  });
}

// --- 現在の回答を保存 ---
function saveCurrentAnswer() {
  const q = questions[currentQuestion];
  const isMultiple = q.selectionType === 'multiple';
  const isInput = q.selectionType === 'input';
  
  let answer = null;
  
  if(isInput) {
    const input = document.getElementById('inputAnswer');
    if(input && input.value.trim()) {
      answer = input.value.trim();
    }
  } else if(isMultiple) {
    if(selectedChoices.length > 0) {
      answer = [...selectedChoices]; // 配列をコピー
    }
  } else {
    // 単一選択
    if(selectedChoices.length > 0) {
      answer = selectedChoices[0];
    }
  }
  
  // userAnswersに保存
  userAnswers[currentQuestion] = {
    questionId: q.id,
    answer: answer
  };
  
  // インジケーターを更新
  const progressIndicatorHeader = document.getElementById('progressIndicatorHeader');
  if (progressIndicatorHeader) {
    progressIndicatorHeader.innerHTML = renderProgressIndicator();
  }
}

// --- 保存された回答を復元 ---
function restoreSavedAnswer() {
  const savedAnswer = userAnswers[currentQuestion];
  if(!savedAnswer || savedAnswer.answer === null) {
    selectedChoices = [];
    return;
  }
  
  const q = questions[currentQuestion];
  const isInput = q.selectionType === 'input';
  
  if(isInput) {
    const input = document.getElementById('inputAnswer');
    if(input) input.value = savedAnswer.answer;
    selectedChoices = [];
  } else if(Array.isArray(savedAnswer.answer)) {
    // 複数選択
    selectedChoices = [...savedAnswer.answer];
    updateSelectedButtons();
  } else {
    // 単一選択
    selectedChoices = [savedAnswer.answer];
    updateSelectedButtons();
  }
}

// --- 前の問題へ ---
function previousQuestion() {
  if(currentQuestion > 0) {
    // 入力問題の場合は保存
    const q = questions[currentQuestion];
    if(q.selectionType === 'input') {
      saveCurrentAnswer();
    }
    
    currentQuestion--;
    showQuestion();
  }
}

// --- 次の問題へ ---
function nextQuestion() {
  if(currentQuestion < questions.length - 1) {
    // 入力問題の場合は保存
    const q = questions[currentQuestion];
    if(q.selectionType === 'input') {
      saveCurrentAnswer();
    }
    
    currentQuestion++;
    showQuestion();
  }
}

// --- 全問回答済みかチェック ---
function canSubmit() {
  return userAnswers.every(a => a && a.answer !== null);
}

// --- 全回答を一括送信 ---
function submitAllAnswers() {
  // 入力問題の場合は最後に保存
  const q = questions[currentQuestion];
  if(q.selectionType === 'input') {
    saveCurrentAnswer();
  }
  
  if(!canSubmit()) {
    alert('全ての問題に回答してください');
    return;
  }
  
  // 採点中ローディング画面を表示
  showGradingLoading();
  
  google.script.run
    .withSuccessHandler(function(data){
      // data = { results: [true, false, ...], wrongAnswers: [...] }
      score = data.results.filter(r => r).length;

      // 誤答情報をグローバル変数に保存
      window.wrongAnswersData = data.wrongAnswers || [];

      showSectionResult();
    })
    .withFailureHandler(function(err){
      alert('採点に失敗しました: ' + err);
      showScreen('questionScreen');
    })
    .judgeAllAnswers({
      genre: currentGenre,
      level: levels[currentLevelIndex],
      answers: userAnswers,
      userId: nickname
    });
}

// --- 採点中ローディング画面を表示 ---
function showGradingLoading() {
  document.getElementById('multipleInstruction').style.display = 'none';
  document.getElementById('questionText').innerHTML =
    '<div class="loading-container">' +
    '<div class="loading-title">📝 採点中...</div>' +
    '<div class="loading-message">しばらくお待ちください</div>' +
    '<div class="loading-spinner"></div>' +
    '</div>';
  document.getElementById('choices').innerHTML = '';
  document.getElementById('navigation').innerHTML = '';

  // スライダーボタンを非表示
  const prevBtn = document.getElementById('prevQuestionBtn');
  const nextBtn = document.getElementById('nextQuestionBtn');
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';

  showScreen('questionScreen');
}

// レベル結果
function showSectionResult(){
  if(score === questions.length){
    // 合格：合格証明書を表示
    showCertificate();
  } else {
    // 不合格：不合格画面を表示
    document.getElementById('failResultText').textContent =
      score + ' / ' + questions.length + ' 問正解！';

    // 誤答リストを表示
    showWrongAnswers();

    showScreen('failScreen');
  }
}

// 誤答リストを表示
function showWrongAnswers() {
  const wrongAnswers = window.wrongAnswersData || [];
  const failScreen = document.getElementById('failScreen');

  // 既存の誤答リストを削除
  const existingList = document.getElementById('wrongAnswersList');
  if (existingList) {
    existingList.remove();
  }

  if (wrongAnswers.length === 0) {
    return; // 誤答がない（全問正解）
  }

  // 誤答リストのHTML を生成
  let wrongAnswersHtml = '<div id="wrongAnswersList" class="wrong-answers-list">';

  wrongAnswers.forEach(function(item) {
    wrongAnswersHtml += '<div class="wrong-answer-item">';
    wrongAnswersHtml += '<div class="wrong-answer-header">Q' + item.questionNumber + '. ' + item.question + '</div>';
    wrongAnswersHtml += '<div class="wrong-answer-user">あなたの解答：' + item.userAnswer + '</div>';

    if (item.hintText || item.hintUrl) {
      wrongAnswersHtml += '<div class="wrong-answer-hint">ヒント：';
      if (item.hintUrl) {
        wrongAnswersHtml += '<a href="' + item.hintUrl + '" target="_blank" rel="noopener noreferrer">' + (item.hintText || 'こちら') + '</a>';

        // YouTube動画の場合はサムネイルを表示
        const youtubeId = extractYouTubeId(item.hintUrl);
        if (youtubeId) {
          const thumbnailUrl = getYouTubeThumbnail(youtubeId);
          wrongAnswersHtml += '<a href="' + item.hintUrl + '" target="_blank" rel="noopener noreferrer" class="hint-thumbnail-link">';
          wrongAnswersHtml += '<div class="hint-thumbnail">';
          wrongAnswersHtml += '<img src="' + thumbnailUrl + '" alt="YouTube動画サムネイル" onerror="this.parentElement.parentElement.style.display=\'none\'">';
          wrongAnswersHtml += '</div>';
          wrongAnswersHtml += '</a>';
        }
      } else {
        wrongAnswersHtml += item.hintText;
      }
      wrongAnswersHtml += '</div>';
    }

    wrongAnswersHtml += '</div>';
  });

  wrongAnswersHtml += '</div>';

  // 不合格画面の「もう一度挑戦する」ボタンの前に挿入
  const retryButton = failScreen.querySelector('.btn:not(.btn-twitter)');
  if (retryButton) {
    retryButton.insertAdjacentHTML('beforebegin', wrongAnswersHtml);
  }
}

// 合格証明書を表示
function showCertificate(){
  // エクストラモードの場合は「合格」、超級モード（currentLevelIndex = 3）の場合は「超級」
  let levelName;
  if (isExtraMode) {
    levelName = '合格';
  } else if (currentLevelIndex === 3) {
    levelName = '超級';
  } else {
    levelName = levels[currentLevelIndex];
  }

  const today = new Date();
  const dateStr = today.getFullYear() + '年' + (today.getMonth()+1) + '月' + today.getDate() + '日';

  // エクストラモードの場合は'ALL'キーを使用
  let mapKey;
  if (isExtraMode) {
    mapKey = 'ALL';
  } else {
    // ジャンル番号を取得（config.jsのGENRE_NAMESから）
    const genreNumber = getGenreNumber(currentGenre);
    const levelNumber = currentLevelIndex + 1; // 0:初級→1, 1:中級→2, 2:上級→3, 3:超級→4
    mapKey = genreNumber + '-' + levelNumber;
  }

  // 背景画像URLをマッピングから取得
  const imageUrl = CERTIFICATE_BG_IMAGE_MAP[mapKey];

  // マッピングに存在しない場合のフォールバック（念のため）
  if (!imageUrl) {
    console.error('合格証明書の背景画像が見つかりません: ' + mapKey);
    alert('合格証明書の背景画像が見つかりません。管理者に連絡してください。');
    return;
  }

  // テキスト内容を準備（CSSクラスで位置・スタイルを指定）
  const certificateTextHtml =
    '<div class="certificate-nickname">' + nickname + '殿</div>' +
    '<div class="certificate-date">' + dateStr + '</div>';

  // ローディング画面を表示して画像生成開始
  showCertificateLoading(levelName, dateStr, imageUrl, certificateTextHtml, mapKey);
}

// 合格証作成中ローディング表示 → 画像生成 → 合格証画面表示
function showCertificateLoading(levelName, dateStr, imageUrl, certificateTextHtml, mapKey){
  // ローディング画面を表示（問題画面エリアを使用）
  document.getElementById('multipleInstruction').style.display = 'none';
  document.getElementById('questionText').innerHTML =
    '<div class="loading-container">' +
    '<div class="loading-title">🎉 おめでとうございます！</div>' +
    '<div class="loading-message">合格証を作成中...</div>' +
    '<div class="loading-spinner"></div>' +
    '</div>';
  document.getElementById('choices').innerHTML = '';
  document.getElementById('navigation').innerHTML = '';

  // スライダーボタンを非表示
  const prevBtn = document.getElementById('prevQuestionBtn');
  const nextBtn = document.getElementById('nextQuestionBtn');
  if (prevBtn) prevBtn.style.display = 'none';
  if (nextBtn) nextBtn.style.display = 'none';

  showScreen('questionScreen');

  // キャプチャ用エリアに設定
  document.getElementById('captureImage').src = imageUrl;
  document.getElementById('captureText').innerHTML = certificateTextHtml;

  // 背景画像の読み込みを待つ
  const captureImg = document.getElementById('captureImage');
  captureImg.onload = function() {
    setTimeout(() => {
      generateAndSaveCertificate(levelName, dateStr, imageUrl, certificateTextHtml, mapKey);
    }, 100);
  };

  // 既に読み込み済みの場合（キャッシュ）
  if (captureImg.complete) {
    setTimeout(() => {
      generateAndSaveCertificate(levelName, dateStr, imageUrl, certificateTextHtml, mapKey);
    }, 100);
  }
}

// 合格証画像を生成してlocalStorageに保存後、合格証画面を表示
function generateAndSaveCertificate(levelName, dateStr, imageUrl, certificateTextHtml, mapKey){
  const captureArea = document.getElementById('captureArea');

  html2canvas(captureArea, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    scale: 2,
    width: 800,
    height: 565
  }).then(canvas => {
    // canvasをBase64形式に変換（JPEG形式で圧縮して軽量化）
    const imageDataBase64 = canvas.toDataURL('image/jpeg', 0.8);

    // localStorageに保存
    const storageKey = mapKey;
    try {
      localStorage.setItem(storageKey, imageDataBase64);
      console.log('合格証画像をlocalStorageに保存しました。Key: ' + storageKey);
    } catch(error) {
      console.error('localStorage保存エラー:', error);
      alert('合格証の保存に失敗しました。ブラウザのストレージ容量を確認してください。');
    }

    // 保存完了後に合格証画面を表示
    showCertificateScreen(levelName, imageDataBase64);
    
  }).catch(error => {
    console.error('html2canvasエラー:', error);
    alert('合格証の生成に失敗しました。');
  });
}

// 合格証画面を表示（生成した画像を使用）
function showCertificateScreen(levelName, imageDataBase64){
  // 生成した画像を表示
  const certImg = document.getElementById('certificateDisplayImage');
  const certLink = document.getElementById('certificateLink');

  certImg.src = imageDataBase64;
  certLink.href = base64ToBlobUrl(imageDataBase64);  // data:image/jpeg;base64,... のBlobURLをhrefに設定

  // ボタンの表示制御
  const nextBtn = document.getElementById('certificateNextBtn');
  const backBtn = document.getElementById('certificateBackBtn');

  if(currentLevelIndex < levels.length - 1){
    // 初級・中級：次のレベルへ進むボタンを表示
    nextBtn.style.display = 'block';
  } else {
    // 上級：次のレベルへボタンを非表示
    nextBtn.style.display = 'none';
  }

  // ジャンル選択へ戻るボタンは常に表示
  backBtn.style.display = 'block';

  // 合格証画面を表示
  showScreen('certificateScreen');
}

// 合格証画像をダウンロード
function downloadCertificate(){
  const img = document.getElementById('certificateDisplayImage');
  const link = document.createElement('a');
  link.href = img.src;
  link.download = currentGenre + '_' + levels[currentLevelIndex] + '_合格証.jpg';
  link.click();
}

// 合格証を別窓で開く
function openCertificateInNewWindow(){
  const img = document.getElementById('certificateDisplayImage');
  window.open(img.src, '_blank');
}

// 難易度の解放状態を判定
function isDifficultyUnlocked(genreName, levelIndex) {
  if (levelIndex === 0) return true; // 初級は常に解放

  const genreNumber = getGenreNumber(genreName);
  const storageKey = genreNumber + '-' + levelIndex;
  return localStorage.getItem(storageKey) !== null;
}

// ジャンルボタンを動的に生成（難易度選択システム）
function initializeGenreButtons() {
  const genreButtonsDiv = document.getElementById('genreButtons');
  if (!genreButtonsDiv || !GENRE_NAMES) return;

  genreButtonsDiv.innerHTML = '';

  GENRE_NAMES.forEach(genreName => {
    // ジャンルコンテナ（枠線付き）
    const genreContainer = document.createElement('div');
    genreContainer.className = 'genre-container';

    // ジャンル名タイトル
    const genreTitle = document.createElement('div');
    genreTitle.className = 'genre-title';
    genreTitle.textContent = genreName;
    genreContainer.appendChild(genreTitle);

    // 難易度ボタンコンテナ
    const difficultyContainer = document.createElement('div');
    difficultyContainer.className = 'difficulty-container';

    levels.forEach((levelName, levelIndex) => {
      // 難易度ボタンとメダルのラッパー
      const difficultyWrapper = document.createElement('div');
      difficultyWrapper.className = 'difficulty-wrapper';

      // 難易度ボタン
      const difficultyBtn = document.createElement('button');
      difficultyBtn.className = 'btn difficulty-btn';
      difficultyBtn.textContent = levelName;

      // 解放状態をチェック
      const isUnlocked = isDifficultyUnlocked(genreName, levelIndex);

      if (isUnlocked) {
        difficultyBtn.onclick = function() {
          selectGenreAndLevel(genreName, levelIndex);
        };
      } else {
        difficultyBtn.disabled = true;
        difficultyBtn.classList.add('locked');
      }

      difficultyWrapper.appendChild(difficultyBtn);

      // 合格証バッジ（メダル）
      const genreNumber = getGenreNumber(genreName);
      const storageKey = genreNumber + '-' + (levelIndex + 1);
      const certificateData = localStorage.getItem(storageKey);

      if (certificateData) {
        const badgeMedal = document.createElement('span');
        badgeMedal.className = 'certificate-medal';
        badgeMedal.title = levelName + '合格証を表示';

        const emoji = levelIndex === 0 ? '🥉' : levelIndex === 1 ? '🥈' : '🥇';
        badgeMedal.textContent = emoji;

        badgeMedal.onclick = function(e) {
          e.stopPropagation();
          openCertificateModal(storageKey);
        };

        difficultyWrapper.appendChild(badgeMedal);
      }

      difficultyContainer.appendChild(difficultyWrapper);
    });

    // 超級ボタンを追加（上級クリア後のみ表示）
    const ultraWrapper = document.createElement('div');
    ultraWrapper.className = 'difficulty-wrapper';

    const ultraBtn = document.createElement('button');
    ultraBtn.className = 'btn difficulty-btn ultra-btn';
    ultraBtn.textContent = '超級';

    // 超級の解放判定：上級クリア済みかどうか
    const genreNumber = getGenreNumber(genreName);
    const ultraStorageKey = genreNumber + '-3';
    const isUltraUnlocked = localStorage.getItem(ultraStorageKey) !== null;

    if (isUltraUnlocked) {
      ultraBtn.onclick = function() {
        startUltraMode(genreName);
      };
    } else {
      ultraBtn.disabled = true;
      ultraBtn.classList.add('locked');
    }

    ultraWrapper.appendChild(ultraBtn);

    // 超級の合格証バッジ
    const ultraCertKey = genreNumber + '-4';
    const ultraCertData = localStorage.getItem(ultraCertKey);

    if (ultraCertData) {
      const badgeMedal = document.createElement('span');
      badgeMedal.className = 'certificate-medal';
      badgeMedal.title = '超級合格証を表示';
      badgeMedal.textContent = '🏆';

      badgeMedal.onclick = function(e) {
        e.stopPropagation();
        openCertificateModal(ultraCertKey);
      };

      ultraWrapper.appendChild(badgeMedal);
    }

    difficultyContainer.appendChild(ultraWrapper);

    genreContainer.appendChild(difficultyContainer);
    genreButtonsDiv.appendChild(genreContainer);
  });

  // エクストラステージボタンを追加（全ジャンルの上級クリア後のみ表示）
  const allGenresUltraCleared = GENRE_NAMES.every(genreName => {
    const genreNumber = getGenreNumber(genreName);
    const storageKey = genreNumber + '-3';
    return localStorage.getItem(storageKey) !== null;
  });

  if (allGenresUltraCleared) {
    const extraContainer = document.createElement('div');
    extraContainer.className = 'extra-stage-container';

    const extraBtn = document.createElement('button');
    extraBtn.className = 'btn extra-stage-btn';
    extraBtn.textContent = '🏆 エクストラステージ 🏆';
    extraBtn.onclick = function() {
      startUltraMode(); // 引数なし = エクストラモード
    };

    extraContainer.appendChild(extraBtn);

    // エクストラステージの合格証バッジ
    const extraCertKey = 'ALL';
    const extraCertData = localStorage.getItem(extraCertKey);

    if (extraCertData) {
      const badgeMedal = document.createElement('span');
      badgeMedal.className = 'certificate-medal extra-medal';
      badgeMedal.title = 'エクストラステージ合格証を表示';
      badgeMedal.textContent = '👑';

      badgeMedal.onclick = function(e) {
        e.stopPropagation();
        openCertificateModal(extraCertKey);
      };

      extraContainer.appendChild(badgeMedal);
    }

    genreButtonsDiv.appendChild(extraContainer);

    // ランキング表示ボタンを追加
    const rankingBtn = document.createElement('button');
    rankingBtn.className = 'btn btn-ranking';
    rankingBtn.textContent = '🏆 ランキングを見る';
    rankingBtn.onclick = function() {
      showRanking();
    };
    genreButtonsDiv.appendChild(rankingBtn);
  }
}

// Xで共有（合格時）
function shareToX(){
  const levelName = levels[currentLevelIndex];
  const levelText = currentLevelIndex === 2 ? '上級全問正解' : levelName + '合格';
  const text = 'クイズアプリで' + currentGenre + 'の' + levelText + 'しました！君も挑戦してみよう！';
  // GitHub PagesのURLを使用（config.jsで定義）
  const url = HOSTING_BASE_URL;
  const twitterUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

// Xで共有（失敗時）
function shareFailToX(){
  const levelName = levels[currentLevelIndex];
  const text = 'クイズアプリで' + currentGenre + 'の' + levelName + 'に挑戦したよ！' + score + '/' + questions.length + '問正解！君も挑戦してみよう！';
  // GitHub PagesのURLを使用（config.jsで定義）
  const url = HOSTING_BASE_URL;
  const twitterUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

// レベルをやり直す
function retryLevel(){
  loadLevel(currentGenre, levels[currentLevelIndex]);
}

function nextSection(){
  // ボタン連打防止
  document.getElementById('certificateNextBtn').disabled = true;

  // ブラウザが Loading を描画してから処理を開始
  requestAnimationFrame(() => {
    currentLevelIndex++;
    if(currentLevelIndex < levels.length){
      document.getElementById('certificateNextBtn').disabled = false;
      loadLevel(currentGenre, levels[currentLevelIndex]);
    }
  });
}

// ジャンル選択に戻る
function backToGenreSelection() {
  // 超級タイマーをクリア
  if (ultraTimer) {
    clearInterval(ultraTimer);
    ultraTimer = null;
  }

  // ジャンルボタンを再生成（合格証バッジを更新）
  initializeGenreButtons();
  showScreen('genreScreen');
}

/**
 * Base64(DataURL) を Blob URL に変換して返す
 * @param {string} base64DataUrl - data:image/jpeg;base64,... 形式
 * @returns {string} blob URL（hrefにそのまま使える）
 */
function base64ToBlobUrl(base64DataUrl) {
  const [meta, base64] = base64DataUrl.split(',');
  const mime = meta.match(/data:(.*?);base64/)[1];

  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

// ========================================
// 超級モード専用の関数群
// ========================================

/**
 * SHA-256ハッシュを生成（Web Crypto API使用）
 * @param {string} text - ハッシュ化する文字列
 * @returns {Promise<string>} ハッシュ値（16進数文字列）
 */
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * 回答を正規化してハッシュ化
 * @param {string|Array} answer - ユーザーの回答
 * @returns {Promise<string>} ハッシュ値
 */
async function hashAnswer(answer) {
  let normalized;

  if (Array.isArray(answer)) {
    // 配列の場合はソートして結合
    normalized = answer
      .map(a => a.toString().trim().toUpperCase())
      .sort()
      .join(',');
  } else {
    // 文字列の場合
    normalized = answer.toString().trim().toUpperCase();
  }

  return await sha256(normalized);
}

/**
 * 超級モードを開始
 * @param {string} genre - ジャンル名（省略時は全ジャンル・全レベル = エクストラモード）
 */
function startUltraMode(genre) {
  isUltraMode = true;
  isExtraMode = !genre; // ジャンルが指定されていない場合はエクストラモード
  currentGenre = genre || 'エクストラステージ';
  ultraCurrentQuestion = 0;

  showScreen('loading');

  // GASから超級モード用の問題を取得
  if (isExtraMode) {
    // エクストラモード：全ジャンル・全レベルの問題を取得
    google.script.run
      .withSuccessHandler(function(questionsData) {
        ultraQuestions = questionsData;

        if (ultraQuestions.length === 0) {
          alert('問題の取得に失敗しました');
          backToGenreSelection();
          return;
        }

        // 最初の問題を表示
        showUltraQuestion();
      })
      .withFailureHandler(function(error) {
        console.error('エクストラモード: 問題取得エラー', error);
        alert('問題の読み込みに失敗しました: ' + error.message);
        backToGenreSelection();
      })
      .getAllQuestionsForExtraMode(nickname);
  } else {
    // 超級モード：特定ジャンルの全レベル問題を取得
    google.script.run
      .withSuccessHandler(function(questionsData) {
        ultraQuestions = questionsData;

        if (ultraQuestions.length === 0) {
          alert('問題の取得に失敗しました');
          backToGenreSelection();
          return;
        }

        // 最初の問題を表示
        showUltraQuestion();
      })
      .withFailureHandler(function(error) {
        console.error('超級モード: 問題取得エラー', error);
        alert('問題の読み込みに失敗しました: ' + error.message);
        backToGenreSelection();
      })
      .getUltraModeQuestions(genre, nickname);
  }
}

/**
 * 超級モードの問題を表示
 */
function showUltraQuestion() {
  const q = ultraQuestions[ultraCurrentQuestion];

  // 画面要素を取得
  const questionText = document.getElementById('ultraQuestionText');
  const questionImage = document.getElementById('ultraQuestionImage');
  const choicesDiv = document.getElementById('ultraChoices');
  const currentNumEl = document.getElementById('ultraCurrentNum');
  const totalNumEl = document.getElementById('ultraTotalNum');

  // 問題番号を更新
  currentNumEl.textContent = ultraCurrentQuestion + 1;
  totalNumEl.textContent = ultraQuestions.length;

  // 問題文を表示（サニタイズ）
  questionText.innerHTML = DOMPurify.sanitize(q.question, {
    ALLOWED_TAGS: ['br', 'b', 'i', 'u', 'strong', 'em'],
    ALLOWED_ATTR: []
  });

  // 画像表示
  questionImage.innerHTML = '';
  if (q.displayType === 'image' && q.question) {
    const img = document.createElement('img');
    img.src = q.question;
    img.alt = '問題画像';
    img.classList.add('question-image');
    questionImage.appendChild(img);
    questionText.style.display = 'none';
  } else {
    questionText.style.display = 'block';
  }

  // 選択肢を表示（GAS側でシャッフル済み）
  choicesDiv.innerHTML = '';
  const isImage = q.displayType === 'image';
  const isMultiple = q.selectionType === 'multiple';
  const isInput = q.selectionType === 'input';

  // デバッグ用ログ
  console.log('超級問題:', {
    id: q.id,
    selectionType: q.selectionType,
    displayType: q.displayType,
    isMultiple: isMultiple,
    isInput: isInput
  });

  // 入力式問題の場合
  if (isInput) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'ultraInputAnswer';
    input.placeholder = '答えを入力してください';
    input.className = 'answer-input';

    // Enterキーで送信
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        submitUltraInputAnswer();
      }
    });

    choicesDiv.appendChild(input);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn btn-primary ultra-submit-btn';
    submitBtn.textContent = '回答する';
    submitBtn.onclick = function() {
      submitUltraInputAnswer();
    };
    choicesDiv.appendChild(submitBtn);

    // 入力欄にフォーカス
    setTimeout(() => input.focus(), 100);

  } else {
    // 選択式問題の場合（従来通り）
    // 選択肢マップを作成（通常問題と同じ）
    const choiceMap = { A: q.choiceA || '', B: q.choiceB || '', C: q.choiceC || '', D: q.choiceD || '' };

    const gridDiv = document.createElement('div');
    gridDiv.className = 'image-grid';

    Object.keys(choiceMap).forEach(label => {
      const value = choiceMap[label];
      if (!value) return; // 空の選択肢はスキップ

      const button = document.createElement('button');
      button.className = 'btn choice-btn' + (isImage ? ' image-choice' : '');
      button.dataset.label = label;
      button.dataset.value = value;

      if (isImage) {
        button.innerHTML = `<img src="${encodeURIComponent(value)}" alt="選択肢${label}" onerror="this.src='https://via.placeholder.com/400x250?text=画像読込エラー'">
                            <div class="image-choice-label">${label}</div>`;
      } else {
        const sanitizedHtml = DOMPurify.sanitize(value);
        button.innerHTML = `<strong>${label}:</strong> ${sanitizedHtml}`;
      }

      if (isMultiple) {
        // 複数選択：クリックで選択状態をトグル
        button.onclick = function() {
          toggleUltraChoice(button);
        };
      } else {
        // 単一選択：クリックで即座に回答
        button.onclick = function() {
          submitUltraAnswer([value]);
        };
      }

      gridDiv.appendChild(button);
    });

    choicesDiv.appendChild(gridDiv);

    // 複数選択の場合は回答ボタンを追加
    if (isMultiple) {
      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary ultra-submit-btn';
      submitBtn.textContent = '回答する';
      submitBtn.onclick = function() {
        submitUltraMultipleAnswer();
      };
      choicesDiv.appendChild(submitBtn);
    }
  }

  // タイマーをリセットして開始
  startUltraTimer();

  // 画面表示
  showScreen('ultraQuestionScreen');
}

/**
 * 超級モードのタイマーを開始
 */
function startUltraTimer() {
  // 既存のタイマーをクリア
  if (ultraTimer) {
    clearInterval(ultraTimer);
  }

  ultraTimeLeft = 10;
  updateUltraTimerDisplay();

  ultraTimer = setInterval(() => {
    ultraTimeLeft--;
    updateUltraTimerDisplay();

    if (ultraTimeLeft <= 0) {
      clearInterval(ultraTimer);
      handleUltraTimeOut();
    }
  }, 1000);
}

/**
 * 超級モードのタイマー表示を更新
 */
function updateUltraTimerDisplay() {
  const timerEl = document.getElementById('ultraTimer');
  timerEl.textContent = ultraTimeLeft;

  // 残り3秒以下で警告表示
  if (ultraTimeLeft <= 3) {
    timerEl.classList.add('warning');
  } else {
    timerEl.classList.remove('warning');
  }
}

/**
 * 超級モードの選択肢トグル（複数選択用）
 * @param {HTMLElement} button - クリックされたボタン
 */
function toggleUltraChoice(button) {
  button.classList.toggle('selected');
}

/**
 * 超級モードの複数選択回答を送信
 */
function submitUltraMultipleAnswer() {
  const selectedButtons = document.querySelectorAll('#ultraChoices .choice-btn.selected');
  const selectedValues = Array.from(selectedButtons).map(btn => btn.dataset.value);

  if (selectedValues.length === 0) {
    alert('選択肢を選んでください');
    return;
  }

  submitUltraAnswer(selectedValues);
}

/**
 * 超級モードの入力式回答を送信
 */
function submitUltraInputAnswer() {
  const input = document.getElementById('ultraInputAnswer');
  if (!input) return;

  const answer = input.value.trim();
  if (answer === '') {
    alert('答えを入力してください');
    return;
  }

  submitUltraAnswer([answer]);
}

/**
 * 超級モードの回答処理
 * @param {Array} answers - ユーザーの回答（配列）
 */
async function submitUltraAnswer(answers) {
  // タイマーを停止
  clearInterval(ultraTimer);

  // 選択肢ボタンを無効化
  const choiceButtons = document.querySelectorAll('#ultraChoices .choice-btn');
  choiceButtons.forEach(btn => btn.disabled = true);

  // 回答ボタンも無効化
  const submitBtn = document.querySelector('#ultraChoices .ultra-submit-btn');
  if (submitBtn) submitBtn.disabled = true;

  const q = ultraQuestions[ultraCurrentQuestion];

  // ハッシュ値で判定（answersを配列のまま渡す）
  const userHash = await hashAnswer(answers);
  const isCorrect = userHash === q.correctHash;

  if (isCorrect) {
    // 正解 → 次の問題へ
    ultraCurrentQuestion++;

    if (ultraCurrentQuestion >= ultraQuestions.length) {
      // 全問正解！合格証を発行
      showUltraCertificate();
    } else {
      // 次の問題へ（少し間を置く）
      setTimeout(() => {
        showUltraQuestion();
      }, 500);
    }
  } else {
    // 不正解 → 失敗画面へ
    showUltraFailScreen();
  }
}

/**
 * 超級モードのタイムアウト処理
 */
function handleUltraTimeOut() {
  // 失敗画面へ
  showUltraFailScreen();
}

/**
 * 超級モードの失敗画面を表示
 */
function showUltraFailScreen() {
  const failNumEl = document.getElementById('ultraFailNum');
  failNumEl.textContent = ultraCurrentQuestion + 1;

  // エクストラモードの場合、スコア登録ボタンを表示
  if (isExtraMode) {
    const registerBtn = document.getElementById('registerScoreFailBtn');
    if (registerBtn) {
      registerBtn.style.display = 'inline-block';
    }
  }

  showScreen('ultraFailScreen');
}

/**
 * 超級モードをリトライ
 */
function retryUltraMode() {
  startUltraMode(currentGenre);
}

/**
 * 超級モードの合格証を表示
 */
function showUltraCertificate() {
  // 超級の合格証（レベルインデックス = 3）
  currentLevelIndex = 3;

  // エクストラモードの場合、スコア登録ボタンを表示
  if (isExtraMode) {
    const registerBtn = document.getElementById('registerScoreBtn');
    if (registerBtn) {
      registerBtn.style.display = 'inline-block';
    }
  }

  // 合格証生成（既存の関数を使用）
  showCertificate();
}

/**
 * ブラウザ識別用のユニークIDを取得または生成
 * @returns {string} ブラウザID (UUID v4形式)
 */
function getBrowserId() {
  let browserId = localStorage.getItem(STORAGE_KEY_BROWSER_ID);

  if (!browserId) {
    // UUID v4を生成
    browserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    localStorage.setItem(STORAGE_KEY_BROWSER_ID, browserId);
  }

  return browserId;
}

/**
 * エクストラステージのスコアをスプレッドシートに送信
 * @param {number} score - スコア（正解数）
 * @param {number} totalQuestions - 総問題数
 * @param {HTMLElement} buttonElement - クリックされたボタン要素（オプション）
 */
function sendScoreToServer(score, totalQuestions, buttonElement) {
  const browserId = getBrowserId();
  const genre = 'エクストラステージ';

  // スコアを100点満点に変換
  const scorePercent = Math.round((score / totalQuestions) * 100);

  // ボタンを無効化して送信中表示
  if (buttonElement) {
    buttonElement.disabled = true;
    buttonElement.textContent = '送信中...';
  }

  google.script.run
    .withSuccessHandler(function(response) {
      if (response.success) {
        if (buttonElement) {
          // 殿堂入りか順位かで表示を分ける
          if (response.isHallOfFame) {
            console.log('スコア送信成功: 殿堂入り（全問正解）');
            buttonElement.textContent = '✓ 登録完了（殿堂入り）';
          } else {
            console.log('スコア送信成功: 順位 = ' + response.rank);
            buttonElement.textContent = '✓ 登録完了（' + response.rank + '位）';
          }
          buttonElement.classList.add('btn-success');
        }
      } else {
        console.error('スコア送信失敗:', response.error);
        if (buttonElement) {
          buttonElement.disabled = false;
          buttonElement.textContent = '❌ 送信失敗 - 再試行';
        }
      }
    })
    .withFailureHandler(function(error) {
      console.error('スコア送信エラー:', error);
      if (buttonElement) {
        buttonElement.disabled = false;
        buttonElement.textContent = '❌ 送信失敗 - 再試行';
      }
    })
    .saveScore({
      browserId: browserId,
      nickname: nickname,
      score: scorePercent,
      genre: genre
    });
}

/**
 * エクストラステージのスコア送信（合格画面用）
 */
function registerExtraScore(evt) {
  const buttonElement = evt ? evt.target : null;
  // 全問正解なので100点
  sendScoreToServer(ultraQuestions.length, ultraQuestions.length, buttonElement);
}

/**
 * エクストラステージのスコア送信（失敗画面用）
 */
function registerExtraScoreFailed(evt) {
  const buttonElement = evt ? evt.target : null;
  // ultraCurrentQuestionが失敗した問題なので、正解数 = ultraCurrentQuestion
  sendScoreToServer(ultraCurrentQuestion, ultraQuestions.length, buttonElement);
}

/**
 * ランキング画面を表示
 */
function showRanking() {
  const browserId = getBrowserId();

  google.script.run
    .withSuccessHandler(function(response) {
      displayRanking(response.hallOfFame, response.rankings);
    })
    .withFailureHandler(function(error) {
      console.error('ランキング取得エラー:', error);
      document.getElementById('rankingList').innerHTML =
        '<div class="error-text">ランキングの取得に失敗しました</div>';
    })
    .getTopScores({
      genre: 'エクストラステージ',
      limit: 10,
      browserId: browserId
    });

  showScreen('rankingScreen');
}

/**
 * ランキングを画面に表示（殿堂入りと挑戦者を分離）
 * @param {Array} hallOfFame - 殿堂入りデータ（全問正解者）
 * @param {Array} rankings - 挑戦者ランキングデータ
 */
function displayRanking(hallOfFame, rankings) {
  const rankingList = document.getElementById('rankingList');

  if ((!hallOfFame || hallOfFame.length === 0) && (!rankings || rankings.length === 0)) {
    rankingList.innerHTML = '<div class="description-text">まだランキングデータがありません</div>';
    return;
  }

  let html = '';

  // 殿堂入りセクション（全問正解者）
  if (hallOfFame && hallOfFame.length > 0) {
    html += '<div class="ranking-section hall-of-fame-section">';
    html += '<h2 class="ranking-section-title">👑 全問正解者</h2>';
    html += '<div class="ranking-table">';

    hallOfFame.forEach(function(item) {
      const currentUserClass = item.isCurrentUser ? 'current-user' : '';
      html += '<div class="ranking-item hall-of-fame-item ' + currentUserClass + '">';
      html += '<div class="ranking-rank">👑</div>';
      html += '<div class="ranking-nickname">' + item.nickname + '</div>';
      html += '<div class="ranking-score">' + item.score + '点</div>';
      html += '<div class="ranking-timestamp">' + item.timestamp + '</div>';
      html += '</div>';
    });

    html += '</div>';
    html += '</div>';
  }

  // 挑戦者ランキングセクション
  if (rankings && rankings.length > 0) {
    html += '<div class="ranking-section challenger-section">';
    html += '<h2 class="ranking-section-title">🔥 挑戦者スコアTOP10</h2>';
    html += '<div class="ranking-table">';

    rankings.forEach(function(item) {
      const rankClass = item.rank === 1 ? 'rank-1' : item.rank === 2 ? 'rank-2' : item.rank === 3 ? 'rank-3' : '';
      const currentUserClass = item.isCurrentUser ? 'current-user' : '';
      const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : '';

      html += '<div class="ranking-item ' + rankClass + ' ' + currentUserClass + '">';
      html += '<div class="ranking-rank">' + medal + item.rank + '</div>';
      html += '<div class="ranking-nickname">' + item.nickname + '</div>';
      html += '<div class="ranking-score">' + item.score + '点</div>';
      html += '</div>';
    });

    html += '</div>';
    html += '</div>';
  }

  rankingList.innerHTML = html;
}

/**
 * YouTube URLから動画IDを抽出
 * @param {string} url - YouTube URL
 * @returns {string|null} 動画ID、または抽出できない場合はnull
 */
function extractYouTubeId(url) {
  if (!url) return null;

  // youtube.com/watch?v=VIDEO_ID 形式
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID 形式
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID 形式
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * YouTube動画IDからサムネイルURLを生成
 * @param {string} videoId - YouTube動画ID
 * @returns {string} サムネイルURL
 */
function getYouTubeThumbnail(videoId) {
  // maxresdefaultを最初に試み、存在しない場合はhqdefaultにフォールバック
  return 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
}

/**
 * 合格証モーダルを開く
 * @param {string} key - localStorageのキー（例: "ジャンル1_初級"）
 */
function openCertificateModal(key) {
  // localStorageから合格証画像データを取得
  const certificateData = localStorage.getItem(key);

  if (!certificateData) {
    return;
  }

  // モーダル要素を取得
  const modal = document.getElementById('certificateModal');
  const modalImage = document.getElementById('certificateModalImage');
  const downloadLink = document.getElementById('certificateModalDownload');

  // 画像とダウンロードリンクを設定
  modalImage.src = certificateData;
  downloadLink.href = certificateData;

  // ファイル名を設定
  const filename = key + '_合格証.webp';
  downloadLink.download = filename;

  // モーダルを表示
  modal.style.display = 'flex';
}

/**
 * 合格証モーダルを閉じる
 */
function closeCertificateModal() {
  const modal = document.getElementById('certificateModal');
  modal.style.display = 'none';
}
