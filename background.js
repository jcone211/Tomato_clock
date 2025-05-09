// 点击扩展图标时切换窗口状态
chrome.action.onClicked.addListener(() => {
    chrome.storage.local.get('popupWindowId', ({ popupWindowId }) => {
        if (popupWindowId !== null && popupWindowId !== undefined) {
            chrome.windows.remove(popupWindowId, () => {
                chrome.storage.local.set({ popupWindowId: null });
            });
        } else {
            chrome.windows.getCurrent((currentWindow) => {
                chrome.windows.create({
                    url: chrome.runtime.getURL('index.html'),
                    type: 'popup',
                    width: 420,
                    height: 762,
                    left: currentWindow.width - 400,
                    top: 50
                }, (newWindow) => {
                    chrome.storage.local.set({ popupWindowId: newWindow.id });
                });
            });
        }
    })
});

// 监听窗口关闭
chrome.windows.onRemoved.addListener((closedWindowId) => {
    chrome.storage.local.get(['popupWindowId'], ({ popupWindowId }) => {
        if (closedWindowId === popupWindowId) {
            chrome.storage.local.set({ popupWindowId: null });
        }
    })
    chrome.alarms.clear('pomodoro-timer');
});

// 添加消息监听
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'pomodoro-timer') {
        chrome.storage.local.get('popupWindowId', (data) => {
            const popupWindowId = data.popupWindowId;
            if (popupWindowId !== null && popupWindowId !== undefined) {
                chrome.windows.get(popupWindowId, (window) => {
                    if (window) {
                        chrome.runtime.sendMessage({ action: "tick" });
                    }
                });
            }
        });
    }
});