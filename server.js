const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

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

  code: String,
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

/* ======================================================
   🔐 ACCÈS FORMULAIRE
====================================================== */
app.get('/users', (req, res) => {
  if (!req.session.formAccess) {
    return res.send(`
<html><body style="text-align:center;padding-top:60px;font-family:Arial">
<h2>🔒 Accès formulaire</h2>
<form method="post" action="/auth/form">
<input type="password" name="code" placeholder="Code d'accès" required><br><br>
<button>Valider</button>
</form>
</body></html>`);
  }
  res.redirect('/users/lookup');
});

app.post('/auth/form', (req, res) => {
  if (req.body.code === '123') req.session.formAccess = true;
  res.redirect('/users');
});

/* ======================================================
   📞 RECHERCHE PAR TÉLÉPHONE
====================================================== */
app.get('/users/lookup', (req, res) => {
  if (!req.session.formAccess) return res.redirect('/users');

  res.send(`
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="text-align:center;padding-top:60px;font-family:Arial;background:#eef2f7">
<h3>📞 Numéro expéditeur</h3>
<form method="post" action="/users/lookup">
<input name="phone" placeholder="Téléphone" required><br><br>
<button>Continuer</button>
</form>
</body></html>`);
});

app.post('/users/lookup', async (req, res) => {
  const phone = req.body.phone;
  const user = await User.findOne({ senderPhone: phone }).sort({ createdAt: -1 });

  // IMPORTANT : si non trouvé → on garde le téléphone seulement
  req.session.prefill = user
    ? user
    : { senderPhone: phone };

  res.redirect('/users/form');
});

