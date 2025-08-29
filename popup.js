// 打卡记录器的主要逻辑
class CheckInTracker {
    constructor() {
        this.init();
        this.bindEvents();
        this.updateTime();
        this.loadSettings();
        this.loadData();
    }

    init() {
        this.currentTimeElement = document.getElementById('currentTime');
        this.checkInBtn = document.getElementById('checkInBtn');
        this.checkInStatus = document.getElementById('checkInStatus');
        this.todayCount = document.getElementById('todayCount');
        this.streakCount = document.getElementById('streakCount');
        this.heatmapContainer = document.getElementById('heatmapContainer');
        this.historyList = document.getElementById('historyList');
        this.settingsBtn = document.getElementById('settingsBtn');
    // 指定打卡元素
    this.specificCheckInBtn = document.getElementById('specificCheckInBtn');
    this.specificModal = document.getElementById('specificModal');
    this.specificDateInput = document.getElementById('specificDateInput');
    this.specificCancelBtn = document.getElementById('specificCancelBtn');
    this.specificConfirmBtn = document.getElementById('specificConfirmBtn');

        // 默认设置
        this.settings = {
            heatmapPeriod: 30,
            maxHistoryItems: 3
        };

        // 历史记录显示相关
        this.displayedHistoryCount = 0;
        this.todayHistory = [];

        // 更新时间
        setInterval(() => this.updateTime(), 1000);
    }

