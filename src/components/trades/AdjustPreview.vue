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
  set: '設定',
  add: '增加',
  reduce: '減少',
  remove: '移除',
}

const ACTION_VARIANTS = {
  set: 'outline',
  add: 'default',
  reduce: 'destructive',
  remove: 'destructive',
}

const props = defineProps({
  adjustment: { type: Object, default: null },
  open: { type: Boolean, default: false },
  username: { type: String, required: true },
})

const emit = defineEmits(['close', 'saved'])
const saving = ref(false)

function formatDescription(adj) {
  if (!adj) return ''
  const name = adj.name || adj.symbol
  switch (adj.action) {
    case 'set':
      return `將 ${name} 設定為 ${adj.quantity?.toLocaleString('zh-TW')} 單位` +
        (adj.avgPrice != null ? `，均價 ${adj.avgPrice.toLocaleString('zh-TW')}` : '')
    case 'add':
      return `增加 ${name} ${adj.quantity?.toLocaleString('zh-TW')} 單位` +
        (adj.avgPrice != null ? `，均價 ${adj.avgPrice.toLocaleString('zh-TW')}` : '')
    case 'reduce':
      return `減少 ${name} ${adj.quantity?.toLocaleString('zh-TW')} 單位`
    case 'remove':
      return `移除 ${name} 的全部持倉`
    default:
      return ''
  }
}

async function handleConfirm() {
  if (!props.adjustment) return
  saving.value = true
  try {
    await applyAdjust(props.username, props.adjustment)
    const name = props.adjustment.name || props.adjustment.symbol
    toast.success(`${ACTION_LABELS[props.adjustment.action]}${name} 完成`)
    emit('close')
    emit('saved')
  } catch (err) {
    toast.error(err.message || '調整失敗')
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
        <DialogTitle>確認部位調整</DialogTitle>
      </DialogHeader>

      <div v-if="adjustment" class="space-y-4 py-2">
        <div class="rounded-lg bg-[var(--muted)] p-4 text-base leading-relaxed">
          <div class="flex items-center gap-2 text-lg font-semibold">
            <Badge :variant="ACTION_VARIANTS[adjustment.action]" class="text-sm">
              {{ ACTION_LABELS[adjustment.action] }}
            </Badge>
            <span class="text-[var(--muted-foreground)] text-sm">部位調整（不產生交易記錄）</span>
          </div>

          <div class="mt-2 text-xl font-bold">
            <span v-if="adjustment.name">{{ adjustment.name }}</span>
            <span v-if="adjustment.name" class="text-[var(--muted-foreground)]">({{ adjustment.symbol }})</span>
            <span v-else>{{ adjustment.symbol }}</span>
          </div>

          <div class="mt-2 text-base text-[var(--foreground)]">
            {{ formatDescription(adjustment) }}
          </div>
        </div>

        <div v-if="adjustment.notes" class="rounded-md border border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)]">
          備註：{{ adjustment.notes }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="saving">取消</Button>
        <Button @click="handleConfirm" :disabled="saving">
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
          {{ saving ? '調整中...' : '確認調整' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
