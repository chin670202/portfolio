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
  mode: { type: String, default: 'add' },
  bond: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const internalMode = ref('view')

const form = ref({
  symbol: '',
  companyName: '',
  buyPrice: '',
  units: '',
  couponRate: '',
  paymentDate: '',
  tradeDate: '',
  maturityDate: '',
  pledgeUnits: '',
})

const dialogTitle = computed(() => {
  if (internalMode.value === 'add') return '新增債券'
  if (internalMode.value === 'edit') return '編輯債券'
  if (internalMode.value === 'delete') return '刪除債券'
  return '債券明細'
})

const bondLabel = computed(() => {
  if (!props.bond) return ''
  return props.bond.公司名稱
    ? `${props.bond.公司名稱} (${props.bond.代號})`
    : props.bond.代號
})

function resetForm() {
  if (props.bond) {
    form.value = {
      symbol: props.bond.代號 || '',
      companyName: props.bond.公司名稱 || '',
      buyPrice: props.bond.買入價格 != null ? String(props.bond.買入價格) : '',
      units: String(props.bond.持有單位 || ''),
      couponRate: props.bond.票面利率 != null ? String(props.bond.票面利率) : '',
      paymentDate: props.bond.配息日 || '',
      tradeDate: props.bond.交易日 || '',
      maturityDate: props.bond.到期日 || '',
      pledgeUnits: props.bond.質押單位 != null ? String(props.bond.質押單位) : '',
    }
  }
}

watch(() => props.open, (val) => {
  if (!val) return
  internalMode.value = props.mode
  if (props.mode === 'add') {
    form.value = {
      symbol: '', companyName: '', buyPrice: '', units: '',
      couponRate: '', paymentDate: '', tradeDate: '', maturityDate: '', pledgeUnits: '',
    }
  } else {
    resetForm()
  }
})

function switchToEdit() { internalMode.value = 'edit' }
function switchToDelete() { internalMode.value = 'delete' }
function switchToView() {
  internalMode.value = 'view'
  resetForm()
}

