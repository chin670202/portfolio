const { chromium } = require('playwright');

async function debugCSS() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 找到痛點區塊的 section-header
  const sectionHeader = await page.$('.problems .section-header');
  if (sectionHeader) {
    const styles = await page.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        background: computed.backgroundColor,
        color: computed.color,
      };
    }, sectionHeader);
    console.log('Section Header styles:', styles);

    const h2Styles = await page.evaluate(() => {
      const h2 = document.querySelector('.problems .section-header h2');
      if (h2) {
        const computed = window.getComputedStyle(h2);
        return {
          color: computed.color,
          background: computed.backgroundColor,
        };
      }
      return null;
    });
    console.log('H2 styles:', h2Styles);
  }

  // 檢查 .problems 區塊
  const problemsStyles = await page.evaluate(() => {
    const el = document.querySelector('.problems');
    if (el) {
      const computed = window.getComputedStyle(el);
      return {
        background: computed.backgroundColor,
      };
    }
    return null;
  });
  console.log('Problems section styles:', problemsStyles);

  await browser.close();
}

debugCSS();
