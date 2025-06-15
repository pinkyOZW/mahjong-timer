document.addEventListener('DOMContentLoaded', () => {
    // サーバーに接続
    const socket = io();

    // HTML要素を取得
    const timerDisplay = document.getElementById('timer-display');
    const timerSettingInput = document.getElementById('timer-setting');
    const choukouSettingInput = document.getElementById('choukou-setting');
    const startTimerBtn = document.getElementById('start-timer-btn');
    const stopTimerBtn = document.getElementById('stop-timer-btn');
    const btnChoukou = document.getElementById('btn-choukou');
    const body = document.body;

    const scoreInputs = {
        east: document.getElementById('score-east'),
        south: document.getElementById('score-south'),
        west: document.getElementById('score-west'),
        north: document.getElementById('score-north'),
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
    let windIndex = 0; // 0:東, 1:南, 2:西, 3:北

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
        // ポップアップはサーバーからの指示で消すのでここでは消さない
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

    // 初期状態で東を赤字
    setActiveWind(0);

    socket.on('stateUpdate', (gameState) => {
        // 点数を画面に反映
        scoreInputs.east.value = gameState.scores.east;
        scoreInputs.south.value = gameState.scores.south;
        scoreInputs.west.value = gameState.scores.west;
        scoreInputs.north.value = gameState.scores.north;

        // タイマーを画面に反映
        const seconds = gameState.timer.secondsLeft;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        timerDisplay.textContent =
            `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

        // タイマー設定値も同期
        timerSettingInput.value = gameState.timer.initialSeconds;
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
        setActiveWind(windIndex);
    });

    // タイマー表示部クリックでタイマーリセット＋赤字進行（東→南→西→北→東ループ）
    timerDisplay.addEventListener('click', () => {
        windIndex++;
        if (windIndex > 3) windIndex = 0; // 0:東, 1:南, 2:西, 3:北
        setActiveWind(windIndex);

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
        setActiveWind(windIndex);
    });

    // 点数が変更されたら、サーバーに通知
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
});