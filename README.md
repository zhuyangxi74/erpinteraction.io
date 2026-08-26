# 可运行MVP原型

此原型包含一个无外部依赖的 Node.js 服务和静态前端，展示工作台、AI需求助手、需求中心、项目进度、应用中心、主数据中心、部门工作区和权限中心。

运行：

```powershell
node server.js
```

浏览器打开 `http://localhost:4173`。

可用只读接口：

- `GET /api/health`
- `GET /api/master-data/schema`
- `GET /api/dashboard`
- `GET /api/requirements`
- `GET /api/generation-tasks`

当前已按《表格_20260825.csv》登记 6 个分类、18 个主数据对象，但没有写入任何虚构客户明细记录。收到员工、部门、物料等明细模板或脱敏样例后，下一步是实现上传、精确字段映射、校验和持久化。
