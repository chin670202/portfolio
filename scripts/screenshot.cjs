/**
 * 頁面截圖工具
 * 用於自動截取頁面截圖供 Claude 檢視
 *
 * 使用方式：
 *   node scripts/screenshot.cjs [url] [output] [options]
 *
 * 範例：
 *   node scripts/screenshot.cjs                          # 截取首頁
 *   node scripts/screenshot.cjs /demo                    # 截取 demo 頁
 *   node scripts/screenshot.cjs / landing.png            # 自訂檔名
 *   node scripts/screenshot.cjs --full                   # 完整頁面截圖
 *   node scripts/screenshot.cjs --mobile                 # 手機版截圖
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function takeScreenshot() {
  const args = process.argv.slice(2);

  // 解析參數
  let urlPath = '/';
  let outputName = 'screenshot.png';
  let fullPage = false;
  let mobile = false;

  for (const arg of args) {
    if (arg === '--full') {
      fullPage = true;
    } else if (arg === '--mobile') {
      mobile = true;
    } else if (arg.endsWith('.png')) {
      outputName = arg;
    } else if (arg.startsWith('/') || arg.startsWith('path:')) {
      // 支援 path:demo 格式避免 Git Bash 路徑轉換問題
      urlPath = arg.startsWith('path:') ? '/' + arg.slice(5) : arg;
    }
  }

  // 如果是手機模式，調整輸出檔名
  if (mobile && outputName === 'screenshot.png') {
    outputName = 'screenshot-mobile.png';
  }

  const baseUrl = 'http://localhost:5173';
  const url = `${baseUrl}${urlPath}`;
  const outputPath = path.join(__dirname, '..', 'screenshots', outputName);

  // 視窗設定
  const viewport = mobile
    ? { width: 390, height: 844 }  // iPhone 14 尺寸
    : { width: 1440, height: 900 };

  console.log(`📸 截圖設定：`);
  console.log(`   URL Path: ${urlPath}`);
  console.log(`   Full URL: ${url}`);
  console.log(`   輸出: ${outputPath}`);
  console.log(`   完整頁面: ${fullPage}`);
  console.log(`   手機模式: ${mobile}`);
  console.log(`   視窗: ${viewport.width}x${viewport.height}`);
  console.log('');

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });

  const page = await context.newPage();

  try {
    console.log('⏳ 載入頁面...');

    // 強制不使用快取
    await page.route('**/*', route => {
      route.continue({
        headers: {
          ...route.request().headers(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        }
      });
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待頁面穩定
    await page.waitForTimeout(1500);

    // 確保 screenshots 目錄存在
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // 截圖
    await page.screenshot({
      path: outputPath,
      fullPage: fullPage
    });

    console.log(`✅ 截圖成功：${outputPath}`);

  } catch (error) {
    console.error('❌ 截圖失敗:', error.message);
    console.log('');
    console.log('請確認開發伺服器正在運行 (npm run dev)');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshot();
