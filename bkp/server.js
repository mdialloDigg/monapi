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

  password: String,
  code: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ======================================================
   🔐 FORMULAIRE — GET /users
====================================================== */
app.get('/users', (req, res) => {
  if (!req.session.formAccess) {
    return res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Accès formulaire</title>
<style>
body{font-family:Arial;background:#f4f6f9;text-align:center;padding-top:60px}
input,button{padding:10px;font-size:16px;width:90%;max-width:300px}
button{background:#007bff;color:#fff;border:none}
</style>
</head>
<body>
<h2>🔒 Accès au formulaire</h2>
<form method="post" action="/auth/form">
<input type="password" name="code" placeholder="Code d'accès" required><br><br>
<button>Valider</button>
</form>
</body>
</html>
`);
  }

res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Créer un transfert</title>
<style>
body{font-family:Arial;background:#f2f2f2;margin:0}
form{background:#fff;max-width:900px;margin:20px auto;padding:15px;border-radius:8px}
.container{display:flex;gap:15px;flex-wrap:wrap}
.box{flex:1;min-width:280px;padding:15px;border-radius:6px}
.origin{background:#e9f1ff}
.dest{background:#ffdede}
h3,h4{text-align:center}
input,button{width:100%;padding:8px;margin-top:8px}
button{border:none;color:#fff;font-size:15px}
#save{background:#007bff}
#print{background:#28a745}
#logout{background:#dc3545}
@media(max-width:600px){
  form{margin:0;border-radius:0}
}
</style>
</head>
<body>

<form id="form">
<h3>💸 Créer un transfert</h3>

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
<input id="recoveryMode" placeholder="Mode récupération" required>
</div>
</div>

<input id="password" type="password" placeholder="Mot de passe" required>

<button id="save">💾 Enregistrer</button>
<button type="button" id="print" onclick="printReceipt()">🖨 Imprimer</button>
<button type="button" id="logout" onclick="location.href='/logout/form'">🚪 Déconnexion</button>

<p id="message"></p>
</form>

<script>
let lastCode='';
form.onsubmit=async e=>{
e.preventDefault();
const r=await fetch('/users',{method:'POST',headers:{'Content-Type':'application/json'},
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
})});
const d=await r.json();
message.innerText=d.message+' | Code: '+d.code;
lastCode=d.code;
};

function printReceipt(){
if(!lastCode)return alert('Enregistrez d’abord');
const w=window.open('');
w.document.write('<h3>🧾 Reçu</h3><p><b>Code:</b> '+lastCode+'</p><p><b>Destinataire:</b> '+receiverFirstName.value+' '+receiverLastName.value+'</p><p><b>Destination:</b> '+destinationLocation.value+'</p>');
w.print();
}
</script>
</body>
</html>
`);
});

/* ================= POST /users ================= */
app.post('/users', async (req,res)=>{
  const code = Math.floor(100000 + Math.random()*900000).toString();
  const hash = await bcrypt.hash(req.body.password,10);
  await new User({...req.body,password:hash,code}).save();
  res.json({message:'✅ Transfert enregistré',code});
});

/* ================= AUTH FORM ================= */
app.post('/auth/form',(req,res)=>{
  if(req.body.code==='123') req.session.formAccess=true;
  res.redirect('/users');
});

/* ======================================================
   📋 LISTE — GROUPÉE, COLORÉE, RESPONSIVE
====================================================== */
app.get('/users/all', async (req,res)=>{
  if(!req.session.listAccess){
    return res.send(`
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="text-align:center;padding-top:60px">
<h2>🔒 Accès liste</h2>
<form method="post" action="/auth/list">
<input type="password" name="code" placeholder="Code d'accès" required><br><br>
<button>Valider</button>
</form>
</body></html>
`);
  }

  const users = await User.find({}, {password:0});
  const grouped = {};
  let grandA=0, grandR=0;

  users.forEach(u=>{
    grouped[u.destinationLocation]=grouped[u.destinationLocation]||[];
    grouped[u.destinationLocation].push(u);
    grandA+=u.amount;
    grandR+=u.recoveryAmount;
  });

let html=`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Liste des transferts</title>
<style>
body{font-family:Arial;background:#f4f6f9;margin:0}
.section{margin:20px}
.title{background:#343a40;color:#fff;padding:10px;border-radius:4px}
.table-wrap{overflow-x:auto;background:#fff;border-radius:6px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border:1px solid #ccc;padding:6px;text-align:center}
th{background:#007bff;color:#fff}
.origin{background:#eef4ff}
.destination{background:#ecfff1}
.total{background:#222;color:#fff;font-weight:bold}
.logout{text-align:center;margin:10px}
</style>
</head>
<body>

<h2 style="text-align:center">📋 Transferts par destination</h2>
<div class="logout"><a href="/logout/list">🚪 Déconnexion</a></div>
`;

for(const dest in grouped){
let tA=0,tR=0;
html+=`<div class="section">
<div class="title">🌍 Destination : ${dest}</div>
<div class="table-wrap">
<table>
<tr>
<th>Expéditeur</th><th>Tél</th><th>Origine</th><th>Montant</th><th>Code</th>
<th>Destinataire</th><th>Tél</th><th>Reçu</th><th>Mode</th><th>Date</th>
</tr>`;

grouped[dest].forEach(u=>{
tA+=u.amount; tR+=u.recoveryAmount;
html+=`
<tr>
<td>${u.senderFirstName} ${u.senderLastName}</td>
<td>${u.senderPhone}</td>
<td class="origin">${u.originLocation}</td>
<td>${u.amount}</td>
<td>${u.code}</td>
<td>${u.receiverFirstName} ${u.receiverLastName}</td>
<td>${u.receiverPhone}</td>
<td class="destination">${u.recoveryAmount}</td>
<td>${u.recoveryMode}</td>
<td>${new Date(u.createdAt).toLocaleDateString()}</td>
</tr>`;
});

html+=`
<tr class="total">
<td colspan="3">TOTAL ${dest}</td>
<td>${tA}</td>
<td colspan="3"></td>
<td>${tR}</td>
<td colspan="2"></td>
</tr>
</table>
</div>
</div>`;
}

html+=`
<div class="section">
<table>
<tr class="total">
<td>TOTAL GÉNÉRAL ENVOYÉ : ${grandA}</td>
<td>TOTAL GÉNÉRAL REÇU : ${grandR}</td>
</tr>
</table>
</div>

</body>
</html>`;

res.send(html);
});

/* ================= AUTH LIST ================= */
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
app.listen(PORT,()=>console.log('🚀 Serveur en ligne sur le port',PORT));
