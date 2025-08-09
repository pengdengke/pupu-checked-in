// Content script for the check-in extension
// 这个文件可以在网页中注入一些功能，比如快捷键打卡等

// 监听键盘快捷键 (Ctrl+Shift+C 或 Cmd+Shift+C)
document.addEventListener('keydown', (event) => {
    // 检查是否按下了 Ctrl+Shift+C (Windows) 或 Cmd+Shift+C (Mac)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();

        // 发送消息到background script进行打卡
        chrome.runtime.sendMessage({
            action: 'addCheckIn'
        }, (response) => {
            if (response && response.success) {
                // 显示打卡成功提示
                showCheckInNotification('打卡成功！', 'success');
            } else {
                showCheckInNotification('打卡失败，请重试', 'error');
            }
        });
    }
});

// 显示打卡通知
function showCheckInNotification(message, type) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
    `;

    // 根据类型设置背景色
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #e53e3e 0%, #c53030 100%)';
    }

    notification.textContent = message;

    // 添加到页面
    document.body.appendChild(notification);

    // 显示动画
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);

    // 3秒后自动移除
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkInFromContent') {
        // 从content script触发打卡
        chrome.runtime.sendMessage({
            action: 'addCheckIn'
        }, (response) => {
            sendResponse(response);
        });
        return true;
    }
});

console.log('噗噗打卡记录器 content script 已加载');
console.log('使用快捷键 Ctrl+Shift+C (Windows) 或 Cmd+Shift+C (Mac) 进行快速打卡');
