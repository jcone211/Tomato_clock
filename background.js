chrome.action.onClicked.addListener(() => {
    chrome.windows.getCurrent((currentWindow) => {
        chrome.windows.create({
            url: 'index.html',
            type: 'popup',
            width: 520,
            height: 720,
            left: currentWindow.width - 400,
            top: 50
        });
    });
});
