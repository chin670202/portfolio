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
import { Loader2, RotateCcw, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { fetchBackups, fetchBackupData, restoreBackup } from '@/services/tradeApi'

const route = useRoute()
const username = computed(() => route.params.username)

// View state: 'list' or 'preview'
const currentView = ref('list')

// List state
const backups = ref([])
const loading = ref(true)
const error = ref(null)

// Preview state
const selectedBackup = ref(null)
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
  selectedBackup.value = backup
  previewData.value = null
  previewError.value = null
  previewLoading.value = true
  showRawJson.value = false
  currentView.value = 'preview'

  try {
    const result = await fetchBackupData(username.value, backup.filename)
    previewData.value = result.data
  } catch {
    previewError.value = '無法載入備份資料，請稍後再試'
  } finally {
    previewLoading.value = false
  }
}

function backToList() {
  currentView.value = 'list'
  selectedBackup.value = null
  previewData.value = null
}

// User-input fields for each section
const USER_INPUT_BOND_FIELDS = [
  { key: '代號', label: '代號' },
  { key: '公司名稱', label: '公司名稱' },
  { key: '買入價格', label: '買入價格' },
  { key: '持有單位', label: '持有單位', altKey: '面額' },
  { key: '票面利率', label: '票面利率', suffix: '%' },
  { key: '配息日', label: '配息日' },
  { key: '交易日', label: '交易日' },
  { key: '到期日', label: '到期日' },
  { key: '質押單位', label: '質押單位' },
]

const USER_INPUT_STOCK_FIELDS = [
  { key: '代號', label: '代號' },
  { key: '名稱', label: '名稱' },
  { key: '持有單位', label: '持有數量', altKey: '股數' },
  { key: '買入均價', label: '買入均價' },
  { key: '每股配息', label: '每股配息' },
]

const USER_INPUT_LOAN_FIELDS = [
  { key: '貸款別', label: '貸款別' },
  { key: '貸款餘額', label: '貸款餘額' },
  { key: '年利率', label: '年利率', suffix: '%' },
  { key: '還款方式', label: '還款方式' },
  { key: '貸款期間', label: '貸款期間' },
  { key: '備註', label: '備註' },
]

