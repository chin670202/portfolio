<script setup>
import { ref } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-vue-next'
import { applyAdjust } from '@/services/tradeApi'

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

function formatDescription(loan) {
  if (!loan) return ''
  const name = loan.loanType
  switch (loan.action) {
    case 'add':
      return `新增「${name}」` +
        (loan.balance != null ? `，餘額 ${formatAmount(loan.balance)}` : '') +
        (loan.rate != null ? `，利率 ${loan.rate}%` : '')
    case 'set':
      return `修改「${name}」` +
        (loan.balance != null ? `，餘額改為 ${formatAmount(loan.balance)}` : '') +
        (loan.rate != null ? `，利率改為 ${loan.rate}%` : '')
    case 'reduce':
      return `「${name}」餘額減少 ${formatAmount(loan.balance)}`
    case 'remove':
      return `移除「${name}」貸款`
    default:
      return ''
  }
}

async function handleConfirm() {
  if (!props.loan) return
  saving.value = true
  try {
    await applyAdjust(props.username, props.loan)
    emit('close')
    emit('saved')
  } catch (err) {
    alert(err.message || '操作失敗')
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

      <div v-if="loan" class="space-y-4 py-2">
        <div class="rounded-lg bg-[var(--muted)] p-4 text-base leading-relaxed">
          <div class="flex items-center gap-2 text-lg font-semibold">
            <Badge :variant="ACTION_VARIANTS[loan.action]" class="text-sm">
              {{ ACTION_LABELS[loan.action] }}
            </Badge>
            <span class="text-[var(--muted-foreground)] text-sm">貸款管理（不產生交易記錄）</span>
          </div>

          <div class="mt-2 text-xl font-bold">
            {{ loan.loanType }}
          </div>

          <div class="mt-2 text-base text-[var(--foreground)]">
            {{ formatDescription(loan) }}
          </div>

          <div v-if="loan.usage" class="mt-1 text-sm text-[var(--muted-foreground)]">
            用途：{{ loan.usage }}
          </div>
        </div>

        <div v-if="loan.notes" class="rounded-md border border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)]">
          備註：{{ loan.notes }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="saving">取消</Button>
        <Button @click="handleConfirm" :disabled="saving">
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
          {{ saving ? '處理中...' : '確認' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
