<script setup>
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-vue-next'
import { parseUnified } from '@/services/tradeApi'

const props = defineProps({
  username: { type: String, required: true }
})

const emit = defineEmits(['parsed', 'adjust-parsed', 'loan-parsed'])

const input = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!input.value.trim()) return
  loading.value = true
  error.value = ''

  try {
    const result = await parseUnified(props.username, input.value.trim())

    if (result.type === 'trade') {
      emit('parsed', result)
    } else if (result.type === 'adjust') {
      emit('adjust-parsed', result)
    } else if (result.type === 'loan') {
      emit('loan-parsed', result)
    }
    input.value = ''
  } catch (err) {
    const msg = err.message || ''
    if (msg.length > 100 || msg.includes('CLI')) {
      error.value = 'AI 解析服務暫時無法使用，請稍後再試'
    } else {
      error.value = msg || '網路錯誤，請重試'
    }
  } finally {
    loading.value = false
  }
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSubmit()
  }
}
</script>

<template>
  <div class="space-y-2">
    <div class="relative">
      <Textarea
        v-model="input"
        @keydown="handleKeyDown"
        placeholder="輸入交易或調整指令，例如：「買了兩張台積電 680元」「台積電改成 3000 股」「新增房貸 500萬 利率 2.1%」"
        class="min-h-[80px] pr-14 text-base"
        :disabled="loading"
      />
      <Button
        size="icon"
        @click="handleSubmit"
        :disabled="loading || !input.trim()"
        class="absolute bottom-2 right-2"
      >
        <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
        <Send v-else class="h-4 w-4" />
      </Button>
    </div>

    <div v-if="loading" class="flex items-center gap-2 rounded-md bg-[var(--muted)] px-3 py-2">
      <Loader2 class="h-4 w-4 animate-spin text-[var(--primary)]" />
      <span class="text-sm text-[var(--muted-foreground)]">AI 解析中，約需 10~20 秒，請稍候...</span>
    </div>

    <p v-if="error" class="text-sm text-[var(--destructive)]">{{ error }}</p>

    <p v-if="!loading" class="text-xs text-[var(--muted-foreground)]">
      按 Enter 送出，Shift+Enter 換行。AI 自動辨識：交易紀錄 / 部位調整 / 貸款管理
    </p>
  </div>
</template>
