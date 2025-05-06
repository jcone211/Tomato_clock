// 播放音频
export function playSound(url) {
    try {
        const audio = new Audio(url);
        audio.play();
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
    const thisWeekCount = calculatePeriodCount(dailyTomatoes, 7);

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

// 计算指定时间范围内的完成数
function calculatePeriodCount(dailyTomatoes, days) {
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
function getLastWeekCount(dailyTomatoes) {
    return calculatePeriodCount(dailyTomatoes, 14) - calculatePeriodCount(dailyTomatoes, 7);
}

// 获取上月完成数
function getLastMonthCount(dailyTomatoes) {
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