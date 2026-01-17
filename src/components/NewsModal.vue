<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')" @wheel.prevent="handleWheel">
    <div class="modal-content news-modal" @wheel.stop>
      <div class="modal-header">
        <h3>
          {{ title }} - 相關新聞
          <span v-if="totalCount > 1" class="nav-hint">({{ currentIndex + 1 }}/{{ totalCount }} - 滾輪切換)</span>
        </h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="loading" class="news-loading">
          <span class="spinner"></span> 載入新聞中...
        </div>
        <div v-else-if="news.length === 0" class="news-empty">
          最近 7 天內無相關新聞
        </div>
        <ul v-else class="news-list">
          <li v-for="(item, index) in news" :key="index" :class="{ 'negative-news': item.isNegative }">
            <a :href="item.link" target="_blank" rel="noopener noreferrer">
              <span v-if="item.isNegative" class="warning-badge">!</span>
              {{ item.title }}
            </a>
            <span class="news-date">{{ item.pubDate }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  news: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  currentIndex: {
    type: Number,
    default: 0
  },
  totalCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close', 'navigate'])

// 處理滾輪事件：向上滾 = 上一個，向下滾 = 下一個
function handleWheel(event) {
  if (event.deltaY > 0) {
    emit('navigate', 1) // 下一個
  } else if (event.deltaY < 0) {
    emit('navigate', -1) // 上一個
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #4472c4;
  color: white;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.nav-hint {
  font-size: 12px;
  font-weight: normal;
  opacity: 0.8;
  margin-left: 8px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  opacity: 0.8;
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.news-loading {
  text-align: center;
  padding: 30px;
  color: #666;
}

.news-empty {
  text-align: center;
  padding: 30px;
  color: #999;
}

.news-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.news-list li {
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.news-list li:last-child {
  border-bottom: none;
}

.news-list a {
  color: #333;
  text-decoration: none;
  font-size: 15px;
  line-height: 1.4;
}

.news-list a:hover {
  color: #4472c4;
  text-decoration: underline;
}

.news-date {
  font-size: 12px;
  color: #999;
}

.negative-news {
  background: #fff5f5;
  margin: 0 -20px;
  padding-left: 20px !important;
  padding-right: 20px !important;
  border-left: 3px solid #ff6b6b;
}

.negative-news a {
  color: #c62828;
}

.warning-badge {
  display: inline-block;
  background: #ff6b6b;
  color: white;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  line-height: 18px;
  margin-right: 6px;
}
</style>
