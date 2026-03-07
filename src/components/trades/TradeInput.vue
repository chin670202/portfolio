<script setup>
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ASSET_TYPES } from '@/lib/constants'

const props = defineProps({
  username: { type: String, required: true }
})

const emit = defineEmits(['parsed'])

const form = ref({
  tradeDate: new Date().toISOString().slice(0, 10),
  assetType: 'tw_stock',
  symbol: '',
  name: '',
  side: 'buy',
  price: '',
  quantity: '',
  notes: '',
})

const error = ref('')

function handleSubmit() {
  error.value = ''

  if (!form.value.symbol.trim()) {
    error.value = '請輸入代號'
    return
  }
  if (!form.value.price || Number(form.value.price) <= 0) {
    error.value = '請輸入有效價格'
    return
  }
  if (!form.value.quantity || Number(form.value.quantity) <= 0) {
    error.value = '請輸入有效數量'
    return
  }

  emit('parsed', {
    tradeDate: form.value.tradeDate,
    assetType: form.value.assetType,
    symbol: form.value.symbol.trim().toUpperCase(),
    name: form.value.name.trim() || null,
    side: form.value.side,
    price: Number(form.value.price),
    quantity: Number(form.value.quantity),
    notes: form.value.notes.trim() || null,
  })

  // 送出後清空（保留日期和類型）
  form.value.symbol = ''
  form.value.name = ''
  form.value.price = ''
  form.value.quantity = ''
  form.value.notes = ''
}
</script>

<template>
  <div class="space-y-4">
    <!-- 第一行：日期、類型、買賣 -->
    <div class="grid grid-cols-3 gap-3">
      <div class="space-y-1">
        <Label class="text-xs">日期</Label>
        <Input v-model="form.tradeDate" type="date" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs">類型</Label>
        <select
          v-model="form.assetType"
          class="flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]"
        >
          <option v-for="t in ASSET_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>
      <div class="space-y-1">
        <Label class="text-xs">方向</Label>
        <div class="flex h-9 rounded-md overflow-hidden border border-[var(--input)]">
          <button
            type="button"
            class="flex-1 text-sm font-medium transition-colors"
            :class="form.side === 'buy' ? 'bg-green-600 text-white' : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]'"
            @click="form.side = 'buy'"
          >買入</button>
          <button
            type="button"
            class="flex-1 text-sm font-medium transition-colors"
            :class="form.side === 'sell' ? 'bg-red-600 text-white' : 'bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--muted)]'"
            @click="form.side = 'sell'"
          >賣出</button>
        </div>
      </div>
    </div>

    <!-- 第二行：代號、名稱 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1">
        <Label class="text-xs">代號</Label>
        <Input v-model="form.symbol" placeholder="如：2330、AAPL" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs">名稱（選填）</Label>
        <Input v-model="form.name" placeholder="如：台積電" />
      </div>
    </div>

    <!-- 第三行：價格、數量 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1">
        <Label class="text-xs">價格</Label>
        <Input v-model="form.price" type="number" step="0.01" placeholder="0" />
      </div>
      <div class="space-y-1">
        <Label class="text-xs">數量</Label>
        <Input v-model="form.quantity" type="number" placeholder="0" />
      </div>
    </div>

    <!-- 第四行：備註 + 送出 -->
    <div class="flex gap-3 items-end">
      <div class="flex-1 space-y-1">
        <Label class="text-xs">備註（選填）</Label>
        <Input v-model="form.notes" placeholder="備註" />
      </div>
      <Button @click="handleSubmit" class="h-9 px-6">送出</Button>
    </div>

    <p v-if="error" class="text-sm text-[var(--destructive)]">{{ error }}</p>
  </div>
</template>
