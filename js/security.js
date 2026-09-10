let violationCount=0;
function logSecurityEvent(eventType,details=""){
  if(window.examToken){
    api("logEvent",{token:window.examToken,eventType,details}).catch(()=>{});
  }
  violationCount++;
}
["copy","cut","paste","contextmenu","dragstart","drop"].forEach(ev=>{
  document.addEventListener(ev,e=>{e.preventDefault();logSecurityEvent(ev.toUpperCase());},true);
});
document.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&["c","v","x","a","s","p","u"].includes(k)){
    e.preventDefault(); logSecurityEvent("KEY_BLOCK",k); return;
  }
  if(e.key==="F12" || ((e.ctrlKey||e.metaKey)&&e.shiftKey&&["i","j","c"].includes(k))){
    e.preventDefault(); logSecurityEvent("DEVTOOLS_KEY",k);
  }
});
document.addEventListener("visibilitychange",()=>{
  if(document.hidden) logSecurityEvent("TAB_HIDDEN");
});
window.addEventListener("blur",()=>logSecurityEvent("WINDOW_BLUR"));
document.addEventListener("fullscreenchange",()=>{
  if(!document.fullscreenElement) logSecurityEvent("FULLSCREEN_EXIT");
});
window.addEventListener("beforeunload",e=>{
  if(window.examToken && !window.submitted){
    e.preventDefault(); e.returnValue="";
  }
});
async function requestExamFullscreen(){
  try{if(!document.fullscreenElement) await document.documentElement.requestFullscreen();}catch(_){}
}
