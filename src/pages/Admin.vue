<template>
  <div class="admin">
    <!-- ── 登录 ── -->
    <div v-if="!authed" class="login-wrap">
      <div class="login-card glass">
        <div class="login-card__logo">🎮</div>
        <h1 class="login-card__title">GameHub 管理后台</h1>
        <p class="text-low">输入 GitHub 细粒度 PAT（仅 GameHub 仓库 contents:write）</p>
        <input
          v-model="tokenInput"
          type="password"
          class="form-input"
          placeholder="github_pat_..."
          @keydown.enter="login"
        />
        <button class="btn btn-primary" style="width: 100%" :disabled="loading" @click="login">
          {{ loading ? '验证中...' : '登录' }}
        </button>
        <p v-if="loginError" class="login-error">{{ loginError }}</p>
        <p class="text-low" style="font-size: 12px; margin-top: 10px">
          Token 仅保存在本浏览器 sessionStorage，关闭页面自动清除，绝不写入仓库。
        </p>
      </div>
    </div>

    <!-- ── 主界面 ── -->
    <div v-else class="admin-main">
      <header class="admin-topbar">
        <div class="container flex-between">
          <div class="flex gap-sm">
            <span class="admin-logo">🎮 GameHub 后台</span>
            <span class="badge">已连接 {{ repo }}</span>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-sm" :disabled="saving" @click="deploy">
              {{ deploying ? '触发中...' : '🚀 重新部署' }}
            </button>
            <button class="btn btn-sm" @click="logout">退出</button>
          </div>
        </div>
      </header>

      <div class="container admin-body">
        <nav class="admin-nav">
          <button
            v-for="t in tabs"
            :key="t.key"
            class="admin-nav__item"
            :class="{ active: tab === t.key }"
            @click="tab = t.key"
          >{{ t.icon }} {{ t.name }}</button>
        </nav>

        <div class="admin-content glass">
          <!-- ═══ 总览 Dashboard ═══ -->
          <template v-if="tab === 'dashboard'">
            <h2 class="mb-md">📈 数据总览</h2>

            <!-- 统计卡片 -->
            <div class="stat-grid mb-md">
              <div class="stat-card">
                <div class="stat-card__num">{{ resources.length }}</div>
                <div class="stat-card__label">资源总数</div>
              </div>
              <div class="stat-card">
                <div class="stat-card__num">{{ todayAdded }}</div>
                <div class="stat-card__label">今日新增</div>
              </div>
              <div class="stat-card">
                <div class="stat-card__num">{{ monthAdded }}</div>
                <div class="stat-card__label">本月新增</div>
              </div>
              <div class="stat-card">
                <div class="stat-card__num">{{ featuredCount }}</div>
                <div class="stat-card__label">首页推荐</div>
              </div>
              <div class="stat-card" :class="{ warn: inactiveCount > 0 }">
                <div class="stat-card__num">{{ inactiveCount }}</div>
                <div class="stat-card__label">失效链接</div>
              </div>
            </div>

            <!-- 数据完整度 -->
            <h3 class="mb-sm">🩺 数据完整度</h3>
            <div class="mb-md">
              <div v-for="m in integrity" :key="m.label" class="integrity-row">
                <span class="integrity-row__label">{{ m.label }}</span>
                <div class="integrity-bar">
                  <div class="integrity-bar__fill" :style="{ width: m.pct + '%', background: m.pct === 100 ? 'var(--accent-sage)' : m.pct >= 50 ? 'var(--accent-gold)' : '#fb7185' }"></div>
                </div>
                <span class="integrity-row__val">{{ m.ok }}/{{ m.total }} ({{ m.pct }}%)</span>
              </div>
            </div>

            <div class="dash-grid">
              <!-- 分类分布 -->
              <div class="glass dash-panel">
                <h3 class="mb-sm">🗂️ 分类分布</h3>
                <div v-for="c in catDist" :key="c.name" class="dist-row">
                  <span class="dist-row__label">{{ c.emoji }} {{ c.name }}</span>
                  <div class="dist-bar"><div class="dist-bar__fill" :style="{ width: c.pct + '%' }"></div></div>
                  <span class="dist-row__val">{{ c.count }}</span>
                </div>
              </div>
              <!-- 月度趋势 -->
              <div class="glass dash-panel">
                <h3 class="mb-sm">📅 月度新增趋势</h3>
                <div class="trend">
                  <div v-for="m in monthTrend" :key="m.month" class="trend-col">
                    <div class="trend-col__bar" :style="{ height: m.pct + '%' }" :title="m.month + ': ' + m.count + ' 条'"></div>
                    <div class="trend-col__label">{{ m.label }}</div>
                  </div>
                </div>
                <p v-if="!monthTrend.length" class="text-low">暂无数据</p>
              </div>
            </div>

            <!-- 数据质量告警 -->
            <div v-if="qualityWarns.length" class="mt-md">
              <h3 class="mb-sm">⚠️ 数据质量提示</h3>
              <div v-for="w in qualityWarns" :key="w" class="warn-row">{{ w }}</div>
            </div>
          </template>

          <!-- ═══ 资源管理 ═══ -->
          <template v-if="tab === 'resources'">
            <div class="flex-between wrap gap-sm mb-md">
              <h2>📦 资源管理 <span class="text-low" style="font-size: 13px">{{ resources.length }} 条</span></h2>
              <div class="flex gap-sm wrap">
                <input v-model="resSearch" class="form-input" style="width: 200px" placeholder="搜索标题/链接..." />
                <button class="btn btn-sm" @click="openImport">📥 批量导入</button>
                <button class="btn btn-sm btn-primary" @click="openEdit()">＋ 新增资源</button>
              </div>
            </div>

            <div class="table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>标题</th>
                    <th>分类</th>
                    <th>平台</th>
                    <th>提取码</th>
                    <th>大小</th>
                    <th>状态</th>
                    <th>时间</th>
                    <th style="width: 130px">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in filteredResources" :key="r.id">
                    <td class="text-low" style="font-size: 12px">{{ r.id }}</td>
                    <td class="res-title">{{ r.title }}</td>
                    <td><span class="badge">{{ catLabel(r.category) }}</span></td>
                    <td>{{ platIcon(r.platform) }}</td>
                    <td><code class="pwd">{{ r.pwd || '—' }}</code></td>
                    <td class="text-low">{{ r.size || '—' }}</td>
                    <td>
                      <span class="badge" :class="r.status === 'active' ? 'ok' : 'bad'">
                        {{ r.status === 'active' ? '正常' : '失效' }}
                      </span>
                    </td>
                    <td class="text-low" style="font-size: 12px">{{ fmtShort(r.addedAt) }}</td>
                    <td>
                      <button class="btn btn-sm" @click="openEdit(r)">编辑</button>
                      <button class="btn btn-sm btn-danger" @click="removeRes(r)">删除</button>
                    </td>
                  </tr>
                  <tr v-if="!filteredResources.length">
                    <td colspan="9" class="empty-row text-low">暂无资源，点击右上角"新增"或"批量导入"</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>

          <!-- ═══ 分类管理 ═══ -->
          <template v-else-if="tab === 'categories'">
            <div class="flex-between mb-md">
              <h2>🏷️ 分类管理</h2>
              <button class="btn btn-sm btn-primary" @click="openCatEdit()">＋ 新增分类</button>
            </div>
            <div class="cat-list">
              <div v-for="c in sortedCats" :key="c.key" class="cat-row">
                <span class="cat-row__icon" :style="catIconStyle(c)">{{ c.emoji }}</span>
                <span class="cat-row__name">{{ c.name }}</span>
                <code class="text-low">{{ c.key }}</code>
                <span class="badge">{{ countBy(c.key) }} 个</span>
                <span class="text-low" style="font-size: 12px">order: {{ c.order }}</span>
                <span class="badge" :class="c.show ? 'ok' : ''">{{ c.show ? '显示' : '隐藏' }}</span>
                <div class="cat-row__ops">
                  <button class="btn btn-sm" @click="moveCat(c, -1)">↑</button>
                  <button class="btn btn-sm" @click="moveCat(c, 1)">↓</button>
                  <button class="btn btn-sm" @click="openCatEdit(c)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="removeCat(c)">删除</button>
                </div>
              </div>
            </div>
          </template>

          <!-- ═══ 站点配置 ═══ -->
          <template v-else-if="tab === 'site'">
            <h2 class="mb-md">⚙️ 站点配置</h2>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">站点名称</label>
                <input v-model="siteForm.siteName" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">口号</label>
                <input v-model="siteForm.slogan" class="form-input" />
              </div>
              <div class="form-group" style="grid-column: 1/-1">
                <label class="form-label">公告</label>
                <input v-model="siteForm.announcement" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">QQ群链接</label>
                <input v-model="siteForm.qqGroup" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Telegram</label>
                <input v-model="siteForm.telegram" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">联系邮箱</label>
                <input v-model="siteForm.email" class="form-input" />
              </div>
              <div class="form-group" style="grid-column: 1/-1">
                <label class="form-label">页脚文案</label>
                <input v-model="siteForm.footer" class="form-input" />
              </div>
              <div class="form-group" style="grid-column: 1/-1">
                <label class="form-label">热门关键词（逗号分隔）</label>
                <input v-model="hotKeywordsStr" class="form-input" />
              </div>
            </div>
          </template>

          <!-- ═══ 批量导入 ═══ -->
          <template v-else-if="tab === 'import'">
            <h2 class="mb-md">📥 批量导入资源</h2>
            <p class="text-low mb-md">
              每行一条，支持格式：<code>标题 | https://...?pwd=xxx</code> 或 <code>标题 https://...</code> 或纯链接。<br />
              默认导入到分类：<select v-model="importCat" class="form-input" style="width: auto; display: inline-block">
                <option v-for="c in state.categories" :key="c.key" :value="c.key">{{ c.name }}</option>
              </select>
            </p>
            <textarea v-model="importText" class="form-input import-area" placeholder="粘贴资源列表..."></textarea>
            <div class="flex gap-sm mt-md">
              <button class="btn btn-primary" :disabled="!importParsed.length" @click="previewImport">解析预览</button>
            </div>

            <div v-if="importParsed.length" class="mt-md">
              <div class="flex-between mb-md">
                <h3>解析出 {{ importParsed.length }} 条（重复 {{ importDup.length }} 条已剔除）</h3>
                <button class="btn btn-primary" :disabled="saving" @click="saveImport">✅ 确认导入并提交</button>
              </div>
              <div class="table-wrap">
                <table class="admin-table">
                  <thead><tr><th>标题</th><th>平台</th><th>提取码</th><th>链接</th></tr></thead>
                  <tbody>
                    <tr v-for="(r, i) in importParsed" :key="i">
                      <td>{{ r.title }}</td>
                      <td>{{ platIcon(r.platform) }}</td>
                      <td><code class="pwd">{{ r.pwd || '—' }}</code></td>
                      <td class="text-low" style="font-size: 12px; word-break: break-all">{{ r.url }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <!-- 保存条 -->
          <div v-if="dirty" class="save-bar">
            <div class="flex gap-sm">
              <input v-model="commitMsg" class="form-input" style="flex: 1" placeholder="commit message，如：add: 新增5个游戏资源" />
              <button class="btn btn-primary" :disabled="saving" @click="saveAll">{{ saving ? '提交中...' : '💾 提交到 GitHub' }}</button>
            </div>
            <p class="save-bar__hint text-low">提交后将自动触发 GitHub Actions 重新部署（3-5 分钟）</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="editVisible" class="modal-mask" @click.self="editVisible = false">
      <div class="modal glass modal--wide">
        <h3 class="modal__title">{{ editing.id ? '编辑资源' : '新增资源' }}</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">标题 *</label>
            <input v-model="editing.title" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">英文名</label>
            <input v-model="editing.enTitle" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">分类 *</label>
            <select v-model="editing.category" class="form-input">
              <option v-for="c in state.categories" :key="c.key" :value="c.key">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">平台 *</label>
            <select v-model="editing.platform" class="form-input">
              <option v-for="(p, k) in state.site?.platforms" :key="k" :value="k">{{ p.label }}</option>
            </select>
          </div>
          <div class="form-group" style="grid-column: 1/-1">
            <label class="form-label">网盘链接 *</label>
            <input v-model="editing.url" class="form-input" placeholder="https://pan.quark.cn/s/..." />
          </div>
          <div class="form-group">
            <label class="form-label">提取码</label>
            <input v-model="editing.pwd" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">大小（展示用）</label>
            <input v-model="editing.size" class="form-input" placeholder="12.5GB" />
          </div>
          <div class="form-group">
            <label class="form-label">大小（字节，排序用）</label>
            <input v-model.number="editing.sizeBytes" type="number" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">封面 URL（可空）</label>
            <input v-model="editing.cover" class="form-input" placeholder="留空自动生成霓虹渐变封面" />
          </div>
          <div class="form-group" style="grid-column: 1/-1">
            <label class="form-label">描述</label>
            <input v-model="editing.desc" class="form-input" placeholder="豪华中文版 解压即玩" />
          </div>
          <div class="form-group" style="grid-column: 1/-1">
            <label class="form-label">标签（逗号分隔，最多8个）</label>
            <input v-model="editing.tagsStr" class="form-input" placeholder="动作, 联机, 中文" />
          </div>
          <div class="form-group">
            <label class="form-label">添加时间（ISO 到秒）</label>
            <input v-model="editing.addedAt" class="form-input" placeholder="2026-08-25T10:00:00+08:00" />
          </div>
          <div class="form-group flex gap-md">
            <label class="flex gap-sm" style="cursor: pointer">
              <input v-model="editing.featured" type="checkbox" /> 首页推荐
            </label>
            <label class="flex gap-sm" style="cursor: pointer">
              <input v-model="editing.statusInactive" type="checkbox" /> 链接失效
            </label>
          </div>
        </div>
        <div class="flex gap-sm mt-md">
          <button class="btn btn-primary" @click="confirmEdit">保存</button>
          <button class="btn" @click="editVisible = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 分类编辑弹窗 -->
    <div v-if="catEditVisible" class="modal-mask" @click.self="catEditVisible = false">
      <div class="modal glass">
        <h3 class="modal__title">{{ catEditing.key ? '编辑分类' : '新增分类' }}</h3>
        <div class="form-group">
          <label class="form-label">key（英文，唯一）*</label>
          <input v-model="catEditing.key" class="form-input" :disabled="!!catEditing.originalKey" />
        </div>
        <div class="form-group">
          <label class="form-label">名称 *</label>
          <input v-model="catEditing.name" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">Emoji</label>
          <input v-model="catEditing.emoji" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">渐变色1</label>
          <input v-model="catEditing.gradient0" class="form-input" placeholder="#c99a5b" />
        </div>
        <div class="form-group">
          <label class="form-label">渐变色2</label>
          <input v-model="catEditing.gradient1" class="form-input" placeholder="#a87b3f" />
        </div>
        <div class="form-group">
          <label class="form-label">排序（小在前）</label>
          <input v-model.number="catEditing.order" type="number" class="form-input" />
        </div>
        <label class="flex gap-sm mb-md" style="cursor: pointer">
          <input v-model="catEditing.show" type="checkbox" /> 前台显示
        </label>
        <div class="flex gap-sm">
          <button class="btn btn-primary" @click="confirmCatEdit">保存</button>
          <button class="btn" @click="catEditVisible = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useData } from '../composables/useData.js'

const { state, load, parseLines, catLabel, catMeta } = useData()

const REPO = 'xi7ang/GameHub'
const BASE = 'https://api.github.com'
const TOKEN_KEY = 'gamehub-pat'

// ── 登录状态 ──
const tokenInput = ref('')
const authed = ref(false)
const loading = ref(false)
const loginError = ref('')
const token = ref('')

async function login() {
  const t = (tokenInput.value || '').trim()
  if (!t) return
  loading.value = true
  loginError.value = ''
  try {
    const res = await fetch(`${BASE}/repos/${REPO}`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) throw new Error(`验证失败: ${res.status}`)
    token.value = t
    sessionStorage.setItem(TOKEN_KEY, t)
    authed.value = true
    await refreshAll()
  } catch (e) {
    loginError.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}
function logout() {
  sessionStorage.removeItem(TOKEN_KEY)
  authed.value = false
  token.value = ''
  tokenInput.value = ''
}

// ── GitHub API 封装 ──
const apiHeaders = () => ({
  Authorization: `Bearer ${token.value}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
})

async function ghGet(path) {
  const res = await fetch(`${BASE}/repos/${REPO}${path}`, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`)
  return res.json()
}
async function ghPut(path, body) {
  const res = await fetch(`${BASE}/repos/${REPO}${path}`, {
    method: 'PUT',
    headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`PUT ${path}: ${res.status} ${err.message || ''}`)
  }
  return res.json()
}

// 读文件（拿 sha + 内容）
const fileCache = reactive({})
async function readFile(filePath) {
  const meta = await ghGet(`/contents/${filePath}`)
  const content = JSON.parse(decodeURIComponent(escape(atob(meta.content.replace(/\n/g, '')))))
  fileCache[filePath] = { sha: meta.sha, content }
  return content
}
async function writeFile(filePath, content, message) {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
  }
  if (fileCache[filePath]?.sha) body.sha = fileCache[filePath].sha
  const meta = await ghPut(`/contents/${filePath}`, body)
  fileCache[filePath] = { sha: meta.content.sha, content }
}

// ── 数据状态 ──
const resources = ref([])
const cats = ref([])
const siteForm = reactive({})
const dirty = ref(false)
const saving = ref(false)
const commitMsg = ref('')

// 站点配置表单 deep watch：任何字段修改即标记 dirty，显示保存条
// siteInit 标志防止 refreshAll() 初始化填充时误触发
const siteInit = ref(false)
watch(
  siteForm,
  () => {
    if (siteInit.value) dirty.value = true
  },
  { deep: true, flush: 'sync' }
)
const tab = ref('dashboard')
const tabs = [
  { key: 'dashboard', icon: '📈', name: '总览' },
  { key: 'resources', icon: '📦', name: '资源管理' },
  { key: 'categories', icon: '🏷️', name: '分类管理' },
  { key: 'site', icon: '⚙️', name: '站点配置' },
  { key: 'import', icon: '📥', name: '批量导入' },
]

// ── Dashboard 统计 ──
const todayAdded = computed(() => {
  const t = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const today = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`
  return resources.value.filter((r) => (r.addedAt || '').startsWith(today)).length
})
const monthAdded = computed(() => {
  const t = new Date()
  const ym = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, '0')}`
  return resources.value.filter((r) => (r.month || '') === ym).length
})
const featuredCount = computed(() => resources.value.filter((r) => r.featured).length)
const inactiveCount = computed(() => resources.value.filter((r) => r.status === 'inactive').length)

const integrity = computed(() => {
  const total = resources.value.length || 1
  const mk = (label, okCount) => ({
    label,
    ok: okCount,
    total: resources.value.length,
    pct: Math.round((okCount / total) * 100),
  })
  return [
    mk('大小 (size)', resources.value.filter((r) => r.size).length),
    mk('封面 (cover)', resources.value.filter((r) => r.cover).length),
    mk('英文名 (enTitle)', resources.value.filter((r) => r.enTitle).length),
    mk('描述 (desc)', resources.value.filter((r) => r.desc).length),
  ]
})

const catDist = computed(() => {
  const total = resources.value.length || 1
  return [...cats.value]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      name: c.name,
      emoji: c.emoji || '📦',
      count: resources.value.filter((r) => r.category === c.key).length,
      pct: Math.round((resources.value.filter((r) => r.category === c.key).length / total) * 100),
    }))
})