    bindEvents() {
        this.checkInBtn.addEventListener('click', () => this.checkIn());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        // 指定打卡事件绑定
        if (this.specificCheckInBtn) {
            this.specificCheckInBtn.addEventListener('click', () => this.openSpecificModal());
        }
        if (this.specificCancelBtn) {
            this.specificCancelBtn.addEventListener('click', () => this.closeSpecificModal());
        }
        if (this.specificConfirmBtn) {
            this.specificConfirmBtn.addEventListener('click', () => this.confirmSpecificCheckIn());
        }
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        this.currentTimeElement.textContent = timeString;
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['heatmapPeriod', 'maxHistoryItems']);
            this.settings.heatmapPeriod = result.heatmapPeriod || 30;
            this.settings.maxHistoryItems = result.maxHistoryItems || 3;
        } catch (error) {
            console.error('加载设置失败:', error);
        }
    }

    openSettings() {
        chrome.runtime.openOptionsPage();
    }

    async checkIn() {
        const now = new Date();
        const checkInData = {
            timestamp: now.getTime(),
            date: now.toISOString().split('T')[0],
            time: now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };

        try {
            // 获取现有数据
            const result = await chrome.storage.local.get(['checkInHistory', 'lastCheckInDate']);
            console.log(result);
            let history = result.checkInHistory || [];
            const lastCheckInDate = result.lastCheckInDate;

            // 添加新的打卡记录
            history.push(checkInData);

            // 保存数据
            await chrome.storage.local.set({
                checkInHistory: history,
                lastCheckInDate: checkInData.date
            });

            // 更新界面
            this.showCheckInStatus('打卡成功！');
            this.loadData();

            // 3秒后清除状态
            setTimeout(() => {
                this.checkInStatus.textContent = '';
            }, 3000);

        } catch (error) {
            console.error('打卡失败:', error);
            this.showCheckInStatus('打卡失败，请重试');
        }
    }

    openSpecificModal() {
        // 设置日期最大值为今天
        const today = new Date().toISOString().split('T')[0];
        if (this.specificDateInput) {
            this.specificDateInput.max = today;
            this.specificDateInput.value = today;
        }
        if (this.specificModal) this.specificModal.style.display = 'flex';
    }

    closeSpecificModal() {
        if (this.specificModal) this.specificModal.style.display = 'none';
    }

    async confirmSpecificCheckIn() {
        const dateInput = this.specificDateInput ? this.specificDateInput.value : null;
        if (!dateInput) {
            this.showCheckInStatus('请选择一个有效的日期');
            return;
        }

        const chosenDate = new Date(dateInput);
        const today = new Date();
        // strip time
        chosenDate.setHours(0,0,0,0);
        today.setHours(0,0,0,0);

        if (chosenDate > today) {
            this.showCheckInStatus('只能选择今天或以前的日期');
            return;
        }

        // 创建记录（时间按当前时间）
        const now = new Date();
        const checkInData = {
            timestamp: now.getTime(),
            date: dateInput,
            time: now.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })
        };

        try {
            const result = await chrome.storage.local.get(['checkInHistory', 'lastCheckInDate']);
            let history = result.checkInHistory || [];

            // 将记录追加到指定日期
            history.push(checkInData);

            await chrome.storage.local.set({
                checkInHistory: history,
                lastCheckInDate: checkInData.date
            });

            this.showCheckInStatus('指定打卡已记录');
            this.closeSpecificModal();
            this.loadData();

            setTimeout(() => {
                this.checkInStatus.textContent = '';
            }, 3000);
        } catch (error) {
            console.error('指定打卡失败:', error);
            this.showCheckInStatus('指定打卡失败，请重试');
        }
    }

    showCheckInStatus(message) {
        this.checkInStatus.textContent = message;
        this.checkInStatus.style.color = message.includes('成功') ? '#48bb78' : '#e53e3e';
    }

    async loadData() {
        try {
            const result = await chrome.storage.local.get(['checkInHistory']);
            const history = result.checkInHistory || [];

            this.updateTodayCount(history);
            this.updateStreakCount(history);
            this.updateHeatmap(history);
            this.updateHistoryList(history);
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    updateTodayCount(history) {
        const today = new Date().toISOString().split('T')[0];
        const todayCount = history.filter(record => record.date === today).length;
        this.todayCount.textContent = todayCount;
    }

    updateStreakCount(history) {
        const dates = [...new Set(history.map(record => record.date))].sort();
        let streak = 0;
        const today = new Date();

        for (let i = dates.length - 1; i >= 0; i--) {
            const date = new Date(dates[i]);
            const expectedDate = new Date(today);
            expectedDate.setDate(today.getDate() - (dates.length - 1 - i));

            if (date.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
                streak++;
            } else {
                break;
            }
        }

        this.streakCount.textContent = streak;
    }

    updateHeatmap(history) {
        this.heatmapContainer.innerHTML = '';

        // 根据设置生成热力图
        const days = this.settings.heatmapPeriod;
        const today = new Date();
        const heatmapData = {};

        // 统计每天打卡次数
        history.forEach(record => {
            const date = record.date;
            heatmapData[date] = (heatmapData[date] || 0) + 1;
        });

        // 计算开始日期（从周一开始）
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - days + 1);

        // 调整到最近的周一
        const dayOfWeek = startDate.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0是周日，1是周一
        startDate.setDate(startDate.getDate() - daysToMonday);

        // 计算结束日期（到最近的周日）
        const endDate = new Date(today);
        const endDayOfWeek = endDate.getDay();
        const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
        endDate.setDate(endDate.getDate() + daysToSunday);

        // 创建GitHub风格的热力图（垂直布局）
        const currentDate = new Date(startDate);
        const weeks = [];
        let currentWeek = [];

        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            const count = heatmapData[dateString] || 0;

            currentWeek.push({
                date: dateString,
                count: count,
                isToday: dateString === today.toISOString().split('T')[0]
            });

            // 每周7天
            if (currentWeek.length === 7) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // 如果最后一周不满7天，补齐
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push({
                    date: '',
                    count: 0,
                    isToday: false
                });
            }
            weeks.push(currentWeek);
        }

        // 创建垂直布局的热力图
        const heatmapGrid = document.createElement('div');
        heatmapGrid.className = 'heatmap-grid';

        // 为每一天创建一列
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'heatmap-column';

            // 添加星期标签
            const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
            const dayLabel = document.createElement('div');
            dayLabel.className = 'day-label';
            dayLabel.textContent = dayLabels[dayIndex];
            dayColumn.appendChild(dayLabel);

            // 为这一列添加每一天的方块
            weeks.forEach(week => {
                const dayData = week[dayIndex];
                if (dayData && dayData.date) {
                    const dayElement = document.createElement('div');
                    dayElement.className = `heatmap-day level-${this.getLevel(dayData.count)}`;
                    dayElement.title = `${dayData.date}: ${dayData.count} 次打卡`;

                    // 如果是今天，添加特殊样式
                    if (dayData.isToday) {
                        dayElement.style.border = '2px solid #667eea';
                    }

                    dayColumn.appendChild(dayElement);
                } else {
                    // 空日期
                    const emptyDay = document.createElement('div');
                    emptyDay.className = 'heatmap-day level-0';
                    emptyDay.style.opacity = '0.3';
                    dayColumn.appendChild(emptyDay);
                }
            });

            heatmapGrid.appendChild(dayColumn);
        }

        this.heatmapContainer.appendChild(heatmapGrid);
    }

    getLevel(count) {
        if (count === 0) return 0;
        if (count <= 2) return 1;
        if (count <= 5) return 2;
        if (count <= 10) return 3;
        return 4;
    }

    updateHistoryList(history) {
        const today = new Date().toISOString().split('T')[0];
        this.todayHistory = history
            .filter(record => record.date === today)
            .sort((a, b) => b.timestamp - a.timestamp);

        this.historyList.innerHTML = '';
        this.displayedHistoryCount = 0;

        if (this.todayHistory.length === 0) {
            const noRecord = document.createElement('div');
            noRecord.textContent = '今日暂无打卡记录';
            noRecord.style.textAlign = 'center';
            noRecord.style.color = '#718096';
            noRecord.style.padding = '20px';
            this.historyList.appendChild(noRecord);
        } else {
            this.loadMoreHistory();
        }
    }

    loadMoreHistory() {
        const remainingCount = this.todayHistory.length - this.displayedHistoryCount;
        const loadCount = Math.min(3, remainingCount);

        // 加载指定数量的记录
        for (let i = 0; i < loadCount; i++) {
            const record = this.todayHistory[this.displayedHistoryCount + i];
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';

            const timeElement = document.createElement('span');
            timeElement.className = 'history-time';
            timeElement.textContent = record.time;

            const countElement = document.createElement('span');
            countElement.className = 'history-count';
            countElement.textContent = `第${this.todayHistory.length - (this.displayedHistoryCount + i)}次`;

            historyItem.appendChild(timeElement);
            historyItem.appendChild(countElement);
            this.historyList.appendChild(historyItem);
        }

        this.displayedHistoryCount += loadCount;

        // 如果还有更多记录，显示"还有X条记录..."按钮
        if (this.displayedHistoryCount < this.todayHistory.length) {
            const remainingCount = this.todayHistory.length - this.displayedHistoryCount;
            const moreItem = document.createElement('div');
            moreItem.className = 'history-item';
            moreItem.style.justifyContent = 'center';
            moreItem.style.color = '#667eea';
            moreItem.style.fontSize = '12px';
            moreItem.style.cursor = 'pointer';
            moreItem.style.fontWeight = '500';
            moreItem.textContent = `还有 ${remainingCount} 条记录...`;
            moreItem.addEventListener('click', () => {
                // 移除当前的"还有X条记录..."按钮
                moreItem.remove();
                // 加载更多记录
                this.loadMoreHistory();
            });
            moreItem.addEventListener('mouseenter', () => {
                moreItem.style.backgroundColor = '#f0f4ff';
            });
            moreItem.addEventListener('mouseleave', () => {
                moreItem.style.backgroundColor = 'white';
            });
            this.historyList.appendChild(moreItem);
        }
    }
}

// 监听设置更新消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'settingsUpdated') {
        // 重新加载设置和数据
        const tracker = window.checkInTracker;
        if (tracker) {
            tracker.settings = request.settings;
            tracker.loadData();
        }
    }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.checkInTracker = new CheckInTracker();
});
