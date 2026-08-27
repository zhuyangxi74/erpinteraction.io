(function(){
  let lastSignature='';
  const safeParse=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const getCollab=()=>{const c=safeParse('erp-ai-collab',{});if(!c.projectId){c.projectId='project-'+Date.now();localStorage.setItem('erp-ai-collab',JSON.stringify(c))}return c};
  const getHistory=()=>safeParse('erp-ai-project-history',[]);
  const saveHistory=history=>localStorage.setItem('erp-ai-project-history',JSON.stringify(history));
  const toChinese=n=>['一','二','三','四','五','六','七','八','九','十'][n-1]||n;
  const readyFlags=project=>[!!project.requirement,!!project.implementation?.file,!!project.code?.file];
  const readyCount=project=>readyFlags(project).filter(Boolean).length;

  function currentProject(collab,index){
    if(!collab.requirement&&!collab.implementation&&!collab.code&&!collab.questionnaire&&!(collab.privateNotes||[]).length)return null;
    const scene=(collab.privateNotes||[]).find(note=>note.role==='customer')?.text||collab.requirement?.title||'未命名项目';
    return {id:collab.projectId||'current',name:collab.projectMeta?.name||`项目${toChinese(index+1)}`,scene:scene.slice(0,40),projectMeta:collab.projectMeta||{},requirement:collab.requirement||null,implementation:collab.implementation||null,code:collab.code||null,acceptance:collab.acceptance||null,events:collab.events||[],current:true};
  }
  function projects(){const history=getHistory(),current=currentProject(getCollab(),history.length);return current?[...history,current]:history}

  function syncRelations(items){
    if(typeof state==='undefined')return;
    items.forEach((project,index)=>{
      const accepted=project.acceptance?.status==='accepted';
      const rejected=project.acceptance?.status==='rejected';
      const projectStatus=accepted?'已完成':project.code?.file?'待验收':project.implementation?.file?'开发中':project.requirement?'已确认':'待确认';
      const projectProgress=accepted?4:project.code?.file?3:project.implementation?.file?2:project.requirement?1:0;
      let requirement=state.requirements.find(item=>item.projectId===project.id);
      const related={implementationFile:project.implementation?.file?.name||'',implementationFileMeta:project.implementation?.file||null,deliveryFile:project.code?.file?.name||'',deliveryFileMeta:project.code?.file||null,acceptance:project.acceptance||null,projectMeta:project.projectMeta||{}};
      if(project.requirement&&!requirement){
        requirement={id:'req-'+project.id,projectId:project.id,code:'REQ-PROJECT-'+String(index+1).padStart(3,'0'),name:project.projectMeta?.name||project.scene||project.name,org:project.projectMeta?.organization||'',dept:project.projectMeta?.department||'',priority:'中',file:project.requirement.file?.name||'在线需求方案',status:projectStatus,time:project.requirement.time||new Date().toLocaleString(),progress:projectProgress,...related};
        state.requirements.unshift(requirement);
      }else if(requirement){
        requirement.name=project.projectMeta?.name||requirement.name;
        requirement.org=project.projectMeta?.organization||requirement.org;
        requirement.dept=project.projectMeta?.department||requirement.dept;
        requirement.file=project.requirement?.file?.name||requirement.file||'在线需求方案';
        requirement.status=projectStatus;
        requirement.progress=projectProgress;
        Object.assign(requirement,related);
      }
      let app=state.apps.find(item=>item.projectId===project.id);
      if(accepted&&!app){
        state.apps.push({id:'app-'+project.id,projectId:project.id,name:project.projectMeta?.name||project.scene||project.name,org:project.projectMeta?.organization||'',version:project.code?.version||'1.0.0',status:'已验收',deliveryFile:project.code?.file?.name||'',deliveryFileMeta:project.code?.file||null,implementationFile:project.implementation?.file?.name||'',implementationFileMeta:project.implementation?.file||null,requirementTitle:project.requirement?.title||''});
      }else if(app){
        app.version=project.code?.version||app.version;
        app.status=accepted?'已验收':rejected?'已退回':'待验收';
        app.deliveryFile=project.code?.file?.name||app.deliveryFile;
        app.deliveryFileMeta=project.code?.file||app.deliveryFileMeta;
        app.implementationFile=project.implementation?.file?.name||app.implementationFile;
        app.implementationFileMeta=project.implementation?.file||app.implementationFileMeta;
      }
    });
    localStorage.setItem('erp-ai-demo',JSON.stringify(state));
  }

  function renderPanel(){
    const items=projects();
    syncRelations(items);
    const signature=JSON.stringify(items.map(project=>[project.id,project.name,readyCount(project),project.acceptance?.status||'',project.implementation?.file?.name||'',project.code?.file?.name||'']));
    if(signature===lastSignature)return;
    lastSignature=signature;
    const panel=document.querySelector('#assistant .delivery-panel');
    if(panel){
      panel.dataset.simpleProjects='1';
      panel.innerHTML=`<div class="project-panel-head"><div><h3>项目</h3><span>点击项目查看交付内容</span></div><button class="project-add" data-project-action="new">＋</button></div><div class="project-list">${items.length?items.map((project,index)=>`<button class="project-row" data-project-id="${esc(project.id)}"><span class="project-number">${index+1}</span><span><b>${esc(project.name)}</b><small>${esc(project.scene)}</small></span><em>${readyCount(project)}/3</em></button>`).join(''):'<div class="project-empty"><b>暂无项目</b><span>发送第一份需求方案后，项目会出现在这里。</span></div>'}</div>`;
    }
    if(document.querySelector('#generation.active')&&typeof renderGeneration==='function')renderGeneration();
    if(typeof renderApps==='function')renderApps();
  }

  function artifact(project,title,item){
    const needsFile=title!=='需求';
    const complete=!!item&&(!needsFile||!!item.file);
    const detail=!item?'尚未提交':item.file?.name||'在线需求内容';
    const warning=item&&needsFile&&!item.file?' · 缺少上传文件':'';
    return `<article class="project-artifact ${complete?'ready':item?'partial':''}"><i>${complete?'✓':item?'!':'○'}</i><div><b>${title}</b><span>${esc(detail)}${warning}</span></div>${item?`<button class="secondary" data-project-view="${title}" data-project-ref="${esc(project.id)}">查看内容</button>`:''}${item?.file?.id?`<button class="link" data-project-download="${esc(item.file.id)}">下载</button>`:''}</article>`;
  }

  function archivedAcceptance(project){
    const count=readyCount(project),complete=count===3,status=project.acceptance?.status,role=getCollab().role||'customer';
    let action='';
    if(status==='accepted')action=`<div class="acceptance-result"><b>验收通过</b><span>${esc(project.acceptance.time||'')}</span></div>`;
    else if(!project.code?.file)action='<div class="acceptance-waiting">等待开发人员提交正式代码文件后再验收。</div>';
    else if(role!=='customer')action='<div class="acceptance-waiting">交付资料可以查看，仅客户可以执行验收操作。</div>';
    else action=`<label class="field acceptance-note"><span>${status==='rejected'?'补充验收意见':'验收意见'}</span><textarea id="projectAcceptanceNote" rows="3" placeholder="通过时可填写说明；驳回时必须说明修改内容"></textarea></label><div class="acceptance-actions"><span>${complete?'请确认已查看全部资料':'实施文档和代码文件齐全后才能通过'}</span><button class="secondary" data-project-reject="${esc(project.id)}">驳回修改</button><button class="primary" data-project-accept="${esc(project.id)}" ${complete?'':'disabled'}>验收通过</button></div>`;
    return `<section class="acceptance-card ${status||'pending'}"><div class="acceptance-title"><div><span class="role-tag customer">客户验收包</span><h3>${status==='accepted'?'交付已验收':status==='rejected'?'交付已退回修改':'核对项目交付'}</h3><p>${status==='rejected'?`修改意见：${esc(project.acceptance.note||'未填写')}`:'依次查看需求、实施文档和开发代码。'}</p></div><span class="acceptance-completeness ${complete?'complete':'incomplete'}">${count}/3 资料${complete?'齐全':'待补充'}</span></div><div class="project-artifacts project-detail-artifacts">${artifact(project,'需求',project.requirement)}${artifact(project,'实施文档',project.implementation)}${artifact(project,'开发代码',project.code)}</div>${project.code?`<div class="acceptance-version"><span><small>交付版本</small><b>${esc(project.code.version||'未填写')}</b></span><span><small>提交时间</small><b>${esc(project.code.time||'未记录')}</b></span><span><small>交付说明</small><b>${esc(project.code.content||'未填写')}</b></span></div>`:''}${action}</section>`;
  }

  function openProject(id){
    const project=projects().find(item=>item.id===id);if(!project)return toast('未找到该项目，请刷新后重试');
    const meta=project.projectMeta||{};
    const acceptance=project.current&&typeof window.renderCurrentAcceptance==='function'?window.renderCurrentAcceptance():archivedAcceptance(project);
    modal(`<div class="project-detail-modal"><div class="modal-head"><div><h2>${esc(project.name)}</h2><p>${esc(project.scene)}</p></div><button data-close>×</button></div><div class="project-detail-meta"><span><small>客户组织</small><b>${esc(meta.organization||'未填写')}</b></span><span><small>所属部门</small><b>${esc(meta.department||'未填写')}</b></span><span><small>项目负责人</small><b>${esc(meta.owner||'未填写')}</b></span><span><small>当前状态</small><b>${project.acceptance?.status==='accepted'?'已验收':project.acceptance?.status==='rejected'?'已驳回':project.code?.file?'待验收':project.implementation?.file?'开发中':project.requirement?'需求已确认':'待提交需求'}</b></span></div>${acceptance}<div class="relation-note"><b>资料关联</b><p>需求来自“需求中心”，实施文档和代码由项目成员提交，客户验收通过后自动归档到“应用中心”。</p></div><div class="modal-actions"><button class="secondary" data-close>关闭</button></div></div>`);
  }

  function openArtifact(projectId,title){
    const project=projects().find(item=>item.id===projectId);if(!project)return toast('未找到该项目资料');
    const key=title==='需求'?'requirement':title==='实施文档'?'implementation':'code';
    const item=project[key];if(!item)return toast(`${title}尚未提交`);
    const type=title==='需求'?'需求方案':title,file=item.file;
    modal(`<div class="project-document-view"><div class="modal-head"><div><h2>${esc(item.title||type)}</h2><p>${type} · ${esc(item.version||'当前版本')}</p></div><button data-close>×</button></div><div class="project-document-body"><div class="document-section"><small>内容说明</small><p>${esc(item.content||'未填写详细说明')}</p></div>${file?`<div class="project-file-box"><div><small>附件</small><b>${esc(file.name)}</b><span>${file.size?`${Math.max(1,Math.round(file.size/1024))} KB · `:''}${esc(item.time||'')}</span></div>${file.id?`<button class="primary" data-project-download="${esc(file.id)}">下载文件</button>`:''}</div>`:title==='需求'?'<div class="project-online-note">该需求由系统在线生成，内容已完整显示在上方。</div>':'<div class="project-file-missing"><b>缺少上传文件</b><span>当前只保存了文字说明，请相关人员补充提交正式文件。</span></div>'}</div><div class="modal-actions"><button class="secondary" data-project-back="${esc(project.id)}">返回项目</button><button class="secondary" data-close>关闭</button></div></div>`);
  }

  function updateArchivedAcceptance(projectId,status){
    const collab=getCollab();if(collab.role!=='customer')return toast('请切换到客户视角后执行验收');
    const history=getHistory(),project=history.find(item=>item.id===projectId);if(!project)return toast('当前项目不是历史项目，请刷新后重试');
    const note=document.querySelector('#projectAcceptanceNote')?.value.trim()||'';
    if(status==='rejected'&&!note)return toast('请填写需要修改的具体内容');
    if(status==='accepted'&&readyCount(project)!==3)return toast('需求、实施文档和开发代码文件齐全后才能通过验收');
    const time=new Date().toLocaleString();
    project.acceptance={status,note,time};
    project.events=project.events||[];
    project.events.push({time,title:status==='accepted'?'客户验收通过':'客户驳回交付',detail:note||project.code?.version||project.name});
    saveHistory(history);
    lastSignature='';
    syncRelations(projects());
    if(typeof renderGeneration==='function')renderGeneration();
    if(typeof renderApps==='function')renderApps();
    openProject(projectId);
    toast(status==='accepted'?'交付已验收并归档':'修改意见已发送');
  }

  function newProject(){
    const collab=getCollab();
    if(collab.requirement||collab.implementation||collab.code||collab.questionnaire||(collab.privateNotes||[]).length){const history=getHistory(),archived=currentProject(collab,history.length);archived.current=false;history.push(archived);saveHistory(history)}
    localStorage.setItem('erp-ai-collab',JSON.stringify({role:collab.role||'customer',projectId:'project-'+(Date.now()+1),projectMeta:{name:'',organization:'',department:'',owner:'',planDate:''},privateNotes:[],questionnaire:null,pendingIntent:null,requirement:null,implementation:null,implementationVersions:[],code:null,codeVersions:[],acceptance:null,events:[]}));
    location.reload();
  }

  document.addEventListener('click',async event=>{
    const row=event.target.closest('[data-project-id]');if(row){openProject(row.dataset.projectId);return}
    const action=event.target.closest('[data-project-action]');if(action?.dataset.projectAction==='new'){newProject();return}
    const view=event.target.closest('[data-project-view]');if(view){openArtifact(view.dataset.projectRef,view.dataset.projectView);return}
    const back=event.target.closest('[data-project-back]');if(back){openProject(back.dataset.projectBack);return}
    const download=event.target.closest('[data-project-download]');if(download){if(typeof window.downloadProjectFile==='function')await window.downloadProjectFile(download.dataset.projectDownload);else toast('文件下载功能暂不可用');return}
    const accept=event.target.closest('[data-project-accept]');if(accept){updateArchivedAcceptance(accept.dataset.projectAccept,'accepted');return}
    const reject=event.target.closest('[data-project-reject]');if(reject){updateArchivedAcceptance(reject.dataset.projectReject,'rejected');return}
  });

  window.startNewProject=newProject;
  window.openProjectDetail=openProject;
  setInterval(renderPanel,700);
  renderPanel();
})();
