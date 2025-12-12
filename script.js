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

// ========================================
// 超級モード専用の変数
// ========================================
let isUltraMode = false; // 超級モード中かどうか
let ultraQuestions = []; // 超級モード用の問題配列
let ultraCurrentQuestion = 0; // 超級モード用の現在の問題番号
let ultraTimer = null; // 超級モード用のタイマーID
let ultraTimeLeft = 10; // 超級モード用の残り時間（秒）

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
  const headerArea = document.querySelector('.header-area');
  const backBtn = document.getElementById('backToGenreButton');
  const nicknameDisplay = document.getElementById('nicknameDisplay');

  if (!headerArea) return;

  // ニックネーム入力画面ではヘッダー全体を非表示
  if (screenId === 'nicknameScreen') {
    headerArea.style.display = 'none';
    return;
  }

  // その他の画面ではヘッダーを表示
  headerArea.style.display = 'flex';

  // ジャンル選択へ戻るボタンの表示制御
  if (backBtn) {
    if (screenId === 'genreScreen') {
      backBtn.classList.add('hidden');
    } else {
      backBtn.classList.remove('hidden');
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
        .getQuestions(genre, level);
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

  // 回答状況インジケーターを表示
  document.getElementById('progressIndicator').innerHTML = renderProgressIndicator();

  // 問題番号とレベル表示
  const levelName = levels[currentLevelIndex];
  document.getElementById('questionNumber').textContent = levelName + '問題 ' + (currentQuestion+1) + ' / ' + questions.length;
  
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

  // 上部ナビゲーションボタンを表示（前へ・次へのみ）
  renderTopNavigationButtons();

  // 下部ナビゲーションボタンを表示（前へ・次へ・採点）
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

// --- 上部ナビゲーションボタン（前へ・次へのみ） ---
function renderTopNavigationButtons() {
  const topNavDiv = document.getElementById('topNavigation');
  topNavDiv.innerHTML = '';

  const navContainer = document.createElement('div');
  navContainer.className = 'nav-container';

  // 前へボタン
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-nav-small btn-nav-left';
  prevBtn.textContent = '← 前へ';
  prevBtn.onclick = previousQuestion;
  if(currentQuestion === 0) {
    prevBtn.disabled = true;
  }
  navContainer.appendChild(prevBtn);

  // 次へボタン
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-nav-small btn-nav-right';
  nextBtn.textContent = '次へ →';
  nextBtn.onclick = nextQuestion;
  if(currentQuestion === questions.length - 1) {
    nextBtn.disabled = true;
  }
  navContainer.appendChild(nextBtn);

  topNavDiv.appendChild(navContainer);
}

// --- 下部ナビゲーションボタン（前へ・次へ・採点） ---
function renderNavigationButtons() {
  const navDiv = document.getElementById('navigation');
  navDiv.innerHTML = '';

  // 前へ・次へのコンテナ
  const navContainer = document.createElement('div');
  navContainer.className = 'nav-container';

  // 前へボタン
  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-nav-small btn-nav-left';
  prevBtn.textContent = '← 前へ';
  prevBtn.onclick = previousQuestion;
  if(currentQuestion === 0) {
    prevBtn.disabled = true;
  }
  navContainer.appendChild(prevBtn);

  // 次へボタン
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-nav-small btn-nav-right';
  nextBtn.textContent = '次へ →';
  nextBtn.onclick = nextQuestion;
  if(currentQuestion === questions.length - 1) {
    nextBtn.disabled = true;
  }
  navContainer.appendChild(nextBtn);

  navDiv.appendChild(navContainer);

  // 改行を追加
  navDiv.appendChild(document.createElement('br'));

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
  renderTopNavigationButtons();
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
  renderTopNavigationButtons();
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
  document.getElementById('progressIndicator').innerHTML = renderProgressIndicator();
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
    .withSuccessHandler(function(results){
      // results = [true, false, true, ...] (正誤の配列)
      score = results.filter(r => r).length;
      showSectionResult();
    })
    .withFailureHandler(function(err){
      alert('採点に失敗しました: ' + err);
      showScreen('questionScreen');
    })
    .judgeAllAnswers({
      genre: currentGenre,
      level: levels[currentLevelIndex],
      answers: userAnswers
    });
}

// --- 採点中ローディング画面を表示 ---
function showGradingLoading() {
  document.getElementById('progressIndicator').innerHTML = '';
  document.getElementById('topNavigation').innerHTML = '';
  document.getElementById('questionNumber').innerHTML = '';
  document.getElementById('multipleInstruction').style.display = 'none';
  document.getElementById('questionText').innerHTML =
    '<div class="loading-container">' +
    '<div class="loading-title">📝 採点中...</div>' +
    '<div class="loading-message">しばらくお待ちください</div>' +
    '<div class="loading-spinner"></div>' +
    '</div>';
  document.getElementById('choices').innerHTML = '';
  document.getElementById('navigation').innerHTML = '';
  showScreen('questionScreen');
}

// レベル結果
function showSectionResult(){
  const levelName = levels[currentLevelIndex];

  if(score === questions.length){
    // 合格：合格証明書を表示
    showCertificate();
  } else {
    // 不合格：不合格画面を表示
    document.getElementById('failResultText').textContent =
      currentGenre + ' - ' + levelName + 'の結果は ' + score + ' / ' + questions.length + ' 問でした';
    showScreen('failScreen');
  }
}

// 合格証明書を表示
function showCertificate(){
  // 超級モード（currentLevelIndex = 3）の場合は「超級」
  const levelName = currentLevelIndex === 3 ? '超級' : levels[currentLevelIndex];
  const today = new Date();
  const dateStr = today.getFullYear() + '年' + (today.getMonth()+1) + '月' + today.getDate() + '日';

  // ジャンル番号を取得（config.jsのGENRE_NAMESから）
  const genreNumber = getGenreNumber(currentGenre);
  const levelNumber = currentLevelIndex + 1; // 0:初級→1, 1:中級→2, 2:上級→3, 3:超級→4

  // 背景画像URLをマッピングから取得
  const mapKey = genreNumber + '-' + levelNumber;
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
  showCertificateLoading(levelName, dateStr, imageUrl, certificateTextHtml);
}

// 合格証作成中ローディング表示 → 画像生成 → 合格証画面表示
function showCertificateLoading(levelName, dateStr, imageUrl, certificateTextHtml){
  // ローディング画面を表示（問題画面エリアを使用）
  document.getElementById('progressIndicator').innerHTML = '';
  document.getElementById('topNavigation').innerHTML = '';
  document.getElementById('questionNumber').innerHTML = '';
  document.getElementById('multipleInstruction').style.display = 'none';
  document.getElementById('questionText').innerHTML =
    '<div class="loading-container">' +
    '<div class="loading-title">🎉 おめでとうございます！</div>' +
    '<div class="loading-message">合格証を作成中...</div>' +
    '<div class="loading-spinner"></div>' +
    '</div>';
  document.getElementById('choices').innerHTML = '';
  document.getElementById('navigation').innerHTML = '';
  showScreen('questionScreen');

  // キャプチャ用エリアに設定
  document.getElementById('captureImage').src = imageUrl;
  document.getElementById('captureText').innerHTML = certificateTextHtml;

  // 背景画像の読み込みを待つ
  const captureImg = document.getElementById('captureImage');
  captureImg.onload = function() {
    setTimeout(() => {
      generateAndSaveCertificate(levelName, dateStr, imageUrl, certificateTextHtml);
    }, 100);
  };

  // 既に読み込み済みの場合（キャッシュ）
  if (captureImg.complete) {
    setTimeout(() => {
      generateAndSaveCertificate(levelName, dateStr, imageUrl, certificateTextHtml);
    }, 100);
  }
}

// 合格証画像を生成してlocalStorageに保存後、合格証画面を表示
function generateAndSaveCertificate(levelName, dateStr, imageUrl, certificateTextHtml){
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
    const storageKey = currentGenre + '_' + levelName;
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

  const previousLevel = levels[levelIndex - 1];
  const storageKey = genreName + '_' + previousLevel;
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
      const storageKey = genreName + '_' + levelName;
      const certificateData = localStorage.getItem(storageKey);

      if (certificateData) {
        const badgeLink = document.createElement('a');
        badgeLink.href = base64ToBlobUrl(certificateData);
        badgeLink.target = '_blank';
        badgeLink.className = 'certificate-medal';
        badgeLink.title = levelName + '合格証を別窓で開く';

        const emoji = levelIndex === 0 ? '🥉' : levelIndex === 1 ? '🥈' : '🥇';
        badgeLink.textContent = emoji;

        badgeLink.onclick = function(e) {
          e.stopPropagation();
        };

        genreTitle.appendChild(badgeLink);
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
    const ultraStorageKey = genreName + '_上級';
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
    const ultraCertKey = genreName + '_超級';
    const ultraCertData = localStorage.getItem(ultraCertKey);

    if (ultraCertData) {
      const badgeLink = document.createElement('a');
      badgeLink.href = base64ToBlobUrl(ultraCertData);
      badgeLink.target = '_blank';
      badgeLink.className = 'certificate-medal';
      badgeLink.title = '超級合格証を別窓で開く';
      badgeLink.textContent = '🏆';

      badgeLink.onclick = function(e) {
        e.stopPropagation();
      };

      ultraWrapper.appendChild(badgeLink);
    }

    difficultyContainer.appendChild(ultraWrapper);

    genreContainer.appendChild(difficultyContainer);
    genreButtonsDiv.appendChild(genreContainer);
  });
}

// Xで共有（合格時）
function shareToX(){
  const levelName = levels[currentLevelIndex];
  const levelText = currentLevelIndex === 2 ? '上級全問正解' : levelName + '合格';
  const text = 'クイズアプリで' + currentGenre + 'の' + levelText + 'しました！君も挑戦してみよう！';
  const url = window.location.origin + window.location.pathname;
  const twitterUrl = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
  window.open(twitterUrl, '_blank', 'width=550,height=420');
}

// Xで共有（失敗時）
function shareFailToX(){
  const levelName = levels[currentLevelIndex];
  const text = 'クイズアプリで' + currentGenre + 'の' + levelName + 'に挑戦したよ！' + score + '/' + questions.length + '問正解！君も挑戦してみよう！';
  const url = window.location.origin + window.location.pathname;
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
  // ジャンルボタンを再生成（合格証バッジを更新）
  initializeGenreButtons();
  showScreen('genreScreen');
}

function restartQuiz(){
  nickname = '';
  currentGenre = '';
  currentLevelIndex = 0;
  questions = [];
  currentQuestion = 0;
  score = 0;
  selectedChoices = [];
  userAnswers = [];
  document.getElementById('nicknameInput').value = '';

  // ニックネーム画面の表示状態をリセット
  document.getElementById('nicknameForm').style.display = 'block';
  document.getElementById('preparingMessage').style.display = 'none';

  showScreen('nicknameScreen');
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
 * @param {string} genre - ジャンル名
 */
function startUltraMode(genre) {
  isUltraMode = true;
  currentGenre = genre;
  ultraCurrentQuestion = 0;

  showScreen('loading');

  // GASから超級モード用の問題を取得
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
    .getUltraModeQuestions(genre);
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

    button.onclick = function() {
      handleUltraAnswer(value);
    };

    gridDiv.appendChild(button);
  });

  choicesDiv.appendChild(gridDiv);

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
 * 超級モードの回答処理
 * @param {string} answer - ユーザーの回答
 */
async function handleUltraAnswer(answer) {
  // タイマーを停止
  clearInterval(ultraTimer);

  // 選択肢ボタンを無効化
  const choiceButtons = document.querySelectorAll('#ultraChoices .choice');
  choiceButtons.forEach(btn => btn.disabled = true);

  const q = ultraQuestions[ultraCurrentQuestion];

  // ハッシュ値で判定
  const userHash = await hashAnswer(answer);
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

  // 合格証生成（既存の関数を使用）
  showCertificate();
}
