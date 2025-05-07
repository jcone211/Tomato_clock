let popupWindowId = null;

// 点击扩展图标时切换窗口状态
chrome.action.onClicked.addListener(() => {
    if (popupWindowId !== null) {
        chrome.windows.remove(popupWindowId, () => {
            popupWindowId = null;
        });
    } else {
        chrome.windows.getCurrent((currentWindow) => {
            chrome.windows.create({
                url: chrome.runtime.getURL('index.html'),
                type: 'popup',
                width: 520,
                height: 770,
                left: currentWindow.width - 400,
                top: 50
            }, (newWindow) => {
                popupWindowId = newWindow.id;
            });
        });
    }
});

// 监听窗口关闭
chrome.windows.onRemoved.addListener((closedWindowId) => {
    if (closedWindowId === popupWindowId) {
        popupWindowId = null;
    }
});

// 添加消息监听
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoro-timer') {
        if (popupWindowId !== null) {
            chrome.windows.get(popupWindowId, (window) => {
                if (window) {
                    chrome.runtime.sendMessage({ action: "tick" });
                }
            })
        }
    }
});