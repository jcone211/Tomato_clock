import { selectTagWhileDel } from "./script.js";

const now = new Date();
// 求出至本周一0点时间应减去的天数，now.getDay() 0为星期天，1为星期一，6为星期六
const decreaseDay = (now.getDay() === 0 ? 7 : now.getDay()) - 1;
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - decreaseDay);
const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - decreaseDay - 7);

// 播放音频
export function playSound(url) {
    try {
        const audio = new Audio(url);
        audio.play().then(() => {
            console.log("播放音频成功");
        });
    } catch (error) {
        console.error("播放音频时发生错误:", error);
    }
}

// 渲染统计表格
export function renderStatsTable(tomatoCount, dailyTomatoes) {
    const statsTable = document.getElementById("statsTable");
    // 计算统计指标
    const lastMonthCount = getLastMonthCount(dailyTomatoes);
    const lastWeekCount = getLastWeekCount(dailyTomatoes);
    const thisWeekCount = calculatePeriodCount(dailyTomatoes, decreaseDay);

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

// 渲染标签表格
export function renderTagsTable(tags) {
    const tagsTableEl = document.getElementById("tagsTable");
    if (tags.length === 0) {
        tagsTableEl.innerHTML = "<p>暂无数据</p>";
        return;
    }
    let html = '<table><tr><th></th><th>总计</th><th>上周</th><th>本周</th><th style="text-align:center;width:40px">操作(del)</th></tr>';
    tags.sort((a, b) => b.total - a.total).forEach(tag => {
        html += `<tr><td>${tag.name}</td><td>${keepOneDecimalPlace(tag.total)}h</td><td>${getLastWeekTagHours(tag.records)}h</td><td>${getThisWeekTagHours(tag.records)}h</td><td class="delete-tag"><a class="deleteTag" data-tag-id="${tag.id}">x</a></td></tr>`;
    });
    html += '</table>';
    tagsTableEl.innerHTML = html;
    // 绑定删除标签的点击事件
    document.querySelectorAll('.deleteTag').forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            const tagId = link.getAttribute('data-tag-id');
            deleteTag(tags, tagId);
        });
    });
}

// 删除标签
function deleteTag(tags, tagId) {
    const tag = tags.find(tag => tag.id == tagId);
    if (tag) {
        const index = tags.indexOf(tag);
        tags.splice(index, 1);
        chrome.storage.sync.set({ tags }, () => {
            selectTagWhileDel(tag.id);
            renderTagsTable(tags);
        });
    }
}

// 计算指定时间范围内的完成数
function calculatePeriodCount(dailyTomatoes, days) {
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
function getLastWeekCount(dailyTomatoes) {
    return calculatePeriodCount(dailyTomatoes, decreaseDay + 7) - calculatePeriodCount(dailyTomatoes, decreaseDay);
}

// 获取上月完成数
function getLastMonthCount(dailyTomatoes) {
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

// 获取上周标签累计小时数
function getLastWeekTagHours(records) {
    let count = 0;
    for (const [dateStr, hoursForDay] of Object.entries(records)) {
        if (new Date(dateStr) >= lastMonday && new Date(dateStr) < thisMonday) {
            count += hoursForDay;
        }
    }
    return keepOneDecimalPlace(count);
}

// 获取本周标签累计小时数
function getThisWeekTagHours(records) {
    let count = 0;
    for (const [dateStr, hoursForDay] of Object.entries(records)) {
        if (new Date(dateStr) >= thisMonday) {
            count += hoursForDay;
        }
    }
    return keepOneDecimalPlace(count);
}

// 保留一位小数
function keepOneDecimalPlace(number) {
    return Math.round(number * 10) / 10;
}

// chrome通知
export function createChromeNotification(msg) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "./icons/tomato_icon_128x128.png",
        title: "我的番茄钟",
        message: msg,
        priority: 2
    })
}