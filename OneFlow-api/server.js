const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const DEFAULT_DATA_FILE = process.env.ONEFLOW_DATA_FILE || path.join(__dirname, 'data', 'store.json');
const RESOURCE_MAP = {
  projects: 'projects',
  repositories: 'repositories',
  'test-plans': 'testPlans',
  'coverage-tasks': 'coverageTasks'
};

const DEFAULT_STORE = {
  projects: [
    {
      id: 'project-oneflow',
      name: 'OneFlow',
      key: 'ONEFLOW',
      description: '研发与测试质量一体化平台',
      createdAt: '2026-10-24T00:00:00.000Z'
    }
  ],
  repositories: [
    {
      id: 'repo-openai-release', name: 'oneboxy/openai', url: 'https://github.com/oneboxy/openai',
      branch: 'release/2.8', base: '8a7c1d2', head: '42f91b8', language: 'JavaScript / TypeScript',
      full: 91.6, diff: 88.3, changedCovered: 86, changedTotal: 97, status: '通过', badge: 'green', color: '#6d8cff'
    },
    {
      id: 'repo-payment-main', name: 'payment-service', url: 'https://github.com/example/payment-service',
      branch: 'main', base: 'a72c1b0', head: 'b18de04', language: 'Java',
      full: 84.7, diff: 79.2, changedCovered: 61, changedTotal: 77, status: '关注', badge: 'amber', color: '#a683f3'
    },
    {
      id: 'repo-risk-feature', name: 'risk-engine-python', url: 'https://github.com/example/risk-engine-python',
      branch: 'feature/risk-rule', base: '9a2e1f0', head: '0f12caa', language: 'Python',
      full: 82.1, diff: 72.5, changedCovered: 58, changedTotal: 80, status: '需补测', badge: 'red', color: '#efaa51'
    },
    {
      id: 'repo-web-main', name: 'web-console', url: 'https://github.com/example/web-console',
      branch: 'main', base: '6e8a101', head: '7d9e113', language: 'JavaScript / TypeScript',
      full: 86.4, diff: 83.8, changedCovered: 91, changedTotal: 108, status: '通过', badge: 'green', color: '#ed7193'
    }
  ],
  testPlans: [
    {
      id: 'plan-payment-v28', name: '支付中心 v2.8 回归', mode: 'diff', runType: '自动化 + 手工',
      base: '8a7c1d2', head: '42f91b8', repositoryIds: ['repo-openai-release', 'repo-payment-main', 'repo-risk-feature', 'repo-web-main'],
      status: '已完成', updatedAt: '2026-10-23T14:32:00.000Z'
    }
  ],
  coverageTasks: [
    {
      id: 'coverage-payment-v28', testPlanId: 'plan-payment-v28', mode: 'diff',
      repositoryIds: ['repo-openai-release', 'repo-payment-main', 'repo-risk-feature', 'repo-web-main'],
      status: '已完成', createdAt: '2026-10-23T14:32:00.000Z'
    }
  ]
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${randomUUID()}`;
}

function now() {
  return new Date().toISOString();
}

class JsonStore {
  constructor(dataFile = DEFAULT_DATA_FILE) {
    this.dataFile = dataFile;
    this.data = this.load();
  }

  load() {
    try {
      return { ...clone(DEFAULT_STORE), ...JSON.parse(fs.readFileSync(this.dataFile, 'utf8')) };
    } catch (error) {
      this.save(DEFAULT_STORE);
      return clone(DEFAULT_STORE);
    }
  }

  save(data = this.data) {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    const tempFile = `${this.dataFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, this.dataFile);
  }

  list(resource) {
    return clone(this.data[resource]);
  }

  get(resource, id) {
    return clone(this.data[resource].find((item) => item.id === id) || null);
  }

  create(resource, record) {
    this.data[resource].push(record);
    this.save();
    return clone(record);
  }

  update(resource, id, attributes) {
    const record = this.data[resource].find((item) => item.id === id);
    if (!record) return null;
    Object.assign(record, attributes, { id, updatedAt: now() });
    this.save();
    return clone(record);
  }

  remove(resource, id) {
    const index = this.data[resource].findIndex((item) => item.id === id);
    if (index < 0) return false;
    this.data[resource].splice(index, 1);
    this.save();
    return true;
  }
}

