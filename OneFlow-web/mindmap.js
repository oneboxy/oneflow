const caseRecords = [
  {
    id: 'case-001', caseId: 'CASE-PAY-001', title: '普通支付成功', path: '支付中心 / 订单支付 / 正常流程', priority: 'P0', version: 'v1.3', owner: '林 QA', status: 'pass', statusLabel: '通过', badge: 'green', runType: '自动化', lastRun: '10-23 14:20', coverage: '94%', coverageMeta: '覆盖 16 / 17 行 · 1 行待补测', code: 'tabs',
    steps: ['创建待支付订单', '完成支付并返回商户页', '确认订单状态与金额']
  },
  {
    id: 'case-002', caseId: 'CASE-PAY-002', title: '待审核订单进入人工复核', path: '支付中心 / 订单支付 / 风险分流', priority: 'P1', version: 'v1.3', owner: '林 QA', status: 'blocked', statusLabel: '阻塞', badge: 'amber', runType: '手工', lastRun: '10-23 14:05', coverage: '72%', coverageMeta: '覆盖 18 / 25 行 · 手工场景阻塞', code: 'settlement',
    steps: ['创建高风险订单', '等待风控规则命中', '确认出现人工审核提示']
  },
  {
    id: 'case-003', caseId: 'CASE-PAY-003', title: '结算后退款进入人工审核', path: '支付中心 / 退款 / 异常流程', priority: 'P0', version: 'v1.3', owner: '赵敏', status: 'fail', statusLabel: '失败', badge: 'red', runType: '自动化', lastRun: '10-23 13:46', coverage: '79%', coverageMeta: '覆盖 12 / 15 行 · 异常分支未覆盖', code: 'refund',
    steps: ['完成订单结算', '发起原路退款', '确认进入人工审核队列']
  },
  {
    id: 'case-004', caseId: 'CASE-PAY-004', title: '新设备高风险规则', path: '支付中心 / 风控 / 设备识别', priority: 'P1', version: 'v1.3', owner: '王强', status: 'skipped', statusLabel: '跳过', badge: 'blue', runType: '手工', lastRun: '—', coverage: '0%', coverageMeta: '尚未执行 · 9 行待验证', code: 'risk',
    steps: ['使用新设备登录', '创建高金额订单', '确认风险分数和拦截策略']
  }
];

const statusText = { pass: '通过', fail: '失败', blocked: '阻塞', skipped: '跳过' };
const statusBadge = { pass: 'green', fail: 'red', blocked: 'amber', skipped: 'blue' };
const statusIcon = { pass: '✓', fail: '×', blocked: '!', skipped: '—' };
const caseById = new Map(caseRecords.map((record) => [record.id, record]));

const repositoryStorageKey = 'oneflow.repositories.v1';
const defaultRepositories = [
  { id: 'repo-openai-release', name: 'oneboxy/openai', url: 'https://github.com/oneboxy/openai', branch: 'release/2.8', base: '8a7c1d2', head: '42f91b8', language: 'JavaScript / TypeScript', full: 91.6, diff: 88.3, changedCovered: 86, changedTotal: 97, status: '通过', badge: 'green', color: '#6d8cff' },
  { id: 'repo-payment-main', name: 'payment-service', url: 'https://github.com/example/payment-service', branch: 'main', base: 'a72c1b0', head: 'b18de04', language: 'Java', full: 84.7, diff: 79.2, changedCovered: 61, changedTotal: 77, status: '关注', badge: 'amber', color: '#a683f3' },
  { id: 'repo-risk-feature', name: 'risk-engine-python', url: 'https://github.com/example/risk-engine-python', branch: 'feature/risk-rule', base: '9a2e1f0', head: '0f12caa', language: 'Python', full: 82.1, diff: 72.5, changedCovered: 58, changedTotal: 80, status: '需补测', badge: 'red', color: '#efaa51' },
  { id: 'repo-web-main', name: 'web-console', url: 'https://github.com/example/web-console', branch: 'main', base: '6e8a101', head: '7d9e113', language: 'JavaScript / TypeScript', full: 86.4, diff: 83.8, changedCovered: 91, changedTotal: 108, status: '通过', badge: 'green', color: '#ed7193' }
];

