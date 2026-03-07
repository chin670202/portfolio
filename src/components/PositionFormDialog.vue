<script setup>
import { ref, watch, computed } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-vue-next'
import { applyAdjust } from '@/services/tradeApi'
import { toast } from 'vue-sonner'
import { formatNumber, formatDecimal, formatPercent } from '@/utils/format'

const props = defineProps({
  open: { type: Boolean, default: false },
  username: { type: String, required: true },
  mode: { type: String, default: 'add' }, // 'view' | 'add' | 'edit' | 'delete'
  position: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const internalMode = ref('view')

const form = ref({
  symbol: '',
  name: '',
  quantity: '',
  avgPrice: '',
})

const dialogTitle = computed(() => {
  if (internalMode.value === 'add') return '新增持倉'
  if (internalMode.value === 'edit') return '編輯持倉'
  if (internalMode.value === 'delete') return '刪除持倉'
  return '持倉明細'
})

const positionLabel = computed(() => {
  if (!props.position) return ''
  return props.position.名稱
    ? `${props.position.名稱} (${props.position.代號})`
    : props.position.代號
})

watch(() => props.open, (val) => {
  if (!val) return
  internalMode.value = props.mode
  if (props.mode === 'add') {
    form.value = { symbol: '', name: '', quantity: '', avgPrice: '' }
  } else if (props.position) {
    form.value = {
      symbol: props.position.代號 || '',
      name: props.position.名稱 || '',
      quantity: String(props.position.持有單位 || props.position.股數 || ''),
      avgPrice: String(props.position.買入均價 || ''),
    }
  }
})

function switchToEdit() {
  internalMode.value = 'edit'
}

function switchToDelete() {
  internalMode.value = 'delete'
}

function switchToView() {
  internalMode.value = 'view'
  if (props.position) {
    form.value = {
      symbol: props.position.代號 || '',
      name: props.position.名稱 || '',
      quantity: String(props.position.持有單位 || props.position.股數 || ''),
      avgPrice: String(props.position.買入均價 || ''),
    }
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    if (internalMode.value === 'add') {
      if (!form.value.symbol.trim()) {
        toast.error('請輸入代號')
        return
      }
      if (!form.value.quantity || Number(form.value.quantity) <= 0) {
        toast.error('請輸入有效數量')
        return
      }
      await applyAdjust(props.username, {
        type: 'adjust',
        action: 'set',
        symbol: form.value.symbol.trim().toUpperCase(),
        name: form.value.name.trim() || null,
        quantity: Number(form.value.quantity),
        avgPrice: form.value.avgPrice ? Number(form.value.avgPrice) : null,
      })
      toast.success('持倉新增成功')
    } else if (internalMode.value === 'edit') {
      if (!form.value.quantity || Number(form.value.quantity) <= 0) {
        toast.error('請輸入有效數量')
        return
      }
      await applyAdjust(props.username, {
        type: 'adjust',
        action: 'set',
        symbol: props.position.代號,
        name: form.value.name.trim() || null,
        quantity: Number(form.value.quantity),
        avgPrice: form.value.avgPrice ? Number(form.value.avgPrice) : null,
      })
      toast.success('持倉修改成功')
    } else if (internalMode.value === 'delete') {
      await applyAdjust(props.username, {
        type: 'adjust',
        action: 'remove',
        symbol: props.position.代號,
      })
      toast.success('持倉已刪除')
    }
    emit('close')
    emit('saved')
  } catch (err) {
    toast.error(err.message || '操作失敗')
  } finally {
    saving.value = false
  }
}

function handleOpenChange(val) {
  if (!val) emit('close')
}

function getColorClass(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return ''
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>

      <!-- View mode: detail display -->
      <div v-if="internalMode === 'view' && position" class="space-y-3 py-2">
        <!-- Name + Symbol header -->
        <div class="text-center pb-2 border-b border-[var(--border)]">
          <div class="text-lg font-bold">{{ position.名稱 }}</div>
          <div class="text-sm text-[var(--muted-foreground)]">{{ position.代號 }}</div>
        </div>

        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">買入均價</span>
            <span class="detail-value">{{ formatDecimal(position.買入均價) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">持有數量</span>
            <span class="detail-value">{{ formatNumber(position.持有單位 || position.股數) }}</span>
          </div>
          <div v-if="position.最新價格" class="detail-row">
            <span class="detail-label">最新價格</span>
            <span class="detail-value">{{ formatDecimal(position.最新價格) }}</span>
          </div>
          <div v-if="position.台幣資產" class="detail-row">
            <span class="detail-label">市值</span>
            <span class="detail-value font-semibold">{{ formatNumber(position.台幣資產) }}</span>
          </div>
          <div v-if="position.台幣損益 != null" class="detail-row">
            <span class="detail-label">損益</span>
            <span class="detail-value" :class="getColorClass(position.台幣損益)">
              {{ formatNumber(position.台幣損益) }}
              <span v-if="position.損益百分比 != null" class="text-sm">
                ({{ formatPercent(position.損益百分比) }})
              </span>
            </span>
          </div>
          <div v-if="position.每股配息" class="detail-row">
            <span class="detail-label">每股配息</span>
            <span class="detail-value">{{ formatDecimal(position.每股配息) }}</span>
          </div>
          <div v-if="position.每年利息 || position.每年配息" class="detail-row">
            <span class="detail-label">每年配息</span>
            <span class="detail-value calculated-text">{{ formatNumber(position.每年利息 || position.每年配息) }}</span>
          </div>
          <div v-if="position.年殖利率" class="detail-row">
            <span class="detail-label">殖利率</span>
            <span class="detail-value">{{ formatPercent(position.年殖利率) }}</span>
          </div>
          <div v-if="position.下次配息日" class="detail-row">
            <span class="detail-label">下次配息日</span>
            <span class="detail-value">{{ position.下次配息日 }}</span>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <Button variant="outline" class="flex-1" @click="switchToEdit">編輯</Button>
          <Button variant="destructive" class="flex-1" @click="switchToDelete">刪除</Button>
        </div>
      </div>

      <!-- Delete confirmation -->
      <div v-else-if="internalMode === 'delete'" class="py-4 space-y-3">
        <p class="text-base">確定要刪除「<strong>{{ positionLabel }}</strong>」的全部持倉嗎？</p>
        <p class="text-sm text-[var(--muted-foreground)]">此操作無法復原（但可從備份還原）</p>
        <div class="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          若為賣出，建議透過「交易紀錄」記錄，以便統計損益
        </div>
      </div>

      <!-- Add / Edit form -->
      <div v-else-if="internalMode === 'add' || internalMode === 'edit'" class="space-y-4 py-2">
        <div class="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          建議透過「交易紀錄」頁面記錄買賣，系統會自動同步持倉並統計損益
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>代號</Label>
            <Input
              v-model="form.symbol"
              placeholder="如：2330、AAPL"
              :disabled="internalMode === 'edit'"
            />
          </div>
          <div class="space-y-2">
            <Label>名稱</Label>
            <Input v-model="form.name" placeholder="如：台積電" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>持有數量</Label>
            <Input v-model="form.quantity" type="number" placeholder="0" />
          </div>
          <div class="space-y-2">
            <Label>買入均價</Label>
            <Input v-model="form.avgPrice" type="number" step="0.01" placeholder="0" />
          </div>
        </div>
      </div>

      <!-- Footer: depends on mode -->
      <DialogFooter v-if="internalMode !== 'view'">
        <Button variant="outline" @click="internalMode === 'add' ? emit('close') : switchToView()" :disabled="saving">
          {{ internalMode === 'add' ? '取消' : '返回' }}
        </Button>
        <Button
          :variant="internalMode === 'delete' ? 'destructive' : 'default'"
          @click="handleSubmit"
          :disabled="saving"
        >
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
          {{ saving ? '處理中...' : internalMode === 'delete' ? '確認刪除' : internalMode === 'edit' ? '儲存' : '新增' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--muted-foreground);
  font-size: 14px;
  flex-shrink: 0;
}

.detail-value {
  text-align: right;
  font-size: 15px;
}

.calculated-text {
  color: var(--muted-foreground);
  font-style: italic;
}

.positive {
  color: #16a34a;
}

.negative {
  color: #dc2626;
}
</style>