const monthTrend = computed(() => {
  const map = {}
  resources.value.forEach((r) => { if (r.month) map[r.month] = (map[r.month] || 0) + 1 })
  const keys = Object.keys(map).sort().slice(-6)
  const max = Math.max(1, ...keys.map((k) => map[k]))
  return keys.map((k) => ({
    month: k,
    label: `${k.slice(0, 4)}.${k.slice(4)}`,
    count: map[k],
    pct: Math.round((map[k] / max) * 100),
  }))
})

const qualityWarns = computed(() => {
  const warns = []
  if (!resources.value.length) return warns
  const noSize = resources.value.filter((r) => !r.size).length
  const noCover = resources.value.filter((r) => !r.cover).length
  const noEn = resources.value.filter((r) => !r.enTitle).length
  if (noSize) warns.push(`📏 有 ${noSize} 条资源未填大小（占 ${Math.round((noSize / resources.value.length) * 100)}%），排序与展示不完整`)
  if (noCover) warns.push(`🖼️ 有 ${noCover} 条资源无封面（占 ${Math.round((noCover / resources.value.length) * 100)}%），前台将显示渐变占位图`)
  if (noEn) warns.push(`🌐 有 ${noEn} 条资源缺英文名（占 ${Math.round((noEn / resources.value.length) * 100)}%），Steam 封面匹配和英文搜索受影响`)
  cats.value.forEach((c) => {
    if (c.show && !resources.value.some((r) => r.category === c.key)) warns.push(`📭 分类「${c.name}」前台显示但无资源`)
  })
  return warns
})

