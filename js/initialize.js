// interface tagTempData = [
//     {
//         "id": 1,
//         "name": "背单词",   // 标签名
//         "total": 13.5,      // 总时长(h)
//         "records": {
//             "2023/5/1": 2.5,
//             "2023/5/2": 1.5,
//         },   // 记录数据
//     }
// ]

export function initialize(workTime) {

    return new Promise((resolve) => {
        let tomatoCount = 0;
        let dailyTomatoes = {};
        let tags = [];

        chrome.storage.sync.get(['tomatoCount', 'dailyTomatoes', 'tags'], (result) => {
            tomatoCount = result.tomatoCount || 0;
            dailyTomatoes = result.dailyTomatoes || {};
            tags = result.tags || [];

            const today = new Date().toLocaleDateString();
            if (!dailyTomatoes[today]) {
                dailyTomatoes[today] = 0;
            }

            document.body.classList.add("work-mode");

            updateTimeLeftDisplay(workTime);
            updateTomatoCountDisplay(dailyTomatoes[today]);
            resolve({ tomatoCount, dailyTomatoes, tags })
        });

    });

}

// 更新剩余时间显示
export function updateTimeLeftDisplay(timeLeft, isWorkTime, workTime, restTime) {
    const timerDisplay = document.getElementById("timer");

    let minutes, seconds;
    if (timeLeft != 0) {
        minutes = Math.floor(timeLeft / 60);
        seconds = timeLeft % 60;
    } else {
        if (isWorkTime) {
            minutes = parseInt(restTime / 60);
        } else {
            minutes = parseInt(workTime / 60);
        }
        seconds = 0;
    }
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
}

// 更新今日已完成目标显示
export function updateTomatoCountDisplay(tomatoCount) {
    const tomatoCountDisplay = document.getElementById("tomatoCount");
    tomatoCountDisplay.textContent = tomatoCount;
}
