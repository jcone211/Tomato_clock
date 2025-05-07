import { playSound, renderStatsTable } from './func.js'
import { workTime, restTime } from '../config.js'
import { initialize, updateTimeLeftDisplay, updateTomatoCountDisplay } from './initialize.js';

let timeLeft = workTime; // 时钟动态显示的值（秒）
let startTime = 0;      // 记录计时开始的时间戳
let elapsedSeconds = 0; // 累计经过的秒数
let isRunning = false;
let isWorkTime = true;
let refreshInterval;
let selectedTagId;

let { tomatoCount, dailyTomatoes, tags } = await initialize(workTime);

// DOM元素
const statsBtn = document.getElementById("statsBtn");
const modal = document.getElementById("statsModal");
const closeBtn = document.querySelector(".close");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const tomatoCountDisplay = document.getElementById("tomatoCount");
// 标签元素
const tagTrigger = document.getElementById('tag-trigger');
const tagDropdown = document.getElementById('tag-dropdown');
const selectedTagSpan = document.querySelector('.selected-tag');

startBtn.addEventListener("click", startTimer);
startBtn.addEventListener("click", () => {
    playSound("./resources/ping.mp3");
});
statsBtn.addEventListener("click", showStats);
closeBtn.addEventListener("click", closeModal);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);
tagTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tagDropdown.classList.contains('show') ? hideDropdown() : showDropdown();
});
tagDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
});
window.addEventListener("click", (event) => {
    if (event.target === modal) {
        closeModal();
    }
});
document.addEventListener('click', hideDropdown);

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

//  监听chrome后台的消息
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
    updateTimeLeftDisplay(timeLeft);
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
    updateTimeLeftDisplay(timeLeft, isWorkTime, workTime, restTime);

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
            recordTag();
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

/* 标签相关操作 */
// 渲染下拉菜单
function renderDropdown() {
    tagDropdown.innerHTML = '';

    // 渲染现有标签
    tags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.textContent = tag.name;
        item.addEventListener('click', () => {
            selectTag(tag);
            hideDropdown();
        });
        tagDropdown.appendChild(item);
    });

    // 添加"新建标签"项
    const addNewItem = document.createElement('div');
    addNewItem.className = 'dropdown-item add-new';
    addNewItem.innerHTML = `
        <input class="add-tag-input" type="text" placeholder="(新建标签)" maxlength="6" id="new-tag-input">
    `;
    tagDropdown.appendChild(addNewItem);

    // 添加事件监听器
    const newTagInput = document.getElementById('new-tag-input');
    newTagInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addNewTag();
        }
    });
}
// 添加新标签
function addNewTag() {
    const newTagInput = document.getElementById('new-tag-input');
    const newTagName = newTagInput.value.trim();

    if (newTagName) {
        const newId = tags.length > 0 ? Math.max(...tags.map(tag => tag.id)) + 1 : 1;
        const newTag = {
            id: newId,
            name: newTagName,
            total: 0,       // 用于记录该标签对应的总时长
            records: {}       // 用于记录该标签对应的日期时长记录,如"2025/5/1": 3
        };

        tags.push(newTag);
        selectTag(newTag);
        hideDropdown();
        newTagInput.value = '';
        renderDropdown();
        chrome.storage.sync.set({ tags });
    }
}
// 选择标签
function selectTag(tag) {
    selectedTagSpan.textContent = tag.name;
    selectedTagId = tag.id;
}

// 显示下拉列表
function showDropdown() {
    tagDropdown.classList.add('show');
    renderDropdown();
}

// 隐藏下拉列表
function hideDropdown() {
    tagDropdown.classList.remove('show');
}

// 完成目标时保存标签对应时间
function recordTag() {
    if (selectedTagId != null) {
        const temp = 60 * 25;
        const workTimeHours = Math.round(temp / 36) / 100;
        const tag = tags.find(item => item.id == selectedTagId);
        tag.total += workTimeHours;
        // 删除超过14天的数据
        if (Object.keys(tag.records) > 14) {
            const dates = Object.keys(tag.records).map(date => new Date(date));
            const dateToDelete = new Date(Math.min(...dates));
            delete tag.records[dateToDelete.toLocaleDateString()];
        }
        // 记录今天数据
        const todayStr = new Date().toLocaleDateString();
        if (tag.records[todayStr]) {
            tag.records[todayStr] += workTimeHours;
        } else {
            tag.records[todayStr] = workTimeHours;
        }
        chrome.storage.sync.set({ tags });
    }
}