// 必要なライブラリを読み込む
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 公開するフォルダを指定
app.use(express.static(__dirname));

// サーバーの記憶領域（これが全員で共有されるデータ）
let gameState = {
    scores: {
        east: 25000,
        south: 25000,
        west: 25000,
        north: 25000,
    },
    timer: {
        isRunning: false,
        initialSeconds: 30,
        secondsLeft: 30,
    }
};

let timerInterval = null;

// タイマーのカウントダウン処理
function runTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (gameState.timer.secondsLeft > 0 && gameState.timer.isRunning) {
            gameState.timer.secondsLeft--;
            // 状態が変わったので全員に通知
            io.emit('stateUpdate', gameState);
        } else {
            gameState.timer.isRunning = false;
            clearInterval(timerInterval);
            io.emit('stateUpdate', gameState); // 0秒になったら更新
        }
    }, 1000);
}

// 誰かがサイトに接続してきた時の処理
io.on('connection', (socket) => {
    console.log('a user connected');

    // 接続してきた人に現在の状態を送る
    socket.emit('stateUpdate', gameState);

    // タイマーリセットの要求を受け取った時の処理
    socket.on('resetTimer', (newInitialSeconds) => {
        console.log('timer reset requested');
        gameState.timer.initialSeconds = newInitialSeconds;
        gameState.timer.secondsLeft = newInitialSeconds;
        gameState.timer.isRunning = true;
        runTimer();
        // 状態が変わったので全員に通知
        io.emit('stateUpdate', gameState);
    });

    // タイマーストップの要求を受け取った時の処理
    socket.on('stopTimer', () => {
        console.log('timer stop requested');
        gameState.timer.isRunning = false;
        clearInterval(timerInterval);
        // 状態が変わったので全員に通知
        io.emit('stateUpdate', gameState);
    });

    // 長考ボタンでタイマーに追加時間を加算
    socket.on('addTime', (addSeconds) => {
        // 残り時間にaddSecondsを加算
        gameState.timer.secondsLeft += addSeconds;
        // 状態が変わったので全員に通知
        io.emit('stateUpdate', gameState);
    });

    // 点数更新の要求を受け取った時の処理
    socket.on('updateScore', (newScores) => {
        console.log('score update requested');
        gameState.scores = newScores;
        // 状態が変わったので全員に通知
        io.emit('stateUpdate', gameState);
    });

    // 接続が切れた時の処理
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// サーバーを起動
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});