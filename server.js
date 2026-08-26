const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4173);

const schema = {
  sourceStatus: '已读取主数据范围清单；明细记录未提供',
  recordsImported: 0,
  catalogCount: 18,
  categoryCount: 6,
  entities: [
    { key: 'organization', name: '组织', confirmed: ['公司代码/法人', '工厂/库存地/仓库', '成本中心/利润中心', '部门/业务线'], pending: ['对象编码', '父子引用键', '状态字段'] },
    { key: 'department', name: '部门', confirmed: ['部门/业务线', '组织架构层级'], pending: ['部门编码', '名称', '负责人', '父部门'] },
    { key: 'position', name: '岗位', confirmed: ['员工/人员关联岗位'], pending: ['岗位编码', '名称', '职级', '所属部门'] },
    { key: 'user', name: '用户/人员', confirmed: ['工号', '姓名', '组织', '岗位', '成本中心归属'], pending: ['登录名', '手机号', '邮箱', '账号状态'] },
    { key: 'masterData', name: '业务主数据', confirmed: ['6个分类', '18个主数据对象', '核心内容', '主要使用模块'], pending: ['明细列类型', '唯一键', '真实记录', '引用关系'] },
    { key: 'permission', name: '权限', confirmed: ['菜单权限', '数据权限', '操作权限', 'RBAC'], pending: ['角色清单', '权限编码', '互斥规则'] }
  ]
};

const api = {
  '/api/health': { ok: true, service: 'erp-ai-lowcode-mvp' },
  '/api/master-data/schema': schema,
  '/api/dashboard': { masterDataStatus: '目录已识别，明细待上传', catalogDefinitions: 18, categories: 6, organizations: 0, departments: 0, users: 0, requirements: 0, generationTasks: 0 },
  '/api/requirements': { items: [], message: '尚无需求；上传真实需求Excel后创建。' },
  '/api/generation-tasks': { items: [], message: '尚无生成任务。' }
};

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

http.createServer((req, res) => {
  if (req.method === 'GET' && api[req.url]) {
    res.writeHead(200, { 'Content-Type': types['.json'] });
    return res.end(JSON.stringify(api[req.url]));
  }
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.join(root, requested);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log(`MVP prototype: http://localhost:${port}`));
