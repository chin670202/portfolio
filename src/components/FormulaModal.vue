<template>
  <div v-if="visible" class="modal-overlay" @click="close">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="formula-section">
          <div class="formula-label">計算公式</div>
          <div class="formula-box">{{ formula }}</div>
        </div>
        <div class="values-section">
          <div class="formula-label">數值來源</div>
          <table class="values-table">
            <tbody>
              <tr v-for="(item, index) in values" :key="index">
                <td class="value-name">{{ item.name }}</td>
                <td class="value-number">{{ item.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="result-section">
          <div class="formula-label">計算結果</div>
          <div class="result-box">
            <span class="result-formula">{{ resultFormula }}</span>
            <span class="result-value">= {{ result }}</span>
          </div>
        </div>
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
  formula: {
    type: String,
    default: ''
  },
  values: {
    type: Array,
    default: () => []
  },
  resultFormula: {
    type: String,
    default: ''
  },
  result: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close'])

function close() {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  overflow: hidden;
}

.modal-header {
  background: #4472c4;
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
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
}

.formula-section,
.values-section,
.result-section {
  margin-bottom: 20px;
}

.formula-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  font-weight: bold;
}

.formula-box {
  background: #f5f5f5;
  padding: 12px 15px;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #333;
  border-left: 4px solid #4472c4;
}

.values-table {
  width: 100%;
  border-collapse: collapse;
}

.values-table td {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}

.value-name {
  color: #666;
  font-size: 13px;
}

.value-number {
  text-align: right;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #0066cc;
  font-weight: bold;
}

.result-section {
  margin-bottom: 0;
}

.result-box {
  background: linear-gradient(135deg, #90ee90 0%, #7ddc7d 100%);
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.result-formula {
  display: block;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #333;
  margin-bottom: 5px;
}

.result-value {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: #006600;
}
</style>
