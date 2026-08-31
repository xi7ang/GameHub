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
            <span v-if="deployState.status !== 'idle'" class="deploy-badge" :class="deployState.status" title="点击查看部署详情" @click="openDeployRun">
              <template v-if="deployState.status === 'queued' || deployState.status === 'in_progress'">🔄 部署中...</template>
              <template v-else-if="deployState.status === 'success'">✅ 部署成功</template>
              <template v-else-if="deployState.status === 'failure'">❌ 部署失败({{ deployState.conclusion }})</template>
              <template v-else-if="deployState.status === 'timeout'">⏳ 超时，点击查看</template>
            </span>
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

            <!-- 批量操作栏 -->
            <div v-if="selectedIds.size" class="bulk-bar mb-md">
              <span class="bulk-bar__count">已选 {{ selectedIds.size }} 条</span>
              <select v-model="bulkCat" class="form-input" style="width: auto">
                <option value="">→ 改分类...</option>
                <option v-for="c in state.categories" :key="c.key" :value="c.key">{{ c.name }}</option>
              </select>
              <button class="btn btn-sm" @click="bulkChange('category')">应用</button>
              <select v-model="bulkPlat" class="form-input" style="width: auto">
                <option value="">→ 改平台...</option>
                <option v-for="(p, k) in state.site?.platforms" :key="k" :value="k">{{ p.label }}</option>
              </select>
              <button class="btn btn-sm" @click="bulkChange('platform')">应用</button>
              <button class="btn btn-sm" @click="bulkFeatured(true)">⭐ 推荐</button>
              <button class="btn btn-sm" @click="bulkFeatured(false)">取消推荐</button>
              <button class="btn btn-sm" @click="bulkStatus('inactive')">⛔ 标记失效</button>
              <button class="btn btn-sm" @click="bulkStatus('active')">✅ 标记正常</button>
              <button class="btn btn-sm btn-danger" @click="bulkDelete">🗑 删除</button>
              <button class="btn btn-sm" @click="clearSelect">取消选择</button>
            </div>

            <div class="table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th style="width: 32px"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
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
                  <tr v-for="r in filteredResources" :key="r.id" :class="{ 'row-selected': selectedIds.has(r.id) }">
                    <td><input type="checkbox" :checked="selectedIds.has(r.id)" @change="toggleOne(r.id)" /></td>
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
              <!-- 平台配置（可编辑，新增网盘不用改代码） -->
              <div class="form-group" style="grid-column: 1/-1">
                <label class="form-label">平台配置</label>
                <div v-for="(p, key) in siteForm.platforms" :key="key" class="plat-row">
                  <code>{{ key }}</code>
                  <input v-model="p.label" class="form-input" style="flex: 2" placeholder="平台名" />
                  <input v-model="p.icon" class="form-input" style="width: 70px" placeholder="图标" />
                  <input v-model="p.color" class="form-input" style="width: 100px" placeholder="#RRGGBB" />
                  <button class="btn btn-sm btn-danger" @click="removePlatform(key)">删</button>
                </div>
                <div class="plat-row">
                  <input v-model="newPlatKey" class="form-input" style="width: 90px" placeholder="key" />
                  <input v-model="newPlatLabel" class="form-input" style="flex: 2" placeholder="新平台名" />
                  <input v-model="newPlatIcon" class="form-input" style="width: 70px" placeholder="图标" />
                  <button class="btn btn-sm btn-primary" @click="addPlatform">＋ 添加</button>
                </div>
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

          <!-- ═══ 数据体检 ═══ -->
          <template v-else-if="tab === 'health'">
            <div class="flex-between wrap gap-sm mb-md">
              <h2>🩺 数据体检</h2>
              <div class="flex gap-sm wrap">
                <button class="btn btn-sm" @click="runHealthCheck">🔍 运行体检</button>
                <button class="btn btn-sm btn-primary" :disabled="!healthFixable.length" @click="fixHealthAll">⚡ 一键修复({{ healthFixable.length }})</button>
                <button class="btn btn-sm" :disabled="linkChecking" @click="triggerLinkCheck">{{ linkChecking ? '检测中...' : '🌐 链接检测' }}</button>
              </div>
            </div>

            <!-- 校验结果 -->
            <div v-if="healthRun" class="mb-md">
              <div v-if="healthErrors.length" class="table-wrap">
                <table class="admin-table">
                  <thead><tr><th>资源</th><th>问题</th><th style="width: 150px">操作</th></tr></thead>
                  <tbody>
                    <tr v-for="(e, i) in healthErrors" :key="i">
                      <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ e.title }}</td>
                      <td class="text-low">{{ e.msg }}</td>
                      <td>
                        <button v-if="e.res" class="btn btn-sm" @click="openEdit(e.res)">编辑</button>
                        <button v-if="e.fix" class="btn btn-sm" @click="fixOne(e)">修复</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="ok-banner mb-md">✅ 数据健康，未发现问题</div>
            </div>

            <!-- 重复 URL 处理 -->
            <div v-if="dupUrls.length" class="mb-md">
              <h3 class="mb-sm">🔁 重复链接 {{ dupUrls.length }} 组（保留最早一条，其余删除）</h3>
              <div class="flex gap-sm mb-sm">
                <button class="btn btn-sm btn-danger" @click="fixDupUrls">🗑 一键去重({{ dupTotal }} 条)</button>
              </div>
              <div class="table-wrap">
                <table class="admin-table">
                  <thead><tr><th>链接</th><th>重复条目</th></tr></thead>
                  <tbody>
                    <tr v-for="(g, i) in dupUrls.slice(0, 20)" :key="i">
                      <td class="text-low" style="font-size: 12px; word-break: break-all; max-width: 300px">{{ g.url }}</td>
                      <td class="text-low" style="font-size: 12px">{{ g.ids.join('、') }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- 链接检测报告 -->
            <div v-if="linkReport" class="mb-md">
              <h3 class="mb-sm">🌐 最近链接检测 <span class="text-low" style="font-size: 12px">{{ linkReport.checkedAt }}</span></h3>
              <div class="flex gap-sm wrap mb-sm">
                <span class="badge ok">正常 {{ linkReport.ok }}</span>
                <span class="badge" :class="linkReport.warn ? '' : 'ok'">需确认 {{ linkReport.warn }}</span>
                <span class="badge bad">失败 {{ linkReport.fail }}</span>
                <button class="btn btn-sm" @click="loadLinkReport">刷新</button>
              </div>
              <div v-if="linkReport.fails.length" class="table-wrap">
                <table class="admin-table">
                  <thead><tr><th>资源</th><th>状态</th><th style="width: 150px">操作</th></tr></thead>
                  <tbody>
                    <tr v-for="(f, i) in linkReport.fails.slice(0, 50)" :key="i">
                      <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ f.title }}</td>
                      <td><span class="badge" :class="f.status >= 400 && f.status < 500 ? 'bad' : ''">{{ f.status }}</span></td>
                      <td>
                        <button class="btn btn-sm" @click="openEdit(f)">编辑</button>
                        <button class="btn btn-sm" @click="markInactive(f)">标失效</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>

          <!-- ═══ 备份回滚 ═══ -->
          <template v-else-if="tab === 'backup'">
            <div class="flex-between mb-md">
              <h2>💾 备份与回滚</h2>
            </div>

            <!-- 一键导出 -->
            <div class="glass dash-panel mb-md">
              <h3 class="mb-sm">📤 一键导出</h3>
              <p class="text-low mb-sm" style="font-size: 12px">导出当前内存中的最新数据（含未提交修改），下载到本地备份。</p>
              <div class="flex gap-sm wrap">
                <button class="btn btn-sm" @click="exportJSON('resources')">📦 resources.json</button>
                <button class="btn btn-sm" @click="exportJSON('categories')">🏷️ categories.json</button>
                <button class="btn btn-sm" @click="exportJSON('site')">⚙️ site.json</button>
                <button class="btn btn-sm btn-primary" @click="exportAll">📦 全部导出</button>
              </div>
            </div>

            <!-- 历史版本回滚 -->
            <div class="glass dash-panel">
              <div class="flex-between mb-sm">
                <h3>🕘 resources.json 历史版本（最近 {{ historyList.length }} 次提交）</h3>
                <button class="btn btn-sm" @click="loadHistory">刷新</button>
              </div>
              <p class="text-low mb-sm" style="font-size: 12px">回滚会拉取该版本内容覆盖当前数据并提交，可随时再回滚回来。</p>
              <div v-if="historyLoading" class="text-low">加载中...</div>
              <div v-else-if="historyList.length" class="history-list">
                <div v-for="c in historyList" :key="c.sha" class="history-row">
                  <code class="text-low">{{ c.sha.slice(0, 7) }}</code>
                  <span class="history-row__msg">{{ c.message }}</span>
                  <span class="text-low" style="font-size: 12px">{{ fmtShort(c.date) }}</span>
                  <button class="btn btn-sm" :disabled="rollbacking === c.sha" @click="rollbackTo(c.sha)">
                    {{ rollbacking === c.sha ? '回滚中...' : '↩ 回滚到此版本' }}
                  </button>
                </div>
              </div>
              <div v-else class="text-low">暂无历史记录</div>
            </div>
          </template>

          <!-- ═══ 操作日志 ═══ -->
          <template v-else-if="tab === 'logs'">
            <div class="flex-between mb-md">
              <h2>📋 操作日志 <span class="text-low" style="font-size: 13px">最近 {{ opLogs.length }} 次提交</span></h2>
              <button class="btn btn-sm" @click="loadOpLogs">刷新</button>
            </div>
            <p class="text-low mb-md" style="font-size: 12px">每次提交到 GitHub 自动记录：时间 / 操作者 / 改动文件数。回滚、封面入库也在这里留痕。</p>
            <div v-if="opLogs.length" class="table-wrap">
              <table class="admin-table">
                <thead><tr><th>时间</th><th>操作者</th><th>改动</th><th>说明</th></tr></thead>
                <tbody>
                  <tr v-for="l in opLogs" :key="l.sha">
                    <td class="text-low" style="font-size: 12px; white-space: nowrap">{{ fmtShort(l.date) }}</td>
                    <td>{{ l.author }}</td>
                    <td><span class="badge">{{ l.files }} 文件</span></td>
                    <td class="text-low" style="font-size: 12px; max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ l.message }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="text-low">加载中...</div>
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
            <div class="flex gap-sm">
              <input v-model="editing.cover" class="form-input" placeholder="留空自动生成霓虹渐变封面" />
              <button class="btn btn-sm" type="button" @click="openCoverPicker">🖼 管理</button>
            </div>
            <img v-if="editing.cover" :src="editing.cover" class="cover-preview" alt="预览" />
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
    <!-- 封面管理弹窗 -->
    <div v-if="coverPickerVisible" class="modal-mask" @click.self="coverPickerVisible = false">
      <div class="modal glass modal--wide">
        <h3 class="modal__title">🖼 封面管理 <span class="text-low" style="font-size: 13px">已选: {{ editing.cover || '无' }}</span></h3>

        <!-- ① 仓库已有封面 -->
        <h4 class="cover-sec-title">① 仓库已有封面（点击选用）</h4>
        <div class="cover-grid">
          <div
            v-for="c in repoCovers"
            :key="c"
            class="cover-cell"
            :class="{ active: editing.cover === c.url }"
            @click="pickCover(c.url)"
          >
            <img :src="c.url" :alt="c.name" loading="lazy" />
            <span class="cover-cell__name">{{ c.name }}</span>
          </div>
          <div v-if="!repoCovers.length" class="text-low" style="grid-column: 1/-1">加载中...</div>
        </div>

        <!-- ② Steam 匹配 -->
        <h4 class="cover-sec-title">② Steam 封面匹配</h4>
        <div class="flex gap-sm mb-sm">
          <input v-model="steamQuery" class="form-input" style="flex: 1" placeholder="输入英文名搜索，如：Stardew Valley" @keydown.enter="steamSearch" />
          <button class="btn btn-sm" :disabled="steamLoading" @click="steamSearch">{{ steamLoading ? '搜索中...' : '🔍 搜索' }}</button>
        </div>
        <div v-if="steamResults.length" class="cover-grid">
          <div v-for="s in steamResults" :key="s.id" class="cover-cell" :class="{ active: editing.cover === s.url }" @click="pickSteam(s)">
            <img :src="s.url" :alt="s.name" loading="lazy" />
            <span class="cover-cell__name">{{ s.name }}</span>
          </div>
        </div>
        <p v-if="steamError" class="text-low" style="color: #fb7185; font-size: 12px">{{ steamError }}</p>

        <!-- ③ URL 抓取入库 -->
        <h4 class="cover-sec-title">③ 从图片 URL 抓取转 webp 入库</h4>
        <div class="flex gap-sm">
          <input v-model="grabUrl" class="form-input" style="flex: 1" placeholder="https://.../cover.jpg（支持 jpg/png/webp）" @keydown.enter="grabCover" />
          <button class="btn btn-sm" :disabled="grabbing" @click="grabCover">{{ grabbing ? '抓取中...' : '⬇️ 抓取入库' }}</button>
        </div>
        <p v-if="grabMsg" class="text-low" style="font-size: 12px; margin-top: 6px" :style="{ color: grabErr ? '#fb7185' : '' }">{{ grabMsg }}</p>
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
// 二进制文件写入（封面图片）：base64 内容，需先查 sha 再覆盖
async function writeFileBinary(filePath, base64Content, message) {
  const body = { message, content: base64Content }
  try {
    const meta = await ghGet(`/contents/${filePath}`)
    if (meta.sha) body.sha = meta.sha
  } catch { /* 文件不存在则新建 */ }
  const meta = await ghPut(`/contents/${filePath}`, body)
  fileCache[filePath] = { sha: meta.content.sha }
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
  { key: 'health', icon: '🩺', name: '数据体检' },
  { key: 'backup', icon: '💾', name: '备份回滚' },
  { key: 'logs', icon: '📋', name: '操作日志' },
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

// ── 数据体检（校验逻辑对齐 scripts/validate.js） ──
const healthRun = ref(false)
const healthErrors = ref([])
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/

function runHealthCheck() {
  const errors = []
  const seenIds = new Set()
  const seenUrls = new Set()
  const catKeys = new Set(cats.value.map((c) => c.key))
  const platKeys = new Set(Object.keys(state.site?.platforms || {}))

  resources.value.forEach((r, i) => {
    const loc = `[${i}] ${r.title || r.id || '?'}`
    if (!r.id || typeof r.id !== 'string') errors.push({ title: loc, msg: '缺 id', res: r, type: 'id' })
    else if (seenIds.has(r.id)) errors.push({ title: loc, msg: `id 重复: ${r.id}`, res: r, type: 'id-dup' })
    else seenIds.add(r.id)
    if (!r.title) errors.push({ title: loc, msg: '缺 title', res: r, type: 'title' })
    if (!catKeys.has(r.category)) errors.push({ title: loc, msg: `category 不存在: ${r.category}`, res: r, type: 'category' })
    if (!platKeys.has(r.platform)) errors.push({ title: loc, msg: `platform 非法: ${r.platform}`, res: r, type: 'platform' })
    if (!r.url || !/^https?:\/\//.test(r.url)) errors.push({ title: loc, msg: 'url 非法', res: r, type: 'url' })
    else {
      const u = r.url.replace(/[?&]pwd=[^&\s]+/, '').replace(/#.*$/, '')
      if (seenUrls.has(u)) errors.push({ title: loc, msg: `url 重复: ${u}`, res: r, type: 'url-dup' })
      else seenUrls.add(u)
    }
    if (r.pwd != null && typeof r.pwd !== 'string') errors.push({ title: loc, msg: 'pwd 必须是字符串', res: r, type: 'pwd' })
    if (r.status !== 'active' && r.status !== 'inactive') errors.push({ title: loc, msg: `status 非法: ${r.status}`, res: r, type: 'status', fix: true })
    if (typeof r.featured !== 'boolean') errors.push({ title: loc, msg: 'featured 必须是布尔', res: r, type: 'featured', fix: true })
    if (!Array.isArray(r.tags)) errors.push({ title: loc, msg: 'tags 必须是数组', res: r, type: 'tags', fix: true })
    else if (r.tags.length > 8) errors.push({ title: loc, msg: `tags 超过 8 个 (${r.tags.length})`, res: r, type: 'tags-max', fix: true })
    if (!ISO_RE.test(r.addedAt)) errors.push({ title: loc, msg: `addedAt 非 ISO8601: ${r.addedAt}`, res: r, type: 'time' })
    if (!ISO_RE.test(r.updatedAt)) errors.push({ title: loc, msg: `updatedAt 非 ISO8601: ${r.updatedAt}`, res: r, type: 'time' })
    if (r.addedAt && ISO_RE.test(r.addedAt)) {
      const m = r.addedAt.slice(0, 7).replace('-', '')
      if (r.month !== m) errors.push({ title: loc, msg: `month(${r.month}) ≠ addedAt 派生(${m})`, res: r, type: 'month', fix: true })
    }
  })
  healthErrors.value = errors
  healthRun.value = true
}

const healthFixable = computed(() => healthErrors.value.filter((e) => e.fix))

function fixOne(e) {
  fixHealthItem(e)
  runHealthCheck()
  dirty.value = true
}
function fixHealthAll() {
  const list = [...healthFixable.value]
  if (!list.length) return
  list.forEach(fixHealthItem)
  runHealthCheck()
  dirty.value = true
  alert(`✅ 已修复 ${list.length} 项，记得点「提交到 GitHub」`)
}
function fixHealthItem(e) {
  const r = e.res
  if (!r) return
  switch (e.type) {
    case 'status': r.status = 'active'; break
    case 'featured': r.featured = !!r.featured; break
    case 'tags': r.tags = Array.isArray(r.tags) ? r.tags : []; break
    case 'tags-max': r.tags = r.tags.slice(0, 8); break
    case 'month': {
      const m = r.addedAt.slice(0, 7).replace('-', '')
      r.month = m
      break
    }
  }
}

// 重复 URL 分组
const dupUrls = computed(() => {
  const map = new Map()
  resources.value.forEach((r) => {
    if (!r.url) return
    const u = r.url.replace(/[?&]pwd=[^&\s]+/, '').replace(/#.*$/, '')
    if (!map.has(u)) map.set(u, [])
    map.get(u).push(r)
  })
  return [...map.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([url, list]) => ({ url, ids: list.map((r) => r.id), list }))
})
const dupTotal = computed(() => dupUrls.value.reduce((n, g) => n + g.list.length - 1, 0))
function fixDupUrls() {
  if (!dupUrls.value.length) return
  if (!confirm(`将删除 ${dupTotal.value} 条重复资源（每组保留最早一条），确定？`)) return
  const keep = new Set()
  dupUrls.value.forEach((g) => {
    const sorted = [...g.list].sort((a, b) => (a.addedAt || '').localeCompare(b.addedAt || ''))
    sorted.slice(1).forEach((r) => keep.add(r.id))
  })
  resources.value = resources.value.filter((r) => !keep.has(r.id))
  dirty.value = true
  alert(`🗑 已去重 ${keep.size} 条`)
}

// 失效链接检测（GitHub Actions 服务端跑，写回 link-report.json）
const linkChecking = ref(false)
const linkReport = ref(null)
const LINK_WF = 'check-links.yml'
async function triggerLinkCheck() {
  linkChecking.value = true
  try {
    const res = await fetch(`${BASE}/repos/${REPO}/actions/workflows/${LINK_WF}/dispatches`, {
      method: 'POST',
      headers: { ...apiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main' }),
    })
    if (!res.ok && res.status !== 204) throw new Error(`触发失败: ${res.status}`)
    alert('🚀 已触发链接检测（约 1-2 分钟，完成后点「刷新」查看报告）')
    // 轮询报告（最多 8 次 × 15s）
    let tries = 0
    const t = setInterval(async () => {
      tries++
      const before = linkReport.value?.checkedAt || ''
      await loadLinkReport()
      if (linkReport.value && linkReport.value.checkedAt !== before) {
        clearInterval(t)
        linkChecking.value = false
        alert('✅ 链接检测完成')
      } else if (tries >= 8) {
        clearInterval(t)
        linkChecking.value = false
      }
    }, 15000)
  } catch (e) {
    alert('触发失败: ' + (e.message || e))
    linkChecking.value = false
  }
}
async function loadLinkReport() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/link-report.json?t=${Date.now()}`)
    if (!res.ok) { linkReport.value = null; return }
    linkReport.value = await res.json()
  } catch { linkReport.value = null }
}
function markInactive(r) {
  const target = resources.value.find((x) => x.id === r.id)
  if (!target) return
  target.status = 'inactive'
  target.updatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/T/, 'T')
  dirty.value = true
  alert('⛔ 已标记为失效，记得提交')
}

// ── 备份与回滚 ──
const historyList = ref([])
const historyLoading = ref(false)
const rollbacking = ref('')

function exportJSON(kind) {
  const map = {
    resources: ['resources.json', resources.value],
    categories: ['categories.json', cats.value],
    site: ['site.json', { ...siteForm }],
  }
  const [name, data] = map[kind]
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
function exportAll() {
  exportJSON('resources')
  exportJSON('categories')
  exportJSON('site')
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const data = await ghGet('/commits?path=public/data/resources.json&per_page=10')
    historyList.value = data.map((c) => ({
      sha: c.sha,
      date: c.commit.committer.date,
      message: c.commit.message.split('\n')[0],
    }))
  } catch (e) {
    alert('加载历史失败: ' + (e.message || e))
  } finally {
    historyLoading.value = false
  }
}

async function rollbackTo(sha) {
  if (!confirm(`回滚 resources.json 到 ${sha.slice(0, 7)}？当前未提交的修改会被覆盖。`)) return
  rollbacking.value = sha
  try {
    const meta = await ghGet(`/contents/public/data/resources.json?ref=${sha}`)
    const content = JSON.parse(decodeURIComponent(escape(atob(meta.content.replace(/\n/g, '')))))
    resources.value = content
    state.resources = [...resources.value]
    dirty.value = true
    commitMsg.value = `rollback: 回滚数据到 ${sha.slice(0, 7)}`
    alert('✅ 已载入历史版本到内存，确认无误后点「提交到 GitHub」生效')
    tab.value = 'resources'
  } catch (e) {
    alert('回滚失败: ' + (e.message || e))
  } finally {
    rollbacking.value = ''
  }
}

// ── 操作日志（GitHub 提交记录，含作者与改动文件数） ──
const opLogs = ref([])
async function loadOpLogs() {
  try {
    const data = await ghGet('/commits?per_page=15')
    const logs = await Promise.all(data.map(async (c) => {
      let files = 0
      try {
        const detail = await ghGet(`/commits/${c.sha}`)
        files = detail.files?.length || 0
      } catch { /* 单条失败不阻塞 */ }
      return {
        sha: c.sha,
        date: c.commit.committer.date,
        author: c.commit.author?.name || c.commit.author?.login || 'unknown',
        message: c.commit.message.split('\n')[0],
        files,
      }
    }))
    opLogs.value = logs
  } catch (e) {
    alert('加载操作日志失败: ' + (e.message || e))
  }
}

const hotKeywordsStr = computed({
  get: () => (siteForm.hotKeywords || []).join(', '),
  set: (v) => (siteForm.hotKeywords = v.split(/[,，]/).map((s) => s.trim()).filter(Boolean)),
})

// ── 平台配置（site.json platforms 可编辑） ──
const newPlatKey = ref('')
const newPlatLabel = ref('')
const newPlatIcon = ref('')

function addPlatform() {
  const key = newPlatKey.value.trim().toLowerCase()
  if (!key || !/^[a-z0-9-]+$/.test(key)) { alert('key 只能是小写字母/数字/连字符'); return }
  if (siteForm.platforms?.[key]) { alert(`平台 ${key} 已存在`); return }
  if (!newPlatLabel.value.trim()) { alert('请填写平台名称'); return }
  if (!siteForm.platforms) siteForm.platforms = {}
  siteForm.platforms[key] = {
    label: newPlatLabel.value.trim(),
    icon: newPlatIcon.value.trim() || '🔗',
    color: '#888888',
  }
  newPlatKey.value = ''
  newPlatLabel.value = ''
  newPlatIcon.value = ''
}
function removePlatform(key) {
  const used = resources.value.filter((r) => r.platform === key).length
  const label = siteForm.platforms?.[key]?.label || key
  if (used > 0 && !confirm(`平台「${label}」下有 ${used} 条资源，删除后这些资源将变为「未知平台」，确定删除？`)) return
  if (used === 0 && !confirm(`确定删除平台「${label}」？`)) return
  delete siteForm.platforms[key]
  // 资源平台回退为 unknown
  resources.value.forEach((r) => { if (r.platform === key) r.platform = 'unknown' })
}

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

// ── 批量操作 ──
const selectedIds = ref(new Set())
const bulkCat = ref('')
const bulkPlat = ref('')
const allSelected = computed(() => filteredResources.value.length > 0 && filteredResources.value.every((r) => selectedIds.value.has(r.id)))
function toggleAll(e) {
  if (e.target.checked) {
    const s = new Set(selectedIds.value)
    filteredResources.value.forEach((r) => s.add(r.id))
    selectedIds.value = s
  } else {
    selectedIds.value = new Set()
  }
}
function toggleOne(id) {
  const s = new Set(selectedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  selectedIds.value = s
}
function clearSelect() { selectedIds.value = new Set(); bulkCat.value = ''; bulkPlat.value = '' }
const selectedItems = computed(() => resources.value.filter((r) => selectedIds.value.has(r.id)))
function bulkChange(field) {
  const val = field === 'category' ? bulkCat.value : bulkPlat.value
  if (!val) { alert(field === 'category' ? '请先选择目标分类' : '请先选择目标平台'); return }
  if (!selectedItems.value.length) return
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/T/, 'T')
  selectedItems.value.forEach((r) => {
    r[field] = val
    r.updatedAt = nowIso
  })
  clearSelect()
  dirty.value = true
  alert(`✅ 已更新 ${selectedItems.value.length} 条`)
}
function bulkFeatured(v) {
  if (!selectedItems.value.length) return
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/T/, 'T')
  selectedItems.value.forEach((r) => { r.featured = v; r.updatedAt = nowIso })
  clearSelect()
  dirty.value = true
}
function bulkStatus(s) {
  if (!selectedItems.value.length) return
  const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, '+08:00').replace(/T/, 'T')
  selectedItems.value.forEach((r) => { r.status = s; r.updatedAt = nowIso })
  clearSelect()
  dirty.value = true
}
function bulkDelete() {
  const n = selectedItems.value.length
  if (!n) return
  if (!confirm(`确定删除选中的 ${n} 条资源？此操作不可撤销。`)) return
  const ids = selectedIds.value
  resources.value = resources.value.filter((x) => !ids.has(x.id))
  clearSelect()
  dirty.value = true
  alert(`🗑 已删除 ${n} 条`)
}

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

// ── 封面管理 ──
const coverPickerVisible = ref(false)
const repoCovers = ref([])
const steamQuery = ref('')
const steamResults = ref([])
const steamLoading = ref(false)
const steamError = ref('')
const grabUrl = ref('')
const grabbing = ref(false)
const grabMsg = ref('')
const grabErr = ref(false)
const pendingUploads = ref([]) // 待入库 webp: { path, content }

async function loadRepoCovers() {
  try {
    const files = await ghGet('/contents/public/covers')
    repoCovers.value = files
      .filter((f) => /^\.(webp|jpg|jpeg|png)$/i.test(f.name))
      .map((f) => ({ name: f.name, url: `/GameHub/covers/${f.name}` }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    repoCovers.value = []
  }
}

function openCoverPicker() {
  coverPickerVisible.value = true
  loadRepoCovers()
  steamError.value = ''
  grabMsg.value = ''
  grabErr.value = false
}

function pickCover(url) {
  editing.cover = url
}

async function steamSearch() {
  const q = steamQuery.value.trim()
  if (!q) return
  steamLoading.value = true
  steamError.value = ''
  try {
    const res = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(q)}&cc=cn&l=schinese`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    steamResults.value = (json.items || []).slice(0, 12).map((it) => ({
      id: it.id,
      name: it.name,
      url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${it.id}/header.jpg`,
    }))
    if (!steamResults.value.length) steamError.value = '未找到匹配，换英文名试试'
  } catch (e) {
    steamError.value = '搜索失败: ' + (e.message || e)
  } finally {
    steamLoading.value = false
  }
}

function pickSteam(s) {
  editing.cover = s.url
}

// URL 抓图 → webp → 暂存，随 saveAll 一起提交（只部署一次）
async function grabCover() {
  const url = grabUrl.value.trim()
  if (!url) return
  grabbing.value = true
  grabMsg.value = ''
  grabErr.value = false
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const bmp = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width
    canvas.height = bmp.height
    canvas.getContext('2d').drawImage(bmp, 0, 0)
    const webpBlob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.82))
    if (!webpBlob) throw new Error('webp 编码失败')
    const buf = await webpBlob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let bin = ''
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    const name = `cover-${Date.now()}.webp`
    pendingUploads.value.push({ path: `public/covers/${name}`, content: btoa(bin) })
    editing.cover = `/GameHub/covers/${name}`
    grabMsg.value = `✅ 已暂存 /GameHub/covers/${name}（点击「提交到 GitHub」时一并上传）`
  } catch (e) {
    grabErr.value = true
    grabMsg.value = '抓取失败: ' + (e.message || e) + '（可能被 CORS 拦截，可改用 Steam 匹配或直接粘贴 URL）'
  } finally {
    grabbing.value = false
  }
}

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
const deployState = ref({ status: 'idle' }) // idle | queued | in_progress | success | failure | timeout
let pollTimer = null
let pollCount = 0
const POLL_MAX = 40

function openDeployRun() {
  if (deployState.value.htmlUrl) window.open(deployState.value.htmlUrl, '_blank')
}

function stopPoll() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function pollDeploy() {
  if (!token.value) return
  try {
    const data = await ghGet('/actions/runs?per_page=1')
    const run = data.workflow_runs?.[0]
    if (!run) return
    // 只认 workflow_dispatch 或 push 触发的 deploy 工作流（排除旧记录）
    if (run.status === 'completed') {
      stopPoll()
      deployState.value = {
        status: run.conclusion === 'success' ? 'success' : 'failure',
        conclusion: run.conclusion,
        htmlUrl: run.html_url,
      }
      if (run.conclusion !== 'success') {
        // 拉取失败日志摘要（jobs → 失败步骤）
        try {
          const jobs = await ghGet(`/actions/runs/${run.id}/jobs`)
          const failedStep = jobs.jobs?.[0]?.steps?.find((s) => s.conclusion === 'failure')
          deployState.value.failedStep = failedStep?.name || ''
        } catch { /* 日志获取失败不阻塞 */ }
      }
    } else if (run.status === 'in_progress' || run.status === 'queued') {
      deployState.value = { status: 'in_progress', htmlUrl: run.html_url }
    }
  } catch { /* 轮询失败保持现状，继续等 */ }
  if (++pollCount >= POLL_MAX) {
    stopPoll()
    if (deployState.value.status === 'in_progress') deployState.value = { status: 'timeout' }
  }
}

function startPoll() {
  stopPoll()
  pollCount = 0
  deployState.value = { status: 'queued' }
  pollTimer = setInterval(pollDeploy, 10000)
  pollDeploy()
}

async function saveAll() {
  if (!dirty.value) return
  saving.value = true
  try {
    const msg = commitMsg.value.trim() || 'chore: 更新 GameHub 数据'
    // 先上传暂存的封面图片（每个文件一次 commit）
    for (const up of pendingUploads.value) {
      await writeFileBinary(up.path, up.content, `add: 封面 ${up.path.split('/').pop()}`)
    }
    pendingUploads.value = []
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
    startPoll()
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

/* 部署状态徽章 */
.deploy-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
}
.deploy-badge.queued, .deploy-badge.in_progress {
  color: var(--neon-cyan);
  border-color: rgba(45, 212, 191, 0.45);
  background: rgba(45, 212, 191, 0.08);
  animation: pulse 1.4s infinite;
}
.deploy-badge.success { color: var(--accent-sage); border-color: rgba(125, 163, 125, 0.5); background: rgba(125, 163, 125, 0.1); }
.deploy-badge.failure { color: #fb7185; border-color: rgba(244, 63, 94, 0.5); background: rgba(244, 63, 94, 0.1); }
.deploy-badge.timeout { color: #fbbf24; border-color: rgba(251, 191, 36, 0.5); background: rgba(251, 191, 36, 0.1); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

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

/* 批量操作栏 */
.bulk-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(var(--neon-purple), 0.08);
  border: 1px solid rgba(var(--neon-purple), 0.35);
  font-size: 13px;
}
.bulk-bar__count { font-weight: 700; color: var(--neon-purple); margin-right: 4px; }
.row-selected td { background: rgba(var(--neon-purple), 0.07); }

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

/* 数据体检 */
.ok-banner {
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  background: rgba(125, 163, 125, 0.1);
  border: 1px solid rgba(125, 163, 125, 0.4);
  color: var(--accent-sage);
}

/* 备份回滚 */
.history-list { max-height: 420px; overflow-y: auto; }
.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.07);
  font-size: 13px;
}
.history-row code { flex-shrink: 0; }
.history-row__msg {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 平台配置 */
.plat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.plat-row code { width: 80px; flex-shrink: 0; font-size: 12px; }

/* 封面管理 */
.cover-preview { width: 150px; height: 70px; object-fit: cover; border-radius: 8px; margin-top: 8px; border: 1px solid var(--glass-border); display: block; }
.cover-sec-title { margin: 18px 0 10px; font-size: 14px; color: var(--text-mid); }
.cover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 10px;
  max-height: 240px;
  overflow-y: auto;
  padding: 2px;
}
.cover-cell {
  border: 2px solid transparent;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(var(--accent-rgb), 0.06);
  transition: all 0.15s;
}
.cover-cell:hover { border-color: var(--neon-cyan); transform: translateY(-2px); }
.cover-cell.active { border-color: var(--neon-purple); box-shadow: 0 0 0 1px var(--neon-purple); }
.cover-cell img { width: 100%; height: 56px; object-fit: cover; display: block; }
.cover-cell__name {
  display: block;
  padding: 4px 6px;
  font-size: 11px;
  color: var(--text-low);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
