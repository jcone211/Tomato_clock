import { playSound, renderStatsTable } from './func.js'
import { workTime, restTime } from '../config.js'
import { initialize, updateTimeLeftDisplay, updateTomatoCountDisplay } from './initialize.js';

let timeLeft = workTime; // 时钟动态显示的值（秒）
let startTime = 0;      // 记录计时开始的时间戳
let elapsedSeconds = 0; // 累计经过的秒数
let isRunning = false;
let isWorkTime = true;
let refreshInterval;

let { tomatoCount, dailyTomatoes } = await initialize(workTime);

// DOM元素
const statsBtn = document.getElementById("statsBtn");
const modal = document.getElementById("statsModal");
const closeBtn = document.querySelector(".close");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const tomatoCountDisplay = document.getElementById("tomatoCount");

startBtn.addEventListener("click", startTimer);
statsBtn.addEventListener("click", showStats);
closeBtn.addEventListener("click", closeModal);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
window.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// 监听缩至菜单栏/从菜单栏打开事件
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // 页面变为可见时，启动每秒刷新
        if (isRunning) {
            chrome.alarms.clear('pomodoro-timer');
            refreshInterval = setInterval(updateTimer, 1000);
        }
    } else {
        // 页面变为隐藏时，清除刷新定时器
        if (isRunning) {
            clearInterval(refreshInterval);
            chrome.alarms.create('pomodoro-timer', { periodInMinutes: 0.5 }); // 30秒触发一次
        }
    }
});

// 监听系统锁屏事件
chrome.idle.onStateChanged.addListener((newState) => {
    if (newState === "locked" && isRunning) {
        pauseTimer(); // 系统锁屏时暂停计时器
    }
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "tick") {
        updateTimer();
    }
});

// 开始计时
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        startTime = Date.now() - elapsedSeconds * 1000; // 补偿已过去的时间
        refreshInterval = setInterval(updateTimer, 1000);
    }
}

// 暂停计时
function pauseTimer() {
    isRunning = false;
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000); // 保存已过去的时间
    clearInterval(refreshInterval);
}

// 重置计时
function resetTimer() {
    pauseTimer();
    startTime = 0;
    elapsedSeconds = 0;
    isWorkTime = true;
    timeLeft = 25 * 60;
    updateTimeLeftDisplay(timeLeft, isWorkTime);
}

// 显示统计弹窗
function showStats() {
    modal.style.display = "block";
    renderStatsTable(tomatoCount, dailyTomatoes);
}

// 关闭统计弹窗
function closeModal() {
    modal.style.display = "none";
}

// 更新计时器
function updateTimer() {
    const now = Date.now();
    elapsedSeconds = Math.floor((now - startTime) / 1000);
    const targetTime = isWorkTime ? workTime : restTime;
    timeLeft = Math.max(0, targetTime - elapsedSeconds);
    updateTimeLeftDisplay(timeLeft, isWorkTime);

    if (timeLeft <= 0) {
        if (isWorkTime) {
            // 工作结束，切换到休息
            isWorkTime = false;
            startTime = Date.now();
            elapsedSeconds = 0;
            timeLeft = restTime;
            playSound("./resources/end.mp3");
            const today = new Date().toLocaleDateString();
            tomatoCount++;
            dailyTomatoes[today] = (dailyTomatoes[today] || 0) + 1;
            tomatoCountDisplay.textContent = dailyTomatoes[today];
            chrome.storage.sync.set({
                tomatoCount: tomatoCount,
                dailyTomatoes: dailyTomatoes
            });
            updateTomatoCountDisplay(dailyTomatoes[today]);
            document.getElementById("modeTitle").textContent = "保存自己，消灭敌人";
            document.getElementById("restMessage").style.display = "block";
            document.body.classList.remove("work-mode");
            document.body.classList.add("rest-mode");
            document.getElementById("resetBtn").style.color = "#aeab99f3"
            document.getElementById("resetBtn").disabled = true;
            document.getElementById("resetBtn").cursor = "default";
        } else {
            // 休息结束，切换回工作
            isWorkTime = true;
            startTime = Date.now();
            elapsedSeconds = 0;
            timeLeft = workTime;
            playSound("./resources/start.mp3");
            document.getElementById("modeTitle").textContent = "一万年太久，只争朝夕";
            document.getElementById("restMessage").style.display = "none";
            document.body.classList.remove("rest-mode");
            document.body.classList.add("work-mode");
            document.getElementById("resetBtn").style.color = "#00ffff"
            document.getElementById("resetBtn").disabled = false;
            document.getElementById("resetBtn").cursor = "pointer";
        }
    }
}
