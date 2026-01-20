/**
 * 自訂儀表板端對端測試
 * 測試流程：輸入 -> 產生 -> 按鈕出現 -> iframe 載入
 */

import { test, expect } from 'playwright';

const TEST_USER = 'test';
const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('自訂儀表板功能', () => {
  test.beforeEach(async ({ page }) => {
    // 導航到測試用戶的儀表板頁面
    await page.goto(`${FRONTEND_URL}/#/${TEST_USER}`);
    // 等待頁面載入完成
    await page.waitForLoadState('networkidle');
  });

  test('智慧助手按鈕應該存在', async ({ page }) => {
    // 找到智慧助手按鈕
    const assistantBtn = page.locator('.quick-update-btn');
    await expect(assistantBtn).toBeVisible();
    await expect(assistantBtn).toContainText('智慧助手');
  });

  test('點擊智慧助手應該開啟輸入視窗', async ({ page }) => {
    // 點擊智慧助手按鈕
    await page.click('.quick-update-btn');

    // 等待模態框出現
    const modal = page.locator('.modal-content');
    await expect(modal).toBeVisible();

    // 確認標題
    await expect(modal.locator('h3')).toContainText('智慧助手');
  });

  test('應該有三個頁籤', async ({ page }) => {
    // 開啟智慧助手
    await page.click('.quick-update-btn');

    // 等待模態框
    await page.waitForSelector('.modal-content');

    // 檢查三個頁籤
    const tabs = page.locator('.tabs .tab-btn');
    await expect(tabs).toHaveCount(3);

    // 檢查頁籤文字
    await expect(tabs.nth(0)).toContainText('部位更新');
    await expect(tabs.nth(1)).toContainText('儀表板調整');
    await expect(tabs.nth(2)).toContainText('自訂儀表板');
  });

  test('點擊自訂儀表板頁籤應該顯示正確內容', async ({ page }) => {
    // 開啟智慧助手
    await page.click('.quick-update-btn');
    await page.waitForSelector('.modal-content');

    // 點擊自訂儀表板頁籤
    await page.click('.tab-btn:has-text("自訂儀表板")');

    // 檢查頁籤內容
    const tabContent = page.locator('.tab-content');
    await expect(tabContent).toBeVisible();

    // 檢查輸入框提示文字
    const textarea = page.locator('.tab-content textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute('placeholder', /我想要一個簡潔的儀表板/);

    // 檢查說明文字
    const hint = page.locator('.custom-hint');
    await expect(hint).toBeVisible();
    await expect(hint).toContainText('AI 將為你生成獨立的 HTML 儀表板');
  });

  test('檢查自訂儀表板 API 端點', async ({ request }) => {
    // 測試 check 端點
    const checkResponse = await request.get(`${BACKEND_URL}/custom-dashboard/${TEST_USER}/check`);
    expect(checkResponse.ok()).toBeTruthy();

    const checkData = await checkResponse.json();
    expect(checkData).toHaveProperty('exists');
    expect(typeof checkData.exists).toBe('boolean');
  });

  test('檢查 html 端點（當不存在時）', async ({ request }) => {
    // 測試 html 端點（可能返回 404 或預設頁面）
    const htmlResponse = await request.get(`${BACKEND_URL}/custom-dashboard/${TEST_USER}/html`);

    // 應該返回 HTML 內容
    const contentType = htmlResponse.headers()['content-type'];
    expect(contentType).toContain('text/html');
  });

  test('完整流程：輸入描述並產生自訂儀表板', async ({ page }) => {
    // 這個測試會實際呼叫 Claude CLI，可能需要較長時間
    test.setTimeout(180000); // 3 分鐘超時

    // 開啟智慧助手
    await page.click('.quick-update-btn');
    await page.waitForSelector('.modal-content');

    // 點擊自訂儀表板頁籤
    await page.click('.tab-btn:has-text("自訂儀表板")');

    // 輸入描述
    const textarea = page.locator('.tab-content textarea');
    await textarea.fill('請幫我建立一個簡單的儀表板，只顯示總資產和總負債的卡片，使用深色主題');

    // 點擊送出
    await page.click('.submit-btn');

    // 等待處理視窗出現
    await expect(page.locator('.process-modal')).toBeVisible();

    // 等待處理完成（成功或失敗）
    // 由於這會呼叫 Claude CLI，我們設定較長的超時
    await page.waitForSelector('.process-modal .success-icon, .process-modal .error-icon', {
      timeout: 150000
    });

    // 檢查是否成功
    const successIcon = page.locator('.process-modal .success-icon');
    const isSuccess = await successIcon.isVisible();

    if (isSuccess) {
      // 關閉處理視窗
      await page.click('.process-modal .submit-btn');
      await page.waitForSelector('.process-modal', { state: 'hidden' });

      // 檢查「我的自訂儀表板」按鈕是否出現
      const customDashboardBtn = page.locator('.custom-dashboard-btn');
      await expect(customDashboardBtn).toBeVisible({ timeout: 5000 });
      await expect(customDashboardBtn).toContainText('我的自訂儀表板');

      // 點擊按鈕開啟 iframe
      await customDashboardBtn.click();

      // 檢查 iframe 全螢幕視窗
      const overlay = page.locator('.custom-dashboard-overlay');
      await expect(overlay).toBeVisible();

      // 檢查 iframe
      const iframe = page.locator('.custom-dashboard-iframe');
      await expect(iframe).toBeVisible();

      // 檢查標題
      await expect(page.locator('.custom-dashboard-header h3')).toContainText('我的自訂儀表板');

      // 關閉 iframe 視窗
      await page.click('.custom-dashboard-header .close-btn');
      await expect(overlay).not.toBeVisible();

      console.log('✅ 自訂儀表板完整流程測試通過');
    } else {
      // 如果失敗，記錄錯誤訊息但不讓測試失敗
      // （因為 Claude CLI 可能在 CI 環境中不可用）
      const errorMsg = await page.locator('.process-modal .error-message').textContent();
      console.log(`⚠️ 自訂儀表板產生失敗（可能是 Claude CLI 不可用）: ${errorMsg}`);

      // 在本地環境中這應該是失敗，但在 CI 環境中可能會跳過
      if (!process.env.CI) {
        throw new Error(`自訂儀表板產生失敗: ${errorMsg}`);
      }
    }
  });

  test('當自訂儀表板存在時應顯示按鈕', async ({ page, request }) => {
    // 先檢查是否存在
    const checkResponse = await request.get(`${BACKEND_URL}/custom-dashboard/${TEST_USER}/check`);
    const checkData = await checkResponse.json();

    if (checkData.exists) {
      // 如果存在，檢查按鈕
      const customDashboardBtn = page.locator('.custom-dashboard-btn');
      await expect(customDashboardBtn).toBeVisible();

      // 點擊按鈕
      await customDashboardBtn.click();

      // 檢查 iframe 載入
      const iframe = page.locator('.custom-dashboard-iframe');
      await expect(iframe).toBeVisible();

      // 檢查 iframe src
      const src = await iframe.getAttribute('src');
      expect(src).toContain(`/custom-dashboard/${TEST_USER}/html`);
    } else {
      console.log('⚠️ 自訂儀表板不存在，跳過按鈕顯示測試');
    }
  });
});

test.describe('API 測試', () => {
  test('健康檢查端點應該正常', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('check 端點應該返回正確格式', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/custom-dashboard/${TEST_USER}/check`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('exists');
  });

  test('html 端點應該返回 HTML', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/custom-dashboard/${TEST_USER}/html`);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/html');

    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
  });
});
