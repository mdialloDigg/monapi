/* ================= IMPORTS ================= */
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
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

/* ================= AUTH LIST ================= */
app.post('/auth/list', (req, res) => {
  const code = req.body.code;
  if (code === '147') {
    req.session.listAccess = true;
    res.redirect('/users/all');
  } else {
    res.send(`<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔒 Code incorrect</h2>
<a href="/users/all">🔙 Retour</a>
</body></html>`);
  }
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
<input id="recoveryAmount" type="number" value="${u.recoveryAmount||''}" placeholder="Montant reçu" readonly>
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
function calculRecovery(){
  const amt = parseFloat(amount.value) || 0;
  const feesVal = parseFloat(fees.value) || 0;
  recoveryAmount.value = amt - feesVal;
}
amount.addEventListener('input', calculRecovery);
fees.addEventListener('input', calculRecovery);

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

/* ================= LOGOUT ================= */
app.get('/logout/form',(req,res)=>{
  req.session.formAccess=false;
  req.session.prefill=null;
  req.session.editId=null;
  req.session.choiceMode=null;
  res.redirect('/users');
});

app.get('/logout/list',(req,res)=>{
    req.session.listAccess=false;
    res.redirect('/users/all');
});

/* ================= ÉCOUTE DU PORT ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
});
