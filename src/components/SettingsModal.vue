<script setup>
/**
 * 設定視窗元件
 * 提供用戶個人化設定的統一入口
 */
import { ref, computed, watch } from 'vue'
import { Teleport } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  // 當前用戶名稱
  username: {
    type: String,
    default: ''
  },
  // 顯示名稱
  displayName: {
    type: String,
    default: ''
  },
  // 新聞篩選模式（從 Portfolio 傳入）
  newsFilterMode: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits(['close', 'update:newsFilterMode', 'update:displayName'])

// 當前展開的設定區塊
const expandedSection = ref('account')

// 本地狀態（用於編輯）
const localDisplayName = ref('')
const localNewsFilter = ref('all')

// 監聽 visible 變化，初始化本地狀態
watch(() => props.visible, (visible) => {
  if (visible) {
    localDisplayName.value = props.displayName
    localNewsFilter.value = props.newsFilterMode
  }
})

// 設定區塊定義
const settingSections = [
  {
    id: 'account',
    icon: '👤',
    title: '帳號管理',
    description: '管理帳號資訊與資料備份'
  },
  {
    id: 'display',
    icon: '🎨',
    title: '顯示設定',
    description: '調整數字格式與主題'
  },
  {
    id: 'news',
    icon: '📰',
    title: '新聞設定',
    description: '新聞篩選與顯示偏好'
  },
  {
    id: 'update',
    icon: '🔄',
    title: '資料更新',
    description: '價格更新頻率與來源'
  },
  {
    id: 'advanced',
    icon: '⚙️',
    title: '進階設定',
    description: '開發者選項與系統設定'
  }
]

// 切換區塊展開
function toggleSection(sectionId) {
  expandedSection.value = expandedSection.value === sectionId ? null : sectionId
}

// 更新新聞篩選
function updateNewsFilter(mode) {
  localNewsFilter.value = mode
  emit('update:newsFilterMode', mode)
}

// 關閉視窗
function close() {
  emit('close')
}

// 未實作功能提示
function showComingSoon(feature) {
  alert(`「${feature}」功能開發中，敬請期待！`)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="settings-overlay" @click.self="close">
      <div class="settings-modal">
        <!-- 標題列 -->
        <div class="settings-header">
          <h2>⚙️ 設定</h2>
          <button class="close-btn" @click="close">&times;</button>
        </div>

        <!-- 設定內容 -->
        <div class="settings-content">
          <!-- 設定區塊列表 -->
          <div
            v-for="section in settingSections"
            :key="section.id"
            class="settings-section"
            :class="{ expanded: expandedSection === section.id }"
          >
            <!-- 區塊標題 -->
            <div class="section-header" @click="toggleSection(section.id)">
              <div class="section-title">
                <span class="section-icon">{{ section.icon }}</span>
                <div class="section-text">
                  <h3>{{ section.title }}</h3>
                  <p>{{ section.description }}</p>
                </div>
              </div>
              <span class="expand-icon">{{ expandedSection === section.id ? '▼' : '▶' }}</span>
            </div>

            <!-- 區塊內容 -->
            <div v-if="expandedSection === section.id" class="section-content">
              <!-- 帳號管理 -->
              <template v-if="section.id === 'account'">
                <div class="setting-item">
                  <label>目前帳號</label>
                  <div class="setting-value">
                    <span class="current-user">{{ username }}</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>顯示名稱</label>
                  <div class="setting-value">
                    <input
                      type="text"
                      v-model="localDisplayName"
                      placeholder="輸入顯示名稱"
                      class="text-input"
                      disabled
                    />
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>資料管理</label>
                  <div class="setting-actions">
                    <button class="action-btn" @click="showComingSoon('匯出資料')">
                      📤 匯出資料
                    </button>
                    <button class="action-btn" @click="showComingSoon('匯入資料')">
                      📥 匯入資料
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>帳號切換</label>
                  <div class="setting-actions">
                    <button class="action-btn secondary" @click="showComingSoon('切換帳號')">
                      🔄 切換帳號
                    </button>
                  </div>
                </div>
              </template>

              <!-- 顯示設定 -->
              <template v-if="section.id === 'display'">
                <div class="setting-item">
                  <label>基準貨幣</label>
                  <div class="setting-options">
                    <button class="option-btn active" disabled>
                      🇹🇼 台幣 (TWD)
                    </button>
                    <button class="option-btn" disabled>
                      🇺🇸 美元 (USD)
                    </button>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>數字格式</label>
                  <div class="setting-options">
                    <button class="option-btn active" disabled>
                      萬元顯示
                    </button>
                    <button class="option-btn" disabled>
                      完整數字
                    </button>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>小數位數</label>
                  <div class="setting-options">
                    <select class="select-input" disabled>
                      <option value="0">0 位</option>
                      <option value="1">1 位</option>
                      <option value="2" selected>2 位</option>
                      <option value="4">4 位</option>
                    </select>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>主題</label>
                  <div class="setting-options">
                    <button class="option-btn active" disabled>
                      ☀️ 淺色
                    </button>
                    <button class="option-btn" disabled>
                      🌙 深色
                    </button>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
              </template>

              <!-- 新聞設定 -->
              <template v-if="section.id === 'news'">
                <div class="setting-item">
                  <label>預設篩選模式</label>
                  <div class="setting-options">
                    <button
                      :class="['option-btn', { active: localNewsFilter === 'all' }]"
                      @click="updateNewsFilter('all')"
                    >
                      全部
                    </button>
                    <button
                      :class="['option-btn bullish', { active: localNewsFilter === 'bullish' }]"
                      @click="updateNewsFilter('bullish')"
                    >
                      📈 看漲
                    </button>
                    <button
                      :class="['option-btn bearish', { active: localNewsFilter === 'bearish' }]"
                      @click="updateNewsFilter('bearish')"
                    >
                      📉 看跌
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>新聞快取時間</label>
                  <div class="setting-options">
                    <select class="select-input" disabled>
                      <option value="5">5 分鐘</option>
                      <option value="15" selected>15 分鐘</option>
                      <option value="30">30 分鐘</option>
                      <option value="60">1 小時</option>
                    </select>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>新聞來源</label>
                  <div class="setting-value">
                    <span class="info-text">Yahoo Finance、Google News</span>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
              </template>

              <!-- 資料更新 -->
              <template v-if="section.id === 'update'">
                <div class="setting-item">
                  <label>自動更新價格</label>
                  <div class="setting-options">
                    <button class="option-btn" disabled>
                      開啟
                    </button>
                    <button class="option-btn active" disabled>
                      關閉
                    </button>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>更新頻率</label>
                  <div class="setting-options">
                    <select class="select-input" disabled>
                      <option value="5">每 5 分鐘</option>
                      <option value="15">每 15 分鐘</option>
                      <option value="30" selected>每 30 分鐘</option>
                      <option value="0">手動更新</option>
                    </select>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>價格來源</label>
                  <div class="setting-value">
                    <span class="info-text">Yahoo Finance、Alpha Vantage</span>
                  </div>
                </div>
              </template>

              <!-- 進階設定 -->
              <template v-if="section.id === 'advanced'">
                <div class="setting-item">
                  <label>API 服務位址</label>
                  <div class="setting-value">
                    <input
                      type="text"
                      value="http://localhost:3001"
                      class="text-input"
                      disabled
                    />
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>開發者模式</label>
                  <div class="setting-options">
                    <button class="option-btn" disabled>
                      開啟
                    </button>
                    <button class="option-btn active" disabled>
                      關閉
                    </button>
                    <span class="coming-soon-badge">即將推出</span>
                  </div>
                </div>
                <div class="setting-item">
                  <label>系統操作</label>
                  <div class="setting-actions">
                    <button class="action-btn warning" @click="showComingSoon('清除快取')">
                      🗑️ 清除快取
                    </button>
                    <button class="action-btn danger" @click="showComingSoon('重置設定')">
                      ⚠️ 重置設定
                    </button>
                  </div>
                </div>
                <div class="setting-item">
                  <label>版本資訊</label>
                  <div class="setting-value">
                    <span class="info-text">投資現況儀表板 v1.10.0</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 底部 -->
        <div class="settings-footer">
          <span class="footer-hint">部分設定需要重新載入頁面才會生效</span>
          <button class="btn-close" @click="close">關閉</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.settings-modal {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e8e8e8;
}

.settings-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #333;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.settings-section {
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.3s;
  border: 1px solid #e8e8e8;
}