/* ======================================================
   📝 FORMULAIRE DE TRANSFERT
====================================================== */
app.get('/users/form', (req, res) => {
  if (!req.session.formAccess) return res.redirect('/users');

  const u = req.session.prefill || {};

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Créer transfert</title>
<style>
body{font-family:Arial;background:#dde5f0;margin:0}
form{background:#fff;max-width:950px;margin:20px auto;padding:15px;border-radius:8px}
.container{display:flex;gap:15px;flex-wrap:wrap}
.box{flex:1;min-width:260px;padding:15px;border-radius:6px}
.origin{background:#e3f0ff}
.dest{background:#ffe3e3}
h3,h4{text-align:center}
input,select,button{width:100%;padding:9px;margin-top:8px}
button{border:none;color:#fff;font-size:15px}
#save{background:#007bff}
#print{background:#28a745}
#logout{background:#dc3545}
</style>
</head>
<body>

<form id="form">
<h3>💸 Formulaire de transfert</h3>

<div class="container">
<div class="box origin">
<h4>📤 Expéditeur</h4>
<input id="senderFirstName" value="${u.senderFirstName||''}" placeholder="Prénom">
<input id="senderLastName" value="${u.senderLastName||''}" placeholder="Nom">
<input id="senderPhone" value="${u.senderPhone||''}" placeholder="Téléphone" required>

<select id="originLocation">
<option value="">Origine</option>
${['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne']
.map(o=>`<option ${u.originLocation===o?'selected':''}>${o}</option>`).join('')}
</select>

<input id="amount" type="number" placeholder="Montant envoyé">
<input id="fees" type="number" placeholder="Frais">
<input id="feePercent" type="number" placeholder="% Frais">
</div>

<div class="box dest">
<h4>📥 Destinataire</h4>
<input id="receiverFirstName" value="${u.receiverFirstName||''}" placeholder="Prénom">
<input id="receiverLastName" value="${u.receiverLastName||''}" placeholder="Nom">
<input id="receiverPhone" value="${u.receiverPhone||''}" placeholder="Téléphone">

<select id="destinationLocation">
<option value="">Destination</option>
${['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne']
.map(d=>`<option ${u.destinationLocation===d?'selected':''}>${d}</option>`).join('')}
</select>

<input id="recoveryAmount" type="number" placeholder="Montant reçu">

<select id="recoveryMode">
<option value="">Mode de retrait</option>
${['Espèces','Orange Money','Wave','MTN Money','Virement bancaire']
.map(m=>`<option ${u.recoveryMode===m?'selected':''}>${m}</option>`).join('')}
</select>
</div>
</div>

<button id="save">💾 Enregistrer</button>
<button type="button" id="print" onclick="printReceipt()">🖨 Imprimer</button>
<button type="button" id="logout" onclick="location.href='/logout/form'">🚪 Déconnexion</button>

<p id="message"></p>
</form>

<script>
let lastCode='';
form.onsubmit=async e=>{
e.preventDefault();
const r=await fetch('/users',{
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
recoveryMode:recoveryMode.value
})
});
const d=await r.json();
message.innerText=d.message+' | Code: '+d.code;
lastCode=d.code;
};

function printReceipt(){
if(!lastCode)return alert('Enregistrez d’abord');
const w=window.open('');
w.document.write('<h3>🧾 Reçu</h3><p>Code : '+lastCode+'</p><p>Destination : '+destinationLocation.value+'</p>');
w.print();
}
</script>

</body>
</html>
`);
});

/* ================= ENREGISTREMENT ================= */
app.post('/users', async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await new User({ ...req.body, code }).save();
  res.json({ message: '✅ Transfert enregistré', code });
});

/* ======================================================
   📋 LISTE DES TRANSFERTS (CORRIGÉE)
====================================================== */
app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
<html><body style="text-align:center;padding-top:60px;font-family:Arial">
<h2>🔒 Accès liste</h2>
<form method="post" action="/auth/list">
<input type="password" name="code" placeholder="Code d'accès" required><br><br>
<button>Valider</button>
</form>
</body></html>`);
  }

  const users = await User.find().sort({ createdAt: -1 });

  let totalAmount=0,totalFees=0,totalRecovery=0;

  let html = `
<style>
body{font-family:Arial;background:#f0f2f5}
table{width:98%;margin:auto;border-collapse:collapse;background:#fff}
th,td{border:1px solid #ccc;padding:6px;font-size:13px;text-align:center}
th{background:#007bff;color:white}
.sender{background:#e3f2fd}
.receiver{background:#e8f5e9}
.total{background:#212529;color:white;font-weight:bold}
</style>
<h2 style="text-align:center">📋 Liste des transferts</h2>
<div style="text-align:center"><a href="/logout/list">🚪 Déconnexion</a></div>
<table>
<tr>
<th colspan="8">EXPÉDITEUR</th>
<th colspan="7">DESTINATAIRE</th>
<th>Date</th>
</tr>
<tr>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Origine</th>
<th>Montant</th><th>Frais</th><th>%</th><th>Code</th>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Destination</th>
<th>Reçu</th><th>Mode</th><th></th><th></th>
</tr>`;

  users.forEach(u=>{
    totalAmount+=u.amount;
    totalFees+=u.fees;
    totalRecovery+=u.recoveryAmount;

    html+=`
<tr>
<td class="sender">${u.senderFirstName||''}</td>
<td class="sender">${u.senderLastName||''}</td>
<td class="sender">${u.senderPhone}</td>
<td class="sender">${u.originLocation||''}</td>
<td class="sender">${u.amount||0}</td>
<td class="sender">${u.fees||0}</td>
<td class="sender">${u.feePercent||0}</td>
<td class="sender">${u.code}</td>

<td class="receiver">${u.receiverFirstName||''}</td>
<td class="receiver">${u.receiverLastName||''}</td>
<td class="receiver">${u.receiverPhone||''}</td>
<td class="receiver">${u.destinationLocation||''}</td>
<td class="receiver">${u.recoveryAmount||0}</td>
<td class="receiver">${u.recoveryMode||''}</td>
<td></td>
<td>${new Date(u.createdAt).toLocaleString()}</td>
</tr>`;
  });

  html+=`
<tr class="total">
<td colspan="4">TOTAL</td>
<td>${totalAmount}</td>
<td>${totalFees}</td>
<td colspan="5"></td>
<td>${totalRecovery}</td>
<td colspan="3"></td>
</tr>
</table>`;

  res.send(html);
});

/* ================= AUTH LISTE ================= */
app.post('/auth/list', (req, res) => {
  if (req.body.code === '147') req.session.listAccess = true;
  res.redirect('/users/all');
});

/* ================= LOGOUT ================= */
app.get('/logout/form',(req,res)=>{req.session.formAccess=false;req.session.prefill=null;res.redirect('/users');});
app.get('/logout/list',(req,res)=>{req.session.listAccess=false;res.redirect('/users/all');});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Serveur lancé sur le port', PORT));
