const SPREADSHEET_ID="1hviwAh6woruUzHfaLC1Xy2C3R0XGrm_VvdpezqpeJwE";
const TEACHER_PANEL_KEY="koderahasia";

function doGet(){return ContentService.createTextOutput("English Writing Assessment API OK");}

function doPost(e){
  try{
    const p=JSON.parse(e.postData.contents||"{}");
    let r;
    switch(p.action){
      case"startSession":r=startSession(p);break;
      case"logEvent":r=logEvent(p);break;
      case"submitAssessment":r=submitAssessment(p);break;
      case"teacherAssessments":r=teacherAssessments(p);break;
      case"getAssessmentSettings":r=getAssessmentSettings(p);break;
      case"saveAssessmentSettings":r=saveAssessmentSettings(p);break;
      case"teacherProgress":r=teacherProgress(p);break;
      default:throw Error("Unknown action");
    }
    return out(r);
  }catch(err){return out({success:false,message:err.message})}
}
function out(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function sh(n){const s=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(n);if(!s)throw Error("Missing sheet: "+n);return s}
function rows(n){return sh(n).getDataRange().getValues()}

function assessment(id){
  const a=rows("ASSESSMENTS");
  for(let i=1;i<a.length;i++)if(String(a[i][0])===String(id))
    return {row:i+1,id:a[i][0],title:a[i][1],durationMinutes:Number(a[i][2]),templateId:String(a[i][3]||""),folderId:String(a[i][4]||""),teacherEmail:String(a[i][5]||"")};
  return null;
}
function student(id,code){
  const a=rows("STUDENTS");
  for(let i=1;i<a.length;i++)if(String(a[i][0])===String(id)&&String(a[i][3])===String(code))
    return {studentId:a[i][0],name:a[i][1],className:a[i][2]};
  return null;
}
function questions(aid){
  const a=rows("QUESTIONS");
  return a.slice(1).filter(r=>r[0]&&String(r[0])===String(aid))
    .map(r=>({id:String(r[2]),question:String(r[3]),points:r[4]}));
}
function activeAssessment(){const a=rows("ASSESSMENTS");return a.length>1?a[1][0]:null}

function startSession(p){
  const s=student(p.studentId,p.accessCode);
  if(!s)return{success:false,message:"Invalid Student ID or Access Code."};
  const a=assessment(p.assessmentId||activeAssessment());
  if(!a)throw Error("Assessment not found.");
  const rs=rows("SESSIONS");
  for(let i=1;i<rs.length;i++){
    if(String(rs[i][2])===String(s.studentId)&&String(rs[i][1])===String(a.id)){
      if(String(rs[i][8])==="SUBMITTED")return{success:false,message:"Already submitted."};
      if(String(rs[i][8])==="STARTED"||String(rs[i][8])==="PROCESSING")
        return{success:false,message:"An active session already exists for this student."};
    }
  }
  const token=Utilities.getUuid(),start=new Date();
  sh("SESSIONS").appendRow([token,a.id,s.studentId,s.name,s.className,start,"","","STARTED",0,"",""]);
  return{success:true,token,studentId:s.studentId,name:s.name,className:s.className,assessmentTitle:a.title,durationSeconds:a.durationMinutes*60,questions:questions(a.id)};
}

function sessionByToken(token){
  const a=rows("SESSIONS");
  for(let i=1;i<a.length;i++)if(String(a[i][0])===String(token))
    return{row:i+1,token:a[i][0],assessmentId:a[i][1],studentId:a[i][2],name:a[i][3],className:a[i][4],start:a[i][5],submit:a[i][6],status:a[i][8],violations:Number(a[i][9]||0),docId:a[i][10],docUrl:a[i][11]};
  return null;
}
function logEvent(p){
  const s=sessionByToken(p.token);
  if(!s)return{success:false,message:"Invalid session"};
  sh("ACTIVITY_LOG").appendRow([new Date(),p.token,s.assessmentId,s.studentId,p.eventType||"",p.details||""]);
  // Keep the server-side violation counter synchronized with security events.
  if(p.eventType)sh("SESSIONS").getRange(s.row,10).setValue(s.violations+1);
  return{success:true};
}

function submitAssessment(p){
  const lock=LockService.getScriptLock();
  lock.waitLock(20000);
  try{
    const s=sessionByToken(p.token);
    if(!s)throw Error("Invalid session.");
    if(s.status!=="STARTED")throw Error("Session already submitted.");
    const a=assessment(s.assessmentId);
    if(!a)throw Error("Assessment not found.");

    const now=new Date();
    const clientViolations=Number(p.violationCount||0);
    // Use the greater value so client-side count cannot overwrite server-side logged events.
    const finalViolations=Math.max(s.violations,clientViolations);

    sh("SESSIONS").getRange(s.row,7).setValue(now);
    sh("SESSIONS").getRange(s.row,9).setValue("PROCESSING");
    sh("SESSIONS").getRange(s.row,10).setValue(finalViolations);

    let d;
    try{
      d=createDoc(a,s,p.answers||{},finalViolations);
    }catch(err){
      sh("SESSIONS").getRange(s.row,9).setValue("ERROR");
      throw Error("Document creation failed: "+err.message);
    }

    sh("SESSIONS").getRange(s.row,9).setValue("SUBMITTED");
    sh("SESSIONS").getRange(s.row,11).setValue(d.id);
    sh("SESSIONS").getRange(s.row,12).setValue(d.url);
    return{success:true,docUrl:d.url};
  }finally{lock.releaseLock()}
}

function createDoc(a,s,answers,finalViolations){
  if(!a.templateId)throw Error("Google Docs Template ID is empty.");
  if(!a.folderId)throw Error("Output Folder ID is empty.");
  if(!a.teacherEmail)throw Error("Teacher Email is empty.");

  const f=DriveApp.getFileById(a.templateId);
  const folder=DriveApp.getFolderById(a.folderId);
  const copy=f.makeCopy(`${a.title} - ${s.name} - ${s.studentId}`,folder);
  const doc=DocumentApp.openById(copy.getId());
  const body=doc.getBody();

  const rep=(p,v)=>body.replaceText(String(p).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),String(v??""));
  rep("{{ASSESSMENT_TITLE}}",a.title);
  rep("{{STUDENT_ID}}",s.studentId);
  rep("{{STUDENT_NAME}}",s.name);
  rep("{{CLASS}}",s.className);
  rep("{{START_TIME}}",s.start);
  rep("{{SUBMIT_TIME}}",new Date());
  rep("{{VIOLATIONS}}",finalViolations);

  questions(a.id).forEach(q=>{
    rep(`{{Q_${q.id}_TEXT}}`,q.question);
    rep(`{{Q_${q.id}_ANSWER}}`,answers[q.id]||"");
  });

  doc.saveAndClose();
  copy.addViewer(a.teacherEmail);
  copy.setShareableByEditors(false);
  return{id:copy.getId(),url:copy.getUrl()};
}