function loadRepositories() {
  try {
    const saved = window.localStorage.getItem(repositoryStorageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    // 浏览器禁用本地存储时仍允许使用当前页面的仓库数据。
  }
  return defaultRepositories.map((record) => ({ ...record }));
}

function saveRepositories() {
  try {
    window.localStorage.setItem(repositoryStorageKey, JSON.stringify(repositoryRecords));
  } catch (error) {
    // 本地存储不可用时不阻断页面上的当前会话。
  }
}

let repositoryRecords = loadRepositories();

function coverageCell(value, tone = '') {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '<span class="task-meta">待采集</span>';
  }
  return `<div class="bar-row"><span class="coverage-number">${value.toFixed(1)}%</span><div class="bar"><i class="${tone}" style="width:${Math.max(0, Math.min(100, value))}%"></i></div></div>`;
}

function renderRepositories() {
  const table = document.getElementById('repo-table');
  if (!table) return;
  if (!repositoryRecords.length) {
    table.innerHTML = '<tr><td colspan="6" class="empty">还没有登记仓库，请先添加一个仓库和分支。</td></tr>';
    return;
  }
  table.innerHTML = repositoryRecords.map((record) => {
    const rate = typeof record.diff === 'number' ? record.diff : 0;
    const searchText = `${record.name} ${record.url} ${record.branch} ${record.language}`.toLowerCase();
    const changed = typeof record.changedCovered === 'number' && typeof record.changedTotal === 'number'
      ? `${record.changedCovered} / ${record.changedTotal}`
      : '—';
    const head = record.head || '待解析 head';
    return `<tr data-rate="${rate}" data-name="${escapeHtml(searchText)}">
      <td><div class="repo"><i class="repo-dot" style="background:${record.color || '#6d8cff'}"></i><div><strong>${escapeHtml(record.name)}</strong><div class="task-meta">${escapeHtml(record.branch)} · ${escapeHtml(record.base || '待设置')} → ${escapeHtml(head)}</div><div class="task-meta">${escapeHtml(record.language)}</div></div></div></td>
      <td>${coverageCell(record.full)}</td>
      <td>${coverageCell(record.diff, 'green')}</td>
      <td>${changed}</td>
      <td><span class="badge ${record.badge || 'blue'}">${escapeHtml(record.status || '待运行')}</span></td>
      <td><button class="repo-remove" type="button" data-remove-repo="${escapeHtml(record.id)}">移除</button></td>
    </tr>`;
  }).join('');
  table.querySelectorAll('[data-remove-repo]').forEach((button) => button.addEventListener('click', (event) => {
    event.stopPropagation();
    const record = repositoryRecords.find((item) => item.id === button.dataset.removeRepo);
    if (!record || !window.confirm(`确认移除 ${record.name} / ${record.branch} 吗？`)) return;
    repositoryRecords = repositoryRecords.filter((item) => item.id !== record.id);
    saveRepositories();
    renderRepositories();
    renderTask();
    if (typeof filterRepos === 'function') filterRepos();
    showToast(`已移除 ${record.name} / ${record.branch}`);
  }));
  if (typeof filterRepos === 'function') filterRepos();
}

const repoModal = document.getElementById('repo-modal');
const repoForm = document.getElementById('repo-form');
function setRepoModalOpen(open) {
  repoModal.classList.toggle('open', open);
  repoModal.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) document.getElementById('repo-name').focus();
}

document.getElementById('add-repo-button').addEventListener('click', () => setRepoModalOpen(true));
document.getElementById('repo-modal-close').addEventListener('click', () => setRepoModalOpen(false));
document.getElementById('repo-modal-cancel').addEventListener('click', () => setRepoModalOpen(false));
repoModal.addEventListener('click', (event) => { if (event.target === repoModal) setRepoModalOpen(false); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && repoModal.classList.contains('open')) setRepoModalOpen(false); });

repoForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(repoForm);
  const name = String(data.get('name') || '').trim();
  const url = String(data.get('url') || '').trim();
  const branch = String(data.get('branch') || '').trim();
  if (!name || !url || !branch) return;
  if (!/^https?:\/\//i.test(url)) {
    showToast('请输入 http 或 https 格式的 Git 仓库链接');
    return;
  }
  const duplicate = repositoryRecords.some((record) => record.url === url && record.branch === branch);
  if (duplicate) {
    showToast('该仓库分支已经登记');
    return;
  }
  repositoryRecords.push({
    id: `repo-${Date.now()}`,
    name,
    url,
    branch,
    base: String(data.get('base') || '').trim() || '待设置',
    head: String(data.get('head') || '').trim() || '待解析 head',
    language: String(data.get('language') || '未指定'),
    full: null,
    diff: null,
    changedCovered: null,
    changedTotal: null,
    status: '待运行',
    badge: 'blue',
    color: '#6d8cff'
  });
  saveRepositories();
  renderRepositories();
  repoForm.reset();
  document.getElementById('repo-branch').value = 'main';
  setRepoModalOpen(false);
  showToast(`${name} / ${branch} 已登记`);
});

const taskStorageKey = 'oneflow.current-task.v1';
const defaultTask = {
  name: '支付中心 v2.8 回归',
  mode: 'diff',
  runType: '自动化 + 手工',
  base: '8a7c1d2',
  head: '42f91b8',
  repoIds: defaultRepositories.map((record) => record.id),
  status: '已完成',
  updatedAt: '10-23 14:32'
};

function loadTask() {
  try {
    const saved = window.localStorage.getItem(taskStorageKey);
    if (saved) return { ...defaultTask, ...JSON.parse(saved) };
  } catch (error) {
    // 本地存储不可用时继续使用演示任务。
  }
  return { ...defaultTask, repoIds: [...defaultTask.repoIds] };
}

function saveTask() {
  try {
    window.localStorage.setItem(taskStorageKey, JSON.stringify(currentTask));
  } catch (error) {
    // 本地存储不可用时不阻断当前会话。
  }
}

let currentTask = loadTask();

function renderTask() {
  const selectedRecords = repositoryRecords.filter((record) => currentTask.repoIds.includes(record.id));
  currentTask.repoIds = selectedRecords.map((record) => record.id);
  document.getElementById('task-name').textContent = currentTask.name;
  const status = document.getElementById('task-status');
  status.textContent = `● ${currentTask.status}`;
  status.className = `badge ${currentTask.status === '已完成' ? 'green' : currentTask.status === '待运行' ? 'blue' : 'amber'}`;
  document.getElementById('task-mode').textContent = currentTask.mode === 'diff' ? 'Diff coverage' : 'Full coverage';
  document.getElementById('repo-count').textContent = String(selectedRecords.length);
  const branches = selectedRecords.map((record) => record.branch).join(', ') || '未选择仓库';
  document.getElementById('task-meta').innerHTML = `${selectedRecords.length} 个仓库 · ${escapeHtml(branches)} · 基线 ${escapeHtml(currentTask.base || '—')} · head ${escapeHtml(currentTask.head || '—')} · ${escapeHtml(currentTask.updatedAt)}`;
}

function renderTaskRepoOptions() {
  const picker = document.getElementById('task-repo-options');
  if (!repositoryRecords.length) {
    picker.innerHTML = '<div class="empty">请先登记至少一个代码仓库。</div>';
    return;
  }
  picker.innerHTML = repositoryRecords.map((record) => `<label class="repo-option"><input type="checkbox" name="taskRepos" value="${escapeHtml(record.id)}" ${currentTask.repoIds.includes(record.id) ? 'checked' : ''}><span><strong>${escapeHtml(record.name)}</strong><small>${escapeHtml(record.branch)} · ${escapeHtml(record.head || '待解析 head')} · ${escapeHtml(record.language)}</small></span></label>`).join('');
}

