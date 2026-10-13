'use strict';
const cfg = window.APP_CONFIG;
const api = window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
const TEAMS = [
 ['u6','U6'],['u8-a','U8 A'],['u8-b','U8 B'],['u10-loups','U10 Loups'],['u10-lions','U10 Lions'],['u10-tigres','U10 Tigres'],
 ['u12-garcons-a','U12 Garçons A'],['u12-garcons-b','U12 Garçons B'],['u12-filles','U12 Filles'],
 ['u14-awbb-garcons','U14 AWBB Garçons'],['u14-b-garcons','U14 B Garçons'],['u14-filles','U14 Filles'],
 ['u16-hommes','U16 Hommes'],['u16-awbb-dames','U16 AWBB Dames'],['u16-b-dames','U16 B Dames'],
 ['u18-hommes','U18 Hommes'],['u21-hommes','U21 Hommes'],['p4-hommes','P4 Hommes'],['p3-hommes','P3 Hommes'],['p2-hommes','P2 Hommes'],['veterans','Vétérans']
];
const slots=[{id:'09-12',label:'09h00 → 12h00',quota:4},{id:'12-15',label:'12h00 → 15h00',quota:4},{id:'15-18',label:'15h00 → 18h00',quota:3},{id:'18-fin',label:'18h00 → fin',quota:3}];
const el=id=>document.getElementById(id);
let team=null, eventDate='', registrations={}, reserveRegistrations={},adminPassword='',refreshTimer=null,requestSequence=0;
const signupDialog=el('signupDialog'),reserveDialog=el('reserveDialog'),adminDialog=el('adminDialog');
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function toast(message){const x=el('toast');x.textContent=message;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),2800)}
function showDate(v){if(!v)return 'Date à définir';const d=new Date(v+'T12:00:00');return Number.isNaN(d.getTime())?'Date à définir':d.toLocaleDateString('fr-BE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function regsForSlot(id){return registrations[id]||[]}
function reserveEntries(){return reserveRegistrations||[]}
function slotLabel(id){return slots.find(s=>s.id===id)?.label||id}
function render(){
 el('slots').innerHTML=slots.map(s=>{const regs=regsForSlot(s.id),full=regs.length>=s.quota,pct=Math.min(100,Math.round(regs.length/s.quota*100));return `<article class="slot-card ${full?'full':''}"><div class="slot-top"><div><div class="slot-time">${s.label}</div><div>${regs.length} / ${s.quota} inscrit${regs.length>1?'s':''}</div></div><span class="badge ${full?'full':'open'}">${full?'COMPLET':s.quota-regs.length+' place'+(s.quota-regs.length>1?'s':'')}</span></div><div class="progress"><div style="width:${pct}%"></div></div><ul class="names">${regs.length?regs.map(r=>`<li>👤 ${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)} ${r.player_name?`<small>(${escapeHtml(r.player_name)})</small>`:''}</li>`).join(''):'<li>Aucune inscription pour le moment</li>'}</ul><button class="${full?'secondary-btn':'primary-btn'}" ${full||!eventDate?'disabled':''} onclick="openSignup('${s.id}')">${full?'Créneau complet':"Je m'inscris"}</button></article>`}).join('');
 const count=reserveEntries().length;el('reserveCount').textContent=count?`${count} personne${count>1?'s':''} disponible${count>1?'s':''} en renfort`:'Aucune personne inscrite en renfort pour le moment.';
 el('teamDate').textContent=showDate(eventDate);el('notScheduled').classList.toggle('hidden',Boolean(eventDate));el('slots').classList.toggle('hidden',!eventDate);el('reserveBtn').disabled=!eventDate;
 if(adminPassword){el('eventDateInput').value=eventDate;renderAdmin();}
}
async function load(){if(!team)return;const id=team[0],seq=++requestSequence;try{
 const {data,error}=await api.rpc('bar_get_planning',{p_team:id});if(error)throw error;if(!team||team[0]!==id||seq!==requestSequence)return;
 eventDate=data?.event_date||'';registrations={};reserveRegistrations=data?.reserve||[];
 for(const r of data?.registrations||[])(registrations[r.slot_id]??=[]).push(r);
 render();
 }catch(e){console.error('Lecture Supabase',e);toast('Connexion impossible : vérifie le script SQL Supabase.')}}
function openTeam(id){const found=TEAMS.find(t=>t[0]===id);if(!found)return;team=found;adminPassword='';eventDate='';registrations={};reserveRegistrations={};el('teamTitle').textContent='Organisation du bar – '+found[1];el('teamScreen').classList.add('hidden');el('planningScreen').classList.remove('hidden');render();load();if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(!document.hidden)load()},12000);}
const picker=el('teamSelect');TEAMS.forEach(([id,name])=>{const option=document.createElement('option');option.value=id;option.textContent=name;picker.append(option)});picker.addEventListener('change',()=>el('enterTeamBtn').disabled=!picker.value);
el('enterTeamBtn').addEventListener('click',()=>openTeam(picker.value));
el('changeTeamBtn').addEventListener('click',()=>{if(refreshTimer)clearInterval(refreshTimer);refreshTimer=null;++requestSequence;team=null;adminPassword='';el('planningScreen').classList.add('hidden');el('teamScreen').classList.remove('hidden');adminDialog.close();window.scrollTo(0,0)});
window.openSignup=id=>{const s=slots.find(v=>v.id===id);if(!s||!eventDate)return;if(regsForSlot(id).length>=s.quota){toast('Créneau complet');return;}el('signupForm').reset();el('slotId').value=id;el('signupTitle').textContent='Inscription – '+s.label;el('signupError').textContent='';signupDialog.showModal();};
el('closeSignup').addEventListener('click',()=>signupDialog.close());
el('signupForm').addEventListener('submit',async e=>{e.preventDefault();const s=slots.find(v=>v.id===el('slotId').value);if(!team||!s)return;const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;try{const {error}=await api.rpc('bar_register',{p_team:team[0],p_slot:s.id,p_first:el('firstName').value.trim(),p_last:el('lastName').value.trim(),p_player:el('playerName').value.trim()});if(error)throw error;signupDialog.close();toast('Inscription confirmée');await load()}catch(err){el('signupError').textContent=err.message?.includes('COMPLET')?'Ce créneau est désormais complet.':'Inscription impossible : '+(err.message||'erreur inconnue')}finally{btn.disabled=false}});
el('reserveBtn').addEventListener('click',()=>{el('reserveForm').reset();el('reserveError').textContent='';reserveDialog.showModal()});el('closeReserve').addEventListener('click',()=>reserveDialog.close());
el('reserveForm').addEventListener('submit',async e=>{e.preventDefault();const selected=[...document.querySelectorAll('input[name="reserveSlot"]:checked')].map(x=>x.value);if(!selected.length){el('reserveError').textContent='Sélectionne un créneau.';return;}const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;try{const {error}=await api.rpc('bar_add_reserve',{p_team:team[0],p_first:el('reserveFirstName').value.trim(),p_last:el('reserveLastName').value.trim(),p_player:el('reservePlayerName').value.trim(),p_slots:selected});if(error)throw error;reserveDialog.close();toast('Disponibilités enregistrées');await load()}catch(err){el('reserveError').textContent=err.message||'Enregistrement impossible'}finally{btn.disabled=false}});
el('adminBtn').addEventListener('click',()=>{el('adminPin').value='';el('adminError').textContent='';el('adminLogin').classList.toggle('hidden',!!adminPassword);el('adminPanel').classList.toggle('hidden',!adminPassword);if(adminPassword)renderAdmin();adminDialog.showModal()});el('closeAdmin').addEventListener('click',()=>adminDialog.close());
el('adminLoginBtn').addEventListener('click',async()=>{const pass=el('adminPin').value;const {data,error}=await api.rpc('bar_check_admin',{p_password:pass});if(error||data!==true){el('adminError').textContent='Mot de passe incorrect ou service indisponible.';return;}adminPassword=pass;el('adminPin').value='';el('adminLogin').classList.add('hidden');el('adminPanel').classList.remove('hidden');renderAdmin()});
function renderAdmin(){if(!adminPassword||!team)return;el('eventDateInput').value=eventDate||'';el('adminList').innerHTML=slots.map(s=>{const regs=regsForSlot(s.id);return `<section class="admin-slot"><h3>${s.label} (${regs.length}/${s.quota})</h3>${regs.length?regs.map(r=>`<div class="admin-row"><span>${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}${r.player_name?' – '+escapeHtml(r.player_name):''}</span><button onclick="deleteRegistration('${r.id}')">Supprimer</button></div>`).join(''):'<p>Aucune inscription</p>'}</section>`}).join('')+`<section class="reserve-admin"><h3>Renforts disponibles (${reserveEntries().length})</h3>${reserveEntries().length?reserveEntries().map(r=>`<div class="reserve-admin-row"><strong>${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)} ${r.player_name?' – '+escapeHtml(r.player_name):''}</strong><small>${(r.slots||[]).map(slotLabel).join(' • ')}</small><button onclick="deleteReserveRegistration('${r.id}')">Supprimer</button></div>`).join(''):'<p>Aucune disponibilité enregistrée.</p>'}</section>`;}
window.deleteRegistration=async id=>{if(!adminPassword||!confirm('Supprimer cette inscription ?'))return;await adminAction('bar_admin_delete',{p_kind:'registration',p_id:id});};
window.deleteReserveRegistration=async id=>{if(!adminPassword||!confirm('Supprimer cette disponibilité ?'))return;await adminAction('bar_admin_delete',{p_kind:'reserve',p_id:id});};
async function adminAction(fn,args){try{const {error}=await api.rpc(fn,{...args,p_team:team[0],p_password:adminPassword});if(error)throw error;toast('Modification enregistrée');await load()}catch(err){toast('Modification refusée : '+(err.message||'erreur'));}}
el('saveDateBtn').addEventListener('click',()=>{if(!adminPassword)return;const newDate=el('eventDateInput').value;if(!newDate){toast('Choisis une date.');return;}if(eventDate&&eventDate!==newDate&&!confirm('Changer la date sans effacer les inscriptions actuelles ?'))return;adminAction('bar_admin_set_date',{p_date:newDate});});
render();