class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function requireText(payload, field) {
  const value = typeof payload[field] === 'string' ? payload[field].trim() : '';
  if (!value) throw new ApiError(400, `${field} is required`);
  return value;
}

function asIds(payload, field = 'repositoryIds') {
  const value = payload[field] ?? payload.repoIds ?? [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new ApiError(400, `${field} must be an array of ids`);
  }
  return [...new Set(value)];
}

function validateRepository(store, payload, partial = false) {
  const name = partial && payload.name === undefined ? undefined : requireText(payload, 'name');
  const url = partial && payload.url === undefined ? undefined : requireText(payload, 'url');
  const branch = partial && payload.branch === undefined ? undefined : requireText(payload, 'branch');
  if (url && !/^https?:\/\//i.test(url)) throw new ApiError(400, 'url must start with http:// or https://');
  return {
    ...(name === undefined ? {} : { name }),
    ...(url === undefined ? {} : { url }),
    ...(branch === undefined ? {} : { branch }),
    ...(payload.language === undefined ? {} : { language: String(payload.language).trim() }),
    ...(payload.base === undefined ? {} : { base: String(payload.base).trim() }),
    ...(payload.head === undefined ? {} : { head: String(payload.head).trim() })
  };
}

function validatePlan(store, payload, partial = false) {
  const name = partial && payload.name === undefined ? undefined : requireText(payload, 'name');
  const repositoryIds = payload.repositoryIds === undefined && payload.repoIds === undefined && partial
    ? undefined
    : asIds(payload);
  if (repositoryIds) {
    const available = new Set(store.list('repositories').map((item) => item.id));
    const missing = repositoryIds.filter((id) => !available.has(id));
    if (missing.length) throw new ApiError(400, 'unknown repository id', { missing });
  }
  const mode = payload.mode === undefined ? undefined : String(payload.mode);
  if (mode !== undefined && !['full', 'diff'].includes(mode)) throw new ApiError(400, 'mode must be full or diff');
  return {
    ...(name === undefined ? {} : { name }),
    ...(repositoryIds === undefined ? {} : { repositoryIds }),
    ...(mode === undefined ? {} : { mode }),
    ...(payload.runType === undefined ? {} : { runType: String(payload.runType).trim() }),
    ...(payload.base === undefined ? {} : { base: String(payload.base).trim() }),
    ...(payload.head === undefined ? {} : { head: String(payload.head).trim() })
  };
}

function normalizeCreate(store, resource, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ApiError(400, 'JSON object body is required');
  if (resource === 'projects') {
    const name = requireText(payload, 'name');
    return { id: payload.id || createId('project'), name, key: String(payload.key || name.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'PROJECT').toUpperCase(), description: String(payload.description || '').trim(), createdAt: now() };
  }
  if (resource === 'repositories') return { id: payload.id || createId('repo'), ...validateRepository(store, payload), full: payload.full ?? null, diff: payload.diff ?? null, changedCovered: payload.changedCovered ?? null, changedTotal: payload.changedTotal ?? null, status: payload.status || '待运行', badge: payload.badge || 'blue', createdAt: now() };
  if (resource === 'testPlans') {
    const plan = validatePlan(store, payload);
    return { id: payload.id || createId('plan'), ...plan, status: payload.status || '待运行', updatedAt: now(), createdAt: now() };
  }
  if (resource === 'coverageTasks') {
    const testPlanId = requireText(payload, 'testPlanId');
    if (!store.get('testPlans', testPlanId)) throw new ApiError(400, 'unknown testPlanId');
    const repositoryIds = asIds(payload);
    return { id: payload.id || createId('coverage'), testPlanId, repositoryIds, mode: payload.mode === 'full' ? 'full' : 'diff', status: payload.status || '待运行', createdAt: now() };
  }
  throw new ApiError(404, 'resource not found');
}

function normalizeUpdate(store, resource, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ApiError(400, 'JSON object body is required');
  if (resource === 'projects') {
    return { ...(payload.name === undefined ? {} : { name: requireText(payload, 'name') }), ...(payload.key === undefined ? {} : { key: String(payload.key).trim().toUpperCase() }), ...(payload.description === undefined ? {} : { description: String(payload.description).trim() }) };
  }
  if (resource === 'repositories') return validateRepository(store, payload, true);
  if (resource === 'testPlans') return validatePlan(store, payload, true);
  if (resource === 'coverageTasks') {
    const attributes = {};
    if (payload.testPlanId !== undefined) {
      const testPlanId = requireText(payload, 'testPlanId');
      if (!store.get('testPlans', testPlanId)) throw new ApiError(400, 'unknown testPlanId');
      attributes.testPlanId = testPlanId;
    }
    if (payload.repositoryIds !== undefined || payload.repoIds !== undefined) attributes.repositoryIds = asIds(payload);
    if (payload.mode !== undefined) {
      if (!['full', 'diff'].includes(payload.mode)) throw new ApiError(400, 'mode must be full or diff');
      attributes.mode = payload.mode;
    }
    if (payload.status !== undefined) attributes.status = String(payload.status);
    return attributes;
  }
  throw new ApiError(404, 'resource not found');
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(body));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) reject(new ApiError(413, 'request body is too large'));
    });
    request.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); } catch (error) { reject(new ApiError(400, 'invalid JSON body')); }
    });
    request.on('error', reject);
  });
}

