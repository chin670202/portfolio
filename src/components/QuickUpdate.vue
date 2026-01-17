<script setup>
import { ref, computed } from 'vue'
import { updateService, features } from '../config'

const props = defineProps({
  username: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['updated'])

// 輸入視窗狀態
const showInputModal = ref(false)
const updateContent = ref('')
const imageFile = ref(null)
const imagePreview = ref(null)

// 處理視窗狀態（進度 + 結果 合一）
const showProcessModal = ref(false)
const processing = ref(false)
const progressStatus = ref('')
const progressSteps = ref([])
const result = ref(null)
const error = ref(null)

// 確認問題狀態
const clarificationQuestion = ref('')
const clarificationInput = ref('')
const originalInput = ref('')

// 從設定檔讀取服務 URL
const serverUrl = updateService.baseUrl
const apiKey = updateService.apiKey

// 功能是否啟用
const isEnabled = features.quickUpdate

const canSubmit = computed(() => {
  return (updateContent.value.trim() || imageFile.value) && serverUrl
})

function openInputModal() {
  showInputModal.value = true
}

function closeInputModal() {
  showInputModal.value = false
  resetInputForm()
}

function resetInputForm() {
  updateContent.value = ''
  imageFile.value = null
  imagePreview.value = null
}

function closeProcessModal() {
  showProcessModal.value = false
  processing.value = false
  progressStatus.value = ''
  progressSteps.value = []
  result.value = null
  error.value = null
  clarificationQuestion.value = ''
  clarificationInput.value = ''
  originalInput.value = ''
}

function handleImageSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('請選擇圖片檔案')
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    alert('圖片大小不能超過 10MB')
    return
  }

  imageFile.value = file

  // 預覽圖片
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target.result
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  imageFile.value = null
  imagePreview.value = null
}

// 簡單的 markdown 格式化（粗體、換行）
function formatSummary(text) {
  if (!text) return ''
  return text
    // 粗體 **text**
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 換行
    .replace(/\n/g, '<br>')
    // 列表項 - item
    .replace(/^- (.+)$/gm, '<span class="list-item">• $1</span>')
}

// 新增進度步驟
function addProgressStep(step, status = 'active') {
  const existingIndex = progressSteps.value.findIndex(s => s.step === step)
  if (existingIndex >= 0) {
    // 如果步驟已存在且狀態是 done，不要改回 active（保持打勾狀態）
    if (progressSteps.value[existingIndex].status === 'done' && status === 'active') {
      return
    }
    progressSteps.value[existingIndex].status = status
  } else {
    // 將之前的 active 改為 done
    progressSteps.value.forEach(s => {
      if (s.status === 'active') s.status = 'done'
    })
    progressSteps.value.push({ step, status })
  }
}

async function submitUpdate() {
  if (!canSubmit.value) return

  // 立即關閉輸入視窗，打開處理視窗
  showInputModal.value = false
  showProcessModal.value = true
  processing.value = true
  error.value = null
  result.value = null
  progressStatus.value = '正在連接服務...'
  progressSteps.value = []

  const contentToSend = updateContent.value.trim()
  const imageToSend = imagePreview.value

  // 清空輸入表單
  resetInputForm()

  try {
    let type = 'text'
    let content = contentToSend

    // 如果有圖片，優先使用圖片
    if (imageToSend) {
      type = 'image'
      content = imageToSend
    }

    // 使用 SSE 端點
    const response = await fetch(`${serverUrl}/update/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        user: props.username,
        type,
        content
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '更新失敗')
    }

    // 讀取 SSE 串流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            handleSSEMessage(data)
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
    }

  } catch (e) {
    error.value = e.message || '連線失敗，請確認本機服務是否啟動'
    addProgressStep(e.message || '連線失敗', 'error')
  } finally {
    processing.value = false
    progressStatus.value = ''
  }
}

function handleSSEMessage(data) {
  switch (data.type) {
    case 'progress':
      progressStatus.value = data.message
      addProgressStep(data.step || data.message)
      break

    case 'complete':
      // 標記所有步驟為完成
      progressSteps.value.forEach(s => {
        if (s.status === 'active') s.status = 'done'
      })
      result.value = data.result
      emit('updated', data.result)
      break

    case 'clarification':
      // 需要用戶確認/提供更多資訊
      progressSteps.value.forEach(s => {
        if (s.status === 'active') s.status = 'done'
      })
      addProgressStep('需要確認', 'done')
      clarificationQuestion.value = data.question
      originalInput.value = data.originalInput || ''
      processing.value = false
      break

    case 'error':
      error.value = data.message
      addProgressStep(data.message, 'error')
      break
  }
}

// 提交確認回覆
async function submitClarification() {
  if (!clarificationInput.value.trim()) return

  // 組合原始輸入與補充資訊
  const combinedContent = `${originalInput.value}\n\n補充資訊：${clarificationInput.value.trim()}`

  // 重置確認問題狀態，但保留已完成的步驟
  clarificationQuestion.value = ''
  clarificationInput.value = ''
  processing.value = true
  progressStatus.value = ''
  // 移除「需要確認」步驟，加入「重新分析」
  progressSteps.value = progressSteps.value.filter(s => s.step !== '需要確認')
  addProgressStep('重新分析')

  try {
    const response = await fetch(`${serverUrl}/update/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify({
        user: props.username,
        type: 'text',
        content: combinedContent
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '更新失敗')
    }

    // 讀取 SSE 串流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            handleSSEMessage(data)
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }
    }

  } catch (e) {
    error.value = e.message || '連線失敗'
    addProgressStep(e.message || '連線失敗', 'error')
  } finally {
    processing.value = false
    progressStatus.value = ''
  }
}