const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const taskModeInput = document.getElementById('task-mode-input');
const taskBaseInput = document.getElementById('task-base-input');
function setTaskModalOpen(open) {
  taskModal.classList.toggle('open', open);
  taskModal.setAttribute('aria-hidden', String(!open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) {
    renderTaskRepoOptions();
    document.getElementById('task-name-input').focus();
  }
}

function syncTaskFormRequirements() {
  taskBaseInput.required = taskModeInput.value === 'diff';
}

document.getElementById('create-task-button').addEventListener('click', () => {
  document.getElementById('task-name-input').value = currentTask.name;
  taskModeInput.value = currentTask.mode;
  document.getElementById('task-run-type-input').value = currentTask.runType;
  taskBaseInput.value = currentTask.base;
  document.getElementById('task-head-input').value = currentTask.head;
  syncTaskFormRequirements();
  setTaskModalOpen(true);
});
document.getElementById('task-modal-close').addEventListener('click', () => setTaskModalOpen(false));
document.getElementById('task-modal-cancel').addEventListener('click', () => setTaskModalOpen(false));
taskModal.addEventListener('click', (event) => { if (event.target === taskModal) setTaskModalOpen(false); });
taskModeInput.addEventListener('change', syncTaskFormRequirements);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && taskModal.classList.contains('open')) setTaskModalOpen(false); });

taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(taskForm);
  const repoIds = data.getAll('taskRepos').map(String);
  if (!repoIds.length) {
    showToast('请至少选择一个关联仓库');
    return;
  }
  const mode = String(data.get('mode') || 'diff');
  const base = String(data.get('base') || '').trim();
  const head = String(data.get('head') || '').trim();
  if (mode === 'diff' && !base) {
    showToast('Diff 覆盖率必须填写 Base Commit 或分支');
    return;
  }
  if (!head) {
    showToast('请填写 Head Commit');
    return;
  }
  currentTask = {
    ...currentTask,
    name: String(data.get('name') || '').trim(),
    mode,
    runType: String(data.get('runType') || '自动化 + 手工'),
    base: base || '—',
    head,
    repoIds,
    status: '待运行',
    updatedAt: new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())
  };
  saveTask();
  renderTask();
  setTaskModalOpen(false);
  showToast(`测试任务“${currentTask.name}”已保存`);
});

const graphData = {
  nodes: [
    { id: 'plan-root', type: 'rect', x: 125, y: 242, text: '支付中心 v2.8', properties: { kind: 'root' } },
    { id: 'module-order', type: 'rect', x: 345, y: 160, text: '订单支付', properties: { kind: 'module' } },
    { id: 'module-risk', type: 'rect', x: 345, y: 330, text: '风控与退款', properties: { kind: 'module' } },
    { id: 'case-001', type: 'rect', x: 630, y: 80, text: 'CASE-PAY-001\n普通支付成功', properties: { kind: 'case', status: 'pass' } },
    { id: 'case-002', type: 'rect', x: 630, y: 190, text: 'CASE-PAY-002\n人工复核', properties: { kind: 'case', status: 'blocked' } },
    { id: 'case-003', type: 'rect', x: 630, y: 300, text: 'CASE-PAY-003\n结算后退款', properties: { kind: 'case', status: 'fail' } },
    { id: 'case-004', type: 'rect', x: 630, y: 410, text: 'CASE-PAY-004\n新设备风控', properties: { kind: 'case', status: 'skipped' } }
  ],
  edges: [
    { id: 'edge-root-order', type: 'bezier', sourceNodeId: 'plan-root', targetNodeId: 'module-order' },
    { id: 'edge-root-risk', type: 'bezier', sourceNodeId: 'plan-root', targetNodeId: 'module-risk' },
    { id: 'edge-order-001', type: 'bezier', sourceNodeId: 'module-order', targetNodeId: 'case-001' },
    { id: 'edge-order-002', type: 'bezier', sourceNodeId: 'module-order', targetNodeId: 'case-002' },
    { id: 'edge-risk-003', type: 'bezier', sourceNodeId: 'module-risk', targetNodeId: 'case-003' },
    { id: 'edge-risk-004', type: 'bezier', sourceNodeId: 'module-risk', targetNodeId: 'case-004' }
  ]
};

