/* ================= IMPORTS ================= */
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'transfert-secret',
  resave: false,
  saveUninitialized: false
}));

/* ================= MONGODB ================= */
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
).then(() => console.log('✅ MongoDB connecté'))
 .catch(console.error);

/* ================= SCHEMA ================= */
const userSchema = new mongoose.Schema({
  senderFirstName: String,
  senderLastName: String,
  senderPhone: String,
  originLocation: String,
  amount: Number,
  fees: Number,
  feePercent: Number,
  receiverFirstName: String,
  receiverLastName: String,
  receiverPhone: String,
  destinationLocation: String,
  recoveryAmount: Number,
  recoveryMode: String,
  code: String,
  status: { type: String, default: 'actif' },
  retraitHistory: [{ date: Date, mode: String }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ================= ROUTES ================= */
app.get('/', (req,res) => res.send('🚀 API Transfert en ligne'));

/* ================= FORMULAIRE /users ================= */
app.get('/users', (req,res)=>{
  if(!req.session.formAccess){
    return res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔒 Accès formulaire</h2>
<form method="post" action="/auth/form">
<input type="password" name="code" placeholder="Code 123" required><br><br>
<button>Valider</button>
</form></body></html>`);
  }
  res.redirect('/users/choice');
});

app.post('/auth/form',(req,res)=>{
  if(req.body.code==='123') req.session.formAccess=true;
  res.redirect('/users/choice');
});

/* ================= PAGE CHOIX ================= */
app.get('/users/choice',(req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  res.send(`<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial;text-align:center;padding-top:40px;background:#eef2f7}
button{padding:12px 25px;margin:8px;font-size:16px;border:none;color:white;border-radius:5px;cursor:pointer}
#new{background:#007bff} #edit{background:#28a745} #delete{background:#dc3545}
</style></head>
<body>
<h2>📋 Gestion des transferts</h2>
<a href="/users/lookup?mode=new"><button id="new">💾 Nouveau transfert</button></a><br>
<a href="/users/lookup?mode=edit"><button id="edit">✏️ Modifier transfert</button></a><br>
<a href="/users/lookup?mode=delete"><button id="delete">❌ Supprimer transfert</button></a><br>
<br><a href="/logout/form">🚪 Déconnexion</a>
</body></html>`);
});

/* ================= LOOKUP PAR TÉLÉPHONE ================= */
app.get('/users/lookup',(req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  const mode=req.query.mode||'edit';
  req.session.choiceMode=mode;
  res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px;background:#eef2f7">
<h3>📞 Numéro expéditeur</h3>
<form method="post" action="/users/lookup">
<input name="phone" required><br><br>
<button>Continuer</button>
</form><br><a href="/users/choice">🔙 Retour</a>
</body></html>`);
});

app.post('/users/lookup', async (req,res)=>{
  const u = await User.findOne({ senderPhone:req.body.phone }).sort({ createdAt:-1 });
  req.session.prefill = u || { senderPhone:req.body.phone };

  if(req.session.choiceMode==='new') req.session.editId=null;
  else if(u) req.session.editId=u._id;
  else if(req.session.choiceMode==='edit') req.session.editId=null;
  else if(req.session.choiceMode==='delete'){
    if(u){
      await User.findByIdAndDelete(u._id);
      req.session.prefill=null;
      req.session.editId=null;
      return res.send(`<html><body style="text-align:center;font-family:Arial;padding-top:50px">
❌ Transfert supprimé<br><br><a href="/users/choice">🔙 Retour</a></body></html>`);
    } else {
      return res.send(`<html><body style="text-align:center;font-family:Arial;padding-top:50px">
Aucun transfert trouvé pour ce numéro<br><br><a href="/users/choice">🔙 Retour</a></body></html>`);
    }
  }
  res.redirect('/users/form');
});

/* ================= FORMULAIRE TRANSFERT ================= */
app.get('/users/form', (req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  const u=req.session.prefill||{};
  const isEdit=!!req.session.editId;
  const locations=['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne'];

  res.send(`<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial;background:#dde5f0;margin:0;padding:0}
form{background:#fff;max-width:950px;margin:20px auto;padding:15px;border-radius:8px}
.container{display:flex;flex-wrap:wrap;gap:15px}
.box{flex:1;min-width:250px;padding:10px;border-radius:6px}
.origin{background:#e3f0ff}
.dest{background:#ffe3e3}
input,select,button{width:100%;padding:9px;margin-top:8px;font-size:14px}
button{border:none;color:white;font-size:15px;border-radius:5px;cursor:pointer}
#save{background:#007bff} #cancel{background:#dc3545} #logout{background:#6c757d}
@media(max-width:600px){.container{flex-direction:column}}
</style>
</head>
<body>
<form id="form">
<h3 style="text-align:center">${isEdit?'✏️ Modifier transfert':'💸 Nouveau transfert'}</h3>
<div class="container">
<div class="box origin"><h4>📤 Expéditeur</h4>
<input id="senderFirstName" value="${u.senderFirstName||''}" placeholder="Prénom">
<input id="senderLastName" value="${u.senderLastName||''}" placeholder="Nom">
<input id="senderPhone" value="${u.senderPhone||''}" required placeholder="Téléphone">
<select id="originLocation">${locations.map(v=>`<option ${u.originLocation===v?'selected':''}>${v}</option>`).join('')}</select>
<input id="amount" type="number" value="${u.amount||''}" placeholder="Montant">
<input id="fees" type="number" value="${u.fees||''}" placeholder="Frais">
<input id="feePercent" type="number" value="${u.feePercent||''}" placeholder="% Frais">
</div>
<div class="box dest"><h4>📥 Destinataire</h4>
<input id="receiverFirstName" value="${u.receiverFirstName||''}" placeholder="Prénom">
<input id="receiverLastName" value="${u.receiverLastName||''}" placeholder="Nom">
<input id="receiverPhone" value="${u.receiverPhone||''}" placeholder="Téléphone">
<select id="destinationLocation">${locations.map(v=>`<option ${u.destinationLocation===v?'selected':''}>${v}</option>`).join('')}</select>
<input id="recoveryAmount" type="number" value="${u.recoveryAmount||''}" placeholder="Montant reçu">
<select id="recoveryMode">
<option ${u.recoveryMode==='Espèces'?'selected':''}>Espèces</option>
<option ${u.recoveryMode==='Orange Money'?'selected':''}>Orange Money</option>
<option ${u.recoveryMode==='Wave'?'selected':''}>Wave</option>
<option ${u.recoveryMode==='Produit'?'selected':''}>Produit</option>
<option ${u.recoveryMode==='Service'?'selected':''}>Service</option>
</select>
</div>
</div>
<button id="save">${isEdit?'💾 Mettre à jour':'💾 Enregistrer'}</button>
${isEdit?'<button type="button" id="cancel" onclick="cancelTransfer()">❌ Supprimer</button>':''}
<button type="button" id="logout" onclick="location.href=\'/logout/form\'">🚪 Déconnexion</button>
<p id="message"></p>
</form>
<script>
form.onsubmit=async e=>{
e.preventDefault();
const url='${isEdit?'/users/update':'/users'}';
const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({
senderFirstName:senderFirstName.value,
senderLastName:senderLastName.value,
senderPhone:senderPhone.value,
originLocation:originLocation.value,
amount:+amount.value,
fees:+fees.value,
feePercent:+feePercent.value,
receiverFirstName:receiverFirstName.value,
receiverLastName:receiverLastName.value,
receiverPhone:receiverPhone.value,
destinationLocation:destinationLocation.value,
recoveryAmount:+recoveryAmount.value,
recoveryMode:recoveryMode.value
})});
const d=await r.json();
message.innerText=d.message;
};
function cancelTransfer(){
if(!confirm('Voulez-vous supprimer ce transfert ?'))return;
fetch('/users/delete',{method:'POST'}).then(()=>location.href='/users/choice');
}
</script>
</body></html>`);
});

/* ================= CRUD ================= */
app.post('/users', async (req,res)=>{
  const code=Math.floor(100000+Math.random()*900000).toString();
  await new User({...req.body, code,status:'actif'}).save();
  res.json({message:'✅ Transfert enregistré | Code '+code});
});

app.post('/users/update', async (req,res)=>{
  if(!req.session.editId) return res.status(400).json({message:'Aucun transfert sélectionné'});
  await User.findByIdAndUpdate(req.session.editId, req.body);
  req.session.editId=null;
  res.json({message:'✏️ Transfert mis à jour'});
});

app.post('/users/delete', async (req,res)=>{
  if(!req.session.editId) return res.status(400).json({message:'Aucun transfert sélectionné'});
  await User.findByIdAndDelete(req.session.editId);
  req.session.editId=null;
  res.json({message:'❌ Transfert supprimé'});
});

app.get('/logout/form',(req,res)=>{
  req.session.formAccess=false;
  req.session.prefill=null;
  req.session.editId=null;
  req.session.choiceMode=null;
  res.redirect('/users');
});

/* ================= LISTE DES TRANSFERTS ================= */
app.get('/users/all', async (req,res)=>{
  if(!req.session.listAccess){
    return res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔒 Accès liste</h2>
<form method="post" action="/auth/list">
<input type="password" name="code" placeholder="Code 147" required><br><br>
<button>Valider</button>
</form></body></html>`);
  }

  const users=await User.find({}).sort({ destinationLocation:1, createdAt:1 });
  const grouped={};
  let totalAmount=0,totalRecovery=0,totalFees=0;

  users.forEach(u=>{
    if(!grouped[u.destinationLocation]) grouped[u.destinationLocation]=[];
    grouped[u.destinationLocation].push(u);
    totalAmount+=(u.amount||0);
    totalRecovery+=(u.recoveryAmount||0);
    totalFees+=(u.fees||0);
  });

  let html=`<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial;background:#f4f6f9}
h2{text-align:center;margin-top:20px}
table{width:95%;margin:auto;border-collapse:collapse;background:#fff;margin-bottom:40px}
th,td{border:1px solid #ccc;padding:6px;font-size:13px;text-align:center}
th{background:#007bff;color:#fff}
.origin{background:#e3f0ff}
.dest{background:#ffe3e3}
.sub{background:#ddd;font-weight:bold}
.total{background:#222;color:#fff;font-weight:bold}
h3{margin-top:50px;text-align:center;color:#007bff}
button.retirer,button.export{padding:5px 10px;border:none;border-radius:4px;cursor:pointer}
button.retirer{background:#28a745;color:#fff} button.export{background:#007bff;color:#fff;margin:5px}
@media(max-width:600px){table,th,td{font-size:12px;padding:4px}}
</style></head><body>
<h2>📋 Liste de tous les transferts groupés par destination</h2>
<button class="export" onclick="exportCSV()">📄 Export CSV</button>
<button class="export" onclick="exportPDF()">📄 Export PDF</button>
<script>
async function retirer(id){
  let mode=prompt("Mode de retrait : Espèces, Orange Money, Produit, Service");
  if(!mode)return;
  mode=mode.trim();
  if(!["Espèces","Orange Money","Produit","Service"].includes(mode)){alert("Mode invalide !");return;}
  const res=await fetch("/users/retirer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,mode})});
  const data=await res.json();alert(data.message);location.reload();
}
function exportCSV(){window.open("/users/export/csv","_blank")}
function exportPDF(){window.open("/users/export/pdf","_blank")}
</script>
`;

for(let dest in grouped){
  const list=grouped[dest];
  let subAmount=0,subRecovery=0,subFees=0;
  html+=`<h3>Destination: ${dest}</h3>
<table>
<tr>
<th>Expéditeur</th><th>Tél</th><th>Origine</th>
<th>Montant</th><th>Frais</th>
<th>Destinataire</th><th>Tél Dest.</th><th>Destination</th>
<th>Montant reçu</th><th>Code</th><th>Date</th><th>Action</th>
</tr>`;
  list.forEach(u=>{
    subAmount+=(u.amount||0); subRecovery+=(u.recoveryAmount||0); subFees+=(u.fees||0);
    html+=`<tr>
<td>${u.senderFirstName||''} ${u.senderLastName||''}</td>
<td>${u.senderPhone||''}</td>
<td class="origin">${u.originLocation||''}</td>
<td>${u.amount||0}</td>
<td>${u.fees||0}</td>
<td>${u.receiverFirstName||''} ${u.receiverLastName||''}</td>
<td>${u.receiverPhone||''}</td>
<td class="dest">${u.destinationLocation||''}</td>
<td>${u.recoveryAmount||0}</td>
<td>${u.code||''}</td>
<td>${u.createdAt?new Date(u.createdAt).toLocaleString():''}</td>
<td><button class="retirer" onclick="retirer('${u._id}')">💰 Retirer</button></td>
</tr>`;
  });
  html+=`<tr class="sub">
<td colspan="3">Sous-total ${dest}</td>
<td>${subAmount}</td><td>${subFees}</td>
<td colspan="2"></td><td></td>
<td>${subRecovery}</td><td colspan="2"></td><td></td>
</tr></table>`;
}

html+=`<table><tr class="total">
<td colspan="3">TOTAL GÉNÉRAL</td>
<td>${totalAmount}</td><td>${totalFees}</td>
<td colspan="2"></td><td></td>
<td>${totalRecovery}</td><td colspan="2"></td><td></td>
</tr></table>
<br><center><a href="/logout/list">🚪 Déconnexion</a></center></body></html>`;

res.send(html);
});

/* ================= RETRAIT ================= */
app.post('/users/retirer', async (req,res)=>{
  const {id,mode}=req.body;
  if(!["Espèces","Orange Money","Produit","Service"].includes(mode)) return res.status(400).json({message:"Mode invalide"});
  await User.findByIdAndUpdate(id,{recoveryMode:mode,$push:{retraitHistory:{date:new Date(),mode}}});
  res.json({message:`💰 Retrait effectué via ${mode}`});
});

/* ================= EXPORT CSV ================= */
app.get('/users/export/csv', async (req,res)=>{
  const users=await User.find({});
  const fields=['senderFirstName','senderLastName','senderPhone','originLocation','amount','fees','receiverFirstName','receiverLastName','receiverPhone','destinationLocation','recoveryAmount','recoveryMode','code','createdAt'];
  const parser = new Parser({fields});
  const csv=parser.parse(users);
  res.header('Content-Type','text/csv');
  res.attachment('transferts.csv');
  res.send(csv);
});


