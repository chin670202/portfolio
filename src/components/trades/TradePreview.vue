<script setup>
import { ref, computed, watch } from 'vue'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-vue-next'
import { ASSET_TYPE_LABELS, SIDE_LABELS } from '@/lib/constants'
import { createTrade, calculateFee, setDefaultBroker } from '@/services/tradeApi'

const props = defineProps({
  trade: { type: Object, default: null },
  open: { type: Boolean, default: false },
  username: { type: String, required: true },
  brokers: { type: Array, default: () => [] },
  defaultBrokerId: { type: String, default: null },
})

const emit = defineEmits(['close', 'saved', 'default-broker-changed'])
const saving = ref(false)
const selectedBrokerId = ref(null)
const calculatedFee = ref(0)
const calculatedTax = ref(0)
const calculating = ref(false)

// When dialog opens, initialize broker selection
watch(() => props.open, (val) => {
  if (val && props.trade) {
    selectedBrokerId.value = props.trade.brokerId || props.defaultBrokerId || null
    calculatedFee.value = props.trade.fee || 0
    calculatedTax.value = props.trade.tax || 0
  }
})

// Recalculate fees when broker changes
watch(selectedBrokerId, async (newId) => {
  if (!newId || !props.trade) return
  calculating.value = true
  try {
    const { fee, tax } = await calculateFee({
      brokerId: newId,
      assetType: props.trade.assetType,
      price: props.trade.price,
      quantity: props.trade.quantity,
      side: props.trade.side,
      symbol: props.trade.symbol,
    })
    calculatedFee.value = fee
    calculatedTax.value = tax
  } catch (err) {
    console.error('Fee calculation failed:', err)
  } finally {
    calculating.value = false
  }
})

const selectedBroker = computed(() =>
  props.brokers.find(b => b.id === selectedBrokerId.value)
)

const subtotal = computed(() => {
  if (!props.trade) return 0
  return props.trade.price * props.trade.quantity
})

function formatQuantity(trade) {
  if (trade.assetType === 'tw_stock' && trade.quantity >= 1000 && trade.quantity % 1000 === 0) {
    return `${(trade.quantity / 1000).toLocaleString('zh-TW')} 張`
  }
  return `${trade.quantity.toLocaleString('zh-TW')} 股`
}

function onBrokerChange(e) {
  selectedBrokerId.value = e.target.value || null
}

async function handleConfirm() {
  if (!props.trade) return
  saving.value = true
  try {
    const tradeData = {
      ...props.trade,
      fee: calculatedFee.value,
      tax: calculatedTax.value,
      brokerId: selectedBrokerId.value || undefined,
    }
    await createTrade(props.username, tradeData)

    if (selectedBrokerId.value && selectedBrokerId.value !== props.defaultBrokerId) {
      try {
        await setDefaultBroker(props.username, selectedBrokerId.value)
        emit('default-broker-changed', selectedBrokerId.value)
      } catch { /* non-critical */ }
    }

    emit('close')
    emit('saved')
  } catch (err) {
    alert(err.message || '儲存失敗')
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
        <DialogTitle>確認交易紀錄</DialogTitle>
      </DialogHeader>

      <div v-if="trade" class="space-y-4 py-2">
        <!-- 主要語意描述 -->
        <div class="rounded-lg bg-[var(--muted)] p-4 text-base leading-relaxed">
          <div class="flex items-center gap-2 text-lg font-semibold">
            <span>{{ trade.tradeDate }}</span>
            <Badge :variant="trade.side === 'buy' ? 'default' : 'destructive'" class="text-sm">
              {{ SIDE_LABELS[trade.side] }}
            </Badge>
          </div>

          <div class="mt-2 text-xl font-bold">
            <span v-if="trade.name">{{ trade.name }}</span>
            <span v-if="trade.name" class="text-[var(--muted-foreground)]">({{ trade.symbol }})</span>
            <span v-else>{{ trade.symbol }}</span>
          </div>

          <div class="mt-1 text-lg">
            {{ formatQuantity(trade) }} @ {{ trade.price.toLocaleString('zh-TW') }} 元
          </div>

          <div class="mt-3 border-t border-[var(--border)] pt-3 text-base font-semibold"
            :class="trade.side === 'buy' ? 'text-green-700' : 'text-red-600'"
          >
            小計 {{ subtotal.toLocaleString('zh-TW') }} 元
          </div>
        </div>

        <!-- 券商選擇 -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-[var(--foreground)]">下單券商</label>
          <select
            :value="selectedBrokerId || ''"
            @change="onBrokerChange"
            class="flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
            :class="selectedBrokerId ? 'border-[var(--input)]' : 'border-[var(--destructive)]'"
          >
            <option value="" disabled>請選擇券商...</option>
            <option v-for="broker in brokers" :key="broker.id" :value="broker.id">
              {{ broker.name }} ({{ (broker.tw_stock_discount * 10).toFixed(1) }}折)
            </option>
          </select>
          <p v-if="!selectedBrokerId" class="text-xs text-[var(--destructive)]">
            請先選擇您的下單券商，之後會自動記住
          </p>
        </div>

        <!-- 費用明細 -->
        <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--muted-foreground)]">
          <span>{{ ASSET_TYPE_LABELS[trade.assetType] || trade.assetType }}</span>
          <span v-if="selectedBroker">{{ selectedBroker.name }}</span>
          <span v-if="calculating" class="flex items-center gap-1">
            <Loader2 class="h-3 w-3 animate-spin" /> 計算中...
          </span>
          <template v-else>
            <span>手續費 {{ calculatedFee.toLocaleString('zh-TW') }} 元</span>
            <span v-if="calculatedTax">稅 {{ calculatedTax.toLocaleString('zh-TW') }} 元</span>
          </template>
        </div>

        <!-- 備註 -->
        <div v-if="trade.notes" class="rounded-md border border-[var(--border)] p-3 text-sm text-[var(--muted-foreground)]">
          備註：{{ trade.notes }}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('close')" :disabled="saving">取消</Button>
        <Button @click="handleConfirm" :disabled="saving || calculating || !selectedBrokerId">
          <Loader2 v-if="saving" class="mr-2 h-4 w-4 animate-spin" />
          {{ saving ? '儲存中...' : '確認送出' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
