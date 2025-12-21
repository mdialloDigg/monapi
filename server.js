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
).then(()=>console.log('✅ MongoDB connecté'))
 .catch(console.error);

/* ================= SCHEMA ================= */
const userSchema = new mongoose.Schema({
  senderFirstName:String,
  senderLastName:String,
  senderPhone:String,
  originLocation:String,
  amount:Number,
  feePercent:Number,
  fees:Number,
  receiverFirstName:String,
  receiverLastName:String,
  receiverPhone:String,
  destinationLocation:String,
  recoveryAmount:Number,
  recoveryMode:String,
  code:String,
  retired:{type:Boolean,default:false},
  retraitHistory:[{date:Date,mode:String}],
  createdAt:{type:Date,default:Date.now}
});

const User = mongoose.model('User', userSchema);

/* ================= HOME ================= */
app.get('/', (req,res)=>{
  res.send('🚀 API Transfert en ligne');
});

/* ================= FORMULAIRE ================= */
app.get('/users/form',(req,res)=>{
const u=req.session.prefill||{};
res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:Arial;background:#f2f4f8;margin:0}
form{background:#fff;max-width:480px;margin:10px auto;padding:15px;border-radius:10px}
input,select,button{width:100%;padding:12px;margin:6px 0;font-size:16px}
button{border:none;color:white;border-radius:6px}
#save{background:#007bff}
.box{background:#eef3ff;padding:10px;border-radius:8px;margin-bottom:10px}
.orange{background:#ffe5cc}
</style>
</head>
<body>
<form id="form">
<h3 style="text-align:center">💸 Nouveau transfert</h3>

<div class="box">
<input id="senderFirstName" placeholder="Prénom expéditeur">
<input id="senderLastName" placeholder="Nom expéditeur">
<input id="senderPhone" placeholder="Téléphone expéditeur" required>
<select id="originLocation">
<option>France</option><option>Belgique</option><option>Conakry</option>
</select>
</div>

<div class="box">
<input id="amount" type="number" placeholder="Montant">
<input id="feePercent" type="number" placeholder="% Frais">
<input id="fees" placeholder="Frais" readonly>
</div>

<div class="box orange">
<input id="receiverFirstName" placeholder="Prénom destinataire">
<input id="receiverLastName" placeholder="Nom destinataire">
<input id="receiverPhone" placeholder="Téléphone destinataire">
<select id="destinationLocation">
<option>Labé</option><option>Conakry</option><option>France</option>
</select>
<input id="recoveryAmount" placeholder="Montant reçu" readonly>
</div>

<button id="save">💾 Enregistrer</button>
<p id="message"></p>
</form>

<script>
function calc(){
 let m=+amount.value||0;
 let p=+feePercent.value||0;
 let f=m*p/100;
 fees.value=f.toFixed(2);
 recoveryAmount.value=(m-f).toFixed(2);
}
amount.oninput=calc;
feePercent.oninput=calc;

form.onsubmit=async e=>{
 e.preventDefault();
 const r=await fetch('/users',{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({
 senderFirstName:senderFirstName.value,
 senderLastName:senderLastName.value,
 senderPhone:senderPhone.value,
 originLocation:originLocation.value,
 amount:+amount.value,
 feePercent:+feePercent.value,
 fees:+fees.value,
 receiverFirstName:receiverFirstName.value,
 receiverLastName:receiverLastName.value,
 receiverPhone:receiverPhone.value,
 destinationLocation:destinationLocation.value,
 recoveryAmount:+recoveryAmount.value
 })});
 const d=await r.json();
 message.innerText=d.message;
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
const users=await User.find({});
let html=`<html><body style="font-family:Arial">
<h2 style="text-align:center">📋 Liste des transferts</h2>
<table border="1" width="100%" cellpadding="5">
<tr><th>Expéditeur</th><th>Montant</th><th>Destinataire</th><th>Reçu</th><th>Action</th></tr>`;

users.forEach(u=>{
const style=u.retired?'style="background:orange;color:white"':'';
const action=u.retired?'✔ Retiré':
`<select onchange="retirer('${u._id}',this.value)">
<option>Retirer</option>
<option>Espèces</option>
<option>Orange Money</option>
<option>Produit</option>
</select>`;
html+=`<tr ${style}>
<td>${u.senderFirstName}</td>
<td>${u.amount}</td>
<td>${u.receiverFirstName}</td>
<td>${u.recoveryAmount}</td>
<td>${action}</td></tr>`;
});

html+=`</table>
<script>
function retirer(id,mode){
 fetch('/users/retirer',{method:'POST',headers:{'Content-Type':'application/json'},
 body:JSON.stringify({id,mode})}).then(()=>location.reload());
}
</script></body></html>`;
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
res.json({message:'Retrait OK'});
});

/* ================= EXPORT PDF ================= */
app.get('/users/export/pdf', async (req,res)=>{
const users=await User.find({});
const doc=new PDFDocument();
res.setHeader('Content-Type','application/pdf');
res.setHeader('Content-Disposition','attachment;filename=transferts.pdf');
doc.pipe(res);
users.forEach(u=>{
doc.text(`${u.senderFirstName} -> ${u.receiverFirstName} | ${u.amount}`);
doc.moveDown();
});
doc.end();
});

/* ================= SERVER ================= */
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('🚀 Serveur démarré sur le port',PORT));
