# OneFlow API

当前实现是 P0-03 的 MVP：使用 Node.js 原生 HTTP 服务和 JSON 文件持久化，先打通项目、仓库、测试计划和覆盖率任务的数据边界。

## 启动

```bash
cd /workspace/openai/OneFlow-api
npm run check
npm test
node server.js
```

默认监听 `http://localhost:4100`（云平台会优先读取 `PORT`）。数据文件默认写入 `data/store.json`，该文件已加入 `.gitignore`。

仓库根目录的 `render.yaml` 和本目录的 `Dockerfile` 可用于部署 API；GitHub Pages 本身不能运行 Node API。

## API

```text
GET    /health
GET    /api/projects
POST   /api/projects
GET    /api/repositories
POST   /api/repositories
PUT    /api/repositories/:id
DELETE /api/repositories/:id
GET    /api/test-plans
POST   /api/test-plans
PUT    /api/test-plans/:id
GET    /api/coverage-tasks
POST   /api/coverage-tasks
PUT    /api/coverage-tasks/:id
```

测试计划会校验 `repositoryIds` 是否存在；覆盖率任务会校验 `testPlanId` 是否存在。后续 P0-04 会在此 API 之上接入真实 Git Provider、分支和 Commit 解析。
