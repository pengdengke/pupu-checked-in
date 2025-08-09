// Background service worker for the check-in extension
chrome.runtime.onInstalled.addListener(() => {
    console.log('噗噗打卡记录器插件已安装');

    // 初始化存储
    chrome.storage.local.get(['checkInHistory'], (result) => {
        if (!result.checkInHistory) {
            chrome.storage.local.set({
                checkInHistory: [],
                lastCheckInDate: null
            });
        }
    });

    // 初始化默认设置
    chrome.storage.sync.get(['heatmapPeriod', 'maxHistoryItems'], (result) => {
        if (!result.heatmapPeriod) {
            chrome.storage.sync.set({
                heatmapPeriod: 365,
                maxHistoryItems: 3
            });
        }
    });
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCheckInData') {
        chrome.storage.local.get(['checkInHistory'], (result) => {
            sendResponse({
                success: true,
                data: result.checkInHistory || []
            });
        });
        return true; // 保持消息通道开放
    }

    if (request.action === 'addCheckIn') {
        const checkInData = {
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };

        chrome.storage.local.get(['checkInHistory'], (result) => {
            const history = result.checkInHistory || [];
            history.push(checkInData);

            chrome.storage.local.set({
                checkInHistory: history,
                lastCheckInDate: checkInData.date
            }, () => {
                sendResponse({
                    success: true,
                    data: checkInData
                });
            });
        });
        return true;
    }

    if (request.action === 'settingsUpdated') {
        // 广播设置更新消息到所有页面
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'settingsUpdated',
                    settings: request.settings
                }).catch(() => {
                    // 忽略无法发送消息的标签页
                });
            });
        });

        // 发送消息到popup
        chrome.runtime.sendMessage({
            action: 'settingsUpdated',
            settings: request.settings
        }).catch(() => {
            // 忽略popup未打开的情况
        });
    }
});

// 设置扩展图标点击时的行为
chrome.action.onClicked.addListener((tab) => {
    // 如果用户点击了扩展图标，可以在这里添加额外的逻辑
    console.log('用户点击了扩展图标');
});
