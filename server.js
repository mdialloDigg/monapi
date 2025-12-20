const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'super-secret-transfert-key',
  resave: false,
  saveUninitialized: false
}));

/* ================= MONGODB ================= */
mongoose.connect(
  'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
)
.then(() => console.log('✅ MongoDB connecté'))
.catch(console.error);

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

  password: String,
  code: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ======================================================
   🔐 FORMULAIRE
====================================================== */
app.get('/users', (req, res) => {
  if (!req.session.formAccess) {
    return res.send(`
      <h2 style="text-align:center;margin-top:60px">🔒 Accès formulaire</h2>
      <form method="post" action="/auth/form" style="text-align:center">
        <input type="password" name="code" placeholder="Code d'accès" required>
        <br><br>
        <button>Valider</button>
      </form>
    `);
  }

res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Créer un transfert</title>
<style>
body{font-family:Arial;background:#f2f2f2}
form{background:#fff;width:900px;margin:30px auto;padding:20px;border-radius:8px}
.container{display:flex;gap:20px}
.box{flex:1;padding:15px;border-radius:6px}
.origin{background:#e9f1ff}
.dest{background:#ffdede}
input,button{width:100%;padding:8px;margin-top:8px}
#save{background:#007bff;color:#fff}
#print{background:#28a745;color:#fff}
#logout{background:#dc3545;color:#fff}
</style>
</head>
<body>

<form id="form">
<h3 style="text-align:center">💸 Créer un transfert</h3>

<div class="container">
<div class="box origin">
<h4>📤 Expéditeur</h4>
<input id="senderFirstName" placeholder="Prénom" required>
<input id="senderLastName" placeholder="Nom" required>
<input id="senderPhone" placeholder="Téléphone" required>
<input id="originLocation" placeholder="Origine" required>
<input id="amount" type="number" placeholder="Montant" required>
<input id="fees" type="number" placeholder="Frais" required>
<input id="feePercent" type="number" placeholder="% Frais" required>
</div>

<div class="box dest">
<h4>📥 Destinataire</h4>
<input id="receiverFirstName" placeholder="Prénom" required>
<input id="receiverLastName" placeholder="Nom" required>
<input id="receiverPhone" placeholder="Téléphone" required>
<input id="destinationLocation" placeholder="Destination" required>
<input id="recoveryAmount" type="number" placeholder="Montant reçu" required>
<input id="recoveryMode" placeholder="Mode de récupération" required>
</div>
</div>

<input id="password" type="password" placeholder="Mot de passe" required>

<button id="save">💾 Enregistrer</button>
<button type="button" id="print" onclick="printReceipt()">🖨 Imprimer</button>
<button type="button" id="logout" onclick="location.href='/logout/form'">🚪 Déconnexion</button>

<p id="message"></p>
</form>

<script>
let lastCode = '';

form.onsubmit = async e => {
  e.preventDefault();
  const res = await fetch('/users',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
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
      recoveryMode:recoveryMode.value,
      password:password.value
    })
  });
  const data = await res.json();
  message.innerText = data.message + ' | Code: ' + data.code;
  lastCode = data.code;
};

function printReceipt(){
  if(!lastCode) return alert("Enregistrez d'abord");
  const w = window.open('');
  w.document.write(
    '<h3>🧾 Reçu de transfert</h3>'+
    '<p><b>Code:</b> '+lastCode+'</p>'+
    '<p><b>Destinataire:</b> '+receiverFirstName.value+' '+receiverLastName.value+'</p>'+
    '<p><b>Destination:</b> '+destinationLocation.value+'</p>'
  );
  w.print();
}
</script>
</body>
</html>
`);
});

/* ================= SAVE ================= */
app.post('/users', async (req,res)=>{
  const code = Math.floor(100000 + Math.random()*900000).toString();
  const hash = await bcrypt.hash(req.body.password,10);
  await new User({...req.body,password:hash,code}).save();
  res.json({message:'✅ Transfert enregistré',code});
});

/* ======================================================
   📋 LISTE DES TRANSFERTS (COMPLÈTE + TOTAUX)
====================================================== */
app.get('/users/all', async (req,res)=>{
  if(!req.session.listAccess){
    return res.send(`
      <h2 style="text-align:center;margin-top:60px">🔒 Accès liste</h2>
      <form method="post" action="/auth/list" style="text-align:center">
        <input type="password" name="code" placeholder="Code d'accès" required>
        <br><br>
        <button>Valider</button>
      </form>
    `);
  }

  const users = await User.find({}, {password:0});
  let totalAmount = 0;
  let totalRecovery = 0;

  users.forEach(u=>{
    totalAmount += u.amount;
    totalRecovery += u.recoveryAmount;
  });

  let html = `
<style>
table{width:98%;margin:20px auto;border-collapse:collapse;background:#fff}
th,td{border:1px solid #ccc;padding:6px;font-size:13px;text-align:center}
th{background:#007bff;color:#fff}
.origin{background:#eef4ff;font-weight:bold}
.destination{background:#ecfff1;font-weight:bold}
.total{background:#222;color:#fff;font-weight:bold}
</style>

<h2 style="text-align:center">📋 Liste des transferts</h2>
<div style="text-align:center;margin-bottom:10px">
<a href="/logout/list">🚪 Se déconnecter</a>
</div>

<table>
<tr>
<th colspan="7">EXPÉDITEUR</th>
<th colspan="6">DESTINATAIRE</th>
<th>Date</th>
</tr>
<tr>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Origine</th><th>Montant</th><th>Frais</th><th>Code</th>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Destination</th><th>Reçu</th><th>Mode</th>
<th></th>
</tr>`;

users.forEach(u=>{
html+=`
<tr>
<td>${u.senderFirstName}</td>
<td>${u.senderLastName}</td>
<td>${u.senderPhone}</td>
<td class="origin">${u.originLocation}</td>
<td>${u.amount}</td>
<td>${u.fees}</td>
<td>${u.code}</td>

<td>${u.receiverFirstName}</td>
<td>${u.receiverLastName}</td>
<td>${u.receiverPhone}</td>
<td class="destination">${u.destinationLocation}</td>
<td>${u.recoveryAmount}</td>
<td>${u.recoveryMode}</td>
<td>${new Date(u.createdAt).toLocaleString()}</td>
</tr>`;
});

html+=`
<tr class="total">
<td colspan="4">TOTAL</td>
<td>${totalAmount}</td>
<td colspan="6"></td>
<td>${totalRecovery}</td>
<td colspan="2"></td>
</tr>
</table>`;

res.send(html);
});

/* ================= AUTH ================= */
app.post('/auth/form',(req,res)=>{
  if(req.body.code==='123') req.session.formAccess=true;
  res.redirect('/users');
});

app.post('/auth/list',(req,res)=>{
  if(req.body.code==='147') req.session.listAccess=true;
  res.redirect('/users/all');
});

/* ================= LOGOUT ================= */
app.get('/logout/form',(req,res)=>{
  req.session.formAccess=false;
  res.redirect('/users');
});

app.get('/logout/list',(req,res)=>{
  req.session.listAccess=false;
  res.redirect('/users/all');
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('🚀 Serveur lancé sur le port',PORT));