function getFieldValue(item, field) {
  let val = item[field.key]
  if (val == null && field.altKey) val = item[field.altKey]
  if (val == null) return null
  if (typeof val === 'number') val = val.toLocaleString()
  if (field.suffix) val = val + field.suffix
  return val
}

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

    <!-- ===== List View ===== -->
    <template v-else-if="currentView === 'list'">
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
                  class="cursor-pointer hover:bg-[var(--accent)]"
                  @click="handlePreview(backup)"
                >
                  <TableCell>{{ backup.date }}</TableCell>
                  <TableCell>{{ backup.time }}</TableCell>
                  <TableCell class="text-right">
                    <Button variant="ghost" size="sm" @click.stop="openRestoreDialog(backup)">
                      <RotateCcw class="mr-1 h-4 w-4" />
                      還原
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </template>

    <!-- ===== Preview View ===== -->
    <template v-else-if="currentView === 'preview'">
      <Button variant="ghost" size="sm" @click="backToList" class="mb-2">
        <ArrowLeft class="mr-1 h-4 w-4" />
        返回備份列表
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            備份預覽：{{ selectedBackup?.displayName }}
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

          <!-- Preview Content -->
          <div v-else-if="previewData" class="space-y-6">
            <!-- Meta info -->
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div v-if="previewData.資料更新日期" class="rounded-lg border border-[var(--border)] p-3">
                <div class="text-xs text-[var(--muted-foreground)]">資料更新日期</div>
                <div class="mt-1 font-semibold">{{ previewData.資料更新日期 }}</div>
              </div>
              <div v-if="previewData.匯率?.美元匯率" class="rounded-lg border border-[var(--border)] p-3">
                <div class="text-xs text-[var(--muted-foreground)]">美元匯率</div>
                <div class="mt-1 font-semibold">{{ previewData.匯率.美元匯率 }}</div>
              </div>
            </div>

            <!-- 直債 -->
            <div v-if="previewData.股票?.length">
              <h4 class="mb-2 text-sm font-semibold text-[var(--foreground)]">
                直債 ({{ previewData.股票.length }} 筆)
              </h4>
              <div class="space-y-2">
                <div
                  v-for="bond in previewData.股票"
                  :key="bond.代號"
                  class="rounded-md border border-[var(--border)] p-3"
                >
                  <div class="font-medium mb-1">{{ bond.公司名稱 || bond.代號 }}</div>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <template v-for="field in USER_INPUT_BOND_FIELDS" :key="field.key">
                      <template v-if="getFieldValue(bond, field) != null">
                        <span class="text-[var(--muted-foreground)]">{{ field.label }}</span>
                        <span>{{ getFieldValue(bond, field) }}</span>
                      </template>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- ETF -->
            <div v-if="previewData.ETF?.length">
              <h4 class="mb-2 text-sm font-semibold text-[var(--foreground)]">
                ETF ({{ previewData.ETF.length }} 筆)
              </h4>
              <div class="space-y-2">
                <div
                  v-for="etf in previewData.ETF"
                  :key="etf.代號"
                  class="rounded-md border border-[var(--border)] p-3"
                >
                  <div class="font-medium mb-1">{{ etf.名稱 || etf.代號 }}</div>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <template v-for="field in USER_INPUT_STOCK_FIELDS" :key="field.key">
                      <template v-if="getFieldValue(etf, field) != null">
                        <span class="text-[var(--muted-foreground)]">{{ field.label }}</span>
                        <span>{{ getFieldValue(etf, field) }}</span>
                      </template>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- 其它資產 -->
            <div v-if="previewData.其它資產?.length">
              <h4 class="mb-2 text-sm font-semibold text-[var(--foreground)]">
                其它資產 ({{ previewData.其它資產.length }} 筆)
              </h4>
              <div class="space-y-2">
                <div
                  v-for="asset in previewData.其它資產"
                  :key="asset.代號"
                  class="rounded-md border border-[var(--border)] p-3"
                >
                  <div class="font-medium mb-1">{{ asset.名稱 || asset.代號 }}</div>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <template v-for="field in USER_INPUT_STOCK_FIELDS" :key="field.key">
                      <template v-if="getFieldValue(asset, field) != null">
                        <span class="text-[var(--muted-foreground)]">{{ field.label }}</span>
                        <span>{{ getFieldValue(asset, field) }}</span>
                      </template>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- 貸款 -->
            <div v-if="previewData.貸款?.length">
              <h4 class="mb-2 text-sm font-semibold text-[var(--foreground)]">
                貸款 ({{ previewData.貸款.length }} 筆)
              </h4>
              <div class="space-y-2">
                <div
                  v-for="loan in previewData.貸款"
                  :key="loan.貸款別"
                  class="rounded-md border border-[var(--border)] p-3"
                >
                  <div class="font-medium mb-1">{{ loan.貸款別 }}</div>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <template v-for="field in USER_INPUT_LOAN_FIELDS" :key="field.key">
                      <template v-if="getFieldValue(loan, field) != null">
                        <span class="text-[var(--muted-foreground)]">{{ field.label }}</span>
                        <span>{{ getFieldValue(loan, field) }}</span>
                      </template>
                    </template>
                  </div>
                </div>
              </div>
            </div>

            <!-- 資產變化記錄 -->
            <div v-if="previewData.資產變化記錄?.length">
              <h4 class="mb-2 text-sm font-semibold text-[var(--foreground)]">
                資產變化記錄 ({{ previewData.資產變化記錄.length }} 筆)
              </h4>
              <div class="text-sm text-[var(--muted-foreground)]">
                共 {{ previewData.資產變化記錄.length }} 筆歷史快照
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

            <!-- Restore from preview -->
            <div class="flex justify-end pt-2 border-t border-[var(--border)]">
              <Button variant="destructive" size="sm" @click="openRestoreDialog(selectedBackup)">
                <RotateCcw class="mr-1 h-4 w-4" />
                還原此備份
              </Button>
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
