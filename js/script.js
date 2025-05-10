import { workTime, restTime } from '../config.js'
import { playSound, renderStatsTable, renderTagsTable, createChromeNotification } from './func.js'
import { initialize, updateTimeLeftDisplay, updateTomatoCountDisplay } from './initialize.js';

let timeLeft = workTime; // 时钟动态显示的值（秒）
let startTime = 0;      // 记录计时开始的时间戳
let elapsedSeconds = 0; // 累计经过的秒数
let isRunning = false;
let isWorkTime = true;
let refreshInterval;
let selectedTagId;
const todayDateStr = new Date().toLocaleDateString();

let { tomatoCount, dailyTomatoes, tags } = await initialize(workTime);

// DOM元素
const statsBtnEl = document.getElementById("statsBtn");
const statsModalEl = document.getElementById("statsModal");
const closeBtnEl = document.querySelector(".close");
const startBtnEl = document.getElementById("startBtn");
const pauseBtnEl = document.getElementById("pauseBtn");
const resetBtnEl = document.getElementById("resetBtn");
const tomatoCountEl = document.getElementById("tomatoCount");
const modeTitleEl = document.getElementById("modeTitle");
const restMessageEl = document.getElementById("restMessage");

// 标签元素
const tagTriggerEl = document.getElementById('tagTrigger');
const tagDropdownEl = document.getElementById('tagDropdown');
const selectedTagTextEl = document.querySelector('.selected-tag');

startBtnEl.addEventListener("click", startTimer);
startBtnEl.addEventListener("click", () => {
    playSound("./resources/ping.mp3");
});
statsBtnEl.addEventListener("click", showStats);
closeBtnEl.addEventListener("click", closeModal);
pauseBtnEl.addEventListener("click", pauseTimer);
resetBtnEl.addEventListener("click", resetTimer);
tagTriggerEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    tagDropdownEl.classList.contains('show') ? hideDropdown() : showDropdown();
});
tagDropdownEl.addEventListener('click', (e) => {
    e.stopPropagation();
});
window.addEventListener("click", (event) => {
    if (event.target === statsModalEl) {
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
        updateTimer(true);
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

// 重置计时或跳过休息
function resetTimer() {
    const resetBtnStatus = resetBtnEl.getAttribute("data-status");
    if (resetBtnStatus === "reset") {
        pauseTimer();
        startTime = Date.now();
        elapsedSeconds = 0;
        isWorkTime = true;
        timeLeft = workTime;
        updateTimeLeftDisplay(timeLeft);
    } else if (resetBtnStatus === "skip" && !isWorkTime) {
        restEnd();
    }
}

// 显示统计弹窗
function showStats() {
    statsModalEl.style.display = "block";
    renderStatsTable(tomatoCount, dailyTomatoes);
    renderTagsTable(tags);
}

// 关闭统计弹窗
function closeModal() {
    statsModalEl.style.display = "none";
}

// 更新计时器
function updateTimer(fromChrome = false) {
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
            tomatoCount++;
            dailyTomatoes[todayDateStr] = (dailyTomatoes[todayDateStr] || 0) + 1;
            tomatoCountEl.textContent = dailyTomatoes[todayDateStr];
            recordTag();
            chrome.storage.sync.set({
                tomatoCount: tomatoCount,
                dailyTomatoes: dailyTomatoes
            });
            updateTomatoCountDisplay(dailyTomatoes[todayDateStr]);
            modeTitleEl.textContent = "保存自己，消灭敌人";
            restMessageEl.style.display = "block";
            document.body.classList.remove("work-mode");
            document.body.classList.add("rest-mode");
            resetBtnEl.textContent = "跳过休息";
            resetBtnEl.setAttribute("data-status", "skip");
            if (fromChrome) {
                createChromeNotification("目标完成，放松下身体吧ο(=•ω＜=)ρ⌒☆");
            }
            playSound("./resources/end.mp3");
        } else {
            // 休息结束，切换回工作
            restEnd();
            if (fromChrome) {
                createChromeNotification("休息时间到，请打起精神！");
            }
            playSound("./resources/start.mp3");
        }
    }
}

// 休息结束调用
function restEnd() {
    isWorkTime = true;
    startTime = Date.now();
    elapsedSeconds = 0;
    timeLeft = workTime;
    modeTitleEl.textContent = "一万年太久，只争朝夕";
    restMessageEl.style.display = "none";
    document.body.classList.remove("rest-mode");
    document.body.classList.add("work-mode");
    resetBtnEl.textContent = "重置";
    resetBtnEl.setAttribute("data-status", "reset");
    // 调用一次以修改显示
    if (!isRunning) {
        updateTimer();
    }
}

/* 标签相关操作 */
// 渲染下拉菜单
function renderDropdown() {
    tagDropdownEl.innerHTML = '';

    // 渲染现有标签
    tags.forEach(tag => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.textContent = tag.name;
        item.addEventListener('click', () => {
            selectTag(tag);
            hideDropdown();
        });
        tagDropdownEl.appendChild(item);
    });

    // 添加"新建标签"项（最多存在6个标签）
    if (tags.length < 6) {
        const addNewItem = document.createElement('div');
        addNewItem.className = 'dropdown-item add-new';
        addNewItem.innerHTML = `
            <input class="add-tag-input" type="text" placeholder="(新建标签)" maxlength="6" id="new-tag-input">
        `;
        tagDropdownEl.appendChild(addNewItem);

        // 添加事件监听器
        const newTagInput = document.getElementById('new-tag-input');
        newTagInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addNewTag();
            }
        });
    }
}
// 添加标签
function addNewTag() {
    const newTagInput = document.getElementById('new-tag-input');
    const newTagName = newTagInput.value.trim();

    if (newTagName) {
        const newId = tags.length > 0 ? Math.max(...tags.map(tag => tag.id)) + 1 : 1;
        const newTag = {
            id: newId,
            name: newTagName,
            total: 0,       // 用于记录该标签对应的总时长
            records: {}     // 用于记录该标签对应的日期时长记录,如"2025/5/1": 3
        };

        tags.push(newTag);
        selectTag(newTag);
        hideDropdown();
        newTagInput.value = '';
        chrome.storage.sync.set({ tags });
    }
}

// 选择标签
function selectTag(tag) {
    selectedTagTextEl.textContent = tag ? tag.name : "__";
    selectedTagId = tag ? tag.id : null;
}

// 删除标签时修改首页标签
export function selectTagWhileDel(delTagId) {
    if (selectedTagId === delTagId) {
        selectTag(null);
    }
}

// 显示下拉列表
function showDropdown() {
    tagDropdownEl.classList.add('show');
    renderDropdown();
}

// 隐藏下拉列表
function hideDropdown() {
    tagDropdownEl.classList.remove('show');
}

// 完成目标时保存标签对应时间
function recordTag() {
    if (selectedTagId != null) {
        // const temp = 60 * 25;
        const workTimeHours = Math.round(workTime / 36) / 100;
        const tag = tags.find(item => item.id == selectedTagId);
        tag.total += workTimeHours;
        // 删除超过14天的数据
        if (Object.keys(tag.records) > 14) {
            const dates = Object.keys(tag.records).map(date => new Date(date));
            const dateToDelete = new Date(Math.min(...dates));
            delete tag.records[dateToDelete.toLocaleDateString()];
        }
        // 记录今天数据
        if (tag.records[todayDateStr]) {
            tag.records[todayDateStr] += workTimeHours;
        } else {
            tag.records[todayDateStr] = workTimeHours;
        }
        chrome.storage.sync.set({ tags });
    }
}