</script>

<template>
  <div v-if="isEnabled" class="quick-update">
    <!-- 觸發按鈕 -->
    <button class="quick-update-btn" @click="openInputModal" title="快速更新部位">
      <span class="btn-icon">+</span>
      <span class="btn-text">更新部位</span>
    </button>

    <!-- 輸入視窗 -->
    <Teleport to="body">
      <div v-if="showInputModal" class="modal-overlay" @click.self="closeInputModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>快速更新部位</h3>
            <button class="close-btn" @click="closeInputModal">&times;</button>
          </div>

          <div class="modal-body">
            <!-- 輸入區 -->
            <div class="input-section">
              <label>貼上交易訊息：</label>
              <textarea
                v-model="updateContent"
                placeholder="例如：買入 NVDA 10股 @140&#10;或：賣出 00725B 5000股"
                rows="4"
              ></textarea>
            </div>

            <div class="divider">
              <span>或</span>
            </div>

            <div class="image-section">
              <label>上傳截圖：</label>
              <div v-if="imagePreview" class="image-preview">
                <img :src="imagePreview" alt="預覽" />
                <button class="remove-image" @click="removeImage">
                  移除
                </button>
              </div>
              <input
                v-else
                type="file"
                accept="image/*"
                @change="handleImageSelect"
              />
            </div>

            <div class="input-hint">
              僅接受投資部位更新指令（買入/賣出/加碼等）
            </div>
          </div>

          <div class="modal-footer">
            <button class="cancel-btn" @click="closeInputModal">
              取消
            </button>
            <button
              class="submit-btn"
              @click="submitUpdate"
              :disabled="!canSubmit"
            >
              送出更新
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 處理視窗（進度 + 結果） -->
    <Teleport to="body">
      <div v-if="showProcessModal" class="modal-overlay" @click.self="!processing && closeProcessModal()">
        <div class="modal-content process-modal" :class="{ 'success': result && !error, 'error': error }">
          <div class="modal-header" :class="{ 'success-header': result && !error, 'error-header': error }">
            <div class="header-title">
              <span v-if="processing" class="header-spinner"></span>
              <span v-else-if="result && !error" class="success-icon">✓</span>
              <span v-else-if="error" class="error-icon">✗</span>
              <h3>{{ processing ? '處理中' : (error ? '更新失敗' : '更新成功') }}</h3>
            </div>
            <button v-if="!processing" class="close-btn" @click="closeProcessModal">&times;</button>
          </div>

          <div class="modal-body">
            <!-- 進度步驟 -->
            <div class="progress-steps">
              <div
                v-for="(step, i) in progressSteps"
                :key="i"
                class="progress-step"
                :class="step.status"
              >
                <span class="step-icon">
                  <template v-if="step.status === 'done'">✓</template>
                  <template v-else-if="step.status === 'error'">✗</template>
                  <template v-else><span class="step-spinner"></span></template>
                </span>
                <span class="step-text">{{ step.step }}</span>
              </div>
            </div>

            <!-- 處理中狀態 -->
            <div v-if="processing && progressStatus" class="processing-status">
              {{ progressStatus }}
            </div>

            <!-- 錯誤訊息 -->
            <div v-if="error && !processing" class="error-message">
              {{ error }}
            </div>

            <!-- 確認問題 -->
            <div v-if="clarificationQuestion && !processing && !error && !result" class="clarification-section">
              <div class="clarification-question">
                <span class="question-icon">❓</span>
                <p>{{ clarificationQuestion }}</p>
              </div>
              <div class="clarification-input">
                <textarea
                  v-model="clarificationInput"
                  placeholder="請輸入補充資訊..."
                  rows="2"
                ></textarea>
                <button
                  class="submit-btn"
                  @click="submitClarification"
                  :disabled="!clarificationInput.trim()"
                >
                  確認送出
                </button>
              </div>
            </div>

            <!-- 成功結果 -->
            <div v-if="result && !error && !processing" class="result-content">
              <!-- 詳細摘要 -->
              <div v-if="result.summary" class="result-summary" v-html="formatSummary(result.summary)"></div>

              <!-- 變更列表 -->
              <ul v-if="result.changes?.length" class="change-list">
                <li v-for="(change, i) in result.changes" :key="i" :class="'change-' + change.type">
                  <span class="change-icon">
                    {{ change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '↑' }}
                  </span>
                  <span class="change-category">{{ change.category }}</span>
                  <span class="change-item">{{ change.item }}</span>
                </li>
              </ul>

              <!-- 執行時間 -->
              <div v-if="result.duration" class="result-duration">
                處理時間：{{ result.duration }}
              </div>
            </div>
          </div>

          <div v-if="!processing && !clarificationQuestion" class="modal-footer">
            <button class="submit-btn" @click="closeProcessModal">
              完成
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.quick-update-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.quick-update-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-icon {
  font-size: 18px;
  font-weight: bold;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: #1e1e2e;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.process-modal.success {
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.process-modal.error {
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.success-header {
  background: rgba(46, 204, 113, 0.1);
  border-bottom: 1px solid rgba(46, 204, 113, 0.2);
}

.error-header {
  background: rgba(231, 76, 60, 0.1);
  border-bottom: 1px solid rgba(231, 76, 60, 0.2);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.success-header h3 {
  color: #2ecc71;
}

.error-header h3 {
  color: #e74c3c;
}

.header-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.success-icon, .error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 16px;
}

.success-icon {
  background: #2ecc71;
  color: #fff;
}

.error-icon {
  background: #e74c3c;
  color: #fff;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 20px;
}

.input-section label,
.image-section label {
  display: block;
  margin-bottom: 8px;
  color: #aaa;
  font-size: 14px;
}

.input-section textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #2a2a3e;
  color: #fff;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.input-section textarea:focus {
  outline: none;
  border-color: #667eea;
}

.divider {
  display: flex;
  align-items: center;
  margin: 16px 0;
  color: #666;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #444;
}

.divider span {
  padding: 0 12px;
  font-size: 12px;
}

.image-section input[type="file"] {
  width: 100%;
  padding: 12px;
  border: 2px dashed #444;
  border-radius: 8px;
  background: #2a2a3e;
  color: #aaa;
  cursor: pointer;
}

.image-preview {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #444;
}

.image-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  background: #2a2a3e;
}

