<script setup>
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-vue-next'
import { parseTrade } from '@/services/tradeApi'

const props = defineProps({
  username: { type: String, required: true }
})

const emit = defineEmits(['parsed'])

const input = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  if (!input.value.trim()) return
  loading.value = true
  error.value = ''

  try {
    const parsed = await parseTrade(props.username, input.value.trim())
    emit('parsed', parsed)
    input.value = ''
  } catch (err) {
    error.value = err.message || '網路錯誤，請重試'
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
        placeholder="輸入交易記錄，例如：「今天買了兩張台積電 680元」「sell 100 AAPL at 235.5」"
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
      按 Enter 送出，Shift+Enter 換行。支援中文或英文描述。
    </p>
  </div>
</template>
