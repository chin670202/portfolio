/**
 * 模組系統入口
 */

// 從新的 registry 匯出
export {
  getBuiltinModules,
  getBuiltinModule,
  getModuleDefinition,
  getAllModules,
  getDefaultModuleConfig,
  mergeModuleConfig,
  getAllAvailableModules,
  loadUserModules,
  loadSubscribedModules,
  createCustomModule,
  updateCustomModule,
  deleteCustomModule,
  publishModule,
  unpublishModule,
  subscribeModule,
  unsubscribeModule,
  getGalleryModules,
  getGalleryModule,
  validateModuleSpec,
  normalizeModuleSpec,
  generateCustomModuleUid
} from './registry'

// 元件匯出
export { default as ModuleContainer } from './ModuleContainer.vue'
export { default as ModuleGallery } from './ModuleGallery.vue'
export { default as ModuleCard } from './ModuleCard.vue'
