<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff, RotateCcw, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { fetchBackups, fetchBackupData, restoreBackup } from '@/services/tradeApi'

const route = useRoute()
const username = computed(() => route.params.username)

// List state
const backups = ref([])
const loading = ref(true)
const error = ref(null)

// Preview state
const selectedFilename = ref(null)
const previewData = ref(null)
const previewLoading = ref(false)
const previewError = ref(null)
const showRawJson = ref(false)

// Restore state
const restoreDialogOpen = ref(false)
const restoreTarget = ref(null)
const restoring = ref(false)
const restoreSuccess = ref(false)

async function loadBackups() {
  loading.value = true
  error.value = null
  try {
    const result = await fetchBackups(username.value)
    backups.value = result.backups
  } catch {
    error.value = '取得備份列表失敗，請稍後再試'
  } finally {
    loading.value = false
  }
}

async function handlePreview(backup) {
  // Toggle off
  if (selectedFilename.value === backup.filename) {
    selectedFilename.value = null
    previewData.value = null
    return
  }

  selectedFilename.value = backup.filename
  previewData.value = null
  previewError.value = null
  previewLoading.value = true
  showRawJson.value = false

  try {
    const result = await fetchBackupData(username.value, backup.filename)
    previewData.value = result.data
  } catch {
    previewError.value = '無法載入備份資料，請稍後再試'
  } finally {
    previewLoading.value = false
  }
}

const previewSummary = computed(() => {
  if (!previewData.value) return null
  const d = previewData.value
  return {
    updateDate: d.資料更新日期 || '--',
    usdRate: d.匯率?.美元匯率 || '--',
    sections: [
      { label: '直債', count: d.股票?.length || 0 },
      { label: 'ETF', count: d.ETF?.length || 0 },
      { label: '其它資產', count: d.其它資產?.length || 0 },
      { label: '貸款', count: d.貸款?.length || 0 },
      { label: '資產變化記錄', count: d.資產變化記錄?.length || 0 },
    ]
  }
})

function openRestoreDialog(backup) {
  restoreTarget.value = backup
  restoreSuccess.value = false
  restoreDialogOpen.value = true
}

async function handleRestore() {
  if (!restoreTarget.value) return
  restoring.value = true
  try {
    await restoreBackup(username.value, restoreTarget.value.filename)
    restoreSuccess.value = true
    await loadBackups()
  } catch (err) {
    alert(err.message || '還原失敗，請稍後再試')
  } finally {
    restoring.value = false
  }
}

function selectedBackup() {
  return backups.value.find(b => b.filename === selectedFilename.value)
}

onMounted(loadBackups)
</script>

