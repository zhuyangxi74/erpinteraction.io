(function(){
  const initial={role:'customer',projectId:`project-${Date.now()}`,projectMeta:{name:'',organization:'',department:'',owner:'',planDate:''},privateNotes:[],questionnaire:null,pendingIntent:null,requirement:null,implementation:null,implementationVersions:[],code:null,codeVersions:[],acceptance:null,events:[]};
  let collab=JSON.parse(localStorage.getItem('erp-ai-collab')||'null')||structuredClone(initial);
  if(!collab.projectId){collab.projectId=`project-${Date.now()}`;localStorage.setItem('erp-ai-collab',JSON.stringify(collab))}
  collab.projectMeta=collab.projectMeta||structuredClone(initial.projectMeta);collab.implementationVersions=collab.implementationVersions||[];collab.codeVersions=collab.codeVersions||[];collab.events=collab.events||[];collab.pendingIntent=collab.pendingIntent||null;
  const roles={customer:'客户',consultant:'实施顾问',developer:'开发人员'};
  const roleTips={customer:'您可以先与AI整理需求，确认后的方案再发送给实施顾问。',consultant:'查看客户确认后的需求方案，整理实施文档并发送给开发人员。',developer:'查看已确认需求和实施文档，完成开发交付。'};
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const now=()=>new Date().toLocaleString();
  function store(){localStorage.setItem('erp-ai-collab',JSON.stringify(collab));render()}
  function recordEvent(action,detail){collab.events.unshift({role:roles[collab.role]||collab.role,action,detail,time:now()});collab.events=collab.events.slice(0,50)}
  const fileSize=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`;
  function openFileDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('erp-ai-collab-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
  async function persistFile(file){const db=await openFileDb(),id=`file-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;await new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id,blob:file,name:file.name,type:file.type,size:file.size});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();return{id,name:file.name,type:file.type||'application/octet-stream',size:file.size}}
  async function downloadStoredFile(id){const db=await openFileDb(),record=await new Promise((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});db.close();if(!record)return toast('当前浏览器中未找到该文件，请重新上传');const url=URL.createObjectURL(record.blob),a=document.createElement('a');a.href=url;a.download=record.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function attachedFile(file){return file?`<div class="attached-file"><i>↥</i><span><b>${esc(file.name)}</b><small>${fileSize(file.size||0)}</small></span><button class="link" data-collab="downloadFile" data-file-id="${file.id}">下载</button></div>`:''}

  const definitions={
    budget:{name:'预算管理',title:'预算管理需求确认表',items:[
      {key:'templateName',label:'模板名称',question:'需要建立什么模板？',required:true,placeholder:'例如：年度预算模板'},
      {key:'scope',label:'管理范围',question:'模板覆盖哪些组织？',required:true,placeholder:'例如：集团、全公司或指定分公司'},
      {key:'metrics',label:'记录内容',question:'需要记录和对比哪些数据？',required:true,placeholder:'例如：预算金额、实际发生额'},
      {key:'period',label:'预算周期',question:'按年度、季度还是月度管理？',placeholder:'未说明，可提交后由实施顾问确认'},
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
    if(type==='purchase'){
      const approvers=['部门经理','采购经理','财务总监','总经理'].filter(x=>text.includes(x));
      const amount=[...text.matchAll(/(?:超过|大于|达到)[^，。；]*(?:审批|通过)/g)].map(x=>x[0]);
      return {fields:firstMatch(text,[/(申请人[^。；]*?(?:原因|备注|附件))/]),approvers:[...new Set(approvers)].join('、'),amount:[...new Set(amount)].join('；'),reject:firstMatch(text,[/(退回[^，。；]*)/]),timeout:firstMatch(text,[/((?:\d+小时|\d+天)[^，。；]*)/])};
    }
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
  function allCustomerText(){return collab.privateNotes.filter(n=>n.role==='customer'&&!n.pendingIntent).map(n=>n.text).join('；')}
  function questionnaireStats(q){const def=definitions[q.type]||definitions.generic;const filled=def.items.filter(x=>q.values?.[x.key]).length;return {filled,total:def.items.length,missing:def.items.length-filled}}
  function fieldMarkup(item,q){
    const value=q.values?.[item.key]||'',source=q.sources?.[item.key]||'missing';
    const badge=source==='original'?'<em class="source-badge recognized">已从原始需求填写</em>':source==='manual'?'<em class="source-badge manual">已补充</em>':'<em class="source-badge missing">待补充</em>';
    return `<label class="${value?'has-value':'needs-input'}"><b>${item.label}${item.required?' *':''}</b><span>${item.question}</span>${badge}<textarea id="q_${item.key}" data-q-key="${item.key}" rows="${item.key==='process'||item.key==='data'?2:1}" placeholder="${item.placeholder}">${esc(value)}</textarea></label>`;
  }
  function questionnaireForm(){
    const q=collab.questionnaire;if(!q)return '';
    const def=definitions[q.type]||definitions.generic,stats=questionnaireStats(q);
    return `<div class="ai-form-card"><div class="ai-form-title"><div><b>${def.title}</b><span>AI已自动填写原始要求中明确的内容，您可以补充后直接提交</span></div><em>${q.completed?'已提交':`已填写 ${stats.filled}/${stats.total}`}</em></div><div class="requirement-match"><span>AI识别场景</span><b>${def.name}</b><i>与当前需求匹配</i></div><div class="ai-table">${def.items.map(item=>fieldMarkup(item,q)).join('')}</div><div class="ai-form-actions"><span>未提供的信息会标记为“待确认”，不会阻止提交</span><button class="primary" data-collab="submitQuestionnaire">确认并提交需求</button></div></div>`;
  }
  function versionHistory(type){const list=type==='implementation'?collab.implementationVersions:collab.codeVersions;if(!list.length)return '';return `<div class="version-history"><div class="version-title"><b>版本记录</b><span>${list.length} 个版本</span></div>${list.slice().reverse().map(v=>`<div><i>${esc(v.version)}</i><span><b>${esc(v.file?.name||v.title)}</b><small>${v.time}${v.note?` · ${esc(v.note)}`:''}</small></span>${v.file?`<button class="link" data-collab="downloadFile" data-file-id="${v.file.id}">下载</button>`:''}</div>`).join('')}</div>`}
  function acceptancePanel(){if(!collab.code)return '';const status=collab.acceptance?.status;return `<div class="acceptance-card ${status||'pending'}"><div><span class="role-tag customer">客户验收</span><h3>${status==='accepted'?'交付已验收':status==='rejected'?'交付已退回修改':'请验收开发交付'}</h3><p>${status==='accepted'?`验收意见：${esc(collab.acceptance.note||'无')}`:status==='rejected'?`修改意见：${esc(collab.acceptance.note)}`:'请确认需求、实施文档和开发代码是否符合项目要求。'}</p></div>${status==='accepted'?`<em>已通过 · ${collab.acceptance.time}</em>`:`<label class="field"><span>${status==='rejected'?'补充验收意见':'验收意见'}</span><textarea id="acceptanceNote" rows="2" placeholder="通过时可选；驳回时请填写具体修改意见"></textarea></label><div class="acceptance-actions"><button class="secondary" data-collab="rejectDelivery">驳回修改</button><button class="primary" data-collab="acceptDelivery">验收通过</button></div>`}</div>`}

  function artifactCard(kind,title,item,action){const acceptance=title==='开发代码'&&item?(collab.acceptance?.status==='accepted'?' · 客户已验收':collab.acceptance?.status==='rejected'?' · 已退回':' · 待客户验收'):'';return `<article class="delivery-card ${item?'ready':''}"><div class="delivery-icon">${item?'✓':'○'}</div><div><small>${kind}</small><b>${title}</b><span>${item?esc(item.file?.name||'在线内容')+' · '+item.time+acceptance:'等待上一步完成'}</span></div>${item?`<button class="secondary" data-collab="${action}">查看</button>`:'<button disabled>待交付</button>'}</article>`}
  function sharedTimeline(){
    let blocks=[];
    if(collab.requirement)blocks.push(`<div class="handoff customer"><div class="handoff-meta"><b>客户</b><span>发送给实施顾问 · ${collab.requirement.time}</span><em>客户与顾问可见</em></div><div class="handoff-card"><span class="doc-type">需求方案</span><h3>${esc(collab.requirement.title)}</h3><p>${esc(collab.requirement.content)}</p>${attachedFile(collab.requirement.file)}<div class="handoff-actions"><button class="secondary" data-collab="viewRequirement">查看完整需求</button></div></div></div>`);
    else blocks.push('<div class="collab-empty"><b>等待客户提交需求方案</b><span>客户确认后，结构化需求会出现在这里。</span></div>');
    if(collab.implementation)blocks.push(`<div class="handoff consultant"><div class="handoff-meta"><b>实施顾问</b><span>发送给开发人员 · ${collab.implementation.time}</span><em>三方可见</em></div><div class="handoff-card"><span class="doc-type">实施文档 · ${esc(collab.implementation.version||'V1.0')}</span><h3>${esc(collab.implementation.title)}</h3><p>${esc(collab.implementation.content)}</p>${attachedFile(collab.implementation.file)}<div class="handoff-actions"><button class="secondary" data-collab="viewImplementation">查看实施文档</button></div></div></div>`);
    if(collab.code)blocks.push(`<div class="handoff developer"><div class="handoff-meta"><b>开发人员</b><span>完成交付 · ${collab.code.time}</span><em>三方可见</em></div><div class="handoff-card code-card"><span class="doc-type">开发交付 · ${esc(collab.code.version||'V1.0.0')}</span><span class="acceptance-pill ${collab.acceptance?.status||'pending'}">${collab.acceptance?.status==='accepted'?'客户已验收':collab.acceptance?.status==='rejected'?'客户已退回':'待客户验收'}</span><h3>${esc(collab.code.title)}</h3><p>${esc(collab.code.content)}</p>${attachedFile(collab.code.file)}<button class="secondary" data-collab="viewCode">查看开发交付</button></div></div>`);
    return blocks.join('');
  }
  function privateArea(){
    if(collab.role==='consultant'){
      if(!collab.requirement)return `<div class="role-workbench empty-workbench"><b>等待客户确认需求</b><span>客户提交需求方案后，您可以在这里上传实施方案、原型说明或配置清单。</span></div>`;
      return `<div class="role-workbench"><div class="workbench-head"><div><span class="role-tag consultant">实施顾问工作台</span><h3>${collab.implementation?'更新实施文档':'提交实施文档'}</h3><p>基于客户确认的需求，上传可供开发人员执行的正式方案。</p></div><em>${collab.implementation?'已提交，可更新':'等待提交'}</em></div><div class="workbench-grid"><label class="field"><span>文档标题 *</span><input id="implementationTitle" value="${esc(collab.implementation?.title||'业务应用实施方案')}"></label><label class="field"><span>版本</span><input id="implementationVersion" value="${esc(collab.implementation?.version||'V1.0')}"></label><label class="field span2"><span>实施文件 *</span><input id="implementationFile" type="file" accept=".doc,.docx,.pdf,.xls,.xlsx,.ppt,.pptx,.zip"></label><label class="field span2"><span>实施说明</span><textarea id="implementationNote" rows="3" placeholder="说明数据模型、页面、流程、接口及实施注意事项">${esc(collab.implementation?.content||'')}</textarea></label></div><div id="implementationFileHint" class="selected-file">${collab.implementation?.file?`当前文件：${esc(collab.implementation.file.name)} · 上传新文件可替换`:'支持 Word、PDF、Excel、PPT 或 ZIP'}</div><div class="workbench-actions"><span>提交后，开发人员将在同一项目中收到文件。</span><button class="primary" data-collab="submitImplementation">${collab.implementation?'更新并重新提交':'提交给开发人员'}</button></div>${versionHistory('implementation')}</div>`;
    }
    if(collab.role==='developer'){
      if(!collab.implementation)return `<div class="role-workbench empty-workbench"><b>等待实施顾问提交方案</b><span>实施文档到达后，您可以上传源代码包、数据库脚本、接口文档和部署说明。</span></div>`;
      return `<div class="role-workbench">${collab.acceptance?.status==='rejected'?`<div class="revision-alert"><b>客户已驳回本次交付</b><span>${esc(collab.acceptance.note)}</span></div>`:''}<div class="workbench-head"><div><span class="role-tag developer">开发人员工作台</span><h3>${collab.code?'更新开发交付':'提交开发交付'}</h3><p>上传客户可以接收和后续维护的完整开发成果。</p></div><em>${collab.code?'已交付，可更新':'等待交付'}</em></div><div class="workbench-grid"><label class="field"><span>交付名称 *</span><input id="codeTitle" value="${esc(collab.code?.title||'业务应用源代码与配置')}"></label><label class="field"><span>版本</span><input id="codeVersion" value="${esc(collab.code?.version||'V1.0.0')}"></label><label class="field span2"><span>代码或交付包 *</span><input id="codeFile" type="file" accept=".zip,.rar,.7z,.json,.yaml,.yml,.sql,.js,.ts,.vue,.java,.py,.md,.pdf"></label><label class="field span2"><span>交付说明</span><textarea id="codeNote" rows="3" placeholder="说明包含内容、部署方式、依赖与已知问题">${esc(collab.code?.content||'')}</textarea></label></div><div id="codeFileHint" class="selected-file">${collab.code?.file?`当前文件：${esc(collab.code.file.name)} · 上传新文件可替换`:'建议上传 ZIP 完整包，也可提交脚本、配置或说明文档'}</div><div class="delivery-checklist"><span>交付包建议包含</span><i>源代码</i><i>数据库脚本</i><i>接口说明</i><i>部署说明</i></div><div class="workbench-actions"><span>提交后，客户可在项目交付中查看和下载。</span><button class="primary" data-collab="submitCode">${collab.code?'更新开发交付':'完成开发交付'}</button></div>${versionHistory('code')}</div>`;
    }
    const log=collab.privateNotes.length?collab.privateNotes.map(n=>`<div class="flow-message ${n.role}"><span>${n.role==='customer'?'客户':'AI'}</span><p>${esc(n.text)}</p></div>`).join(''):'<div class="dialog-welcome"><span class="ai-orb">AI</span><div><b>请先描述您想解决的业务问题</b><p>例如：建立预算模板，记录全公司和所有分公司的预算及实际发生额。</p></div></div>';
    const intentChoice=collab.pendingIntent?`<div class="intent-switch"><div><span>检测到新的业务主题</span><b>“${definitions[collab.questionnaire?.type||'generic'].name}”与“${definitions[collab.pendingIntent.type]?.name||'新需求'}”不是同一项需求</b><p>请选择如何处理，系统不会再自动混入当前表格。</p></div><button class="primary" data-collab="startNewIntent">新建${definitions[collab.pendingIntent.type]?.name||''}需求（推荐）</button><button class="secondary" data-collab="keepCurrentIntent">作为当前需求的补充说明</button></div>`:'';
    const currentStep=collab.questionnaire?.completed&&collab.requirement?3:collab.questionnaire?2:1;
    const formContent=collab.questionnaire?questionnaireForm():`<div class="form-waiting"><span>02</span><h3>结构化需求表将在这里生成</h3><p>您在左侧描述业务后，AI会识别业务场景，并把已经明确的信息自动填写到表格中。</p><div><i>业务字段</i><i>使用范围</i><i>审批流程</i><i>业务规则</i></div></div>`;
    return `${acceptancePanel()}<div class="customer-flow"><div class="customer-flow-head"><div><span class="role-tag customer">客户需求整理</span><h3>先对话，再确认表格</h3></div><div class="flow-progress">${[['1','与AI对话'],['2','补充需求表'],['3','提交顾问']].map((x,i)=>`<div class="${currentStep>i+1?'done':currentStep===i+1?'active':''}"><i>${currentStep>i+1?'✓':x[0]}</i><b>${x[1]}</b></div>`).join('<em>→</em>')}</div></div><div class="customer-flow-grid"><section class="dialog-lane"><div class="lane-head"><div><span class="lane-number">01</span><b>AI需求对话</b></div><small>用自己的话连续描述，AI会追问缺失内容</small></div><div class="dialog-log">${log}${intentChoice}</div><div class="dialog-compose"><textarea id="privateInput" rows="3" placeholder="${collab.pendingIntent?'请先处理上方检测到的新业务主题':'请输入业务想法、流程或需要解决的问题…'}" ${collab.pendingIntent?'disabled':''}></textarea><div><small>${collab.pendingIntent?'请选择新建需求或保留为补充说明':'发送后，右侧表格会同步更新'}</small><button class="primary" data-collab="askAI" ${collab.pendingIntent?'disabled':''}>发送给AI →</button></div></div></section><section class="form-lane"><div class="lane-head"><div><span class="lane-number">02</span><b>AI生成需求表</b></div><small>绿色为已识别，黄色为需要客户补充</small></div><div class="form-lane-body">${formContent}</div></section></div></div>`;
  }
  function render(){
    const root=document.querySelector('#assistant');if(!root)return;
    root.innerHTML=`<div class="center-tabs"><button class="active" data-go="assistant">AI需求对话</button><button data-go="requirements">需求列表与文件</button></div><div class="toolbar"><div><h2>需求协作中心</h2><p>客户先与AI整理需求，再由实施顾问和开发人员承接已确认成果。</p></div><div class="collab-toolbar-actions"><button class="primary" data-collab="openCustomerChat">打开AI需求对话</button><button class="secondary" data-collab="projectMeta">项目资料</button><div class="role-switch">${Object.entries(roles).map(([k,v])=>`<button data-role-switch="${k}" class="${collab.role===k?'active':''}">${v}视角</button>`).join('')}</div></div></div><div class="ai-boundary"><span class="ai-chip">AI处理</span><b>理解需求、解析Excel、检查遗漏</b><i></i><span class="human-chip">人工完成</span><b>顾问提交实施方案、开发人员提交代码、客户验收</b></div><div class="visibility-banner"><b>当前身份：${roles[collab.role]}</b><span>${roleTips[collab.role]}</span></div><div class="collab-layout"><aside class="collab-rail"><h3>协作流程</h3><div class="stage ${collab.requirement?'done':'active'}"><i>${collab.requirement?'✓':'1'}</i><span><b>客户确认需求</b><small><em class="ai-mini">AI</em> 整理 · <em class="human-mini">人工</em>确认</small></span></div><div class="stage ${collab.implementation?'done':collab.requirement?'active':''}"><i>${collab.implementation?'✓':'2'}</i><span><b>顾问制定实施方案</b><small><em class="ai-mini">AI</em> 辅助 · <em class="human-mini">顾问</em>提交</small></span></div><div class="stage ${collab.code?'done':collab.implementation?'active':''}"><i>${collab.code?'✓':'3'}</i><span><b>开发人员提交代码</b><small><em class="human-mini">开发</em>上传代码包和交付说明</small></span></div><div class="stage ${collab.acceptance?.status==='accepted'?'done':collab.code?'active':''}"><i>${collab.acceptance?.status==='accepted'?'✓':'4'}</i><span><b>客户验收</b><small><em class="human-mini">人工</em>通过或驳回</small></span></div><div class="participant-list"><h4>项目参与者</h4><div><span class="p customer">客</span><b>客户</b><small>${collab.role==='customer'?'当前在线':'可查看交付'}</small></div><div><span class="p consultant">顾</span><b>实施顾问</b><small>${collab.requirement?'已接收需求':'等待需求'}</small></div><div><span class="p developer">开</span><b>开发人员</b><small>${collab.implementation?'已接收实施文档':'等待实施文档'}</small></div><div><span class="p ai">AI</span><b>AI助手</b><small>辅助理解和检查需求</small></div></div></aside><main class="collab-main">${privateArea()}<div class="shared-head"><h3>项目协作对话</h3><span>只显示确认后的阶段成果</span></div><div class="handoff-list">${sharedTimeline()}</div></main><aside class="delivery-panel"><div class="delivery-head"><h3>项目交付</h3><span>三项成果</span></div>${artifactCard('01','需求',collab.requirement,'viewRequirement')}${artifactCard('02','实施文档',collab.implementation,'viewImplementation')}${artifactCard('03','开发代码',collab.code,'viewCode')}</aside></div>`;
    requestAnimationFrame(()=>{const log=document.querySelector('.dialog-log');if(log)log.scrollTop=log.scrollHeight});
  }
  function submitQuestionnaire(){
    const q=collab.questionnaire,def=definitions[q.type]||definitions.generic;
    def.items.forEach(item=>{const el=document.querySelector(`[data-q-key="${item.key}"]`);if(el){const before=q.values[item.key];q.values[item.key]=el.value.trim();if(q.values[item.key]!==before&&q.values[item.key])q.sources[item.key]='manual';if(!q.values[item.key])q.sources[item.key]='missing'}});
    const missingCore=def.items.filter(x=>x.required&&!q.values[x.key]);
    if(missingCore.length)return toast(`请先填写：${missingCore.map(x=>x.label).join('、')}`);
    q.completed=true;
    const details=def.items.map(x=>`${x.label}：${q.values[x.key]||'待确认'}`).join('；');
    const isRevision=!!collab.requirement;collab.requirement={title:`${def.name}需求方案`,content:`原始需求：${allCustomerText()}；${details}`,time:now()};collab.revisionMode=false;recordEvent(isRevision?'提交需求修订版':'提交需求',collab.requirement.title);store();toast(isRevision?'需求修订版已重新发送给实施顾问':'需求方案已发送给实施顾问');
  }
  function showProjectMeta(){const p=collab.projectMeta||{};modal(`<div class="modal-head"><div><h2>项目基础资料</h2><p>三方协作共用；未填写的内容保持为空。</p></div><button data-close>×</button></div><div class="form-grid"><label class="field span2"><span>项目名称</span><input id="projectName" value="${esc(p.name)}" placeholder="请输入项目名称"></label><label class="field"><span>客户组织</span><input id="projectOrganization" value="${esc(p.organization)}" placeholder="未提供"></label><label class="field"><span>所属部门</span><input id="projectDepartment" value="${esc(p.department)}" placeholder="未提供"></label><label class="field"><span>项目负责人</span><input id="projectOwner" value="${esc(p.owner)}" placeholder="未提供"></label><label class="field"><span>计划完成日期</span><input id="projectPlanDate" type="date" value="${esc(p.planDate)}"></label></div><div class="modal-actions"><button class="secondary" data-close>取消</button><button class="primary" data-collab="saveProjectMeta">保存项目资料</button></div>`)}
  function showDoc(item,type){modal(`<div class="modal-head"><div><h2>${esc(item.title)}</h2><p>${type} · ${esc(item.version||'已确认版本')}</p></div><button data-close>×</button></div><div class="document-preview"><h3>${esc(item.title)}</h3><p>${esc(item.content)}</p>${attachedFile(item.file)}<h4>交付状态</h4><p>已确认并进入下一阶段。</p></div><div class="modal-actions"><button class="secondary" data-close>关闭</button>${item.file?`<button class="primary" data-collab="downloadFile" data-file-id="${item.file.id}">下载文件</button>`:''}</div>`)}

  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-view="assistant"]')){collab.role='customer';store();return}
    const role=e.target.closest('[data-role-switch]');if(role){collab.role=role.dataset.roleSwitch;store();return}
    const b=e.target.closest('[data-collab]');if(!b)return;
    const action=b.dataset.collab;
    if(action==='openCustomerChat'){collab.role='customer';store();return}
    if(action==='askAI'){
      const input=document.querySelector('#privateInput'),text=input.value.trim();if(!text)return toast('请输入需要梳理的业务内容');
      if(collab.pendingIntent)return toast('请先选择如何处理检测到的新业务主题');
      const incomingType=detectType(text),currentType=collab.questionnaire?.type;
      if(currentType&&currentType!=='generic'&&incomingType!=='generic'&&currentType!==incomingType){
        collab.privateNotes.push({role:'customer',text,pendingIntent:true});collab.pendingIntent={type:incomingType,text};
        collab.privateNotes.push({role:'ai',text:`检测到这段内容属于“${definitions[incomingType].name}”，与当前“${definitions[currentType].name}”不是同一项需求。请选择新建需求，或明确作为当前需求的补充说明。`});store();return;
      }
      collab.privateNotes.push({role:'customer',text});
      const combined=allCustomerText();collab.questionnaire=buildQuestionnaire(combined,collab.questionnaire);if(collab.requirement){collab.questionnaire.completed=false;collab.revisionMode=true}
      const def=definitions[collab.questionnaire.type],stats=questionnaireStats(collab.questionnaire);
      collab.privateNotes.push({role:'ai',text:`已识别为“${def.name}”需求，当前表格已填写 ${stats.filled}/${stats.total} 项。${collab.revisionMode?'需求已进入修订状态，请确认后重新提交。':'请继续补充标为“待补充”的内容。'}`});store();return;
    }
    if(action==='startNewIntent'){
      const pending=collab.pendingIntent;if(!pending)return;localStorage.setItem('erp-ai-next-requirement',JSON.stringify(pending));if(typeof startNewProject==='function')startNewProject();else toast('新项目入口尚未准备好，请稍后重试');return;
    }
    if(action==='keepCurrentIntent'){
      const pending=collab.pendingIntent;if(!pending)return;const note=collab.privateNotes.find(n=>n.pendingIntent&&n.text===pending.text);if(note){note.pendingIntent=false;note.supplementOnly=true}collab.pendingIntent=null;if(collab.questionnaire){collab.questionnaire.completed=false;collab.revisionMode=true}collab.privateNotes.push({role:'ai',text:'已将这段内容保留为当前需求的补充说明，不会强行映射到不相关的表格字段。实施顾问将在修订版中进一步确认。'});store();return;
    }
    if(action==='submitQuestionnaire'){submitQuestionnaire();return}
    if(action==='submitImplementation'){
      const title=document.querySelector('#implementationTitle').value.trim(),file=document.querySelector('#implementationFile').files[0],existing=collab.implementation?.file;
      if(!title)return toast('请填写实施文档标题');if(!file&&!existing)return toast('请选择要提交的实施文件');
      b.disabled=true;b.textContent='正在保存…';
      try{const saved=file?await persistFile(file):existing;const item={title,version:document.querySelector('#implementationVersion').value.trim()||'V1.0',content:document.querySelector('#implementationNote').value.trim()||`已提交实施文件：${saved.name}`,file:saved,time:now()};collab.implementation=item;collab.implementationVersions.push({...item,note:item.content});recordEvent('提交实施文档',`${item.version} · ${saved.name}`);store();toast('实施文档已提交给开发人员')}catch(error){b.disabled=false;b.textContent='重新提交';toast('文件保存失败，请重试')}return;
    }
    if(action==='submitCode'){
      const title=document.querySelector('#codeTitle').value.trim(),file=document.querySelector('#codeFile').files[0],existing=collab.code?.file;
      if(!title)return toast('请填写开发交付名称');if(!file&&!existing)return toast('请选择代码或交付包');
      b.disabled=true;b.textContent='正在保存…';
      try{const saved=file?await persistFile(file):existing;const item={title,version:document.querySelector('#codeVersion').value.trim()||'V1.0.0',content:document.querySelector('#codeNote').value.trim()||`已提交开发交付包：${saved.name}`,file:saved,time:now()};collab.code=item;collab.codeVersions.push({...item,note:item.content});collab.acceptance=null;recordEvent('提交开发交付',`${item.version} · ${saved.name}`);store();toast('开发成果已提交，等待客户验收')}catch(error){b.disabled=false;b.textContent='重新提交';toast('文件保存失败，请重试')}return;
    }
    if(action==='projectMeta'){showProjectMeta();return}
    if(action==='saveProjectMeta'){
      collab.projectMeta={name:document.querySelector('#projectName').value.trim(),organization:document.querySelector('#projectOrganization').value.trim(),department:document.querySelector('#projectDepartment').value.trim(),owner:document.querySelector('#projectOwner').value.trim(),planDate:document.querySelector('#projectPlanDate').value};recordEvent('更新项目资料',collab.projectMeta.name||'未命名项目');localStorage.setItem('erp-ai-collab',JSON.stringify(collab));closeModal();render();toast('项目资料已保存');return;
    }
    if(action==='acceptDelivery'){
      if(!collab.code)return toast('暂无可验收的开发交付');const note=document.querySelector('#acceptanceNote')?.value.trim()||'';collab.acceptance={status:'accepted',note,time:now()};recordEvent('客户验收通过',collab.code.version||collab.code.title);store();toast('交付已验收并归档');return;
    }
    if(action==='rejectDelivery'){
      const note=document.querySelector('#acceptanceNote')?.value.trim()||'';if(!note)return toast('请填写需要修改的具体内容');collab.acceptance={status:'rejected',note,time:now()};recordEvent('客户驳回交付',note);store();toast('修改意见已发送给开发人员');return;
    }
    if(action==='downloadFile'){await downloadStoredFile(b.dataset.fileId);return}
    if(action==='viewRequirement'&&collab.requirement)showDoc(collab.requirement,'需求');
    if(action==='viewImplementation'&&collab.implementation)showDoc(collab.implementation,'实施文档');
    if(action==='viewCode'&&collab.code)showDoc(collab.code,'开发交付');
  });
  document.addEventListener('change',e=>{if(e.target.id==='implementationFile'&&e.target.files[0])document.querySelector('#implementationFileHint').textContent=`已选择：${e.target.files[0].name} · ${fileSize(e.target.files[0].size)}`;if(e.target.id==='codeFile'&&e.target.files[0])document.querySelector('#codeFileHint').textContent=`已选择：${e.target.files[0].name} · ${fileSize(e.target.files[0].size)}`});
  document.addEventListener('keydown',e=>{if(e.target.id==='privateInput'&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.querySelector('[data-collab="askAI"]')?.click()}});
  if(!collab.pendingIntent&&collab.questionnaire?.type){const currentType=collab.questionnaire.type,divergent=[...collab.privateNotes].reverse().find(n=>n.role==='customer'&&!n.pendingIntent&&detectType(n.text)!=='generic'&&detectType(n.text)!==currentType);if(divergent){const incomingType=detectType(divergent.text);divergent.pendingIntent=true;collab.pendingIntent={type:incomingType,text:divergent.text};collab.privateNotes.push({role:'ai',text:`检测到这段内容属于“${definitions[incomingType].name}”，与当前“${definitions[currentType].name}”不是同一项需求。请选择新建需求，或作为当前需求的补充说明。`});localStorage.setItem('erp-ai-collab',JSON.stringify(collab))}}
  const queuedRequirement=JSON.parse(localStorage.getItem('erp-ai-next-requirement')||'null');
  if(queuedRequirement&&!collab.privateNotes.length){collab.privateNotes=[{role:'customer',text:queuedRequirement.text}];collab.questionnaire=buildQuestionnaire(queuedRequirement.text,null);const def=definitions[collab.questionnaire.type],stats=questionnaireStats(collab.questionnaire);collab.privateNotes.push({role:'ai',text:`已新建“${def.name}”需求，并从刚才的描述中填写了 ${stats.filled}/${stats.total} 项。请继续补充右侧待确认内容。`});localStorage.removeItem('erp-ai-next-requirement');localStorage.setItem('erp-ai-collab',JSON.stringify(collab))}
  if(collab.questionnaire&&!collab.questionnaire.type&&allCustomerText()){
    collab.questionnaire=buildQuestionnaire(allCustomerText(),null);
    localStorage.setItem('erp-ai-collab',JSON.stringify(collab));
  }
  window.persistProjectFile=persistFile;
  window.registerProjectCode=(projectId,item)=>{if(projectId&&collab.projectId!==projectId)return false;collab.code=item;collab.codeVersions.push({...item,note:item.content});collab.acceptance=null;recordEvent('提交开发交付',`${item.version} · ${item.file.name}`);store();return true};
  window.openCustomerAssistant=()=>{collab.role='customer';store()};window.renderResearch=render;render();
})();