const hotKeywordsStr = computed({
  get: () => (siteForm.hotKeywords || []).join(', '),
  set: (v) => (siteForm.hotKeywords = v.split(/[,，]/).map((s) => s.trim()).filter(Boolean)),
})

async function refreshAll() {
  siteInit.value = false // 初始化填充期间不触发 dirty
  resources.value = await readFile('public/data/resources.json')
  cats.value = await readFile('public/data/categories.json')
  const site = await readFile('public/data/site.json')
  Object.assign(siteForm, JSON.parse(JSON.stringify(site)))
  siteInit.value = true // 之后用户任何修改都会触发 dirty
  // 同步前台展示数据
  state.resources = [...resources.value]
  state.categories = [...cats.value]
  state.site = { ...siteForm }
}

// ── 资源 CRUD ──
const resSearch = ref('')
const filteredResources = computed(() => {
  const q = resSearch.value.trim().toLowerCase()
  if (!q) return resources.value
  return resources.value.filter((r) => `${r.title} ${r.url} ${r.id}`.toLowerCase().includes(q))
})

const editVisible = ref(false)
const editing = reactive({})
function blankEdit() {
  const now = new Date()
  const iso = now.toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/T/, 'T')
  return {
    id: '',
    title: '',
    enTitle: '',
    category: cats.value[0]?.key || 'pc',
    tagsStr: '',
    platform: 'quark',
    url: '',
    pwd: '',
    size: '',
    sizeBytes: null,
    cover: '',
    desc: '',
    statusInactive: false,
    featured: false,
    addedAt: iso,
  }
}
function openEdit(r) {
  Object.assign(editing, r ? {
    ...r,
    tagsStr: (r.tags || []).join(', '),
    statusInactive: r.status === 'inactive',
  } : blankEdit())
  editVisible.value = true
}
function confirmEdit() {
  if (!editing.title || !editing.url || !editing.category) { alert('标题/链接/分类必填'); return }
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/T/, 'T')
  const month = (editing.addedAt || nowIso).slice(0, 7).replace('-', '')
  const item = {
    id: editing.id || genId(editing.category, month),
    title: editing.title.trim(),
    enTitle: editing.enTitle.trim(),
    category: editing.category,
    tags: editing.tagsStr.split(/[,，]/).map((s) => s.trim()).filter(Boolean).slice(0, 8),
    platform: editing.platform,
    url: editing.url.trim(),
    pwd: editing.pwd.trim() || null,
    size: editing.size.trim() || '',
    sizeBytes: editing.sizeBytes || null,
    cover: editing.cover.trim() || '',
    desc: editing.desc.trim(),
    status: editing.statusInactive ? 'inactive' : 'active',
    featured: !!editing.featured,
    addedAt: editing.addedAt || nowIso,
    updatedAt: editing.id ? nowIso : editing.addedAt || nowIso,
    month,
  }
  const idx = resources.value.findIndex((x) => x.id === item.id)
  if (idx >= 0) resources.value[idx] = item
  else resources.value.push(item)
  editVisible.value = false
  dirty.value = true
}
function removeRes(r) {
  if (!confirm(`删除「${r.title}」？`)) return
  resources.value = resources.value.filter((x) => x.id !== r.id)
  dirty.value = true
}

