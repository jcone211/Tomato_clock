export function initialize(workTime) {

    return new Promise((resolve) => {
        let tomatoCount = 0;
        let dailyTomatoes = {};

        chrome.storage.sync.get(['tomatoCount', 'dailyTomatoes'], function (result) {
            tomatoCount = result.tomatoCount || 0;
            dailyTomatoes = result.dailyTomatoes || {};

            const today = new Date().toLocaleDateString();
            if (!dailyTomatoes[today]) {
                dailyTomatoes[today] = 0;
            }

            document.body.classList.add("work-mode");

            updateTimeLeftDisplay(workTime);
            updateTomatoCountDisplay(dailyTomatoes[today]);
            resolve({ tomatoCount, dailyTomatoes })
        });

    });

}

// 更新剩余时间显示
export function updateTimeLeftDisplay(timeLeft, isWorkTime) {
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