.settings-section.expanded {
  background: #fff;
  border-color: #4472c4;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.section-header:hover {
  background: rgba(0, 0, 0, 0.03);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.section-icon {
  font-size: 24px;
}

.section-text h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.section-text p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #888;
}

.expand-icon {
  color: #999;
  font-size: 12px;
  transition: transform 0.2s;
}

.section-content {
  padding: 0 20px 20px;
  border-top: 1px solid #e8e8e8;
  margin-top: 0;
  padding-top: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.setting-value {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-user {
  padding: 8px 14px;
  background: #4472c4;
  border-radius: 6px;
  color: #fff;
  font-weight: 500;
}

.text-input {
  flex: 1;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #333;
  font-size: 14px;
  outline: none;
}

.text-input:focus {
  border-color: #4472c4;
}

.text-input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.select-input {
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #333;
  font-size: 14px;
  outline: none;
  cursor: pointer;
}

.select-input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.setting-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.option-btn {
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  color: #666;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #ccc;
  color: #333;
}

.option-btn.active {
  background: #4472c4;
  border-color: #4472c4;
  color: #fff;
}

.option-btn.bullish.active {
  background: #2e7d32;
  border-color: #2e7d32;
}

.option-btn.bearish.active {
  background: #c62828;
  border-color: #c62828;
}

.option-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.setting-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-btn {
  padding: 10px 18px;
  background: #4472c4;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #365a9e;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(68, 114, 196, 0.3);
}

.action-btn.secondary {
  background: #f0f0f0;
  color: #666;
}

.action-btn.secondary:hover {
  background: #e0e0e0;
  box-shadow: none;
}

.action-btn.warning {
  background: #f39c12;
}

.action-btn.warning:hover {
  background: #e67e22;
  box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
}

.action-btn.danger {
  background: #e74c3c;
}

.action-btn.danger:hover {
  background: #c0392b;
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
}

.coming-soon-badge {
  padding: 4px 10px;
  background: #fff8e1;
  border: 1px solid #ffcc80;
  border-radius: 12px;
  color: #f57c00;
  font-size: 11px;
  font-weight: 500;
}

.info-text {
  color: #888;
  font-size: 14px;
}

.settings-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid #e8e8e8;
  background: #f8f9fa;
}

.footer-hint {
  font-size: 12px;
  color: #999;
}

.btn-close {
  padding: 10px 24px;
  background: #4472c4;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #365a9e;
}

/* 響應式 */
@media (max-width: 600px) {
  .settings-modal {
    max-height: 100vh;
    border-radius: 0;
  }

  .setting-options {
    flex-direction: column;
    align-items: stretch;
  }

  .option-btn {
    text-align: center;
  }

  .settings-footer {
    flex-direction: column;
    gap: 12px;
  }

  .footer-hint {
    text-align: center;
  }
}
</style>