// ── ID 生成 ──
function genId(category, month) {
  const prefix = `${category}-${month}-`
  const existing = resources.value.filter((r) => r.id?.startsWith(prefix))
  const max = existing.reduce((m, r) => Math.max(m, parseInt(r.id.split('-').pop() || '0', 10)), 0)
  return `${prefix}${String(max + 1).padStart(4, '0')}`
}

// ── 分类 CRUD ──
const sortedCats = computed(() => [...cats.value].sort((a, b) => a.order - b.order))
const catEditVisible = ref(false)
const catEditing = reactive({})
function openCatEdit(c) {
  Object.assign(catEditing, c ? {
    ...c,
    gradient0: c.gradient[0],
    gradient1: c.gradient[1],
    originalKey: c.key,
  } : { key: '', name: '', emoji: '🎮', gradient0: '#c99a5b', gradient1: '#a87b3f', order: cats.value.length + 1, show: true, originalKey: null })
  catEditVisible.value = true
}
function confirmCatEdit() {
  if (!catEditing.key || !catEditing.name) { alert('key 和名称必填'); return }
  const item = {
    key: catEditing.key,
    name: catEditing.name,
    emoji: catEditing.emoji || '🎮',
    gradient: [catEditing.gradient0 || '#c99a5b', catEditing.gradient1 || '#a87b3f'],
    order: catEditing.order || 99,
    show: catEditing.show,
  }
  if (catEditing.originalKey) {
    const idx = cats.value.findIndex((x) => x.key === catEditing.originalKey)
    if (idx >= 0) cats.value[idx] = item
  } else {
    cats.value.push(item)
  }
  catEditVisible.value = false
  dirty.value = true
}
function removeCat(c) {
  if (cats.value.length <= 1) { alert('至少保留一个分类'); return }
  if (!confirm(`删除分类「${c.name}」？该分类下 ${countBy(c.key)} 个资源不会被删除，但会失去分类归属。`)) return
  cats.value = cats.value.filter((x) => x.key !== c.key)
  dirty.value = true
}
function moveCat(c, dir) {
  const list = [...cats.value].sort((a, b) => a.order - b.order)
  const idx = list.findIndex((x) => x.key === c.key)
  const target = idx + dir
  if (target < 0 || target >= list.length) return
  const tmp = list[idx].order
  list[idx].order = list[target].order
  list[target].order = tmp
  dirty.value = true
}
function catIconStyle(c) {
  return {
    background: `linear-gradient(135deg, ${c.gradient[0]}33, ${c.gradient[1]}22)`,
    border: `1px solid ${c.gradient[0]}55`,
  }
}
function countBy(key) { return resources.value.filter((r) => r.category === key).length }
function platIcon(p) { return state.site?.platforms?.[p]?.icon || '🔗' }

