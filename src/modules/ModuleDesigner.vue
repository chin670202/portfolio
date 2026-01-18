<script setup>
/**
 * 模組設計器
 * 透過對話式 AI 協助用戶創建自訂儀表模組
 * 僅限於創造/編輯儀表模組，拒絕不相關的請求
 */
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { Teleport } from 'vue'
import { updateService } from '../config'
import CustomModuleRenderer from './CustomModuleRenderer.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    required: true
  },
  editingModule: {
    type: Object,
    default: null
  },
  previewData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'save'])

// 對話相關狀態
const messages = ref([])
const inputMessage = ref('')
const imageFile = ref(null)
const imagePreview = ref(null)
const sending = ref(false)
const messagesContainer = ref(null)

// 模組定義
const moduleSpec = ref(null)
const moduleName = ref('')
const moduleIcon = ref('📊')

// API 設定
const serverUrl = updateService.baseUrl
const apiKey = updateService.apiKey

// 初始化
onMounted(() => {
  if (props.visible) {
    initializeDesigner()
  }
})

// 監聽 visible 變化
watch(() => props.visible, (visible) => {
  if (visible) {
    initializeDesigner()
  }
})

function initializeDesigner() {
  messages.value = [{
    role: 'assistant',
    content: '你好！我是儀表模組設計助手。請描述你想要的儀表模組，例如：\n\n• 「我想要一個顯示每月利息收入的卡片」\n• 「做一個資產分布的圓餅圖」\n• 「顯示即將到期的債券列表」\n\n你也可以上傳設計草圖讓我參考。'
  }]
  moduleSpec.value = null
  moduleName.value = ''
  moduleIcon.value = '📊'
  inputMessage.value = ''
  imageFile.value = null
  imagePreview.value = null

  // 如果是編輯模式
  if (props.editingModule) {
    moduleSpec.value = { ...props.editingModule }
    moduleName.value = props.editingModule.name || ''
    moduleIcon.value = props.editingModule.icon || '📊'
    messages.value.push({
      role: 'assistant',
      content: `正在編輯模組「${moduleName.value}」。請告訴我你想要修改什麼？`
    })
  }
}

// 處理圖片選擇
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

