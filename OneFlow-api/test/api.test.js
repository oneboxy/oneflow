const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, before, test } = require('node:test');
const { createHandler } = require('../server');

const dataFile = path.join(os.tmpdir(), `oneflow-api-${process.pid}.json`);
let handleRequest;

function request(method, route, body) {
  return new Promise((resolve, reject) => {
    const incoming = new EventEmitter();
    incoming.method = method;
    incoming.url = route;
    const payload = body === undefined ? '' : JSON.stringify(body);
    const response = {
      writeHead(statusCode) { this.statusCode = statusCode; },
      end(text) {
        try { resolve({ status: this.statusCode, body: text ? JSON.parse(text) : null }); } catch (error) { reject(error); }
      }
    };
    Promise.resolve(handleRequest(incoming, response)).catch(reject);
    process.nextTick(() => {
      if (payload) incoming.emit('data', payload);
      incoming.emit('end');
    });
  });
}

before(async () => {
  fs.rmSync(dataFile, { force: true });
  handleRequest = createHandler({ dataFile });
});

after(() => {
  fs.rmSync(dataFile, { force: true });
});

test('health endpoint reports a running API', async () => {
  const result = await request('GET', '/health');
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
});

test('repository, test plan and coverage task references are persisted', async () => {
  const repository = await request('POST', '/api/repositories', {
    name: 'demo-service', url: 'https://github.com/example/demo-service', branch: 'feature/demo', language: 'Python'
  });
  assert.equal(repository.status, 201);

  const plan = await request('POST', '/api/test-plans', {
    name: 'Demo diff regression', mode: 'diff', runType: '自动化', base: 'main', head: 'abc1234', repositoryIds: [repository.body.id]
  });
  assert.equal(plan.status, 201);

  const task = await request('POST', '/api/coverage-tasks', {
    testPlanId: plan.body.id, mode: 'diff', repositoryIds: [repository.body.id]
  });
  assert.equal(task.status, 201);
  assert.equal(task.body.testPlanId, plan.body.id);

  const repositories = await request('GET', '/api/repositories');
  assert.equal(repositories.status, 200);
  assert.ok(repositories.body.data.some((item) => item.id === repository.body.id));
});

test('unknown repository references are rejected', async () => {
  const result = await request('POST', '/api/test-plans', { name: 'Invalid plan', repositoryIds: ['missing-repository'] });
  assert.equal(result.status, 400);
  assert.deepEqual(result.body.details.missing, ['missing-repository']);
});
