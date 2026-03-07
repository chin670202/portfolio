<script setup>
import { ref } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-vue-next'
import { applyAdjust } from '@/services/tradeApi'
import { toast } from 'vue-sonner'

const ACTION_LABELS = {
  add: '新增',
  set: '修改',
  reduce: '減少',
  remove: '移除',
}

const ACTION_VARIANTS = {
  add: 'default',
  set: 'outline',
  reduce: 'destructive',
  remove: 'destructive',
}

const props = defineProps({
  loan: { type: Object, default: null },
  open: { type: Boolean, default: false },
  username: { type: String, required: true },
})

const emit = defineEmits(['close', 'saved'])
const saving = ref(false)

function formatAmount(val) {
  if (val == null) return ''
  if (val >= 10000) {
    const wan = val / 10000
    return `${wan.toLocaleString('zh-TW')} 萬元`
  }
  return `${val.toLocaleString('zh-TW')} 元`
}

function loanDisplayName(loan) {
  if (!loan) return ''
  return loan.remark ? `${loan.loanType}（${loan.remark}）` : loan.loanType
}

async function handleConfirm() {
  if (!props.loan) return
  saving.value = true
  try {
    await applyAdjust(props.username, props.loan)
    const label = loanDisplayName(props.loan)
    toast.success(`貸款${ACTION_LABELS[props.loan.action] || '操作'}成功`, {
      description: label || undefined,
    })
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
        <DialogTitle>確認貸款調整</DialogTitle>
      </DialogHeader>

      <div v-if="loan" class="space-y-3 py-2">
        <!-- Action badge + label -->
        <div class="flex items-center gap-2">
          <Badge :variant="ACTION_VARIANTS[loan.action]" class="text-sm">
            {{ ACTION_LABELS[loan.action] }}
          </Badge>
          <span class="text-[var(--muted-foreground)] text-sm">貸款管理（不產生交易記錄）</span>
        </div>

        <!-- Matched existing loan info (for set/reduce/remove) -->
        <div v-if="loan.matchedLoan" class="rounded-lg border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3">
          <div class="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">將異動此筆貸款：</div>
          <div class="text-base font-bold">{{ loan.matchedLoan.loanType }}
            <span v-if="loan.matchedLoan.remark" class="font-normal text-[var(--muted-foreground)]">（{{ loan.matchedLoan.remark }}）</span>
          </div>
          <div class="text-sm text-[var(--muted-foreground)] mt-1">
            目前餘額：<span class="font-semibold text-[var(--foreground)]">{{ formatAmount(loan.matchedLoan.balance) }}</span>
            ・利率：<span class="font-semibold text-[var(--foreground)]">{{ loan.matchedLoan.rate }}%</span>
          </div>
        </div>

        <!-- Change details -->
        <div class="rounded-lg bg-[var(--muted)] p-4">
          <div class="text-sm font-medium text-[var(--muted-foreground)] mb-2">
            {{ loan.action === 'add' ? '新增內容' : loan.action === 'remove' ? '將移除此筆貸款' : '變更內容' }}
          </div>

          <!-- Add: show new loan info -->
          <template v-if="loan.action === 'add'">
            <div class="text-lg font-bold">{{ loanDisplayName(loan) }}</div>
            <div v-if="loan.balance != null" class="text-sm mt-1">餘額：{{ formatAmount(loan.balance) }}</div>
            <div v-if="loan.rate != null" class="text-sm">利率：{{ loan.rate }}%</div>
            <div v-if="loan.usage" class="text-sm">用途：{{ loan.usage }}</div>
          </template>

          <!-- Set: show what changes -->
          <template v-else-if="loan.action === 'set'">
            <div v-if="loan.newRemark" class="text-sm">
              備註改為：<span class="font-semibold">{{ loan.newRemark }}</span>
              <span v-if="loan.matchedLoan?.remark" class="text-[var(--muted-foreground)]">
                （原「{{ loan.matchedLoan.remark }}」）
              </span>
            </div>
            <div v-if="loan.balance != null" class="text-sm">
              餘額改為：<span class="font-semibold">{{ formatAmount(loan.balance) }}</span>
              <span v-if="loan.matchedLoan" class="text-[var(--muted-foreground)]">
                （原 {{ formatAmount(loan.matchedLoan.balance) }}）
              </span>
            </div>
            <div v-if="loan.rate != null" class="text-sm">
              利率改為：<span class="font-semibold">{{ loan.rate }}%</span>
              <span v-if="loan.matchedLoan" class="text-[var(--muted-foreground)]">
                （原 {{ loan.matchedLoan.rate }}%）
              </span>
            </div>
          </template>

          <!-- Reduce: show amount to reduce -->
          <template v-else-if="loan.action === 'reduce'">
            <div class="text-sm">
              減少金額：<span class="font-semibold text-red-600">{{ formatAmount(loan.balance) }}</span>
            </div>
            <div v-if="loan.matchedLoan" class="text-sm text-[var(--muted-foreground)] mt-1">
              {{ formatAmount(loan.matchedLoan.balance) }} → {{ formatAmount(loan.matchedLoan.balance - (loan.balance || 0)) }}
            </div>
          </template>

          <!-- Remove: no extra info needed -->
        </div>

        <div v-if="loan.notes" class="rounded-md border border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)]">
          備註：{{ loan.notes }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="saving">取消</Button>
        <Button
          :variant="['reduce', 'remove'].includes(loan?.action) ? 'destructive' : 'default'"
          @click="handleConfirm"
          :disabled="saving"
        >
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
          {{ saving ? '處理中...' : '確認' + (ACTION_LABELS[loan?.action] || '') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
