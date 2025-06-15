document.addEventListener('DOMContentLoaded', () => {
    // サーバーに接続
    const socket = io();

    // HTML要素を取得
    const timerDisplay = document.getElementById('timer-display');
    const timerSettingInput = document.getElementById('timer-setting');
    const resetTimerBtn = document.getElementById('reset-timer-btn');
    const stopTimerBtn = document.getElementById('stop-timer-btn');
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

    // リセットボタンが押されたら、サーバーに通知
    resetTimerBtn.addEventListener('click', () => {
        const newInitialSeconds = parseInt(timerSettingInput.value, 10);
        socket.emit('resetTimer', newInitialSeconds);
    });

    // ストップボタンが押されたらサーバーに通知
    stopTimerBtn.addEventListener('click', () => {
        socket.emit('stopTimer');
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
        body.className = ''; // いったんクラスをリセット
        body.classList.add(`view-${wind}`);
    };
    btnEast.addEventListener('click', () => setPlayerView('east'));
    btnSouth.addEventListener('click', () => setPlayerView('south'));
    btnWest.addEventListener('click', () => setPlayerView('west'));
    btnNorth.addEventListener('click', () => setPlayerView('north'));

    // 初期視点
    setPlayerView('north');
});