async function handleSubmit() {
  saving.value = true
  try {
    if (internalMode.value === 'add') {
      if (!form.value.symbol.trim()) {
        toast.error('請輸入代號')
        return
      }
      if (!form.value.units || Number(form.value.units) <= 0) {
        toast.error('請輸入有效數量')
        return
      }
      await applyAdjust(props.username, {
        type: 'adjust',
        action: 'set',
        symbol: form.value.symbol.trim().toUpperCase(),
        companyName: form.value.companyName.trim() || null,
        quantity: Number(form.value.units),
        buyPrice: form.value.buyPrice ? Number(form.value.buyPrice) : null,
        couponRate: form.value.couponRate ? Number(form.value.couponRate) : null,
        paymentDate: form.value.paymentDate.trim() || null,
        tradeDate: form.value.tradeDate.trim() || null,
        maturityDate: form.value.maturityDate.trim() || null,
      })
      toast.success('債券新增成功')
    } else if (internalMode.value === 'edit') {
      if (!form.value.units || Number(form.value.units) <= 0) {
        toast.error('請輸入有效數量')
        return
      }
      await applyAdjust(props.username, {
        type: 'adjust',
        action: 'set',
        symbol: props.bond.代號,
        companyName: form.value.companyName.trim() || null,
        quantity: Number(form.value.units),
        buyPrice: form.value.buyPrice ? Number(form.value.buyPrice) : null,
        couponRate: form.value.couponRate ? Number(form.value.couponRate) : null,
        paymentDate: form.value.paymentDate.trim() || null,
        tradeDate: form.value.tradeDate.trim() || null,
        maturityDate: form.value.maturityDate.trim() || null,
        pledgeUnits: form.value.pledgeUnits ? Number(form.value.pledgeUnits) : null,
      })
      toast.success('債券修改成功')
    } else if (internalMode.value === 'delete') {
      await applyAdjust(props.username, {
        type: 'adjust',
        action: 'remove',
        symbol: props.bond.代號,
      })
      toast.success('債券已刪除')
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

function getRemainingYears(maturityDate) {
  if (!maturityDate) return '--'
  const [year, month, day] = maturityDate.split('/').map(Number)
  const maturity = new Date(year, month - 1, day)
  const today = new Date()
  const diffMs = maturity - today
  const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25)
  return diffYears > 0 ? diffYears.toFixed(1) + ' 年' : '已到期'
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>

      <!-- View mode -->
      <div v-if="internalMode === 'view' && bond" class="space-y-3 py-2">
        <div class="text-center pb-2 border-b border-[var(--border)]">
          <div class="text-lg font-bold">{{ bond.公司名稱 }}</div>
          <div class="text-sm text-[var(--muted-foreground)]">{{ bond.代號 }}</div>
        </div>

        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">買入價格</span>
            <span class="detail-value">{{ formatDecimal(bond.買入價格) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">持有單位</span>
            <span class="detail-value">{{ formatNumber(bond.持有單位) }}</span>
          </div>
          <div v-if="bond.最新價格" class="detail-row">
            <span class="detail-label">最新價格</span>
            <span class="detail-value">{{ formatDecimal(bond.最新價格) }}</span>
          </div>
          <div v-if="bond.台幣資產" class="detail-row">
            <span class="detail-label">市值</span>
            <span class="detail-value font-semibold">{{ formatNumber(bond.台幣資產) }}</span>
          </div>
          <div v-if="bond.損益百分比 != null" class="detail-row">
            <span class="detail-label">損益</span>
            <span class="detail-value" :class="getColorClass(bond.損益百分比)">
              {{ formatPercent(bond.損益百分比) }}
            </span>
          </div>
          <div v-if="bond.票面利率" class="detail-row">
            <span class="detail-label">票面利率</span>
            <span class="detail-value">{{ formatDecimal(bond.票面利率) }}%</span>
          </div>
          <div v-if="bond.配息日" class="detail-row">
            <span class="detail-label">配息日</span>
            <span class="detail-value">{{ bond.配息日 }}</span>
          </div>
          <div v-if="bond.下次配息" class="detail-row">
            <span class="detail-label">下次配息</span>
            <span class="detail-value calculated-text">{{ formatNumber(bond.下次配息) }}</span>
          </div>
          <div v-if="bond.交易日" class="detail-row">
            <span class="detail-label">交易日</span>
            <span class="detail-value">{{ bond.交易日 }}</span>
          </div>
          <div v-if="bond.到期日" class="detail-row">
            <span class="detail-label">到期日</span>
            <span class="detail-value">{{ bond.到期日 }}</span>
          </div>
          <div v-if="bond.到期日" class="detail-row">
            <span class="detail-label">剩餘年數</span>
            <span class="detail-value calculated-text">{{ getRemainingYears(bond.到期日) }}</span>
          </div>
          <div v-if="bond.質押單位" class="detail-row">
            <span class="detail-label">質押單位</span>
            <span class="detail-value">{{ formatNumber(bond.質押單位) }}</span>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <Button variant="outline" class="flex-1" @click="switchToEdit">編輯</Button>
          <Button variant="destructive" class="flex-1" @click="switchToDelete">刪除</Button>
        </div>
      </div>

      <!-- Delete confirmation -->
      <div v-else-if="internalMode === 'delete'" class="py-4 space-y-3">
        <p class="text-base">確定要刪除「<strong>{{ bondLabel }}</strong>」的持倉嗎？</p>
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
              placeholder="如：USY20721BN29"
              :disabled="internalMode === 'edit'"
            />
          </div>
          <div class="space-y-2">
            <Label>公司名稱</Label>
            <Input v-model="form.companyName" placeholder="如：騰訊" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>買入價格</Label>
            <Input v-model="form.buyPrice" type="number" step="0.01" placeholder="0" />
          </div>
          <div class="space-y-2">
            <Label>持有單位</Label>
            <Input v-model="form.units" type="number" placeholder="0" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>票面利率 (%)</Label>
            <Input v-model="form.couponRate" type="number" step="0.01" placeholder="0" />
          </div>
          <div class="space-y-2">
            <Label>配息日</Label>
            <Input v-model="form.paymentDate" placeholder="如：3/15, 9/15" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>交易日</Label>
            <Input v-model="form.tradeDate" placeholder="如：2024/03/15" />
          </div>
          <div class="space-y-2">
            <Label>到期日</Label>
            <Input v-model="form.maturityDate" placeholder="如：2030/03/15" />
          </div>
        </div>
        <div v-if="internalMode === 'edit'" class="space-y-2">
          <Label>質押單位</Label>
          <Input v-model="form.pledgeUnits" type="number" placeholder="0" />
        </div>
      </div>

      <!-- Footer -->
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