.remove-image {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 12px;
  background: rgba(255, 0, 0, 0.8);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.input-hint {
  margin-top: 16px;
  padding: 10px 12px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 6px;
  color: #ffc107;
  font-size: 12px;
  text-align: center;
}

/* 進度步驟 */
.progress-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  font-size: 14px;
  color: #888;
}

.progress-step.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.15);
}

.progress-step.done {
  color: #2ecc71;
}

.progress-step.error {
  color: #e74c3c;
}

.step-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.processing-status {
  text-align: center;
  color: #667eea;
  font-size: 14px;
  padding: 12px;
}

.error-message {
  padding: 16px;
  background: rgba(231, 76, 60, 0.1);
  border-radius: 8px;
  color: #e74c3c;
  font-size: 14px;
  text-align: center;
}

/* 確認問題區塊 */
.clarification-section {
  padding: 16px;
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 8px;
}

.clarification-question {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.question-icon {
  font-size: 20px;
}

.clarification-question p {
  margin: 0;
  color: #fff;
  line-height: 1.5;
}

.clarification-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.clarification-input textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #444;
  border-radius: 8px;
  background: #2a2a3e;
  color: #fff;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.clarification-input textarea:focus {
  outline: none;
  border-color: #ffc107;
}

.clarification-input .submit-btn {
  align-self: flex-end;
}

/* 結果區塊 */
.result-content {
  margin-top: 8px;
}

.result-summary {
  line-height: 1.6;
  color: #ccc;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 16px;
}

.result-summary strong {
  color: #fff;
}

.result-summary :deep(.list-item) {
  display: block;
  margin: 4px 0;
  padding-left: 8px;
}

.change-list {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
}

.change-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin: 6px 0;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.change-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  font-weight: bold;
  font-size: 14px;
}

.change-add .change-icon {
  background: rgba(46, 204, 113, 0.3);
  color: #2ecc71;
}

.change-remove .change-icon {
  background: rgba(231, 76, 60, 0.3);
  color: #e74c3c;
}

.change-increase .change-icon,
.change-decrease .change-icon,
.change-update .change-icon {
  background: rgba(52, 152, 219, 0.3);
  color: #3498db;
}

.change-category {
  color: #888;
  font-size: 12px;
  min-width: 60px;
}

.change-item {
  color: #fff;
  flex: 1;
}

.result-duration {
  font-size: 12px;
  color: #666;
  text-align: right;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #333;
}

.cancel-btn {
  padding: 10px 20px;
  background: #444;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.cancel-btn:hover {
  background: #555;
}

.submit-btn {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn:not(:disabled):hover {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}
</style>