// ── 批量导入 ──
const importText = ref('')
const importCat = ref('pc')
const importParsed = ref([])
const importDup = ref([])
function previewImport() {
  const parsed = parseLines(importText.value)
  const existUrls = new Set(resources.value.map((r) => r.url.replace(/[?&]pwd=[^&\s]+/, '')))
  const seen = new Set()
  const ok = []
  const dup = []
  for (const p of parsed) {
    const key = p.url.replace(/[?&]pwd=[^&\s]+/, '')
    if (existUrls.has(key) || seen.has(key)) { dup.push(p); continue }
    seen.add(key)
    ok.push(p)
  }
  importParsed.value = ok
  importDup.value = dup
}
function saveImport() {
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/T/, 'T')
  const month = nowIso.slice(0, 7).replace('-', '')
  const items = importParsed.value.map((p) => ({
    id: genId(importCat.value, month),
    title: p.title,
    enTitle: '',
    category: importCat.value,
    tags: [],
    platform: p.platform,
    url: p.url,
    pwd: p.pwd,
    size: '',
    sizeBytes: null,
    cover: '',
    desc: '',
    status: 'active',
    featured: false,
    addedAt: nowIso,
    updatedAt: nowIso,
    month,
  }))
  resources.value.push(...items)
  importParsed.value = []
  importText.value = ''
  tab.value = 'resources'
  dirty.value = true
  commitMsg.value = `add: 批量导入 ${items.length} 个游戏资源`
}