<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
    <h2 class="text-2xl font-bold text-[var(--foreground)]">備份管理</h2>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-2 py-12 text-[var(--muted-foreground)]">
      <Loader2 class="h-4 w-4 animate-spin" />
      載入中...
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4 text-[var(--destructive)]">
      {{ error }}
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Backup List -->
      <Card>
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            備份列表
            <span class="text-base font-normal text-[var(--muted-foreground)]">
              ({{ backups.length }} 份)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="backups.length === 0" class="py-8 text-center text-[var(--muted-foreground)]">
            尚無備份紀錄
          </div>
          <div v-else class="rounded-md border border-[var(--border)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead class="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="backup in backups"
                  :key="backup.filename"
                  :class="{ 'bg-[var(--accent)]': selectedFilename === backup.filename }"
                >
                  <TableCell>{{ backup.date }}</TableCell>
                  <TableCell>{{ backup.time }}</TableCell>
                  <TableCell class="text-right">
                    <div class="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        @click="handlePreview(backup)"
                        :class="selectedFilename === backup.filename ? 'text-[var(--primary)]' : ''"
                      >
                        <component :is="selectedFilename === backup.filename ? EyeOff : Eye" class="mr-1 h-4 w-4" />
                        {{ selectedFilename === backup.filename ? '收起' : '預覽' }}
                      </Button>
                      <Button variant="ghost" size="sm" @click="openRestoreDialog(backup)">
                        <RotateCcw class="mr-1 h-4 w-4" />
                        還原
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <!-- Preview Section -->
      <Card v-if="selectedFilename">
        <CardHeader>
          <CardTitle>
            備份預覽：{{ selectedBackup()?.displayName }}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <!-- Loading -->
          <div v-if="previewLoading" class="flex items-center gap-2 py-4 text-[var(--muted-foreground)]">
            <Loader2 class="h-4 w-4 animate-spin" />
            載入備份資料中...
          </div>

          <!-- Error -->
          <div v-else-if="previewError" class="py-4 text-[var(--destructive)]">
            {{ previewError }}
          </div>

          <!-- Summary -->
          <div v-else-if="previewSummary" class="space-y-4">
            <!-- Overview cards -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div class="rounded-lg border border-[var(--border)] p-3">
                <div class="text-xs text-[var(--muted-foreground)]">資料更新日期</div>
                <div class="mt-1 font-semibold">{{ previewSummary.updateDate }}</div>
              </div>
              <div class="rounded-lg border border-[var(--border)] p-3">
                <div class="text-xs text-[var(--muted-foreground)]">美元匯率</div>
                <div class="mt-1 font-semibold">{{ previewSummary.usdRate }}</div>
              </div>
              <div
                v-for="section in previewSummary.sections"
                :key="section.label"
                class="rounded-lg border border-[var(--border)] p-3"
              >
                <div class="text-xs text-[var(--muted-foreground)]">{{ section.label }}</div>
                <div class="mt-1 font-semibold">{{ section.count }} 筆</div>
              </div>
            </div>

            <!-- Detail lists -->
            <!-- 直債 -->
            <div v-if="previewData.股票?.length">
              <h4 class="mb-1 text-sm font-medium text-[var(--muted-foreground)]">直債明細</h4>
              <div class="rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
                <div
                  v-for="bond in previewData.股票"
                  :key="bond.代號"
                  class="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{{ bond.公司名稱 }} ({{ bond.代號 }})</span>
                  <span class="text-[var(--muted-foreground)]">{{ bond.面額?.toLocaleString() }} USD</span>
                </div>
              </div>
            </div>

            <!-- ETF -->
            <div v-if="previewData.ETF?.length">
              <h4 class="mb-1 text-sm font-medium text-[var(--muted-foreground)]">ETF 明細</h4>
              <div class="rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
                <div
                  v-for="etf in previewData.ETF"
                  :key="etf.代號"
                  class="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{{ etf.名稱 }} ({{ etf.代號 }})</span>
                  <span class="text-[var(--muted-foreground)]">{{ etf.股數?.toLocaleString() }} 股</span>
                </div>
              </div>
            </div>

            <!-- 其它資產 -->
            <div v-if="previewData.其它資產?.length">
              <h4 class="mb-1 text-sm font-medium text-[var(--muted-foreground)]">其它資產明細</h4>
              <div class="rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
                <div
                  v-for="asset in previewData.其它資產"
                  :key="asset.代號"
                  class="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{{ asset.名稱 }} ({{ asset.代號 }})</span>
                  <span class="text-[var(--muted-foreground)]">{{ asset.股數?.toLocaleString() }}</span>
                </div>
              </div>
            </div>

            <!-- 貸款 -->
            <div v-if="previewData.貸款?.length">
              <h4 class="mb-1 text-sm font-medium text-[var(--muted-foreground)]">貸款明細</h4>
              <div class="rounded-md border border-[var(--border)] divide-y divide-[var(--border)]">
                <div
                  v-for="loan in previewData.貸款"
                  :key="loan.貸款別"
                  class="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>{{ loan.貸款別 }}</span>
                  <span class="text-[var(--muted-foreground)]">{{ loan.貸款餘額?.toLocaleString() }} 元</span>
                </div>
              </div>
            </div>

            <!-- Raw JSON toggle -->
            <div>
              <Button variant="ghost" size="sm" @click="showRawJson = !showRawJson">
                <component :is="showRawJson ? ChevronUp : ChevronDown" class="mr-1 h-4 w-4" />
                {{ showRawJson ? '隱藏' : '顯示' }}原始 JSON
              </Button>
              <pre
                v-if="showRawJson"
                class="mt-2 max-h-96 overflow-auto rounded-lg bg-[var(--muted)] p-4 text-xs"
              >{{ JSON.stringify(previewData, null, 2) }}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- Restore Confirmation Dialog -->
    <Dialog :open="restoreDialogOpen" @update:open="(v) => { if (!v && !restoring) restoreDialogOpen = false }">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>確認還原備份</DialogTitle>
          <DialogDescription>
            此操作將以備份資料覆蓋目前的投資組合。還原前系統會自動建立一份當前資料的備份。
          </DialogDescription>
        </DialogHeader>

        <div v-if="restoreSuccess" class="rounded-lg bg-green-50 p-4 text-green-800 text-sm">
          已成功還原至 <strong>{{ restoreTarget?.displayName }}</strong> 的備份資料。
        </div>

        <div v-else class="space-y-2 py-2">
          <p class="text-sm">
            即將還原至：<span class="font-semibold">{{ restoreTarget?.displayName }}</span>
          </p>
          <p class="text-sm text-[var(--muted-foreground)]">
            還原後，目前的資料會先被備份，您可以隨時再切換回來。
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="restoreDialogOpen = false" :disabled="restoring">
            {{ restoreSuccess ? '關閉' : '取消' }}
          </Button>
          <Button
            v-if="!restoreSuccess"
            variant="destructive"
            @click="handleRestore"
            :disabled="restoring"
          >
            <Loader2 v-if="restoring" class="mr-2 h-4 w-4 animate-spin" />
            {{ restoring ? '還原中...' : '確認還原' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
