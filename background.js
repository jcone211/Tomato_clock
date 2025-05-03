chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent((currentWindow) => {
        chrome.windows.create({
            url: 'index.html',
            type: 'popup',
            width: 520,
            height: 760,
            left: currentWindow.width - 400,
            top: 50
        });
    });
});

// 添加消息监听
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoro-timer') {
        chrome.runtime.sendMessage({ action: "tick" });
        // 补偿窗口最小化期间丢失的时间
        chrome.windows.getAll({ populate: true }, (windows) => {
            const isAnyWindowVisible = windows.some(win => win.state !== 'minimized');
            if (!isAnyWindowVisible) {
                chrome.runtime.sendMessage({ action: "tick" });
            }
        });
    }
});