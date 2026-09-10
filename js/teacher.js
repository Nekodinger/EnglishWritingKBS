let teacherKey="", assessments=[], currentAssessment="";
function $(id){return document.getElementById(id)}
function show(id){$(id).classList.remove("hidden")}
function hide(id){$(id).classList.add("hidden")}

$("teacherLoginBtn").addEventListener("click",loginTeacher);
$("teacherKey").addEventListener("keydown",e=>{if(e.key==="Enter")loginTeacher()});

async function loginTeacher(){
  teacherKey=$("teacherKey").value;
  $("teacherLoginMsg").textContent="Checking...";
  try{
    const d=await api("teacherAssessments",{teacherKey});
    assessments=d.assessments||[];
    if(!assessments.length) throw new Error("No assessments found.");
    $("assessmentSelect").innerHTML=assessments.map(a=>`<option value="${esc(a.id)}">${esc(a.title)}</option>`).join("");
    currentAssessment=assessments[0].id;
    hide("teacherLogin"); show("teacherView");
    await refreshAll();
  }catch(e){$("teacherLoginMsg").textContent=e.message}
}
$("assessmentSelect").addEventListener("change",async()=>{currentAssessment=$("assessmentSelect").value;await refreshAll()});
$("refreshBtn").addEventListener("click",refreshAll);
$("saveSettingsBtn").addEventListener("click",saveSettings);
$("logoutBtn").addEventListener("click",()=>location.reload());

async function refreshAll(){
  try{
    const [s,p]=await Promise.all([
      api("getAssessmentSettings",{teacherKey,assessmentId:currentAssessment}),
      api("teacherProgress",{teacherKey,assessmentId:currentAssessment})
    ]);
    $("teacherAssessmentLabel").textContent=s.title;
    $("setTitle").value=s.title||"";
    $("setDuration").value=s.durationMinutes||60;
    $("setTemplateId").value=s.templateId||"";
    $("setFolderId").value=s.folderId||"";
    $("setTeacherEmail").value=s.teacherEmail||"";
    renderProgress(p.students||[]);
  }catch(e){$("settingsMsg").textContent=e.message}
}
async function saveSettings(){
  $("settingsMsg").textContent="Saving...";
  try{
    await api("saveAssessmentSettings",{
      teacherKey,assessmentId:currentAssessment,
      title:$("setTitle").value.trim(),
      durationMinutes:$("setDuration").value,
      templateId:$("setTemplateId").value.trim(),
      folderId:$("setFolderId").value.trim(),
      teacherEmail:$("setTeacherEmail").value.trim()
    });
    $("settingsMsg").textContent="Settings saved.";
    await refreshAll();
  }catch(e){$("settingsMsg").textContent=e.message}
}
function renderProgress(students){
  $("progressBody").innerHTML=students.map(s=>{
    const doc=s.docUrl?`
      <div class="doc-actions">
        <button onclick="openDoc('${js(s.docUrl)}')">Open</button>
        <button onclick="copyText('${js(s.docUrl)}')">Copy URL</button>
      </div>
      <div class="doc-url">${esc(s.docUrl)}</div>`:"—";
    return `<tr>
      <td>${esc(s.name)}</td><td>${esc(s.className)}</td><td>${esc(s.status)}</td>
      <td>${esc(formatDate(s.started))}</td><td>${esc(formatDate(s.submitted))}</td>
      <td>${esc(s.violations)}</td><td>${doc}</td>
    </tr>`;
  }).join("");
}
function openDoc(url){window.open(url,"_blank","noopener")}
async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    alert("Copied.");
  }catch(_){
    const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);
    ta.select();document.execCommand("copy");ta.remove();alert("Copied.");
  }
}
function formatDate(v){if(!v)return ""; const d=new Date(v); return isNaN(d)?String(v):d.toLocaleString()}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function js(v){return String(v??"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/\n/g,"\\n").replace(/\r/g,"\\r")}
