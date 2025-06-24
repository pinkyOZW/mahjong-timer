document.addEventListener('DOMContentLoaded', () => {
    // サーバーに接続
    const socket = io();

    // HTML要素を取得
    const timerDisplay = document.getElementById('timer-display');
    const timerSettingInput = document.getElementById('timer-setting');
    const choukouSettingInput = document.getElementById('choukou-setting');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const stopTimerBtn = document.getElementById('stop-timer-btn');
    const resetScoreBtn = document.getElementById('reset-score-btn');
    const btnChoukou = document.getElementById('btn-choukou');
    const timerContainer = document.getElementById('timer-container');
    const body = document.body;

    // スコアバー
    const scoreInputs = {
        east: document.getElementById('score-bar-east'),
        south: document.getElementById('score-bar-south'),
        west: document.getElementById('score-bar-west'),
        north: document.getElementById('score-bar-north'),
    };
    const playerNameInputs = {
        east: document.getElementById('score-bar-name-east'),
        south: document.getElementById('score-bar-name-south'),
        west: document.getElementById('score-bar-name-west'),
        north: document.getElementById('score-bar-name-north'),
    };

    // 風選択ボタン
    const btnEast = document.getElementById('btn-east');
    const btnSouth = document.getElementById('btn-south');
    const btnWest = document.getElementById('btn-west');
    const btnNorth = document.getElementById('btn-north');

    // 風ラベル
    const windLabels = [
        document.getElementById('label-east'),
        document.getElementById('label-south'),
        document.getElementById('label-west'),
        document.getElementById('label-north'),
    ];

    // アクティブ風インデックス（0:東, 1:南, 2:西, 3:北）
    let windIndex = 0;

    // ポップアップ表示・非表示制御
    function showTimeupPopup() {
        if (document.getElementById('timeup-popup')) return; // 既に表示中は何もしない
        const popup = document.createElement('div');
        popup.id = 'timeup-popup';
        popup.className = 'popup-timeup';
        popup.innerHTML = '<span>タイムアップ！</span>';
        document.body.appendChild(popup);

        // タップで消す（どこをタップしても消える）
        setTimeout(() => {
            document.addEventListener('pointerdown', closePopupHandler, true);
        }, 0);
    }
    function hideTimeupPopup() {
        const popup = document.getElementById('timeup-popup');
        if (popup) {
            popup.parentNode.removeChild(popup);
            document.removeEventListener('pointerdown', closePopupHandler, true);
        }
    }
    function closePopupHandler(e) {
        socket.emit('closeTimeupPopup');
        e.preventDefault();
        e.stopPropagation();
    }

    // 赤字クラス切替
    function setActiveWind(index) {
        windLabels.forEach((el, i) => {
            if (el) {
                if (i === index) {
                    el.classList.add('active-wind');
                } else {
                    el.classList.remove('active-wind');
                }
            }
        });
    }

    // プレイヤー名をスコアバーとラベルに反映
    function setPlayerNamesToBar(names) {
        if (!names) return;
        playerNameInputs.east.value = names.east;
        playerNameInputs.south.value = names.south;
        playerNameInputs.west.value = names.west;
        playerNameInputs.north.value = names.north;
    }
    function getPlayerNamesFromBar() {
        return {
            east: playerNameInputs.east.value,
            south: playerNameInputs.south.value,
            west: playerNameInputs.west.value,
            north: playerNameInputs.north.value,
        };
    }

    // サーバーからstateUpdate
    socket.on('stateUpdate', (gameState) => {
        // 点数をスコアバーに反映
        scoreInputs.east.value = gameState.scores.east;
        scoreInputs.south.value = gameState.scores.south;
        scoreInputs.west.value = gameState.scores.west;
        scoreInputs.north.value = gameState.scores.north;

        // プレイヤー名も反映
        setPlayerNamesToBar(gameState.playerNames);

        // アクティブ風をラベルに反映
        windIndex = typeof gameState.activeWind === "number" ? gameState.activeWind : 0;
        setActiveWind(windIndex);

        // タイマー表示
        const seconds = gameState.timer.secondsLeft;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerDisplay.textContent =
            `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

        // タイマー設定値も同期
        timerSettingInput.value = gameState.timer.initialSeconds;

        // --- 追加：残り10秒で背景色を赤に ---
        if (seconds <= 10 && gameState.timer.isRunning) {
            timerContainer.classList.add('timer-danger');
        } else {
            timerContainer.classList.remove('timer-danger');
        }
    });

    // ポップアップ表示・非表示の同期
    socket.on('timeupPopup', (isShow) => {
        if (isShow) {
            showTimeupPopup();
        } else {
            hideTimeupPopup();
        }
    });

    // タイマースタートボタン押下でタイマー開始（赤字は東のまま）
    startTimerBtn.addEventListener('click', () => {
        const initialSeconds = parseInt(timerSettingInput.value, 10);
        socket.emit('resetTimer', initialSeconds);

        // 赤字は東のまま
        windIndex = 0;
        socket.emit('updateActiveWind', windIndex);
    });

    // タイマー表示部クリックでタイマーリセット＋赤字進行（東→南→西→北→東ループ）
    timerDisplay.addEventListener('click', () => {
        windIndex++;
        if (windIndex > 3) windIndex = 0;
        socket.emit('updateActiveWind', windIndex);

        const initialSeconds = parseInt(timerSettingInput.value, 10);
        socket.emit('resetTimer', initialSeconds);
    });

    // 長考ボタン押下でタイマーに+設定値秒
    btnChoukou.addEventListener('click', () => {
        const addSeconds = parseInt(choukouSettingInput.value, 10) || 60;
        socket.emit('addTime', addSeconds);
    });

    // 終了ボタンが押されたらサーバーに通知＆東を赤字に戻す
    stopTimerBtn.addEventListener('click', () => {
        socket.emit('stopTimer');
        windIndex = 0;
        socket.emit('updateActiveWind', windIndex);
    });

    // 点数リセットボタンが押されたら点数を全員25000点に
    if (resetScoreBtn) {
        resetScoreBtn.addEventListener('click', () => {
            const defaultScores = {
                east: 25000,
                south: 25000,
                west: 25000,
                north: 25000,
            };
            socket.emit('resetScore', defaultScores);
        });
    }

    // 点数バーが変更されたらサーバーに通知
    Object.values(scoreInputs).forEach(input => {
        input.addEventListener('change', () => {
            const newScores = {
                east: parseInt(scoreInputs.east.value, 10),
                south: parseInt(scoreInputs.south.value, 10),
                west: parseInt(scoreInputs.west.value, 10),
                north: parseInt(scoreInputs.north.value, 10),
            };
            socket.emit('updateScore', newScores);
        });
    });

    // プレイヤー名が変更されたらサーバーに通知
    Object.values(playerNameInputs).forEach(input => {
        input.addEventListener('change', () => {
            const newNames = getPlayerNamesFromBar();
            socket.emit('updatePlayerNames', newNames);
        });
        input.addEventListener('blur', () => {
            const newNames = getPlayerNamesFromBar();
            socket.emit('updatePlayerNames', newNames);
        });
    });

    // 視点切り替え（自分の画面だけでOKなのでサーバー通信なし）
    const setPlayerView = (wind) => {
        body.className = '';
        body.classList.add(`view-${wind}`);
    };
    btnEast.addEventListener('click', () => setPlayerView('east'));
    btnSouth.addEventListener('click', () => setPlayerView('south'));
    btnWest.addEventListener('click', () => setPlayerView('west'));
    btnNorth.addEventListener('click', () => setPlayerView('north'));

    // 初期視点
    setPlayerView('north');

    // --- 役一覧ポップアップ機能の追加 ---
    const yakuListBtn = document.getElementById('yaku-list-btn');
    const popupOverlay = document.getElementById('yaku-popup');
    const popupCloseBtn = document.getElementById('yaku-popup-close');
    const yakuImg = document.getElementById('yaku-image');
    const pagePrevBtn = document.getElementById('page-prev');
    const pageNextBtn = document.getElementById('page-next');
    const pageIndicator = document.getElementById('page-indicator');

    // 画像名はサーバーでルーティングされているものと一致させる
    const yakuImages = ["image1", "image2"];
    let currentPage = 0;

    yakuListBtn.addEventListener('click', () => {
        popupOverlay.style.display = 'flex';
        showPage(0);
    });

    popupCloseBtn.addEventListener('click', () => {
        popupOverlay.style.display = 'none';
    });

    pagePrevBtn.addEventListener('click', () => {
        if (currentPage > 0) showPage(currentPage - 1);
    });
    pageNextBtn.addEventListener('click', () => {
        if (currentPage < yakuImages.length - 1) showPage(currentPage + 1);
    });

    function showPage(idx) {
        currentPage = idx;
        yakuImg.src = yakuImages[currentPage];
        pageIndicator.textContent = (currentPage + 1) + ' / ' + yakuImages.length;
        pagePrevBtn.disabled = currentPage === 0;
        pageNextBtn.disabled = currentPage === yakuImages.length - 1;
    }

    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            popupOverlay.style.display = 'none';
        }
    });

    // --- 点数表ポップアップ機能の追加 ---
    const scoreTableBtn = document.getElementById('score-table-btn');
    const scoreTablePopup = document.getElementById('score-table-popup');
    const scoreTableClose = document.getElementById('score-table-popup-close');
    const scoreTableImg = document.getElementById('score-table-image');
    const scoreTablePrev = document.getElementById('score-table-page-prev');
    const scoreTableNext = document.getElementById('score-table-page-next');
    const scoreTableIndicator = document.getElementById('score-table-page-indicator');

    // 画像ファイル名（image3, image4, image5）
    const scoreTableImages = ["image3", "image4", "image5"];
    let scoreTablePage = 0;

    function showScoreTablePage(idx) {
        scoreTablePage = idx;
        scoreTableImg.src = scoreTableImages[scoreTablePage];
        scoreTableIndicator.textContent = (scoreTablePage + 1) + ' / ' + scoreTableImages.length;
        scoreTablePrev.disabled = scoreTablePage === 0;
        scoreTableNext.disabled = scoreTablePage === scoreTableImages.length - 1;
    }

    scoreTableBtn.addEventListener('click', () => {
        scoreTablePopup.style.display = 'flex';
        showScoreTablePage(0);
    });

    scoreTableClose.addEventListener('click', () => {
        scoreTablePopup.style.display = 'none';
    });

    scoreTablePrev.addEventListener('click', () => {
        if (scoreTablePage > 0) showScoreTablePage(scoreTablePage - 1);
    });

    scoreTableNext.addEventListener('click', () => {
        if (scoreTablePage < scoreTableImages.length - 1) showScoreTablePage(scoreTablePage + 1);
    });

    // オーバーレイクリックで閉じる（中身クリックは閉じない）
    scoreTablePopup.addEventListener('click', (e) => {
        if (e.target === scoreTablePopup) {
            scoreTablePopup.style.display = 'none';
        }
    });
});
