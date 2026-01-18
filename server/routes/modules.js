/**
 * 模組 API 路由
 * 統一管理內建模組、用戶自訂模組、訂閱和市集功能
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../..');
const MODULES_DIR = path.join(PROJECT_ROOT, 'public', 'modules');
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');

// ════════════════════════════════════════
// 輔助函數
// ════════════════════════════════════════

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
 * 安全地讀取 JSON 檔案
 */
async function readJsonFile(filePath, defaultValue = null) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * 安全地寫入 JSON 檔案
 */
async function writeJsonFile(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 驗證 ModuleSpec 基本結構
 */
function validateModuleSpec(spec) {
  const errors = [];

  if (!spec.uid || typeof spec.uid !== 'string') {
    errors.push('uid 為必填欄位');
  }
  if (!spec.name || typeof spec.name !== 'string') {
    errors.push('name 為必填欄位');
  }
  if (!spec.author || typeof spec.author !== 'string') {
    errors.push('author 為必填欄位');
  }

  return {
    valid: errors.length === 0,
    errors
  };
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
    updatedAt: now,
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

// ════════════════════════════════════════
// 用戶模組 CRUD API
// ════════════════════════════════════════

/**
 * GET /api/modules/users/:user
 * 取得用戶的所有自訂模組
 */
router.get('/users/:user', async (req, res) => {
  try {
    const { user } = req.params;
    const userModulesDir = path.join(MODULES_DIR, 'users', user);

    // 讀取模組索引
    const indexPath = path.join(userModulesDir, 'modules.json');
    const index = await readJsonFile(indexPath, { modules: [], lastUpdated: null });

    // 讀取每個模組的完整資料
    const modules = [];
    for (const uid of index.modules) {
      const modulePath = path.join(userModulesDir, `${uid}.json`);
      const module = await readJsonFile(modulePath);
      if (module) {
        modules.push(module);
      }
    }

    // 向後相容：也從用戶 JSON 讀取 customModules
    const userJsonPath = path.join(DATA_DIR, `${user}.json`);
    const userData = await readJsonFile(userJsonPath, {});
    if (userData.customModules && userData.customModules.length > 0) {
      // 將舊格式的模組加入（去重複）
      const existingUids = new Set(modules.map(m => m.uid));
      for (const oldModule of userData.customModules) {
        if (!existingUids.has(oldModule.uid)) {
          modules.push(oldModule);
        }
      }
    }

    res.json({ modules });

  } catch (error) {
    console.error('取得用戶模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/modules/users/:user/:uid
 * 取得單一自訂模組
 */
router.get('/users/:user/:uid', async (req, res) => {
  try {
    const { user, uid } = req.params;

    // 優先從獨立檔案讀取
    const modulePath = path.join(MODULES_DIR, 'users', user, `${uid}.json`);
    let module = await readJsonFile(modulePath);

    // 向後相容：從用戶 JSON 讀取
    if (!module) {
      const userJsonPath = path.join(DATA_DIR, `${user}.json`);
      const userData = await readJsonFile(userJsonPath, {});
      module = (userData.customModules || []).find(m => m.uid === uid);
    }

    if (!module) {
      return res.status(404).json({ error: '模組不存在' });
    }

    res.json(module);

  } catch (error) {
    console.error('取得模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/modules/users/:user
 * 新增自訂模組
 */
router.post('/users/:user', async (req, res) => {
  try {
    const { user } = req.params;
    const moduleSpec = req.body;

    // 補齊預設值
    const normalized = normalizeModuleSpec(moduleSpec, user);

    // 驗證
    const validation = validateModuleSpec(normalized);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    // 儲存到獨立檔案
    const userModulesDir = path.join(MODULES_DIR, 'users', user);
    const modulePath = path.join(userModulesDir, `${normalized.uid}.json`);
    await writeJsonFile(modulePath, normalized);

    // 更新索引
    const indexPath = path.join(userModulesDir, 'modules.json');
    const index = await readJsonFile(indexPath, { modules: [], lastUpdated: null });
    if (!index.modules.includes(normalized.uid)) {
      index.modules.push(normalized.uid);
    }
    index.lastUpdated = new Date().toISOString();
    await writeJsonFile(indexPath, index);

    // 同時更新用戶 JSON（向後相容）
    const userJsonPath = path.join(DATA_DIR, `${user}.json`);
    const userData = await readJsonFile(userJsonPath, {});
    if (!userData.customModules) {
      userData.customModules = [];
    }
    const existingIdx = userData.customModules.findIndex(m => m.uid === normalized.uid);
    if (existingIdx >= 0) {
      userData.customModules[existingIdx] = normalized;
    } else {
      userData.customModules.push(normalized);
    }
    await writeJsonFile(userJsonPath, userData);

    res.json({ success: true, module: normalized });

  } catch (error) {
    console.error('新增模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/modules/users/:user/:uid
 * 更新自訂模組
 */
router.put('/users/:user/:uid', async (req, res) => {
  try {
    const { user, uid } = req.params;
    const updates = req.body;

    // 讀取現有模組
    const modulePath = path.join(MODULES_DIR, 'users', user, `${uid}.json`);
    let existing = await readJsonFile(modulePath);

    // 向後相容
    if (!existing) {
      const userJsonPath = path.join(DATA_DIR, `${user}.json`);
      const userData = await readJsonFile(userJsonPath, {});
      existing = (userData.customModules || []).find(m => m.uid === uid);
    }

    if (!existing) {
      return res.status(404).json({ error: '模組不存在' });
    }

    // 合併更新
    const updated = {
      ...existing,
      ...updates,
      uid, // 確保 UID 不變
      updatedAt: new Date().toISOString()
    };

    // 儲存
    await writeJsonFile(modulePath, updated);

    // 同時更新用戶 JSON
    const userJsonPath = path.join(DATA_DIR, `${user}.json`);
    const userData = await readJsonFile(userJsonPath, {});
    if (userData.customModules) {
      const idx = userData.customModules.findIndex(m => m.uid === uid);
      if (idx >= 0) {
        userData.customModules[idx] = updated;
        await writeJsonFile(userJsonPath, userData);
      }
    }

    res.json({ success: true, module: updated });

  } catch (error) {
    console.error('更新模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/modules/users/:user/:uid
 * 刪除自訂模組
 */
router.delete('/users/:user/:uid', async (req, res) => {
  try {
    const { user, uid } = req.params;

    // 刪除獨立檔案
    const modulePath = path.join(MODULES_DIR, 'users', user, `${uid}.json`);
    try {
      await fs.unlink(modulePath);
    } catch (e) {
      // 檔案不存在也沒關係
    }

    // 更新索引
    const indexPath = path.join(MODULES_DIR, 'users', user, 'modules.json');
    const index = await readJsonFile(indexPath, { modules: [], lastUpdated: null });
    index.modules = index.modules.filter(m => m !== uid);
    index.lastUpdated = new Date().toISOString();
    await writeJsonFile(indexPath, index);

    // 從用戶 JSON 移除
    const userJsonPath = path.join(DATA_DIR, `${user}.json`);
    const userData = await readJsonFile(userJsonPath, {});
    if (userData.customModules) {
      userData.customModules = userData.customModules.filter(m => m.uid !== uid);
      await writeJsonFile(userJsonPath, userData);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('刪除模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════
// 發佈 API
// ════════════════════════════════════════

/**
 * POST /api/modules/users/:user/:uid/publish
 * 公開模組到市集
 */
router.post('/users/:user/:uid/publish', async (req, res) => {
  try {
    const { user, uid } = req.params;

    // 讀取模組
    const modulePath = path.join(MODULES_DIR, 'users', user, `${uid}.json`);
    const module = await readJsonFile(modulePath);

    if (!module) {
      return res.status(404).json({ error: '模組不存在' });
    }

    // 驗證公開條件
    if (!module.description || module.description.length < 10) {
      return res.status(400).json({ error: '公開模組的描述至少需要 10 個字元' });
    }

    // 更新模組狀態
    module.visibility = 'public';
    module.publishedAt = module.publishedAt || new Date().toISOString();
    module.updatedAt = new Date().toISOString();
    module.validation = {
      status: 'passed',
      checkedAt: new Date().toISOString()
    };

    await writeJsonFile(modulePath, module);

    // 更新市集索引
    const galleryPath = path.join(MODULES_DIR, 'gallery', 'index.json');
    const gallery = await readJsonFile(galleryPath, { modules: [], lastUpdated: null });

    // 建立市集項目
    const galleryItem = {
      uid: module.uid,
      name: module.name,
      author: module.author,
      authorDisplayName: module.authorDisplayName,
      icon: module.icon,
      description: module.description,
      category: module.category,
      tags: module.tags,
      subscriberCount: module.subscriberCount || 0,
      updatedAt: module.updatedAt
    };

    // 更新或新增
    const existingIdx = gallery.modules.findIndex(m => m.uid === uid);
    if (existingIdx >= 0) {
      gallery.modules[existingIdx] = galleryItem;
    } else {
      gallery.modules.push(galleryItem);
    }
    gallery.lastUpdated = new Date().toISOString();

    await writeJsonFile(galleryPath, gallery);

    res.json({ success: true, module });

  } catch (error) {
    console.error('公開模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/modules/users/:user/:uid/publish
 * 取消公開模組
 */
router.delete('/users/:user/:uid/publish', async (req, res) => {
  try {
    const { user, uid } = req.params;

    // 更新模組狀態
    const modulePath = path.join(MODULES_DIR, 'users', user, `${uid}.json`);
    const module = await readJsonFile(modulePath);

    if (!module) {
      return res.status(404).json({ error: '模組不存在' });
    }

    module.visibility = 'private';
    module.updatedAt = new Date().toISOString();
    await writeJsonFile(modulePath, module);

    // 從市集移除
    const galleryPath = path.join(MODULES_DIR, 'gallery', 'index.json');
    const gallery = await readJsonFile(galleryPath, { modules: [], lastUpdated: null });
    gallery.modules = gallery.modules.filter(m => m.uid !== uid);
    gallery.lastUpdated = new Date().toISOString();
    await writeJsonFile(galleryPath, gallery);

    res.json({ success: true });

  } catch (error) {
    console.error('取消公開失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════
// 訂閱 API
// ════════════════════════════════════════

/**
 * GET /api/modules/users/:user/subscriptions
 * 取得用戶的訂閱列表
 */
router.get('/users/:user/subscriptions', async (req, res) => {
  try {
    const { user } = req.params;
    const subPath = path.join(MODULES_DIR, 'users', user, 'subscriptions.json');
    const data = await readJsonFile(subPath, { subscriptions: [] });
    res.json(data);
  } catch (error) {
    console.error('取得訂閱失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/modules/users/:user/subscriptions
 * 訂閱模組
 */
router.post('/users/:user/subscriptions', async (req, res) => {
  try {
    const { user } = req.params;
    const { authorUsername, moduleUid } = req.body;

    if (!authorUsername || !moduleUid) {
      return res.status(400).json({ error: '缺少必要參數' });
    }

    // 讀取原模組
    const modulePath = path.join(MODULES_DIR, 'users', authorUsername, `${moduleUid}.json`);
    const module = await readJsonFile(modulePath);

    if (!module || module.visibility !== 'public') {
      return res.status(404).json({ error: '模組不存在或非公開' });
    }

    // 更新訂閱列表
    const subPath = path.join(MODULES_DIR, 'users', user, 'subscriptions.json');
    const data = await readJsonFile(subPath, { subscriptions: [] });

    // 檢查是否已訂閱
    if (data.subscriptions.some(s => s.moduleUid === moduleUid)) {
      return res.status(400).json({ error: '已訂閱此模組' });
    }

    // 新增訂閱
    const subscription = {
      moduleUid,
      authorUsername,
      subscribedAt: new Date().toISOString(),
      lastSyncedVersion: module.version,
      enabled: true,
      order: 99
    };
    data.subscriptions.push(subscription);
    await writeJsonFile(subPath, data);

    // 更新原模組的訂閱者數量
    if (!module.subscribers) module.subscribers = [];
    if (!module.subscribers.includes(user)) {
      module.subscribers.push(user);
    }
    module.subscriberCount = module.subscribers.length;
    await writeJsonFile(modulePath, module);

    res.json({ success: true, subscription, module });

  } catch (error) {
    console.error('訂閱失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/modules/users/:user/subscriptions/:uid
 * 取消訂閱
 */
router.delete('/users/:user/subscriptions/:uid', async (req, res) => {
  try {
    const { user, uid } = req.params;

    const subPath = path.join(MODULES_DIR, 'users', user, 'subscriptions.json');
    const data = await readJsonFile(subPath, { subscriptions: [] });

    const sub = data.subscriptions.find(s => s.moduleUid === uid);
    if (!sub) {
      return res.status(404).json({ error: '未訂閱此模組' });
    }

    // 移除訂閱
    data.subscriptions = data.subscriptions.filter(s => s.moduleUid !== uid);
    await writeJsonFile(subPath, data);

    // 更新原模組的訂閱者數量
    try {
      const modulePath = path.join(MODULES_DIR, 'users', sub.authorUsername, `${uid}.json`);
      const module = await readJsonFile(modulePath);
      if (module && module.subscribers) {
        module.subscribers = module.subscribers.filter(u => u !== user);
        module.subscriberCount = module.subscribers.length;
        await writeJsonFile(modulePath, module);
      }
    } catch (e) {
      // 忽略錯誤
    }

    res.json({ success: true });

  } catch (error) {
    console.error('取消訂閱失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════
// 市集 API
// ════════════════════════════════════════

/**
 * GET /api/modules/gallery
 * 取得市集模組列表
 */
router.get('/gallery', async (req, res) => {
  try {
    const { category, search, sort = 'popular', page = 1, limit = 20 } = req.query;

    const galleryPath = path.join(MODULES_DIR, 'gallery', 'index.json');
    const gallery = await readJsonFile(galleryPath, { modules: [], categories: [] });

    let modules = [...gallery.modules];

    // 分類篩選
    if (category) {
      modules = modules.filter(m => m.category === category);
    }

    // 搜尋
    if (search) {
      const q = search.toLowerCase();
      modules = modules.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        (m.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // 排序
    switch (sort) {
      case 'recent':
        modules.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      case 'popular':
      default:
        modules.sort((a, b) => (b.subscriberCount || 0) - (a.subscriberCount || 0));
        break;
    }

    // 分頁
    const start = (parseInt(page) - 1) * parseInt(limit);
    const end = start + parseInt(limit);
    const paged = modules.slice(start, end);

    res.json({
      modules: paged,
      total: modules.length,
      page: parseInt(page),
      limit: parseInt(limit),
      categories: gallery.categories
    });

  } catch (error) {
    console.error('取得市集失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/modules/gallery/:uid
 * 取得市集單一模組詳情
 */
router.get('/gallery/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // 從市集索引找到作者
    const galleryPath = path.join(MODULES_DIR, 'gallery', 'index.json');
    const gallery = await readJsonFile(galleryPath, { modules: [] });
    const item = gallery.modules.find(m => m.uid === uid);

    if (!item) {
      return res.status(404).json({ error: '模組不存在' });
    }

    // 讀取完整模組
    const modulePath = path.join(MODULES_DIR, 'users', item.author, `${uid}.json`);
    const module = await readJsonFile(modulePath);

    if (!module) {
      return res.status(404).json({ error: '模組不存在' });
    }

    // 增加瀏覽次數
    module.stats = module.stats || { views: 0, likes: 0, uses: 0 };
    module.stats.views++;
    await writeJsonFile(modulePath, module);

    res.json(module);

  } catch (error) {
    console.error('取得模組詳情失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

// ════════════════════════════════════════
// 內建模組 API
// ════════════════════════════════════════

/**
 * GET /api/modules/builtin
 * 取得所有內建模組（從 manifest.json 讀取）
 */
router.get('/builtin', async (req, res) => {
  try {
    const builtinDir = path.join(PROJECT_ROOT, 'src', 'modules', 'builtin');
    const dirs = await fs.readdir(builtinDir);

    const modules = [];
    for (const dir of dirs) {
      const manifestPath = path.join(builtinDir, dir, 'manifest.json');
      const manifest = await readJsonFile(manifestPath);
      if (manifest) {
        modules.push(manifest);
      }
    }

    // 按 defaultOrder 排序
    modules.sort((a, b) => (a.defaultOrder || 99) - (b.defaultOrder || 99));

    res.json({ modules });

  } catch (error) {
    console.error('取得內建模組失敗:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
