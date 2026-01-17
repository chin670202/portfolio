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

const showModal = ref(false)
const updateContent = ref('')
const imageFile = ref(null)
const imagePreview = ref(null)
const submitting = ref(false)
const result = ref(null)
const error = ref(null)

// 從設定檔讀取服務 URL
const serverUrl = updateService.baseUrl
const apiKey = updateService.apiKey

// 功能是否啟用
const isEnabled = features.quickUpdate

const canSubmit = computed(() => {
  return (updateContent.value.trim() || imageFile.value) && serverUrl
})

function openModal() {
  showModal.value = true
  result.value = null
  error.value = null
}

function closeModal() {
  showModal.value = false
  resetForm()
}

function resetForm() {
  updateContent.value = ''
  imageFile.value = null
  imagePreview.value = null
  result.value = null
  error.value = null
}

function handleImageSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    error.value = '請選擇圖片檔案'
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    error.value = '圖片大小不能超過 10MB'
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

async function submitUpdate() {
  if (!canSubmit.value) return

  submitting.value = true
  error.value = null
  result.value = null

  try {
    let type = 'text'
    let content = updateContent.value.trim()

    // 如果有圖片，優先使用圖片
    if (imageFile.value) {
      type = 'image'
      content = imagePreview.value // base64 格式
    }

    const response = await fetch(`${serverUrl}/update`, {
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

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || '更新失敗')
    }

    result.value = data
    emit('updated', data)

  } catch (e) {
    error.value = e.message || '連線失敗，請確認本機服務是否啟動'
  } finally {
    submitting.value = false
  }
}

</script>

<template>
  <div v-if="isEnabled" class="quick-update">
    <!-- 觸發按鈕 -->
    <button class="quick-update-btn" @click="openModal" title="快速更新部位">
      <span class="btn-icon">+</span>
      <span class="btn-text">更新部位</span>
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>快速更新部位</h3>
            <button class="close-btn" @click="closeModal">&times;</button>
          </div>

          <div class="modal-body">
            <!-- 輸入區 -->
            <div class="input-section">
                <label>貼上交易訊息：</label>
                <textarea
                  v-model="updateContent"
                  placeholder="例如：買入 NVDA 10股 @140&#10;或：賣出 00725B 5000股"
                  rows="4"
                  :disabled="submitting"
                ></textarea>
              </div>

              <div class="divider">
                <span>或</span>
              </div>

              <div class="image-section">
                <label>上傳截圖：</label>
                <div v-if="imagePreview" class="image-preview">
                  <img :src="imagePreview" alt="預覽" />
                  <button class="remove-image" @click="removeImage" :disabled="submitting">
                    移除
                  </button>
                </div>
                <input
                  v-else
                  type="file"
                  accept="image/*"
                  @change="handleImageSelect"
                  :disabled="submitting"
                />
              </div>

              <!-- 結果顯示 -->
              <div v-if="result" class="result success">
                <p><strong>更新成功！</strong></p>
                <p>{{ result.message }}</p>
                <ul v-if="result.changes?.length">
                  <li v-for="(change, i) in result.changes" :key="i">
                    {{ change.type === 'add' ? '+' : change.type === 'remove' ? '-' : '~' }}
                    {{ change.category }}: {{ change.item }}
                  </li>
                </ul>
                <a v-if="result.commitUrl" :href="result.commitUrl" target="_blank" class="commit-link">
                  查看 GitHub Commit
                </a>
              </div>

            <div v-if="error" class="result error">
              <p><strong>錯誤：</strong>{{ error }}</p>
            </div>
          </div>

          <div class="modal-footer">
            <button class="cancel-btn" @click="closeModal" :disabled="submitting">
              取消
            </button>
            <button
              class="submit-btn"
              @click="submitUpdate"
              :disabled="!canSubmit || submitting"
            >
              {{ submitting ? '處理中...' : '送出更新' }}
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
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

.result {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.result.success {
  background: rgba(46, 204, 113, 0.15);
  border: 1px solid #2ecc71;
  color: #2ecc71;
}

.result.error {
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid #e74c3c;
  color: #e74c3c;
}

.result ul {
  margin: 8px 0 0;
  padding-left: 20px;
}

.result li {
  margin: 4px 0;
}

.commit-link {
  display: inline-block;
  margin-top: 8px;
  color: #667eea;
  text-decoration: underline;
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
  padding: 10px 20px;
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
