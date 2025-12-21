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
  retired: { type: Boolean, default: false },
  retraitHistory: [{ date: Date, mode: String }],
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ================= HOME ================= */
app.get('/', (req,res)=>res.send('🚀 API Transfert en ligne'));

/* ================= FORMULAIRE ================= */
app.get('/users/form',(req,res)=>{
const u = req.session.prefill || {};
const locations=['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne'];

res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial;background:#dde5f0;margin:0}
form{background:#fff;max-width:950px;margin:20px auto;padding:15px;border-radius:8px}
.container{display:flex;flex-wrap:wrap;gap:15px}
.box{flex:1;min-width:250px;padding:10px;border-radius:6px}
.origin{background:#e3f0ff}
.dest{background:#ffe3e3}
input,select,button{width:100%;padding:9px;margin-top:8px;font-size:14px}
button{border:none;color:white;font-size:15px;border-radius:5px;cursor:pointer}
#save{background:#007bff} #logout{background:#6c757d}
@media(max-width:600px){.container{flex-direction:column}}
</style>
</head>
<body>

<form id="form">
<h3 style="text-align:center">💸 Nouveau transfert</h3>

<div class="container">
<div class="box origin">
<h4>📤 Expéditeur</h4>
<input id="senderFirstName" value="${u.senderFirstName||''}" placeholder="Prénom">
<input id="senderLastName" value="${u.senderLastName||''}" placeholder="Nom">
<input id="senderPhone" value="${u.senderPhone||''}" placeholder="Téléphone">
<select id="originLocation">
${locations.map(v=>`<option ${u.originLocation===v?'selected':''}>${v}</option>`).join('')}
</select>
<input id="amount" type="number" value="${u.amount||''}" placeholder="Montant origine">
<input id="feePercent" type="number" value="${u.feePercent||''}" placeholder="% Frais">
<input id="fees" type="number" value="${u.fees||''}" placeholder="Frais">
</div>

<div class="box dest">
<h4>📥 Destinataire</h4>
<input id="receiverFirstName" value="${u.receiverFirstName||''}" placeholder="Prénom">
<input id="receiverLastName" value="${u.receiverLastName||''}" placeholder="Nom">
<input id="receiverPhone" value="${u.receiverPhone||''}" placeholder="Téléphone">
<select id="destinationLocation">
${locations.map(v=>`<option ${u.destinationLocation===v?'selected':''}>${v}</option>`).join('')}
</select>
<input id="recoveryAmount" type="number" value="${u.recoveryAmount||''}" placeholder="Montant destination" readonly>
</div>
</div>

<button id="save">💾 Enregistrer</button>
<button type="button" id="logout" onclick="location.href='/'">🚪 Déconnexion</button>
<p id="message"></p>
</form>

<script>
function calcul(){
  const montant = parseFloat(amount.value)||0;
  const percent = parseFloat(feePercent.value)||0;
  const fraisCalc = montant * percent / 100;
  fees.value = fraisCalc.toFixed(2);
  recoveryAmount.value = (montant - fraisCalc).toFixed(2);
}

amount.oninput = calcul;
feePercent.oninput = calcul;

form.onsubmit = async e=>{
e.preventDefault();
const r = await fetch('/users',{method:'POST',headers:{'Content-Type':'application/json'},
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
recoveryAmount:+recoveryAmount.value
})});
const d = await r.json();
message.innerText = d.message;
};
</script>
</body></html>`);
});

/* ================= CREATE ================= */
app.post('/users', async (req,res)=>{
const code=Math.floor(100000+Math.random()*900000);
await new User({...req.body,code}).save();
res.json({message:'✅ Transfert enregistré | Code '+code});
});

/* ================= LISTE ================= */
app.get('/users/all', async (req,res)=>{
const users=await User.find({}).sort({createdAt:-1});
let html=`<html><body style="font-family:Arial;background:#f4f6f9">
<h2 style="text-align:center">📋 Liste des transferts</h2>
<table width="100%" border="1" cellspacing="0" cellpadding="5">
<tr style="background:#007bff;color:white">
<th>Expéditeur</th><th>Montant</th><th>Destinataire</th><th>Reçu</th><th>Action</th>
</tr>`;

users.forEach(u=>{
const rowStyle = u.retired ? 'style="background:orange;color:white"' : '';
html+=`<tr ${rowStyle}>
<td>${u.senderFirstName}</td>
<td>${u.amount}</td>
<td>${u.receiverFirstName}</td>
<td>${u.recoveryAmount}</td>
<td>
<button class="retirer" onclick="retirer('${u._id}')">💰 Retirer</button>
</td>
</tr>`;
});

html+=`</table>
<script>
function retirer(id){
 const mode = prompt("Mode de retrait : Espèces, Orange Money, Produit, Service");
 if(!mode)return;
 fetch('/users/retirer',{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({id,mode})}).then(()=>location.reload());
}
</script>
</body></html>`;
res.send(html);
});

/* ================= RETRAIT ================= */
app.post('/users/retirer', async (req,res)=>{
const {id,mode}=req.body;
await User.findByIdAndUpdate(id,{
 recoveryMode:mode,
 retired:true,
 $push:{retraitHistory:{date:new Date(),mode}}
});
res.json({message:'💰 Retrait effectué'});
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('🚀 Serveur actif sur le port',PORT));
