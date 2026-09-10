async function api(action,payload={}){
  const res=await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({action,...payload})
  });
  const data=await res.json();
  if(!data.success && data.message) throw new Error(data.message);
  return data;
}
