// 必要なライブラリを読み込む
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 公開するフォルダを指定
app.use(express.static(__dirname));

// 役一覧画像のルーティング（img/yaku1.png, img/yaku2.png を配置すること）
app.get('/image1', (req, res) => {
    res.sendFile(path.join(__dirname, 'img', 'yaku1.png'));
});
app.get('/image2', (req, res) => {
    res.sendFile(path.join(__dirname, 'img', 'yaku2.png'));
});

// 点数表画像のルーティング（img/score1.png, img/score2.png, img/score3.png を配置すること）
app.get('/image3', (req, res) => {
    res.sendFile(path.join(__dirname, 'img', 'score1.png'));
});
app.get('/image4', (req, res) => {
    res.sendFile(path.join(__dirname, 'img', 'score2.png'));
});
app.get('/image5', (req, res) => {
    res.sendFile(path.join(__dirname, 'img', 'score3.png'));
});

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
let isTimeupPopupShown = false; // ポップアップの表示状態

// タイマーのカウントダウン処理
function runTimer() {
    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        if (gameState.timer.secondsLeft > 0 && gameState.timer.isRunning) {
            gameState.timer.secondsLeft--;
            io.emit('stateUpdate', gameState);
        } else {
            gameState.timer.isRunning = false;
            clearInterval(timerInterval);
            io.emit('stateUpdate', gameState); // 0秒になったら更新

            // タイムアップポップアップを全員に表示
            if (!isTimeupPopupShown) {
                isTimeupPopupShown = true;
                io.emit('timeupPopup', true);
            }
        }
    }, 1000);
}

io.on('connection', (socket) => {
    console.log('a user connected');

    // 接続してきた人に現在の状態を送る
    socket.emit('stateUpdate', gameState);

    // 初期のポップアップ状態も送る
    socket.emit('timeupPopup', isTimeupPopupShown);

    socket.on('resetTimer', (newInitialSeconds) => {
        console.log('timer reset requested');
        gameState.timer.initialSeconds = newInitialSeconds;
        gameState.timer.secondsLeft = newInitialSeconds;
        gameState.timer.isRunning = true;
        runTimer();

        // タイマーリセット時はポップアップ非表示に
        if (isTimeupPopupShown) {
            isTimeupPopupShown = false;
            io.emit('timeupPopup', false);
        }

        io.emit('stateUpdate', gameState);
    });

    socket.on('stopTimer', () => {
        console.log('timer stop requested');
        gameState.timer.isRunning = false;
        clearInterval(timerInterval);

        // タイマー停止時もポップアップ非表示に
        if (isTimeupPopupShown) {
            isTimeupPopupShown = false;
            io.emit('timeupPopup', false);
        }

        io.emit('stateUpdate', gameState);
    });

    socket.on('addTime', (addSeconds) => {
        gameState.timer.secondsLeft += addSeconds;
        io.emit('stateUpdate', gameState);
    });

    socket.on('updateScore', (newScores) => {
        console.log('score update requested');
        gameState.scores = newScores;
        io.emit('stateUpdate', gameState);
    });

    // 点数リセット
    socket.on('resetScore', (defaultScores) => {
        console.log('score reset requested');
        gameState.scores = {
            east: 25000,
            south: 25000,
            west: 25000,
            north: 25000,
        };
        io.emit('stateUpdate', gameState);
    });

    // ポップアップを閉じる要求
    socket.on('closeTimeupPopup', () => {
        if (isTimeupPopupShown) {
            isTimeupPopupShown = false;
            io.emit('timeupPopup', false);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});