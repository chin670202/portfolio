<script setup>
import { defineProps, computed, ref, onMounted, onUnmounted } from 'vue'
import { useResponsive } from '../composables/useResponsive'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'

const { isMobile } = useResponsive()

const showTooltip = ref(false)
function toggleTooltip() {
  showTooltip.value = !showTooltip.value
}
function closeTooltip() {
  showTooltip.value = false
}
onMounted(() => document.addEventListener('click', closeTooltip))
onUnmounted(() => document.removeEventListener('click', closeTooltip))

const emit = defineEmits(['delete-record'])

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  columnConfig: {
    type: Array,
    default: () => []
  }
})

// 刪除確認 Dialog
const deleteDialog = ref({ open: false, record: null })
const deleting = ref(false)

function openDeleteDialog(record) {
  deleteDialog.value = { open: true, record }
}

function closeDeleteDialog() {
  deleteDialog.value = { open: false, record: null }
}

async function handleConfirmDelete() {
  const date = deleteDialog.value.record?.記錄時間
  if (!date) return
  closeDeleteDialog()
  emit('delete-record', date)
}

// 欄位定義（移除原始整數欄位，只保留萬元欄位，更精簡）
const columnDefinitions = {
  recordTime: { label: '日期', defaultOrder: 1 },
  usdRate: { label: '匯率', defaultOrder: 2 },
  debtWan: { label: '負債', defaultOrder: 3 },
  currentPositionWan: { label: '資產(當時匯率)', defaultOrder: 4 },
  currentNetWan: { label: '淨值(當時匯率)', defaultOrder: 5 },
  normalizedPositionWan: { label: '資產 (匯率30)', defaultOrder: 6 },
  normalizedNetWan: { label: '淨值 (匯率30)', defaultOrder: 7 },
  posPar31Wan: { label: '資產 (面額@31)', defaultOrder: 8 },
  netPar31Wan: { label: '淨值 (面額@31)', defaultOrder: 9 }
}

// 各欄位的計算公式（標題列 mouseover 顯示）
const columnFormulas = {
  recordTime: `快照記錄日期。每月只保留通過資料健檢的最後一列。`,
  usdRate: `快照當下抓取的美元兌台幣匯率，是其餘欄位的換匯基準。`,
  debtWan: `負債 = Σ 各筆貸款餘額
台幣計價，不做匯率換算。`,
  currentPositionWan: `資產(當時匯率) = Σ(債券價 × 單位 × 當時匯率) + Σ(ETF價 × 單位) + Σ(其它資產)
美元資產用當時匯率換算，台幣資產照原值。`,
  currentNetWan: `淨值(當時匯率) = 資產(當時匯率) − 負債`,
  normalizedPositionWan: `資產(匯率30) = 同上，但美元資產一律用匯率 30 換算
排除匯率波動，看資產是否實質成長。`,
  normalizedNetWan: `淨值(匯率30) = 資產(匯率30) − 負債`,
  posPar31Wan: `資產(面額@31) = 台幣資產 + (債券面額USD + 其它資產USD) × 31
債券用面額而非市價、匯率固定 31，同時剝掉行情與匯率兩層雜訊。`,
  netPar31Wan: `淨值(面額@31) = 資產(面額@31) − 負債
負債為台幣計價，不做匯率換算。`
}

const allColumnKeys = Object.keys(columnDefinitions)

// 排序後的可見欄位
const sortedVisibleColumns = computed(() => {
  if (!props.columnConfig || props.columnConfig.length === 0) {
    return allColumnKeys.map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: columnDefinitions[key].defaultOrder
    })).sort((a, b) => a.order - b.order)
  }

  const configMap = {}
  props.columnConfig.forEach(col => {
    configMap[col.key] = col
  })

  return allColumnKeys
    .filter(key => {
      const config = configMap[key]
      return config ? config.visible !== false : true
    })
    .map(key => ({
      key,
      label: columnDefinitions[key].label,
      order: configMap[key]?.order ?? columnDefinitions[key].defaultOrder
    }))
    .sort((a, b) => a.order - b.order)
})

// 手機版：日期+匯率合併、資產+負債合併
const mobileColumns = computed(() =>
  sortedVisibleColumns.value.filter(col => col.key !== 'usdRate' && col.key !== 'debtWan')
)

const numericCols = ['currentPositionWan', 'debtWan', 'currentNetWan', 'normalizedPositionWan', 'normalizedNetWan', 'posPar31Wan', 'netPar31Wan']

