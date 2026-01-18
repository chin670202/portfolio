#!/usr/bin/env node
/**
 * 模組遷移腳本
 * 將用戶 JSON 中的 customModules 遷移到獨立檔案
 *
 * 使用方式:
 *   node server/scripts/migrate-modules.js [--dry-run] [--user username]
 *
 * 選項:
 *   --dry-run   只檢查不實際執行遷移
 *   --user      只遷移指定用戶
 */

const fs = require('fs').promises;
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');
const MODULES_DIR = path.join(PROJECT_ROOT, 'public', 'modules', 'users');

// 解析命令列參數
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const userIndex = args.indexOf('--user');
const specificUser = userIndex !== -1 ? args[userIndex + 1] : null;

/**
 * 確保目錄存在
 */
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

/**
 * 補齊 ModuleSpec 預設值
 */
function normalizeModuleSpec(spec, username) {
  const now = new Date().toISOString();
  return {
    uid: spec.uid || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    name: spec.name || '未命名模組',
    author: spec.author || username,
    authorDisplayName: spec.authorDisplayName || username,
    version: spec.version || '1.0.0',
    changelog: spec.changelog || [],
    visibility: spec.visibility || 'private',
    subscribers: spec.subscribers || [],
    subscriberCount: spec.subscriberCount || 0,
    category: spec.category || null,
    tags: spec.tags || [],
    createdAt: spec.createdAt || now,
    updatedAt: spec.updatedAt || now,
    publishedAt: spec.publishedAt || null,
    icon: spec.icon || '📊',
    description: spec.description || '',
    readme: spec.readme || null,
    thumbnail: spec.thumbnail || null,
    screenshots: spec.screenshots || [],
    stats: spec.stats || { views: 0, likes: 0, uses: 0 },
    type: 'custom',
    isCustom: true,
    validation: spec.validation || null,
    layout: spec.layout || 'stack',
    dataBindings: spec.dataBindings || [],
    computedFields: spec.computedFields || [],
    components: spec.components || [],
    style: spec.style || {}
  };
}

/**
 * 遷移單一用戶的模組
 */
async function migrateUser(username) {
  const userJsonPath = path.join(DATA_DIR, `${username}.json`);
  const userModulesDir = path.join(MODULES_DIR, username);

  console.log(`\n處理用戶: ${username}`);

  // 讀取用戶 JSON
  let userData;
  try {
    const content = await fs.readFile(userJsonPath, 'utf-8');
    userData = JSON.parse(content);
  } catch (e) {
    console.log(`  ⚠️ 無法讀取用戶資料: ${e.message}`);
    return { migrated: 0, skipped: 0 };
  }

  // 檢查是否有 customModules
  if (!userData.customModules || userData.customModules.length === 0) {
    console.log(`  ℹ️ 沒有自訂模組需要遷移`);
    return { migrated: 0, skipped: 0 };
  }

  console.log(`  找到 ${userData.customModules.length} 個自訂模組`);

  let migrated = 0;
  let skipped = 0;
  const moduleUids = [];

  for (const module of userData.customModules) {
    const uid = module.uid;

    // 檢查是否已存在獨立檔案
    const modulePath = path.join(userModulesDir, `${uid}.json`);
    let exists = false;
    try {
      await fs.access(modulePath);
      exists = true;
    } catch (e) {
      // 檔案不存在
    }

    if (exists) {
      console.log(`  ⏭️ ${module.name} (${uid}) - 已存在，跳過`);
      skipped++;
      moduleUids.push(uid);
      continue;
    }

    // 補齊預設值
    const normalized = normalizeModuleSpec(module, username);

    if (isDryRun) {
      console.log(`  🔍 ${normalized.name} (${uid}) - 將會遷移`);
    } else {
      // 建立目錄
      await ensureDir(userModulesDir);

      // 寫入獨立檔案
      await fs.writeFile(modulePath, JSON.stringify(normalized, null, 2), 'utf-8');
      console.log(`  ✅ ${normalized.name} (${uid}) - 已遷移`);
    }

    migrated++;
    moduleUids.push(uid);
  }

  // 更新索引檔案
  if (!isDryRun && migrated > 0) {
    const indexPath = path.join(userModulesDir, 'modules.json');
    const index = {
      modules: moduleUids,
      lastUpdated: new Date().toISOString(),
      migratedFrom: 'customModules',
      migratedAt: new Date().toISOString()
    };
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
    console.log(`  📋 已建立模組索引`);
  }

  return { migrated, skipped };
}

/**
 * 主函數
 */
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║         模組遷移腳本                        ║');
  console.log('╚════════════════════════════════════════════╝');

  if (isDryRun) {
    console.log('\n⚠️ 試執行模式 - 不會實際修改任何檔案\n');
  }

  // 確保目標目錄存在
  await ensureDir(MODULES_DIR);

  // 取得用戶列表
  let users;
  if (specificUser) {
    users = [specificUser];
  } else {
    const files = await fs.readdir(DATA_DIR);
    users = files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  console.log(`\n將處理 ${users.length} 個用戶...`);

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const user of users) {
    const result = await migrateUser(user);
    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
  }

  console.log('\n────────────────────────────────────────────');
  console.log(`遷移完成!`);
  console.log(`  遷移: ${totalMigrated} 個模組`);
  console.log(`  跳過: ${totalSkipped} 個模組`);

  if (isDryRun && totalMigrated > 0) {
    console.log('\n執行以下命令以實際遷移:');
    console.log('  node server/scripts/migrate-modules.js');
  }
}

// 執行
main().catch(err => {
  console.error('\n❌ 遷移失敗:', err);
  process.exit(1);
});
