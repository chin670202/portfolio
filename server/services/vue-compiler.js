/**
 * Vue SFC 編譯服務
 * 將用戶的 .vue 檔案編譯成可在前端動態執行的格式
 */

const { parse, compileScript, compileTemplate, compileStyle } = require('@vue/compiler-sfc')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')

/**
 * 編譯 Vue SFC 檔案
 * @param {string} vueContent - Vue SFC 原始內容
 * @param {string} filename - 檔案名稱（用於錯誤訊息）
 * @returns {Object} 編譯結果 { success, template, script, styles, errors }
 */
function compileSFC(vueContent, filename = 'component.vue') {
  try {
    // 解析 SFC
    const { descriptor, errors: parseErrors } = parse(vueContent, {
      filename,
      sourceMap: false
    })

    if (parseErrors && parseErrors.length > 0) {
      return {
        success: false,
        errors: parseErrors.map(e => e.message)
      }
    }

    const id = crypto.createHash('md5').update(vueContent).digest('hex').slice(0, 8)
    const scopeId = `data-v-${id}`

    // 編譯 template
    let templateCode = ''
    if (descriptor.template) {
      const templateResult = compileTemplate({
        source: descriptor.template.content,
        filename,
        id,
        scoped: descriptor.styles.some(s => s.scoped),
        compilerOptions: {
          scopeId: descriptor.styles.some(s => s.scoped) ? scopeId : undefined
        }
      })

      if (templateResult.errors && templateResult.errors.length > 0) {
        return {
          success: false,
          errors: templateResult.errors.map(e => typeof e === 'string' ? e : e.message)
        }
      }

      templateCode = templateResult.code
    }

    // 編譯 script setup
    let scriptCode = ''
    let bindings = {}
    if (descriptor.scriptSetup || descriptor.script) {
      const scriptResult = compileScript(descriptor, {
        id,
        inlineTemplate: false,
        templateOptions: {
          scoped: descriptor.styles.some(s => s.scoped),
          scopeId
        }
      })

      scriptCode = scriptResult.content
      bindings = scriptResult.bindings || {}
    }

    // 編譯 styles
    const styles = []
    for (const style of descriptor.styles) {
      const styleResult = compileStyle({
        source: style.content,
        filename,
        id,
        scoped: style.scoped
      })

      if (styleResult.errors && styleResult.errors.length > 0) {
        return {
          success: false,
          errors: styleResult.errors.map(e => e.message)
        }
      }

      styles.push({
        code: styleResult.code,
        scoped: style.scoped
      })
    }

    return {
      success: true,
      template: templateCode,
      script: scriptCode,
      styles,
      bindings,
      scopeId
    }

  } catch (error) {
    return {
      success: false,
      errors: [error.message]
    }
  }
}

/**
 * 編譯用戶儀表板並回傳可用於前端的格式
 * @param {string} username - 用戶名稱
 * @returns {Object} { success, compiled, raw, errors }
 */
async function compileUserDashboard(username) {
  const DASHBOARDS_DIR = path.join(__dirname, '../dashboards')
  const userDashboardPath = path.join(DASHBOARDS_DIR, `${username}.vue`)
  const templatePath = path.join(DASHBOARDS_DIR, 'template.vue')

  let vueContent

  try {
    // 嘗試讀取用戶專屬儀表板
    vueContent = await fs.readFile(userDashboardPath, 'utf-8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      // 用戶沒有專屬儀表板，從模板複製
      try {
        vueContent = await fs.readFile(templatePath, 'utf-8')
        // 建立用戶的儀表板檔案
        await fs.writeFile(userDashboardPath, vueContent, 'utf-8')
        console.log(`[VueCompiler] 為用戶 ${username} 建立新儀表板`)
      } catch (templateErr) {
        return {
          success: false,
          errors: [`無法讀取模板: ${templateErr.message}`]
        }
      }
    } else {
      return {
        success: false,
        errors: [`讀取儀表板失敗: ${err.message}`]
      }
    }
  }

  // 編譯 Vue SFC
  const compiled = compileSFC(vueContent, `${username}.vue`)

  if (!compiled.success) {
    return {
      success: false,
      errors: compiled.errors
    }
  }

  // 回傳編譯結果和原始內容（前端需要兩者）
  return {
    success: true,
    compiled: {
      template: compiled.template,
      script: compiled.script,
      styles: compiled.styles,
      scopeId: compiled.scopeId
    },
    raw: vueContent
  }
}

/**
 * 取得用戶儀表板的原始 Vue 內容
 */
async function getUserDashboardRaw(username) {
  const DASHBOARDS_DIR = path.join(__dirname, '../dashboards')
  const userDashboardPath = path.join(DASHBOARDS_DIR, `${username}.vue`)
  const templatePath = path.join(DASHBOARDS_DIR, 'template.vue')

  try {
    return await fs.readFile(userDashboardPath, 'utf-8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      // 回傳模板內容
      return await fs.readFile(templatePath, 'utf-8')
    }
    throw err
  }
}

/**
 * 儲存用戶儀表板
 */
async function saveUserDashboard(username, content) {
  const DASHBOARDS_DIR = path.join(__dirname, '../dashboards')
  const userDashboardPath = path.join(DASHBOARDS_DIR, `${username}.vue`)

  await fs.writeFile(userDashboardPath, content, 'utf-8')
  console.log(`[VueCompiler] 已儲存用戶 ${username} 的儀表板`)
}

module.exports = {
  compileSFC,
  compileUserDashboard,
  getUserDashboardRaw,
  saveUserDashboard
}