// 債券計價基準：actual = 快照當下由實際持倉算出；backfilled = 由已驗證的持倉回填；
// unknown = 當時沒留下持倉明細，無法得知（不臆測）
const basisNote = {
  actual: '實際記錄',
  derived: '由匯率30欄位分解推得（面額列已驗證，誤差 <0.3%）',
  backfilled: '回填：該區間持倉經比對未變動',
  unknown: '當時未記錄持倉明細，無法回推'
}
const getBasis = (record) => record.債券數據來源 || 'unknown'

// 取得儲存格樣式
const bondCols = ['posPar31Wan', 'netPar31Wan']

const getCellClass = (key, record) => {
  const classes = []
  if (numericCols.includes(key)) classes.push('col-num')
  if (bondCols.includes(key)) classes.push('basis-' + getBasis(record))
  if (key === 'usdRate') classes.push('col-num')

  // 資產淨值顏色
  if (key === 'currentNetWan') {
    const val = parseFloat(record.當時匯率資產總和萬)
    if (val > 0) classes.push('positive')
    if (val < 0) classes.push('negative')
  }
  if (key === 'normalizedNetWan') {
    const val = parseFloat(record.還原匯率30資產總額萬)
    if (val > 0) classes.push('positive')
    if (val < 0) classes.push('negative')
  }
  if (key === 'netPar31Wan') {
    const val = parseFloat(record.淨值面額匯率31萬)
    if (val > 0) classes.push('positive')
    if (val < 0) classes.push('negative')
  }

  return classes.join(' ')
}

// 取得表頭樣式
const getHeaderClass = (key) => {
  if (numericCols.includes(key) || key === 'usdRate') return 'col-num'
  return ''
}

// 取得儲存格值
const getCellValue = (key, record) => {
  switch (key) {
    case 'recordTime': return record.記錄時間
    case 'usdRate': return record.美元匯率
    case 'currentPositionWan': return formatWan(record.當時匯率部位總額萬)
    case 'debtWan': return formatWan(record.台幣負債總額萬)
    case 'currentNetWan': return formatWan(record.當時匯率資產總和萬)
    case 'normalizedPositionWan': return formatWan(record.還原匯率30部位總額萬)
    case 'normalizedNetWan': return formatWan(record.還原匯率30資產總額萬)
    case 'posPar31Wan': return formatWan(record.資產面額匯率31萬)
    case 'netPar31Wan': return formatWan(record.淨值面額匯率31萬)
    default: return ''
  }
}

// 債券欄位滑過去顯示這筆的計價基準，避免把回填值誤當實際記錄
const getCellTitle = (key, record) =>
  bondCols.includes(key) ? basisNote[getBasis(record)] : undefined

// 萬元數字加千分位
function formatWan(val) {
  if (val == null) return '--'
  const n = parseInt(val)
  if (isNaN(n)) return val
  return n.toLocaleString()
}
</script>

