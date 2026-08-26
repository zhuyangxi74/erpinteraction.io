(function(){
  const initial={role:'customer',privateNotes:[],questionnaire:null,requirement:null,implementation:null,code:null};
  let collab=JSON.parse(localStorage.getItem('erp-ai-collab')||'null')||structuredClone(initial);
  const roles={customer:'客户',consultant:'实施顾问',developer:'开发人员'};
  const roleTips={customer:'您可以先与AI整理需求，确认后的方案再发送给实施顾问。',consultant:'查看客户确认后的需求方案，整理实施文档并发送给开发人员。',developer:'查看已确认需求和实施文档，完成开发交付。'};
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now=()=>new Date().toLocaleString();
  function store(){localStorage.setItem('erp-ai-collab',JSON.stringify(collab));render()}

  const definitions={
    budget:{name:'预算管理',title:'预算管理需求确认表',items:[
      {key:'templateName',label:'模板名称',question:'需要建立什么模板？',required:true,placeholder:'例如：年度预算模板'},
      {key:'scope',label:'管理范围',question:'模板覆盖哪些组织？',required:true,placeholder:'例如：集团、全公司或指定分公司'},
      {key:'metrics',label:'记录内容',question:'需要记录和对比哪些数据？',required:true,placeholder:'例如：预算金额、实际发生额'},
      {key:'period',label:'预算周期',question:'按年度、季度还是月度管理？',required:true,placeholder:'请补充预算周期'},
      {key:'dimensions',label:'预算维度',question:'除公司外，还要按部门、科目或项目拆分吗？',placeholder:'例如：公司、部门、科目、项目'},
      {key:'owners',label:'填报与审核',question:'由谁填报、汇总和确认？',placeholder:'例如：分公司填报、总部财务审核'},
      {key:'permissions',label:'查看权限',question:'不同公司之间的数据如何隔离？',placeholder:'例如：分公司仅查看本公司，总部查看全部'}]},
    purchase:{name:'采购审批',title:'采购流程需求确认表',items:[
      {key:'fields',label:'表单字段',question:'采购申请需要记录哪些内容？',required:true,placeholder:'例如：申请人、部门、物品、数量、金额、供应商'},
      {key:'approvers',label:'审批人员',question:'提交后需要经过哪些人审批？',required:true,placeholder:'例如：部门经理、采购经理、财务总监'},
      {key:'amount',label:'金额条件',question:'不同金额是否采用不同流程？',placeholder:'例如：超过5万元增加财务总监审批'},
      {key:'reject',label:'驳回规则',question:'审批不通过时退回到哪里？',placeholder:'例如：退回发起人'},
      {key:'timeout',label:'超时规则',question:'审批超时后如何处理？',placeholder:'例如：24小时后提醒审批人'}]},
    approval:{name:'审批流程',title:'审批流程需求确认表',items:[
      {key:'scene',label:'业务场景',question:'这个流程用于处理什么业务？',required:true,placeholder:'例如：费用报销、请假申请'},
      {key:'fields',label:'表单字段',question:'发起人需要填写哪些内容？',required:true,placeholder:'请输入表单字段'},
      {key:'approvers',label:'审批人员',question:'需要经过哪些人审批？',required:true,placeholder:'请输入审批顺序'},
      {key:'conditions',label:'流转条件',question:'什么条件会改变审批路径？',placeholder:'没有特殊条件可填写“无”'},
      {key:'exceptions',label:'异常规则',question:'驳回和超时如何处理？',placeholder:'请补充驳回和超时规则'}]},
    generic:{name:'业务应用',title:'业务需求确认表',items:[
      {key:'goal',label:'业务目标',question:'希望解决什么问题？',required:true,placeholder:'请说明业务目标'},
      {key:'users',label:'使用对象',question:'哪些组织、部门或人员使用？',required:true,placeholder:'请补充使用范围'},
      {key:'data',label:'业务数据',question:'需要录入、查询或计算哪些内容？',required:true,placeholder:'请补充业务数据'},
      {key:'process',label:'处理流程',question:'从开始到完成要经过哪些步骤？',placeholder:'请补充处理步骤'},
      {key:'output',label:'最终结果',question:'需要形成哪些页面、报表或文件？',placeholder:'请补充最终交付结果'}]}
  };

  function detectType(text){
    if(/预算|实际发生额|决算/.test(text))return 'budget';
    if(/采购|供应商|采购申请/.test(text))return 'purchase';
    if(/审批|报销|请假|申请流程/.test(text))return 'approval';
    return 'generic';
  }
  function firstMatch(text,patterns){for(const pattern of patterns){const m=text.match(pattern);if(m)return (m[1]||m[0]).trim()}return ''}
  function extractValues(type,text){
    if(type==='budget'){
      const templateName=firstMatch(text,[/(?:建立|新建|创建|制作)(?:一个新的|一个|一份|新的)?([^，。；]{0,20}?预算模板)/,/(预算模板)/]);
      const scope=firstMatch(text,[/(全公司(?:和|及|与)?所有分公司)/,/(集团(?:及|和|与)?(?:全部|所有)?分公司)/,/(所有分公司)/,/(全公司)/]);
      const metrics=[];if(/预算/.test(text))metrics.push('预算');if(/实际发生额|实际金额|实际支出/.test(text))metrics.push(firstMatch(text,[/(实际发生额|实际金额|实际支出)/]));
      return {templateName:templateName||'',scope,metrics:[...new Set(metrics)].join('、'),period:firstMatch(text,[/(年度|季度|月度|每月|每季度|每年)/]),dimensions:scope&&/分公司/.test(scope)?'公司、分公司':'',owners:'',permissions:''};
    }
    if(type==='purchase')return {fields:firstMatch(text,[/(申请人[^。；]*?(?:原因|备注|附件))/]),approvers:firstMatch(text,[/((?:部门经理|采购经理|财务总监|总经理)(?:[^。；]*审批)?)/]),amount:firstMatch(text,[/((?:超过|大于|达到)[^。；]*?(?:审批|通过))/]),reject:firstMatch(text,[/(退回[^，。；]*)/]),timeout:firstMatch(text,[/((?:\d+小时|\d+天)[^，。；]*)/])};
    if(type==='approval')return {scene:firstMatch(text,[/([^，。；]*(?:报销|请假|审批|申请流程))/]),fields:'',approvers:firstMatch(text,[/((?:部门经理|财务|总经理|负责人)[^。；]*审批)/]),conditions:firstMatch(text,[/((?:超过|大于|小于|达到)[^。；]*)/]),exceptions:firstMatch(text,[/((?:驳回|超时|退回)[^。；]*)/])};
    return {goal:text,users:'',data:'',process:'',output:''};
  }
  function buildQuestionnaire(text,previous){
    const type=detectType(text),def=definitions[type],extracted=extractValues(type,text);
    const sameType=previous&&previous.type===type;
    const values={},sources={};
    def.items.forEach(item=>{
      const auto=extracted[item.key]||'';
      const old=sameType?(previous.values?.[item.key]||''):'';
      values[item.key]=old||auto;
      sources[item.key]=old?(previous.sources?.[item.key]||'manual'):(auto?'original':'missing');
    });
    return {type,title:def.title,values,sources,completed:false};
  }
  function allCustomerText(){return collab.privateNotes.filter(n=>n.role==='customer').map(n=>n.text).join('；')}
  function questionnaireStats(q){const def=definitions[q.type]||definitions.generic;const filled=def.items.filter(x=>q.values?.[x.key]).length;return {filled,total:def.items.length,missing:def.items.length-filled}}
  function fieldMarkup(item,q){
    const value=q.values?.[item.key]||'',source=q.sources?.[item.key]||'missing';
    const badge=source==='original'?'<em class="source-badge recognized">已从原始需求填写</em>':source==='manual'?'<em class="source-badge manual">已补充</em>':'<em class="source-badge missing">待补充</em>';
    return `<label class="${value?'has-value':'needs-input'}"><b>${item.label}${item.required?' *':''}</b><span>${item.question}</span>${badge}<textarea id="q_${item.key}" data-q-key="${item.key}" rows="${item.key==='process'||item.key==='data'?2:1}" placeholder="${item.placeholder}">${esc(value)}</textarea></label>`;
  }
  function questionnaireForm(){
    const q=collab.questionnaire;if(!q)return '';
    const def=definitions[q.type]||definitions.generic,stats=questionnaireStats(q);
    return `<div class="ai-form-card"><div class="ai-form-title"><div><b>${def.title}</b><span>AI已自动填写原始要求中明确的内容，请只补充标为“待补充”的项目</span></div><em>${q.completed?'已确认':`已填写 ${stats.filled}/${stats.total}`}</em></div><div class="requirement-match"><span>AI识别场景</span><b>${def.name}</b><i>与当前需求匹配</i></div><div class="ai-table">${def.items.map(item=>fieldMarkup(item,q)).join('')}</div><div class="ai-form-actions"><span>系统不会替您编造原始要求中没有的信息</span><button class="primary" data-collab="saveQuestionnaire">保存并生成需求摘要</button></div></div>`;
  }

  function artifactCard(kind,title,item,action){return `<article class="delivery-card ${item?'ready':''}"><div class="delivery-icon">${item?'✓':'○'}</div><div><small>${kind}</small><b>${title}</b><span>${item?'已交付 · '+item.time:'等待上一步完成'}</span></div>${item?`<button class="secondary" data-collab="${action}">查看</button>`:'<button disabled>待交付</button>'}</article>`}
  function sharedTimeline(){
    let blocks=[];
    if(collab.requirement)blocks.push(`<div class="handoff customer"><div class="handoff-meta"><b>客户</b><span>发送给实施顾问 · ${collab.requirement.time}</span><em>客户与顾问可见</em></div><div class="handoff-card"><span class="doc-type">需求方案</span><h3>${esc(collab.requirement.title)}</h3><p>${esc(collab.requirement.content)}</p><div class="handoff-actions"><button class="secondary" data-collab="viewRequirement">查看完整需求</button>${collab.role==='consultant'&&!collab.implementation?'<button class="primary" data-collab="draftImplementation">编写实施文档</button>':''}</div></div></div>`);
    else blocks.push('<div class="collab-empty"><b>等待客户提交需求方案</b><span>客户确认后，结构化需求会出现在这里。</span></div>');
    if(collab.implementation)blocks.push(`<div class="handoff consultant"><div class="handoff-meta"><b>实施顾问</b><span>发送给开发人员 · ${collab.implementation.time}</span><em>三方可见</em></div><div class="handoff-card"><span class="doc-type">实施文档</span><h3>${esc(collab.implementation.title)}</h3><p>${esc(collab.implementation.content)}</p><div class="handoff-actions"><button class="secondary" data-collab="viewImplementation">查看实施文档</button>${collab.role==='developer'&&!collab.code?'<button class="primary" data-collab="deliverCode">开始开发交付</button>':''}</div></div></div>`);
    if(collab.code)blocks.push(`<div class="handoff developer"><div class="handoff-meta"><b>开发人员</b><span>完成交付 · ${collab.code.time}</span><em>三方可见</em></div><div class="handoff-card code-card"><span class="doc-type">开发代码</span><h3>${esc(collab.code.title)}</h3><p>${esc(collab.code.content)}</p><button class="secondary" data-collab="viewCode">查看代码交付</button></div></div>`);
    return blocks.join('');
  }
  function privateArea(){
    if(collab.role!=='customer')return `<div class="privacy-notice"><b>客户与AI的沟通细节已隐藏</b><p>${roleTips[collab.role]}</p><span>客户确认后的结构化需求方案会显示在下方。</span></div>`;
    const log=collab.privateNotes.length?collab.privateNotes.map(n=>`<div><b>${n.role==='customer'?'客户':'AI'}</b><p>${esc(n.text)}</p></div>`).join(''):'<div class="private-welcome"><b>先用自己的话说明需求</b><p>例如：建立预算模板，记录全公司和所有分公司的预算及实际发生额。</p></div>';
    return `<div class="private-ai"><div class="private-head"><div><b>客户 × AI 需求整理</b><span>先自由描述，AI会把已知信息自动带入对应表格</span></div><em>整理中</em></div><div class="private-log">${log}</div>${questionnaireForm()}<div class="private-compose"><textarea id="privateInput" rows="2" placeholder="继续补充业务要求，AI会更新表格中的对应字段"></textarea><button class="primary" data-collab="askAI">发送给AI</button></div><div class="publish-box"><div><b>确认后发送</b><span>只把最终需求方案发送给实施顾问。</span></div><button class="primary" data-collab="publishRequirement">生成并发送需求方案</button></div></div>`;
  }
  function render(){
    const root=document.querySelector('#assistant');if(!root)return;
    root.innerHTML=`<div class="toolbar"><div><h2>三方协作与交付中心</h2><p>客户、实施顾问和开发人员按阶段传递已确认成果。</p></div><div class="role-switch">${Object.entries(roles).map(([k,v])=>`<button data-role-switch="${k}" class="${collab.role===k?'active':''}">${v}视角</button>`).join('')}</div></div><div class="visibility-banner"><b>当前身份：${roles[collab.role]}</b><span>${roleTips[collab.role]}</span></div><div class="collab-layout"><aside class="collab-rail"><h3>协作流程</h3><div class="stage ${collab.requirement?'done':'active'}"><i>${collab.requirement?'✓':'1'}</i><span><b>客户确认需求</b><small>AI整理 → 需求方案</small></span></div><div class="stage ${collab.implementation?'done':collab.requirement?'active':''}"><i>${collab.implementation?'✓':'2'}</i><span><b>顾问制定实施方案</b><small>需求方案 → 实施文档</small></span></div><div class="stage ${collab.code?'done':collab.implementation?'active':''}"><i>${collab.code?'✓':'3'}</i><span><b>开发人员完成交付</b><small>实施文档 → 开发代码</small></span></div><div class="participant-list"><h4>项目参与者</h4><div><span class="p customer">客</span><b>客户</b><small>${collab.role==='customer'?'当前在线':'可查看交付'}</small></div><div><span class="p consultant">顾</span><b>实施顾问</b><small>${collab.requirement?'已接收需求':'等待需求'}</small></div><div><span class="p developer">开</span><b>开发人员</b><small>${collab.implementation?'已接收实施文档':'等待实施文档'}</small></div><div><span class="p ai">AI</span><b>AI助手</b><small>辅助整理</small></div></div></aside><main class="collab-main">${privateArea()}<div class="shared-head"><h3>项目协作对话</h3><span>只显示确认后的阶段成果</span></div><div class="handoff-list">${sharedTimeline()}</div></main><aside class="delivery-panel"><div class="delivery-head"><h3>项目交付</h3><span>三项成果</span></div>${artifactCard('01','需求',collab.requirement,'viewRequirement')}${artifactCard('02','实施文档',collab.implementation,'viewImplementation')}${artifactCard('03','开发代码',collab.code,'viewCode')}</aside></div>`;
  }
  function saveQuestionnaire(){
    const q=collab.questionnaire,def=definitions[q.type]||definitions.generic;
    def.items.forEach(item=>{const el=document.querySelector(`[data-q-key="${item.key}"]`);if(el){const before=q.values[item.key];q.values[item.key]=el.value.trim();if(q.values[item.key]!==before&&q.values[item.key])q.sources[item.key]='manual';if(!q.values[item.key])q.sources[item.key]='missing'}});
    const missing=def.items.filter(x=>x.required&&!q.values[x.key]);q.completed=missing.length===0;
    if(missing.length){store();return toast(`还需补充：${missing.map(x=>x.label).join('、')}`)}
    collab.privateNotes.push({role:'ai',text:'已完成结构化整理。原始要求和您补充的内容已合并为需求摘要，请确认后发送给实施顾问。'});store();toast('需求摘要已生成');
  }
  function publishRequirement(){
    const q=collab.questionnaire;if(!q?.completed)return toast('请先补齐必填项并保存需求表');
    const def=definitions[q.type]||definitions.generic;
    const details=def.items.filter(x=>q.values[x.key]).map(x=>`${x.label}：${q.values[x.key]}`).join('；');
    collab.requirement={title:`${def.name}需求方案`,content:`原始需求：${allCustomerText()}；${details}`,time:now()};store();toast('需求方案已发送给实施顾问');
  }
  function showDoc(title,body,type){modal(`<div class="modal-head"><div><h2>${title}</h2><p>${type} · 三方协作交付物</p></div><button data-close>×</button></div><div class="document-preview"><h3>${title}</h3><p>${body}</p><h4>交付状态</h4><p>已确认并进入下一阶段。</p></div><div class="modal-actions"><button class="secondary" data-close>关闭</button><button class="primary" onclick="toast('已下载交付物（演示）')">下载</button></div>`)}

  document.addEventListener('click',e=>{
    const role=e.target.closest('[data-role-switch]');if(role){collab.role=role.dataset.roleSwitch;store();return}
    const b=e.target.closest('[data-collab]');if(!b)return;
    const action=b.dataset.collab;
    if(action==='askAI'){
      const input=document.querySelector('#privateInput'),text=input.value.trim();if(!text)return toast('请输入需要梳理的业务内容');
      collab.privateNotes.push({role:'customer',text});
      const combined=allCustomerText();collab.questionnaire=buildQuestionnaire(combined,collab.questionnaire);
      const def=definitions[collab.questionnaire.type],stats=questionnaireStats(collab.questionnaire);
      collab.privateNotes.push({role:'ai',text:`已识别为“${def.name}”需求，并从您的描述中自动填写了 ${stats.filled} 项。请只补充表格中标为“待补充”的内容。`});store();return;
    }
    if(action==='saveQuestionnaire'){saveQuestionnaire();return}
    if(action==='publishRequirement'){publishRequirement();return}
    if(action==='draftImplementation'){
      modal(`<div class="modal-head"><div><h2>编写实施文档</h2><p>基于已确认需求，形成开发人员可执行的实施说明。</p></div><button data-close>×</button></div><label class="field"><span>实施文档标题</span><input id="implTitle" value="业务应用实施方案"></label><label class="field"><span>实施内容</span><textarea id="implBody" rows="7">配置数据模型、业务表单和业务规则；完成权限配置、测试验证与用户确认。</textarea></label><div class="modal-actions"><button class="secondary" data-close>取消</button><button class="primary" id="sendImplementation">发送给开发人员</button></div>`);
      document.querySelector('#sendImplementation').onclick=()=>{collab.implementation={title:document.querySelector('#implTitle').value,content:document.querySelector('#implBody').value,time:now()};localStorage.setItem('erp-ai-collab',JSON.stringify(collab));closeModal();render();toast('实施文档已发送给开发人员')};return;
    }
    if(action==='deliverCode'){collab.code={title:'业务应用源代码与配置',content:'前端页面、业务规则配置、数据模型脚本、接口说明及部署说明。',time:now()};store();toast('开发代码已完成交付');return}
    if(action==='viewRequirement'&&collab.requirement)showDoc(collab.requirement.title,collab.requirement.content,'需求');
    if(action==='viewImplementation'&&collab.implementation)showDoc(collab.implementation.title,collab.implementation.content,'实施文档');
    if(action==='viewCode'&&collab.code)showDoc(collab.code.title,collab.code.content,'开发代码');
  });
  if(collab.questionnaire&&!collab.questionnaire.type&&allCustomerText()){
    collab.questionnaire=buildQuestionnaire(allCustomerText(),null);
    localStorage.setItem('erp-ai-collab',JSON.stringify(collab));
  }
  window.renderResearch=render;render();
})();