function createHandler({ dataFile = DEFAULT_DATA_FILE } = {}) {
  const store = new JsonStore(dataFile);
  return async function handleRequest(request, response) {
    if (request.method === 'OPTIONS') return sendJson(response, 204, {});
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/health') return sendJson(response, 200, { ok: true, service: 'oneflow-api', time: now() });
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] !== 'api' || !RESOURCE_MAP[segments[1]] || segments.length > 3) return sendJson(response, 404, { error: 'route not found' });
    const resource = RESOURCE_MAP[segments[1]];
    const id = segments[2];
    try {
      if (request.method === 'GET') {
        if (id) {
          const record = store.get(resource, id);
          return record ? sendJson(response, 200, record) : sendJson(response, 404, { error: 'record not found' });
        }
        return sendJson(response, 200, { data: store.list(resource) });
      }
      if (request.method === 'POST') {
        if (id) throw new ApiError(405, 'POST does not accept an id');
        const record = store.create(resource, normalizeCreate(store, resource, await readJson(request)));
        return sendJson(response, 201, record);
      }
      if (request.method === 'PUT' || request.method === 'PATCH') {
        if (!id) throw new ApiError(405, 'update requires an id');
        const record = store.update(resource, id, normalizeUpdate(store, resource, await readJson(request)));
        return record ? sendJson(response, 200, record) : sendJson(response, 404, { error: 'record not found' });
      }
      if (request.method === 'DELETE') {
        if (!id) throw new ApiError(405, 'delete requires an id');
        return store.remove(resource, id) ? sendJson(response, 204, {}) : sendJson(response, 404, { error: 'record not found' });
      }
      return sendJson(response, 405, { error: 'method not allowed' });
    } catch (error) {
      const status = error instanceof ApiError ? error.status : 500;
      return sendJson(response, status, { error: error.message || 'internal server error', ...(error.details ? { details: error.details } : {}) });
    }
  };
}

function createServer(options = {}) {
  return http.createServer(createHandler(options));
}

if (require.main === module) {
  const port = Number(process.env.PORT || process.env.ONEFLOW_API_PORT || 4100);
  createServer().listen(port, '0.0.0.0', () => {
    console.log(`OneFlow API listening on http://localhost:${port}`);
  });
}

module.exports = { DEFAULT_STORE, JsonStore, createHandler, createServer };