// ── 保存 & 部署 ──
async function saveAll() {
  if (!dirty.value) return
  saving.value = true
  try {
    const msg = commitMsg.value.trim() || 'chore: 更新 GameHub 数据'
    await writeFile('public/data/resources.json', resources.value, msg)
    await writeFile('public/data/categories.json', cats.value, msg)
    await writeFile('public/data/site.json', { ...siteForm }, msg)
    // 同步前台
    state.resources = [...resources.value]
    state.categories = [...cats.value]
    state.site = { ...siteForm }
    dirty.value = false
    commitMsg.value = ''
    alert('✅ 已提交到 GitHub，Actions 正在自动部署（3-5 分钟）')
    deploy()
  } catch (e) {
    alert('提交失败: ' + (e.message || e))
  } finally {
    saving.value = false
  }
}

const deploying = ref(false)
async function deploy() {
  deploying.value = true
  try {
    const res = await fetch(`${BASE}/repos/${REPO}/actions/workflows/deploy.yml/dispatches`, {
      method: 'POST',
      headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    })
    if (!res.ok && res.status !== 204) throw new Error(`触发失败: ${res.status}`)
    alert('🚀 已触发重新部署')
  } catch (e) {
    alert('触发失败: ' + (e.message || e))
  } finally {
    deploying.value = false
  }
}