<template>
  <!-- 桌面版 -->
  <table v-if="records && records.length > 0 && !isMobile" class="history-table">
    <thead>
      <tr class="section-header">
        <th :colspan="sortedVisibleColumns.length + 1">資產變化記錄<span class="unit-note">單位：萬元</span></th>
      </tr>
      <tr>
        <th v-for="(col, ci) in sortedVisibleColumns" :key="col.key"
            :class="[getHeaderClass(col.key), 'th-formula']"
            :title="columnFormulas[col.key]">
          {{ col.label }}
          <span class="formula-tip" :class="{ 'tip-right': ci >= sortedVisibleColumns.length - 2 }">{{ columnFormulas[col.key] }}</span>
        </th>
        <th class="col-action"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(record, index) in records" :key="index">
        <td v-for="col in sortedVisibleColumns" :key="col.key" :class="getCellClass(col.key, record)" :title="getCellTitle(col.key, record)">
          {{ getCellValue(col.key, record) }}
        </td>
        <td class="col-action">
          <button class="btn-delete" @click="openDeleteDialog(record)" title="刪除此筆記錄">✕</button>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 手機版：日期+匯率合併 -->
  <table v-else-if="records && records.length > 0" class="history-table mobile-history-table">
    <thead>
      <tr class="section-header">
        <th :colspan="mobileColumns.length + 1">資產變化記錄<span class="unit-note">單位：萬元</span></th>
      </tr>
      <tr>
        <th v-for="col in mobileColumns" :key="col.key" :class="getHeaderClass(col.key)" :title="columnFormulas[col.key]">
          <template v-if="col.key === 'recordTime'">
            <div>日期</div><div class="sub-line">匯率</div>
          </template>
          <template v-else-if="col.key === 'currentPositionWan'">
            <div>資產</div><div class="sub-line">負債</div>
          </template>
          <template v-else-if="col.key === 'normalizedPositionWan'">
            <div>資產 <span class="tooltip-trigger" @click.stop="toggleTooltip">?<span v-show="showTooltip" class="tooltip-text">模擬美元匯率固定 30 元，排除匯率波動，觀察資產是否實質成長</span></span></div><div class="sub-line">匯率30</div>
          </template>
          <template v-else-if="col.key === 'normalizedNetWan'">
            <div>淨值</div><div class="sub-line">匯率30</div>
          </template>
          <template v-else>{{ col.label }}</template>
        </th>
        <th class="col-action"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(record, index) in records" :key="index">
        <td v-for="col in mobileColumns" :key="col.key" :class="getCellClass(col.key, record)">
          <template v-if="col.key === 'recordTime'">
            <div>{{ record.記錄時間 }}</div>
            <div class="sub-line">{{ record.美元匯率 }}</div>
          </template>
          <template v-else-if="col.key === 'currentPositionWan'">
            <div>{{ getCellValue('currentPositionWan', record) }}</div>
            <div class="sub-line">{{ getCellValue('debtWan', record) }}</div>
          </template>
          <template v-else>
            {{ getCellValue(col.key, record) }}
          </template>
        </td>
        <td class="col-action">
          <button class="btn-delete" @click="openDeleteDialog(record)" title="刪除此筆記錄">✕</button>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 刪除確認 Dialog -->
  <Dialog :open="deleteDialog.open" @update:open="(v) => { if (!v) closeDeleteDialog() }">
    <DialogContent class="max-w-sm">
      <DialogHeader>
        <DialogTitle>刪除資產快照</DialogTitle>
      </DialogHeader>
      <div class="py-4 space-y-3">
        <p class="text-base">確定要刪除「<strong>{{ deleteDialog.record?.記錄時間 }}</strong>」的資產快照嗎？</p>
        <p class="text-sm text-[var(--muted-foreground)]">此操作無法復原（但可從備份還原）</p>
      </div>
      <DialogFooter>
        <Button variant="outline" @click="closeDeleteDialog" :disabled="deleting">取消</Button>
        <Button variant="destructive" @click="handleConfirmDelete" :disabled="deleting">
          {{ deleting ? '刪除中...' : '確認刪除' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.history-table {
  width: 100% !important;
  table-layout: fixed;
}

.history-table td,
.history-table th {
  white-space: normal;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 表頭要放行 overflow，否則公式提示會被裁掉 */
.history-table thead th {
  overflow: visible;
}

.th-formula {
  position: relative;
  cursor: help;
}

.formula-tip {
  display: none;
  position: absolute;
  top: 130%;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  max-width: 300px;
  white-space: pre-line;   /* 讓公式裡的換行生效 */
  text-align: left;
  background: #333;
  color: #fff;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.5;
  padding: 8px 10px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  z-index: 20;
  pointer-events: none;
}

/* 最右兩欄改靠右對齊，避免超出表格 */
.formula-tip.tip-right {
  left: auto;
  right: 0;
  transform: none;
}

.th-formula:hover > .formula-tip {
  display: block;
}

.col-num {
  text-align: right !important;
}

/* 回填值：用虛線底線標示，不動 color —— 讓淨值的正負字色仍能顯示 */
.basis-backfilled {
  border-bottom: 1px dotted currentColor;
  opacity: 0.75;
  cursor: help;
}
.basis-unknown {
  opacity: 0.35;
  cursor: help;
}

.unit-note {
  font-size: 0.75em;
  font-weight: 400;
  opacity: 0.7;
  margin-left: 8px;
}

.mobile-history-table {
  width: 100% !important;
}

.sub-line {
  font-size: 0.8em;
  opacity: 0.6;
}

.tooltip-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 10px;
  font-weight: 600;
  color: #999;
  border: 1px solid #ccc;
  border-radius: 50%;
  cursor: help;
  position: relative;
  vertical-align: middle;
  margin-left: 2px;
}

.tooltip-trigger .tooltip-text {
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: #fff;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.4;
  padding: 6px 10px;
  border-radius: 6px;
  white-space: nowrap;
  z-index: 10;
}

.col-action {
  width: 36px;
  text-align: center !important;
}

.btn-delete {
  background: none;
  border: none;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.2s;
}
.btn-delete:hover {
  color: #e53e3e;
}
</style>
