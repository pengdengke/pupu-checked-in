// 配置页面的JavaScript逻辑
class OptionsManager {
    constructor() {
        this.init();
        this.bindEvents();
        this.loadSettings();
    }

    init() {
        this.heatmapPeriod = document.getElementById('heatmapPeriod');
        this.maxHistoryItems = document.getElementById('maxHistoryItems');
        this.saveBtn = document.getElementById('saveBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.status = document.getElementById('status');
    }

    bindEvents() {
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.resetBtn.addEventListener('click', () => this.resetSettings());
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['heatmapPeriod', 'maxHistoryItems']);

            // 设置默认值
            const heatmapPeriod = result.heatmapPeriod || 30;
            const maxHistoryItems = result.maxHistoryItems || 3;

            this.heatmapPeriod.value = heatmapPeriod;
            this.maxHistoryItems.value = maxHistoryItems;
        } catch (error) {
            console.error('加载设置失败:', error);
            this.showStatus('加载设置失败', 'error');
        }
    }

    async saveSettings() {
        try {
            const heatmapPeriod = parseInt(this.heatmapPeriod.value);
            const maxHistoryItems = parseInt(this.maxHistoryItems.value);

            // 验证输入
            if (heatmapPeriod < 30 || heatmapPeriod > 365) {
                this.showStatus('热力图时间范围必须在30-365天之间', 'error');
                return;
            }

            if (maxHistoryItems < 3 || maxHistoryItems > 20) {
                this.showStatus('最大显示条数必须在3-20之间,噗噗过多请去看医生', 'error');
                return;
            }

            // 保存设置
            await chrome.storage.sync.set({
                heatmapPeriod: heatmapPeriod,
                maxHistoryItems: maxHistoryItems
            });

            this.showStatus('设置保存成功！', 'success');

            // 通知其他页面设置已更新
            chrome.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: {
                    heatmapPeriod: heatmapPeriod,
                    maxHistoryItems: maxHistoryItems
                }
            });

        } catch (error) {
            console.error('保存设置失败:', error);
            this.showStatus('保存设置失败', 'error');
        }
    }

    async resetSettings() {
        try {
            // 重置为默认值
            this.heatmapPeriod.value = 30;
            this.maxHistoryItems.value = 3;

            // 保存默认设置
            await chrome.storage.sync.set({
                heatmapPeriod: 30,
                maxHistoryItems: 3
            });

            this.showStatus('设置已重置为默认值', 'success');

            // 通知其他页面设置已更新
            chrome.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: {
                    heatmapPeriod: 30,
                    maxHistoryItems: 3
                }
            });

        } catch (error) {
            console.error('重置设置失败:', error);
            this.showStatus('重置设置失败', 'error');
        }
    }

    showStatus(message, type) {
        this.status.textContent = message;
        this.status.className = `status ${type} show`;

        // 3秒后隐藏状态
        setTimeout(() => {
            this.status.classList.remove('show');
        }, 3000);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new OptionsManager();
});