function fmtShort(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(async () => {
  await load() // 前台数据兜底
  const saved = sessionStorage.getItem(TOKEN_KEY)
  if (saved) {
    token.value = saved
    authed.value = true
    try { await refreshAll() } catch { logout(); alert('Token 已失效，请重新登录') }
  }
})
</script>

<style scoped>
.admin { min-height: 100vh; }

/* 登录 */
.login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.login-card { max-width: 380px; width: 100%; padding: 36px; text-align: center; }
.login-card__logo { font-size: 44px; margin-bottom: 10px; }
.login-card__title { font-size: 22px; margin-bottom: 6px; }
.login-card p { font-size: 13px; margin-bottom: 16px; }
.login-card .form-input { margin-bottom: 12px; }
.login-error { color: #fb7185; font-size: 13px; }

/* 顶栏 */
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(var(--bg-0-rgb), 0.85);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--glass-border);
  padding: 12px 0;
}
.admin-logo { font-family: var(--font-display); font-weight: 700; font-size: 17px; }

/* 主体 */
.admin-body { display: grid; grid-template-columns: 180px 1fr; gap: 18px; padding-top: 22px; }
.admin-nav { display: flex; flex-direction: column; gap: 6px; }
.admin-nav__item {
  text-align: left;
  padding: 11px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-mid);
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}
.admin-nav__item:hover { background: rgba(var(--accent-rgb), 0.08); color: var(--text-hi); }
.admin-nav__item.active {
  background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-deep));
  color: #fff;
  box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.3);
}
.admin-content { padding: 26px; min-height: 500px; }

