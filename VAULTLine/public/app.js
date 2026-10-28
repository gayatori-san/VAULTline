const form=document.querySelector("#auth-form");
const passwordInput=document.querySelector("#password");
const confirmInput=document.querySelector("#confirmPassword");
const nameInput=document.querySelector("#name");
const emailInput=document.querySelector("#email");
const fill=document.querySelector("#strength-fill");
const strengthLabel=document.querySelector("#strength-label");
const strengthScore=document.querySelector("#strength-score");
const message=document.querySelector("#form-message");
const submitText=document.querySelector("#submit-text");
const submitButton=document.querySelector("#submit-btn");
const banner=document.querySelector("#account-banner");
let mode="register";
const rules={
 length:v=>v.length>=12&&v.length<=128,
 lower:v=>/[a-z]/.test(v),
 upper:v=>/[A-Z]/.test(v),
 number:v=>/[0-9]/.test(v),
 symbol:v=>/[^A-Za-z0-9]/.test(v)
};
function setMessage(text,kind=""){message.textContent=text;message.className=`form-message ${kind}`.trim()}
function evaluate(v){
 let passed=0;
 Object.entries(rules).forEach(([key,test])=>{
  const met=test(v);if(met)passed++;
  const el=document.querySelector(`[data-rule="${key}"]`);
  el.classList.toggle("met",met);el.querySelector("span").textContent=met?"✓":"○";
 });
 fill.style.width=`${passed*20}%`;
 fill.style.background=passed<=2?"#e5b2c0":passed<=4?"#e8cf91":"#9fcdb5";
 strengthScore.textContent=`${passed} / 5`;
 strengthLabel.textContent=!v?"Your strength story starts here":passed<=2?"A little more magic needed":passed<=4?"Growing stronger…":"Lovely and strong!";
 if(v&&/(.)\1{3,}/.test(v))strengthLabel.textContent="Try less repetition";
 return passed===5;
}
passwordInput.addEventListener("input",()=>{evaluate(passwordInput.value);document.querySelector("#confirm-error").textContent=confirmInput.value&&confirmInput.value!==passwordInput.value?"Those two don't match yet.":"";setMessage("")});
confirmInput.addEventListener("input",()=>{document.querySelector("#confirm-error").textContent=confirmInput.value&&confirmInput.value!==passwordInput.value?"Those two don't match yet.":""});
document.querySelectorAll(".reveal").forEach(btn=>btn.addEventListener("click",()=>{
 const input=document.getElementById(btn.dataset.target),show=input.type==="password";
 input.type=show?"text":"password";btn.textContent=show?"hide":"peek";
 btn.setAttribute("aria-label",`${show?"Hide":"Show"} ${btn.dataset.target==="password"?"password":"confirmation password"}`);
}));
function switchMode(next){
 mode=next;const reg=mode==="register";
 document.querySelector("#name-field").classList.toggle("hidden",!reg);
 document.querySelector("#confirm-field").classList.toggle("hidden",!reg);
 document.querySelector("#requirements").classList.toggle("hidden",!reg);
 document.querySelector(".strength-meta").classList.toggle("hidden",!reg);
 document.querySelector(".strength-track").classList.toggle("hidden",!reg);
 document.querySelector("#register-tab").classList.toggle("active",reg);
 document.querySelector("#login-tab").classList.toggle("active",!reg);
 document.querySelector("#register-tab").setAttribute("aria-selected",String(reg));
 document.querySelector("#login-tab").setAttribute("aria-selected",String(!reg));
 nameInput.required=reg;confirmInput.required=reg;
 passwordInput.autocomplete=reg?"new-password":"current-password";
 document.querySelector("#form-title").textContent=reg?"Make yourself at home.":"Oh, hello again.";
 document.querySelector(".card-heading p").textContent=reg?"Let's give your account a lovely little lock.":"Your little vault has missed you.";
 submitText.textContent=reg?"Create my little vault":"Unlock my vault";
 setMessage("");banner.classList.add("hidden");
}
document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>switchMode(btn.dataset.mode)));
form.addEventListener("submit",async e=>{
 e.preventDefault();setMessage("");
 if(!emailInput.value.trim())return setMessage("Pop in your email address first.", "error");
 if(mode==="register"){
  if(nameInput.value.trim().length<2)return setMessage("Could you share a name with at least two characters?", "error");
  if(!evaluate(passwordInput.value))return setMessage("Your passphrase needs a little more strength. Check the list above.", "error");
  if(passwordInput.value!==confirmInput.value)return setMessage("Those passphrases don't match just yet.", "error");
 }
 submitButton.disabled=true;submitText.textContent=mode==="register"?"Tucking everything away…":"Opening your vault…";
 try{
  const response=await fetch(`/api/${mode}`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({name:nameInput.value.trim(),email:emailInput.value.trim(),password:passwordInput.value,confirmPassword:confirmInput.value})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||"Something went wrong. Try again in a moment.");
  setMessage(data.message||"All done!","success");
  banner.replaceChildren();banner.append(document.createTextNode(`A little hello, ${data.user.name} · ${data.user.email} `));
  const logout=document.createElement("button");logout.type="button";logout.textContent="log out";logout.className="logout-link";
  logout.addEventListener("click",async()=>{await fetch("/api/logout",{method:"POST",credentials:"same-origin"});banner.classList.add("hidden");setMessage("You've safely stepped out of your vault.","success")});
  banner.append(logout);banner.classList.remove("hidden");
  if(mode==="register"){form.reset();evaluate("")}
 }catch(err){setMessage(err.message||"Couldn't reach the vault. Is the server running?","error")}
 finally{submitButton.disabled=false;submitText.textContent=mode==="register"?"Create my little vault":"Unlock my vault"}
});
const journal=document.querySelector("#journal");
document.querySelector("#journal-button").addEventListener("click",async()=>{
 journal.classList.toggle("hidden");if(journal.classList.contains("hidden"))return;
 const output=document.querySelector("#journal-events");output.textContent="Gathering the little paper trail…";
 try{
  const r=await fetch("/api/security/events",{credentials:"same-origin"}),data=await r.json();
  if(!r.ok)throw new Error(data.error||"Sign in to view the journal.");
  if(!data.events.length){output.textContent="No events yet. A quiet vault is a happy vault.";return}
  output.replaceChildren();
  data.events.forEach(event=>{
   const row=document.createElement("div");row.className="event-row";
   [event.event_type,event.outcome,event.email_hint||"—",event.created_at].forEach((value,i)=>{
    const cell=document.createElement("span");cell.textContent=value;
    if(i===1)cell.className=event.outcome==="SUCCESS"?"event-success": "event-denied";
    row.append(cell);
   });output.append(row);
  });
 }catch(err){output.textContent=err.message}
});
document.querySelector("#journal-close").addEventListener("click",()=>journal.classList.add("hidden"));
evaluate("");
