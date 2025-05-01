function playSound(url) {
    try {
        const audio = new Audio(url);
        audio.play();
    } catch (error) {
        console.error("播放音频时发生错误:", error);
    }
}

let timer;
let timeLeft = 25 * 60; // 25分钟工作计时
let isRunning = false;
let isWorkTime = true;
let tomatoCount = 0;
let dailyTomatoes = {};

// 从chrome.storage加载番茄计数
chrome.storage.sync.get(['tomatoCount', 'dailyTomatoes'], function (result) {
    tomatoCount = result.tomatoCount || 0;
    dailyTomatoes = result.dailyTomatoes || {};

    // 初始化当天计数
    const today = new Date().toLocaleDateString();
    if (!dailyTomatoes[today]) {
        dailyTomatoes[today] = 0;
    }

    tomatoCountDisplay.textContent = dailyTomatoes[today];
});

// 统计弹窗HTML
const statsModalHTML = `
<div id="statsModal" class="modal">
    <div class="modal-content">
        <span class="close">&times;</span>
        <h2>番茄钟历史记录</h2>
        <div id="heatmap"></div>
        <div id="statsTable"></div>
    </div>
</div>
`;

// 插入弹窗HTML
document.body.insertAdjacentHTML('beforeend', statsModalHTML);

// DOM元素
const timerDisplay = document.getElementById("timer");
const statsBtn = document.getElementById("statsBtn");
const modal = document.getElementById("statsModal");
const closeBtn = document.querySelector(".close");
const statsTable = document.getElementById("statsTable");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const tomatoCountDisplay = document.getElementById("tomatoCount");

// 更新显示
function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    tomatoCountDisplay.textContent = dailyTomatoes[new Date().toLocaleDateString()] || 0;
}

// 初始化
updateDisplay();
document.body.classList.add("work-mode");

// 事件监听
startBtn.addEventListener("click", startTimer);
statsBtn.addEventListener("click", showStats);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

// 开始计时
function startTimer() {
    if (!isRunning) {
        isRunning = true;
        timer = setInterval(updateTimer, 1000);
    }
}

// 暂停计时
function pauseTimer() {
    clearInterval(timer);
    isRunning = false;
}


// 重置计时
function resetTimer() {
    pauseTimer();
    isWorkTime = true;
    timeLeft = 25 * 60;
    updateDisplay();
}

// 显示统计弹窗
function showStats() {
    modal.style.display = "block";
    renderStatsTable();
}

// 关闭弹窗
function closeModal() {
    modal.style.display = "none";
}

// 计算指定时间范围内的完成数
function calculatePeriodCount(days) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    let count = 0;
    for (const [dateStr, tomatoes] of Object.entries(dailyTomatoes)) {
        const date = new Date(dateStr);
        if (date >= startDate && date <= today) {
            count += tomatoes;
        }
    }
    return count;
}

// 获取上周完成数
function getLastWeekCount() {
    return calculatePeriodCount(14) - calculatePeriodCount(7);
}

// 获取上月完成数
function getLastMonthCount() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    let count = 0;
    for (const [dateStr, tomatoes] of Object.entries(dailyTomatoes)) {
        const date = new Date(dateStr);
        if (date >= lastMonth && date <= endOfLastMonth) {
            count += tomatoes;
        }
    }
    return count;
}

// 渲染统计表格
function renderStatsTable() {
    // 计算统计指标
    const lastMonthCount = getLastMonthCount();
    const lastWeekCount = getLastWeekCount();
    const thisWeekCount = calculatePeriodCount(7);

    let html = `
        <div class="stats-summary">
            <div class="stats-row">
                <p>总计: ${tomatoCount}</p>
                <p>上月: ${lastMonthCount}</p>
            </div>
            <div class="stats-row">
                <p>上周: ${lastWeekCount}</p>
                <p>本周: ${thisWeekCount}</p>
            </div>
        </div>
        <table><tr><th>日期</th><th>完成目标数</th></tr>
    `;
    const aaa = {
        "2025/3/1": 30,
        "2025/4/1": 1,
        "2025/4/24": 1,
        "2025/4/25": 1,
        "2025/4/26": 1,
        "2025/4/27": 1,
        "2025/4/28": 1,
        "2025/4/29": 1,
        "2025/4/30": 1,
        "2025/5/1": 5
    }

    // 按日期排序并只显示最近7天
    const sortedDates = Object.keys(dailyTomatoes).sort((a, b) =>
        new Date(b) - new Date(a)
    ).filter(date => {
        const recordDate = new Date(date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return recordDate >= sevenDaysAgo;
    });

    sortedDates.forEach(date => {
        html += `<tr><td>${date}</td><td>${dailyTomatoes[date]}</td></tr>`;
    });

    html += '</table>';
    statsTable.innerHTML = html;
}

// 更新计时器
function updateTimer() {
    timeLeft = timeLeft - 100;
    // timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
        if (isWorkTime) {
            playSound("./resources/end.mp3");
            // 工作结束，切换到休息
            isWorkTime = false;
            timeLeft = 5 * 60; // 5分钟休息
            const today = new Date().toLocaleDateString();
            tomatoCount++;
            dailyTomatoes[today] = (dailyTomatoes[today] || 0) + 1;
            tomatoCountDisplay.textContent = dailyTomatoes[today];
            chrome.storage.sync.set({
                tomatoCount: tomatoCount,
                dailyTomatoes: dailyTomatoes
            });
            document.getElementById("modeTitle").textContent = "保存自己，消灭敌人";
            document.getElementById("restMessage").style.display = "block";
            document.body.classList.remove("work-mode");
            document.body.classList.add("rest-mode");
            document.getElementById("resetBtn").style.color = "#aeab99f3"
            document.getElementById("resetBtn").disabled = true;
            document.getElementById("resetBtn").cursor = "default";
        } else {
            playSound("./resources/start.mp3");
            // 休息结束，切换回工作
            isWorkTime = true;
            timeLeft = 25 * 60;
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