function checkTeacher(k){if(String(k)!==String(TEACHER_PANEL_KEY))throw Error("Unauthorized teacher panel.")}

function teacherAssessments(p){
  checkTeacher(p.teacherKey);
  return{success:true,assessments:rows("ASSESSMENTS").slice(1).filter(r=>r[0]).map(r=>({id:r[0],title:r[1]}))};
}
function getAssessmentSettings(p){
  checkTeacher(p.teacherKey);
  const a=assessment(p.assessmentId);
  if(!a)throw Error("Assessment not found");
  return{success:true,...a};
}
function saveAssessmentSettings(p){
  checkTeacher(p.teacherKey);
  const a=assessment(p.assessmentId);
  if(!a)throw Error("Assessment not found");
  const duration=Number(p.durationMinutes);
  if(!Number.isFinite(duration)||duration<1)throw Error("Duration must be at least 1 minute.");
  sh("ASSESSMENTS").getRange(a.row,2,1,5).setValues([[String(p.title||""),duration,String(p.templateId||""),String(p.folderId||""),String(p.teacherEmail||"")]]);
  return{success:true};
}
function teacherProgress(p){
  checkTeacher(p.teacherKey);
  const a=assessment(p.assessmentId);
  if(!a)throw Error("Assessment not found");
  const ss=rows("SESSIONS"),students=rows("STUDENTS").slice(1).filter(r=>r[0]);
  const out=[];
  students.forEach(st=>{
    const matches=ss.slice(1).filter(r=>String(r[1])===String(a.id)&&String(r[2])===String(st[0]));
    const r=matches.length?matches[matches.length-1]:null;
    out.push({
      studentId:st[0],name:st[1],className:st[2],
      status:r?r[8]:"NOT STARTED",
      started:r&&r[5]?r[5]:"",
      submitted:r&&r[6]?r[6]:"",
      violations:r?Number(r[9]||0):0,
      docUrl:r?r[11]:""
    });
  });
  return{success:true,students:out};
}