function renderCaseDetail(recordId) {
  const record = caseById.get(recordId) || caseRecords[0];
  document.getElementById('case-detail-title').textContent = record.caseId + ' · ' + record.title;
  document.getElementById('case-detail-path').textContent = record.path;
  document.getElementById('case-detail-badges').innerHTML = `<span class="badge ${record.badge}">${statusIcon[record.status]} ${record.statusLabel}</span><span class="badge blue">${record.priority}</span>`;
  const statusActions = document.getElementById('case-status-actions');
  statusActions.innerHTML = Object.entries(statusText).map(([status, label]) => `<button class="status-btn ${record.status === status ? 'active' : ''}" data-status="${status}">${statusIcon[status]} ${label}</button>`).join('');
  statusActions.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => {
    record.status = button.dataset.status;
    record.statusLabel = statusText[record.status];
    record.badge = statusBadge[record.status];
    record.lastRun = '刚刚';
    renderCaseDetail(record.id);
    renderCaseList(document.getElementById('case-status-filter').value);
    showToast(`${record.caseId} 已标记为“${record.statusLabel}”`);
  }));
  document.getElementById('case-owner').textContent = record.owner;
  document.getElementById('case-version-label').textContent = record.version;
  document.getElementById('case-run-type').textContent = record.runType;
  document.getElementById('case-last-run').textContent = record.lastRun;
  document.getElementById('case-coverage-rate').textContent = record.coverage;
  document.getElementById('case-coverage-meta').textContent = record.coverageMeta;
  document.getElementById('case-steps').innerHTML = record.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  const codeButton = document.getElementById('case-code-button');
  codeButton.dataset.code = record.code;
  codeButton.onclick = () => openCode(record.code);
}

function renderCaseList(filter = 'all') {
  const body = document.getElementById('case-table-body');
  const rows = caseRecords.filter((record) => filter === 'all' || record.status === filter);
  body.innerHTML = rows.map((record) => `<tr data-case-row="${record.id}">
    <td><div class="repo"><i class="repo-dot"></i><div><strong>${record.caseId}</strong><div class="task-meta">${escapeHtml(record.title)}</div></div></div></td>
    <td>${escapeHtml(record.path.split(' / ').slice(-1)[0])}</td><td><span class="badge blue">${record.priority}</span></td><td>${record.version}</td><td>${escapeHtml(record.owner)}</td>
    <td><span class="badge ${record.badge}">${statusIcon[record.status]} ${statusText[record.status]}</span></td><td><strong>${record.coverage}</strong></td>
  </tr>`).join('');
  body.querySelectorAll('[data-case-row]').forEach((row) => row.addEventListener('click', () => renderCaseDetail(row.dataset.caseRow)));
}

function initCaseMap() {
  const canvas = document.getElementById('case-canvas');
  if (!window.Core || !window.Core.LogicFlow) {
    canvas.innerHTML = '<div class="case-empty-map">LogicFlow 资源未加载，仍可使用列表视图。</div>';
    return;
  }
  const lf = new window.Core.LogicFlow({
    container: canvas,
    grid: { size: 10, visible: true },
    keyboard: { enabled: true },
    background: { color: '#fbfcff' }
  });
  lf.setTheme({
    rect: { radius: 9, fill: '#ffffff', stroke: '#b7c6e9', strokeWidth: 1.5 },
    bezier: { stroke: '#a8b7d8', strokeWidth: 1.5 },
    nodeText: { color: '#172033', fontSize: 12 },
    edgeText: { color: '#6d7890' }
  });
  lf.render(graphData);
  lf.on('node:click', ({ data }) => {
    if (caseById.has(data.id)) renderCaseDetail(data.id);
  });
}

document.querySelectorAll('[data-case-view]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-case-view]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  const isMap = button.dataset.caseView === 'map';
  document.getElementById('case-map-wrap').classList.toggle('hidden', !isMap);
  document.getElementById('case-list').classList.toggle('visible', !isMap);
}));

document.getElementById('case-status-filter').addEventListener('change', (event) => renderCaseList(event.target.value));
document.getElementById('case-version').addEventListener('change', (event) => {
  document.querySelector('.case-map-hint strong').textContent = event.target.value;
  showToast(`已切换到用例版本 ${event.target.value}`);
});

renderCaseList();
renderCaseDetail('case-001');
initCaseMap();
renderRepositories();
renderTask();
