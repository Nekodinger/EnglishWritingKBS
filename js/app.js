let timerId=null, endTime=null;
window.examToken=null; window.submitted=false;

function $(id){return document.getElementById(id)}
function show(id){$(id).classList.remove("hidden")}
function hide(id){$(id).classList.add("hidden")}

$("startBtn").addEventListener("click",async()=>{
  $("loginMsg").textContent="Starting...";
  try{
    const data=await api("startSession",{
      studentId:$("studentId").value.trim(),
      accessCode:$("accessCode").value.trim()
    });
    window.examToken=data.token;
    window.examStudentId=data.studentId;
    window.submitted=false;
    $("assessmentTitle").textContent=data.assessmentTitle;
    $("studentInfo").textContent=`${data.name} • ${data.studentId} • ${data.className}`;
    renderQuestions(data.questions||[]);
    endTime=Date.now()+Number(data.durationSeconds)*1000;
    updateTimer();
    timerId=setInterval(updateTimer,1000);
    hide("loginView"); show("examView");
    requestExamFullscreen();
  }catch(e){$("loginMsg").textContent=e.message}
});

function renderQuestions(qs){
  $("questions").innerHTML=qs.map((q,i)=>`
    <div class="card question">
      <h3>Question ${i+1}</h3>
      <p>${escapeHtml(q.question)}</p>
      <textarea data-qid="${escapeAttr(q.id)}" spellcheck="true"></textarea>
    </div>`).join("");
}
function updateTimer(){
  const left=Math.max(0,endTime-Date.now()), sec=Math.ceil(left/1000);
  $("timer").textContent=`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
  if(left<=0){clearInterval(timerId); submit(true)}
}
$("submitBtn").addEventListener("click",()=>submit(false));
async function submit(auto){
  if(window.submitting||window.submitted)return;
  if(!auto && !confirm("Submit your assessment? You cannot edit it afterwards."))return;
  window.submitting=true; $("submitBtn").disabled=true; $("examMsg").textContent="Submitting...";
  const answers={};
  document.querySelectorAll("[data-qid]").forEach(x=>answers[x.dataset.qid]=x.value);
  try{
    const data=await api("submitAssessment",{token:window.examToken,answers,violationCount});
    window.submitted=true;
    $("examMsg").textContent="Submitted successfully.";
    $("submitBtn").disabled=true;
    if(data.docUrl) console.log("Teacher document created:",data.docUrl);
    clearInterval(timerId);
    if(document.fullscreenElement) document.exitFullscreen().catch(()=>{});
  }catch(e){
    $("examMsg").textContent=e.message;
    $("submitBtn").disabled=false;
    window.submitting=false;
  }
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function escapeAttr(v){return escapeHtml(v)}