/* 表格 */
.table-wrap { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.admin-table th {
  text-align: left;
  padding: 10px 12px;
  color: var(--text-low);
  font-weight: 600;
  border-bottom: 1px solid var(--glass-border);
  white-space: nowrap;
}
.admin-table td { padding: 10px 12px; border-bottom: 1px solid rgba(var(--accent-rgb), 0.07); vertical-align: middle; }
.admin-table tr:hover td { background: rgba(var(--accent-rgb), 0.04); }
.res-title { max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.pwd { font-family: var(--font-display); color: var(--neon-cyan); }
.badge.ok { color: var(--accent-sage); border-color: rgba(125, 163, 125, 0.45); }
.badge.bad { color: #fb7185; border-color: rgba(244, 63, 94, 0.4); }
.empty-row { text-align: center; padding: 40px; }

/* 分类 */
.cat-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.07);
}
.cat-row__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  flex-shrink: 0;
}
.cat-row__name { font-weight: 700; min-width: 90px; }
.cat-row__ops { margin-left: auto; display: flex; gap: 6px; }

/* 表单 */
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.import-area { min-height: 200px; font-family: monospace; font-size: 13px; }

/* Dashboard */
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; }
.stat-card {
  padding: 18px 16px;
  border-radius: 14px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  text-align: center;
}
.stat-card__num { font-size: 30px; font-weight: 800; font-family: var(--font-display); }
.stat-card__label { font-size: 12px; color: var(--text-low); margin-top: 4px; }
.stat-card.warn { border-color: rgba(244, 63, 94, 0.5); background: rgba(244, 63, 94, 0.08); }
.stat-card.warn .stat-card__num { color: #fb7185; }

.integrity-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.integrity-row__label { width: 130px; font-size: 13px; color: var(--text-mid); flex-shrink: 0; }
.integrity-bar { flex: 1; height: 10px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.integrity-bar__fill { height: 100%; border-radius: 6px; transition: width 0.4s; }
.integrity-row__val { width: 110px; font-size: 12px; color: var(--text-low); text-align: right; flex-shrink: 0; }

.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.dash-panel { padding: 20px; border-radius: 14px; }
.dist-row { display: flex; align-items: center; gap: 12px; margin-bottom: 9px; font-size: 13px; }
.dist-row__label { width: 110px; flex-shrink: 0; }
.dist-bar { flex: 1; height: 9px; border-radius: 5px; background: rgba(var(--accent-rgb), 0.1); overflow: hidden; }
.dist-bar__fill { height: 100%; border-radius: 5px; background: linear-gradient(90deg, var(--accent-gold), var(--accent-gold-deep)); }
.dist-row__val { width: 44px; text-align: right; color: var(--text-low); flex-shrink: 0; }

.trend { display: flex; align-items: flex-end; gap: 10px; height: 160px; padding-top: 8px; }
.trend-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; }
.trend-col__bar {
  width: 100%;
  max-width: 44px;
  min-height: 3px;
  border-radius: 6px 6px 2px 2px;
  background: linear-gradient(180deg, var(--neon-cyan), var(--neon-purple));
  transition: height 0.4s;
}
.trend-col__label { font-size: 11px; color: var(--text-low); white-space: nowrap; }

.warn-row {
  padding: 10px 14px;
  margin-bottom: 8px;
  border-radius: 10px;
  font-size: 13px;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.3);
  color: #fda4af;
}

/* 保存条 */
.save-bar {
  position: sticky;
  bottom: 14px;
  margin-top: 24px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-2-rgb), 0.92);
  border: 1px solid var(--neon-purple);
  backdrop-filter: blur(16px);
  box-shadow: var(--shadow-glow);
}
.save-bar__hint { font-size: 12px; margin-top: 8px; }

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(5, 5, 14, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal { padding: 28px; max-height: 90vh; overflow-y: auto; width: 100%; }
.modal--wide { max-width: 760px; }
.modal__title { margin-bottom: 18px; }

@media (max-width: 768px) {
  .admin-body { grid-template-columns: 1fr; }
  .admin-nav { flex-direction: row; overflow-x: auto; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