// 送出訊息
async function sendMessage() {
  const text = inputMessage.value.trim()
  const image = imagePreview.value

  if (!text && !image) return

  // 新增用戶訊息
  messages.value.push({
    role: 'user',
    content: text,
    image: image
  })

  // 清空輸入
  inputMessage.value = ''
  imageFile.value = null
  imagePreview.value = null

  // 滾動到底部
  await nextTick()
  scrollToBottom()

  // 呼叫 API
  sending.value = true

  try {
    // 準備請求內容
    const requestBody = {
      user: props.username,
      messages: messages.value.slice(0, -1), // 不含剛加入的用戶訊息
      currentSpec: moduleSpec.value,
      type: image ? 'image' : 'text',
      content: text || '' // 文字內容
    }

    // 如果有圖片，加入圖片資料
    if (image) {
      requestBody.imageData = image
    }

    const response = await fetch(`${serverUrl}/modules/design/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '設計請求失敗')
    }

    // 讀取 SSE 串流
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistantMessage = { role: 'assistant', content: '' }
    messages.value.push(assistantMessage)

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
            handleSSEMessage(data, assistantMessage)
          } catch (e) {
            // 忽略解析錯誤
          }
        }
      }

      // 滾動到底部
      await nextTick()
      scrollToBottom()
    }

  } catch (e) {
    messages.value.push({
      role: 'assistant',
      content: `抱歉，發生錯誤：${e.message}`,
      isError: true
    })
  } finally {
    sending.value = false
    await nextTick()
    scrollToBottom()
  }
}

function handleSSEMessage(data, assistantMessage) {
  switch (data.type) {
    case 'content':
      assistantMessage.content += data.text
      break

    case 'module_spec':
      moduleSpec.value = data.spec
      // AI 自動設定的名稱和圖標
      if (data.spec.name) {
        moduleName.value = data.spec.name
      }
      if (data.spec.icon) {
        moduleIcon.value = data.spec.icon
      }
      break

    case 'rejected':
      assistantMessage.content = data.message
      assistantMessage.isRejected = true
      break

    case 'error':
      assistantMessage.content = `錯誤：${data.message}`
      assistantMessage.isError = true
      break

    case 'done':
      console.log('設計完成:', data.success)
      break
  }
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 按 Enter 送出
function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

// 儲存模組
async function saveModule() {
  if (!moduleSpec.value || !moduleSpec.value.name) {
    alert('請先完成模組設計')
    return
  }

  const isEditing = !!props.editingModule
  const existingUid = props.editingModule?.uid

  const finalSpec = {
    ...moduleSpec.value,
    uid: existingUid || moduleSpec.value.uid || `custom-${Date.now()}`,
    name: moduleName.value || moduleSpec.value.name,
    icon: moduleIcon.value || moduleSpec.value.icon || '📊',
    author: props.username,
    isCustom: true,
    type: 'custom',
    createdAt: props.editingModule?.createdAt || moduleSpec.value.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  try {
    let response

    if (isEditing && existingUid) {
      // 編輯模式：使用 PUT 更新
      response = await fetch(`${serverUrl}/api/modules/users/${props.username}/${existingUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(finalSpec)
      })
    } else {
      // 新建模式：使用 POST 建立
      response = await fetch(`${serverUrl}/api/modules/users/${props.username}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(finalSpec)
      })
    }

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '儲存失敗')
    }

    const result = await response.json()
    emit('save', result.module || finalSpec)
    emit('close')
  } catch (e) {
    alert(`儲存失敗：${e.message}`)
  }
}

// 清除對話
function clearConversation() {
  if (confirm('確定要清除對話並重新開始嗎？')) {
    initializeDesigner()
  }
}

// 關閉
function close() {
  emit('close')
}

// 是否可以儲存（AI 會自動設定名稱）
const canSave = computed(() => {
  return moduleSpec.value && moduleSpec.value.name
})

// 是否為編輯模式
const isEditMode = computed(() => !!props.editingModule)

// 標題文字
const titleText = computed(() => {
  return isEditMode.value ? '編輯儀表模組' : '設計我的儀表模組'
})

// 儲存按鈕文字
const saveButtonText = computed(() => {
  return isEditMode.value ? '儲存變更' : '儲存模組'
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="designer-overlay" @click.self="close">
      <div class="designer-modal">
        <!-- 標題列 -->
        <div class="designer-header">
          <div class="header-title">
            <span class="title-icon">{{ isEditMode ? '✏️' : '✨' }}</span>
            <h2>{{ titleText }}</h2>
          </div>
          <div class="header-actions">
            <button class="btn-clear" @click="clearConversation" title="重新開始">
              🔄 重新開始
            </button>
            <button class="close-btn" @click="close">&times;</button>
          </div>
        </div>

        <!-- 主要內容區 -->
        <div class="designer-content">
          <!-- 左側：對話區域 -->
          <div class="chat-panel">
            <div class="messages-container" ref="messagesContainer">
              <div
                v-for="(msg, idx) in messages"
                :key="idx"
                class="message"
                :class="[msg.role, { error: msg.isError, rejected: msg.isRejected }]"
              >
                <div class="message-avatar">
                  {{ msg.role === 'user' ? '👤' : '🤖' }}
                </div>
                <div class="message-content">
                  <div v-if="msg.image" class="message-image">
                    <img :src="msg.image" alt="上傳的圖片" />
                  </div>
                  <div class="message-text" v-html="formatMessage(msg.content)"></div>
                </div>
              </div>

              <!-- 載入中 -->
              <div v-if="sending" class="message assistant loading">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                  <div class="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 輸入區 -->
            <div class="input-area">
              <!-- 圖片預覽 -->
              <div v-if="imagePreview" class="image-preview-mini">
                <img :src="imagePreview" alt="預覽" />
                <button class="remove-image" @click="removeImage">&times;</button>
              </div>

              <div class="input-row">
                <label class="upload-btn" title="上傳圖片">
                  <input
                    type="file"
                    accept="image/*"
                    @change="handleImageSelect"
                    hidden
                  />
                  📎
                </label>
                <textarea
                  v-model="inputMessage"
                  placeholder="描述你想要的模組..."
                  @keydown="handleKeydown"
                  :disabled="sending"
                  rows="1"
                ></textarea>
                <button
                  class="send-btn"
                  @click="sendMessage"
                  :disabled="sending || (!inputMessage.trim() && !imagePreview)"
                >
                  ➤
                </button>
              </div>
            </div>
          </div>

          <!-- 右側：預覽區域 -->
          <div class="preview-panel">
            <div class="preview-header">
              <h3>即時預覽</h3>
            </div>

            <div class="preview-content">
              <div v-if="!moduleSpec" class="preview-empty">
                <span class="empty-icon">📋</span>
                <p>開始對話後，模組預覽會顯示在這裡</p>
              </div>

              <div v-else class="preview-module">
                <div v-if="!previewData || Object.keys(previewData).length === 0" class="preview-loading">
                  <span>⏳</span>
                  <p>載入預覽資料中...</p>
                </div>
                <CustomModuleRenderer
                  v-else
                  :spec="moduleSpec"
                  :data="previewData"
                />
              </div>
            </div>

            <!-- 模組資訊（AI 自動設定） -->
            <div v-if="moduleSpec" class="module-info">
              <div class="info-row">
                <span class="info-icon">{{ moduleIcon }}</span>
                <span class="info-name">{{ moduleName || '未命名模組' }}</span>
              </div>
              <p v-if="moduleSpec.description" class="info-desc">{{ moduleSpec.description }}</p>
            </div>

            <!-- 底部按鈕 -->
            <div class="preview-footer">
              <button class="btn-cancel" @click="close">取消</button>
              <button
                class="btn-save"
                :disabled="!canSave"
                @click="saveModule"
              >
                {{ saveButtonText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
// 格式化訊息（處理換行）
function formatMessage(text) {
  if (!text) return ''
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
</script>

<style scoped>
.designer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.designer-modal {
  background: #1e1e2e;
  border-radius: 16px;
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  max-height: 800px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.designer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #2a2a3e;
  background: linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 24px;
}

.header-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-clear {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #3a3a4e;
  border-radius: 6px;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover {
  background: #2a2a3e;
  color: #fff;
  border-color: #4a4a5e;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #fff;
}

.designer-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 對話區域 */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2a2a3e;
  min-width: 0;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  max-width: 90%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #3a3a4e;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: #9c27b0;
}

.message-content {
  padding: 12px 16px;
  border-radius: 16px;
  background: #2a2a3e;
  max-width: 100%;
}

.message.user .message-content {
  background: #9c27b0;
  border-radius: 16px 16px 4px 16px;
}

.message.assistant .message-content {
  border-radius: 16px 16px 16px 4px;
}

.message.error .message-content,
.message.rejected .message-content {
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.4);
}

.message-image {
  margin-bottom: 8px;
}

.message-image img {
  max-width: 200px;
  max-height: 150px;
  border-radius: 8px;
}

.message-text {
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

/* 載入動畫 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-4px); }
}

/* 輸入區 */
.input-area {
  padding: 16px;
  border-top: 1px solid #2a2a3e;
  background: #252535;
}

.image-preview-mini {
  position: relative;
  display: inline-block;
  margin-bottom: 8px;
}

.image-preview-mini img {
  max-width: 100px;
  max-height: 60px;
  border-radius: 6px;
}

.image-preview-mini .remove-image {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  background: #e74c3c;
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.upload-btn {
  width: 40px;
  height: 40px;
  background: #3a3a4e;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: background 0.2s;
}

.upload-btn:hover {
  background: #4a4a5e;
}

.input-row textarea {
  flex: 1;
  padding: 10px 14px;
  background: #2a2a3e;
  border: 1px solid #3a3a4e;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  resize: none;
  min-height: 40px;
  max-height: 120px;
  font-family: inherit;
}

.input-row textarea:focus {
  outline: none;
  border-color: #9c27b0;
}

.send-btn {
  width: 40px;
  height: 40px;
  background: #9c27b0;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: #7b1fa2;
}

.send-btn:disabled {
  background: #3a3a4e;
  color: #666;
  cursor: not-allowed;
}

/* 預覽區域 */
.preview-panel {
  width: 400px;
  display: flex;
  flex-direction: column;
  background: #252535;
}

.preview-header {
  padding: 16px 20px;
  border-bottom: 1px solid #2a2a3e;
}

.preview-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #888;
}

.preview-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.preview-empty p {
  margin: 0;
  font-size: 14px;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #888;
}

.preview-loading span {
  font-size: 32px;
  margin-bottom: 12px;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.preview-loading p {
  margin: 0;
  font-size: 14px;
}

.preview-module {
  background: #1e1e2e;
  border-radius: 12px;
  padding: 16px;
  min-height: 350px;
}

/* 模組資訊（AI 自動設定） */
.module-info {
  padding: 16px 20px;
  border-top: 1px solid #2a2a3e;
  background: rgba(156, 39, 176, 0.1);
}

.info-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-icon {
  font-size: 28px;
}

.info-name {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.info-desc {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #888;
}

/* 底部按鈕 */
.preview-footer {
  padding: 16px 20px;
  border-top: 1px solid #2a2a3e;
  display: flex;
  gap: 12px;
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #3a3a4e;
  border: none;
  color: #fff;
}

.btn-cancel:hover {
  background: #4a4a5e;
}

.btn-save {
  background: #9c27b0;
  border: none;
  color: #fff;
}

.btn-save:hover:not(:disabled) {
  background: #7b1fa2;
}

.btn-save:disabled {
  background: #3a3a4e;
  color: #666;
  cursor: not-allowed;
}

/* 響應式 */
@media (max-width: 900px) {
  .designer-content {
    flex-direction: column;
  }

  .chat-panel {
    border-right: none;
    border-bottom: 1px solid #2a2a3e;
    height: 50%;
  }

  .preview-panel {
    width: 100%;
    height: 50%;
  }
}

@media (max-width: 600px) {
  .designer-modal {
    height: 100vh;
    max-height: none;
    border-radius: 0;
  }

  .preview-panel {
    display: none;
  }

  .chat-panel {
    height: 100%;
    border-bottom: none;
  }
}
</style>
