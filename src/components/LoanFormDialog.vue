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
import { formatNumber, formatPercent } from '@/utils/format'

const props = defineProps({
  open: { type: Boolean, default: false },
  username: { type: String, required: true },
  mode: { type: String, default: 'add' }, // 'view' | 'add' | 'edit' | 'delete'
  loan: { type: Object, default: null },
})

const emit = defineEmits(['close', 'saved'])

const saving = ref(false)
const internalMode = ref('view')

const form = ref({
  loanType: '',
  remark: '',
  balance: '',
  rate: '',
  usage: '',
})

const dialogTitle = computed(() => {
  if (internalMode.value === 'add') return '新增貸款'
  if (internalMode.value === 'edit') return '編輯貸款'
  if (internalMode.value === 'delete') return '刪除貸款'
  return '貸款明細'
})

const loanLabel = computed(() => {
  if (!props.loan) return ''
  return props.loan.備註
    ? `${props.loan.貸款別}（${props.loan.備註}）`
    : props.loan.貸款別
})

watch(() => props.open, (val) => {
  if (!val) return
  internalMode.value = props.mode
  if (props.mode === 'add') {
    form.value = { loanType: '', remark: '', balance: '', rate: '', usage: '' }
  } else if (props.loan) {
    form.value = {
      loanType: props.loan.貸款別 || '',
      remark: props.loan.備註 || '',
      balance: props.loan.貸款餘額 != null ? String(props.loan.貸款餘額) : '',
      rate: props.loan.貸款利率 != null ? String(props.loan.貸款利率) : '',
      usage: props.loan.用途 || '',
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
  if (props.loan) {
    form.value = {
      loanType: props.loan.貸款別 || '',
      remark: props.loan.備註 || '',
      balance: props.loan.貸款餘額 != null ? String(props.loan.貸款餘額) : '',
      rate: props.loan.貸款利率 != null ? String(props.loan.貸款利率) : '',
      usage: props.loan.用途 || '',
    }
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    if (internalMode.value === 'add') {
      if (!form.value.loanType.trim()) {
        toast.error('請輸入貸款名稱')
        return
      }
      await applyAdjust(props.username, {
        type: 'loan',
        action: 'add',
        loanType: form.value.loanType.trim(),
        remark: form.value.remark.trim() || null,
        balance: form.value.balance ? Number(form.value.balance) : null,
        rate: form.value.rate ? Number(form.value.rate) : null,
        usage: form.value.usage.trim() || null,
      })
      toast.success('貸款新增成功')
    } else if (internalMode.value === 'edit') {
      const payload = {
        type: 'loan',
        action: 'set',
        loanType: props.loan.貸款別,
        remark: props.loan.備註 || null,
      }
      const newBalance = form.value.balance ? Number(form.value.balance) : null
      const newRate = form.value.rate ? Number(form.value.rate) : null
      const newRemark = form.value.remark.trim()
      const newUsage = form.value.usage.trim()
      const newLoanType = form.value.loanType.trim()

      if (newBalance != null) payload.balance = newBalance
      if (newRate != null) payload.rate = newRate
      if (newUsage) payload.usage = newUsage
      if (newRemark !== (props.loan.備註 || '')) {
        payload.newRemark = newRemark || null
      }
      if (newLoanType !== props.loan.貸款別) {
        payload.newLoanType = newLoanType
      }
      await applyAdjust(props.username, payload)
      toast.success('貸款修改成功')
    } else if (internalMode.value === 'delete') {
      await applyAdjust(props.username, {
        type: 'loan',
        action: 'remove',
        loanType: props.loan.貸款別,
        remark: props.loan.備註 || null,
      })
      toast.success('貸款已刪除')
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
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>

      <!-- View mode: detail display -->
      <div v-if="internalMode === 'view' && loan" class="space-y-3 py-2">
        <div class="detail-grid">
          <div class="detail-row">
            <span class="detail-label">貸款名稱</span>
            <span class="detail-value font-semibold">{{ loan.貸款別 }}</span>
          </div>
          <div v-if="loan.備註" class="detail-row">
            <span class="detail-label">備註</span>
            <span class="detail-value">{{ loan.備註 }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">貸款餘額</span>
            <span class="detail-value font-semibold">{{ formatNumber(loan.貸款餘額) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">貸款利率</span>
            <span class="detail-value">{{ formatPercent(loan.貸款利率) }}</span>
          </div>
          <div v-if="loan.月繳金額" class="detail-row">
            <span class="detail-label">月繳金額</span>
            <span class="detail-value calculated-text">{{ formatNumber(loan.月繳金額) }}</span>
          </div>
          <div v-if="loan.每年利息" class="detail-row">
            <span class="detail-label">每年利息</span>
            <span class="detail-value calculated-text">{{ formatNumber(loan.每年利息) }}</span>
          </div>
          <div v-if="loan.用途" class="detail-row">
            <span class="detail-label">用途</span>
            <span class="detail-value">{{ loan.用途 }}</span>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <Button variant="outline" class="flex-1" @click="switchToEdit">編輯</Button>
          <Button variant="destructive" class="flex-1" @click="switchToDelete">刪除</Button>
        </div>
      </div>

      <!-- Delete confirmation -->
      <div v-else-if="internalMode === 'delete'" class="py-4">
        <p class="text-base">確定要刪除「<strong>{{ loanLabel }}</strong>」嗎？</p>
        <p class="text-sm text-[var(--muted-foreground)] mt-2">此操作無法復原（但可從備份還原）</p>
      </div>

      <!-- Add / Edit form -->
      <div v-else-if="internalMode === 'add' || internalMode === 'edit'" class="space-y-4 py-2">
        <div class="space-y-2">
          <Label>貸款名稱</Label>
          <Input
            v-model="form.loanType"
            placeholder="如：房屋貸款、汽車貸款"
          />
        </div>
        <div class="space-y-2">
          <Label>備註</Label>
          <Input v-model="form.remark" placeholder="用於區分同類貸款（選填）" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>貸款餘額</Label>
            <Input v-model="form.balance" type="number" placeholder="0" />
          </div>
          <div class="space-y-2">
            <Label>貸款利率 (%)</Label>
            <Input v-model="form.rate" type="number" step="0.001" placeholder="0" />
          </div>
        </div>
        <div class="space-y-2">
          <Label>用途（選填）</Label>
          <Input v-model="form.usage" placeholder="如：房貸、投資" />
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
</style>
