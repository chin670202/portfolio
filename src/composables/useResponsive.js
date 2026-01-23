/**
 * 響應式佈局 composable
 * 用於判斷當前是否為手機版（直向模式）
 */
import { ref, onMounted, onUnmounted } from 'vue'

// 手機版斷點（寬度 <= 此值時切換為卡片模式）
const MOBILE_BREAKPOINT = 768

// 取得正確的 viewport 寬度（避免水平捲軸影響）
// 使用 document.documentElement.clientWidth 而非 window.innerWidth
// 因為當有水平捲軸時，window.innerWidth 會返回 scrollWidth 而非真正的 viewport 寬度
function getViewportWidth() {
  if (typeof document === 'undefined') return window?.innerWidth || 0
  return document.documentElement?.clientWidth || window.innerWidth
}

// 全域狀態（避免多個元件重複監聽）
// 立即檢查初始值，不要等到 onMounted
const isMobile = ref(typeof window !== 'undefined' ? getViewportWidth() <= MOBILE_BREAKPOINT : false)
let listenerCount = 0
let resizeHandler = null

function checkMobile() {
  const width = getViewportWidth()
  isMobile.value = width <= MOBILE_BREAKPOINT
  console.log(`[useResponsive] checkMobile: width=${width}, isMobile=${isMobile.value}`)
}

export function useResponsive() {
  onMounted(() => {
    // 確保首次檢查（處理 SSR 情況）
    checkMobile()

    if (listenerCount === 0) {
      resizeHandler = () => checkMobile()
      window.addEventListener('resize', resizeHandler)
    }
    listenerCount++
  })

  onUnmounted(() => {
    listenerCount--
    if (listenerCount === 0 && resizeHandler) {
      window.removeEventListener('resize', resizeHandler)
      resizeHandler = null
    }
  })

  return {
    isMobile,
    MOBILE_BREAKPOINT
  }
}
