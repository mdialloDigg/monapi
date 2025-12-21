const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');

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
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

/* ================= ROUTES ================= */

// Accès formulaire
app.get('/users', (req, res) => {
  if (!req.session.formAccess) {
    return res.send(`
<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔒 Accès formulaire</h2>
<form method="post" action="/auth/form">
<input type="password" name="code" placeholder="Code 123" required><br><br>
<button>Valider</button>
</form>
</body></html>
`);
  }
  res.redirect('/users/lookup');
});

app.post('/auth/form', (req, res) => {
  if (req.body.code === '123') req.session.formAccess = true;
  res.redirect('/users');
});

// Lookup téléphone
app.get('/users/lookup', (req, res) => {
  if (!req.session.formAccess) return res.redirect('/users');
  res.send(`
<html><body style="font-family:Arial;text-align:center;padding-top:60px;background:#eef2f7">
<h3>📞 Numéro expéditeur</h3>
<form method="post" action="/users/lookup">
<input name="phone" required><br><br>
<button>Continuer</button>
</form>
<br><a href="/users/edit">✏️ Modifier / Annuler par code</a><br><br>
<a href="/logout/form">🚪 Déconnexion</a>
</body></html>
`);
});

app.post('/users/lookup', async (req, res) => {
  const u = await User.findOne({ senderPhone: req.body.phone }).sort({ createdAt: -1 });
  req.session.prefill = u || { senderPhone: req.body.phone };
  req.session.editId = null;
  res.redirect('/users/form');
});

// Formulaire transfert
app.get('/users/form', (req, res) => {
  if (!req.session.formAccess) return res.redirect('/users');
  const u = req.session.prefill || {};
  const isEdit = !!req.session.editId;

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial;background:#dde5f0}
form{background:#fff;max-width:950px;margin:20px auto;padding:15px;border-radius:8px}
.container{display:flex;flex-wrap:wrap;gap:15px}
.box{flex:1;min-width:260px;padding:15px;border-radius:6px}
.origin{background:#e3f0ff}
.dest{background:#ffe3e3}
input,select,button{width:100%;padding:9px;margin-top:8px}
button{border:none;color:#fff;font-size:15px}
#save{background:#007bff}
#cancel{background:#dc3545}
#logout{background:#6c757d}
</style>
</head>
<body>

<form id="form">
<h3 style="text-align:center">${isEdit ? '✏️ Édition' : '💸 Nouveau'} transfert</h3>

<div class="container">
<div class="box origin">
<h4>📤 Expéditeur</h4>
<input id="senderFirstName" value="${u.senderFirstName||''}" placeholder="Prénom">
<input id="senderLastName" value="${u.senderLastName||''}" placeholder="Nom">
<input id="senderPhone" value="${u.senderPhone||''}" required placeholder="Téléphone">
<select id="originLocation">
${['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne'].map(v=>`<option ${u.originLocation===v?'selected':''}>${v}</option>`).join('')}
</select>
<input id="amount" type="number" value="${u.amount||''}" placeholder="Montant">
<input id="fees" type="number" value="${u.fees||''}" placeholder="Frais">
<input id="feePercent" type="number" value="${u.feePercent||''}" placeholder="% Frais">
</div>

<div class="box dest">
<h4>📥 Destinataire</h4>
<input id="receiverFirstName" value="${u.receiverFirstName||''}" placeholder="Prénom">
<input id="receiverLastName" value="${u.receiverLastName||''}" placeholder="Nom">
<input id="receiverPhone" value="${u.receiverPhone||''}" placeholder="Téléphone">
<select id="destinationLocation">
${['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne'].map(v=>`<option ${u.destinationLocation===v?'selected':''}>${v}</option>`).join('')}
</select>
<input id="recoveryAmount" type="number" value="${u.recoveryAmount||''}" placeholder="Montant reçu">
<select id="recoveryMode">
<option>Espèces</option><option>Orange Money</option><option>Wave</option>
</select>
</div>
</div>

<button id="save">${isEdit?'💾 Mettre à jour':'💾 Enregistrer'}</button>
${isEdit?'<button type="button" id="cancel" onclick="cancelTransfer()">❌ Annuler</button>':''}
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
if(!confirm('Annuler ce transfert ?'))return;
fetch('/users/cancel',{method:'POST'}).then(()=>location.href='/users');
}
</script>

</body>
</html>
`);
});

// CRUD
app.post('/users', async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await new User({ ...req.body, code, status: 'actif' }).save();
  res.json({ message: '✅ Transfert enregistré | Code ' + code });
});

app.post('/users/update', async (req, res) => {
  await User.findByIdAndUpdate(req.session.editId, req.body);
  req.session.editId = null;
  res.json({ message: '✏️ Transfert mis à jour' });
});

app.post('/users/cancel', async (req, res) => {
  await User.findByIdAndUpdate(req.session.editId, { status: 'annulé' });
  req.session.editId = null;
  res.sendStatus(200);
});

app.get('/logout/form', (req, res) => {
  req.session.formAccess = false;
  req.session.prefill = null;
  req.session.editId = null;
  res.redirect('/users');
});

/* ======================================================
   📋 LISTE DES TRANSFERTS PAR DESTINATION - TABLEAU SÉPARÉ
====================================================== */
app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
<html><body style="font-family:Arial;text-align:center;padding-top:60px">
<h2>🔒 Accès liste</h2>
<form method="post" action="/auth/list">
<input type="password" name="code" placeholder="Code 147" required><br><br>
<button>Valider</button>
</form>
</body></html>
`);
  }

  const users = await User.find({ status: 'actif' }).sort({ destinationLocation: 1, createdAt: 1 });

  const grouped = {};
  let totalAmount = 0, totalRecovery = 0, totalFees = 0;

  users.forEach(u => {
    if (!grouped[u.destinationLocation]) grouped[u.destinationLocation] = [];
    grouped[u.destinationLocation].push(u);

    totalAmount += u.amount;
    totalRecovery += u.recoveryAmount;
    totalFees += u.fees;
  });

  let html = `
<html>
<head>
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
</style>
</head>
<body>
<h2>📋 Liste de tous les transferts groupés par destination</h2>
`;

  for (let dest in grouped) {
    const list = grouped[dest];
    let subAmount = 0, subRecovery = 0, subFees = 0;

    html += `<h3>Destination: ${dest}</h3>
<table>
<tr>
<th>Expéditeur</th><th>Tél</th><th>Origine</th>
<th>Montant</th><th>Frais</th>
<th>Destinataire</th><th>Tél Dest.</th><th>Destination</th>
<th>Montant reçu</th><th>Code</th><th>Date</th>
</tr>`;

    list.forEach(u => {
      subAmount += u.amount;
      subRecovery += u.recoveryAmount;
      subFees += u.fees;

      html += `<tr>
<td>${u.senderFirstName} ${u.senderLastName}</td>
<td>${u.senderPhone}</td>
<td class="origin">${u.originLocation}</td>
<td>${u.amount}</td>
<td>${u.fees}</td>
<td>${u.receiverFirstName} ${u.receiverLastName}</td>
<td>${u.receiverPhone}</td>
<td class="dest">${u.destinationLocation}</td>
<td>${u.recoveryAmount}</td>
<td>${u.code}</td>
<td>${new Date(u.createdAt).toLocaleString()}</td>
</tr>`;
    });

    html += `<tr class="sub">
<td colspan="3">Sous-total ${dest}</td>
<td>${subAmount}</td><td>${subFees}</td>
<td colspan="2"></td><td></td>
<td>${subRecovery}</td><td colspan="2"></td>
</tr></table>`;
  }

  html += `<table><tr class="total">
<td colspan="3">TOTAL GÉNÉRAL</td>
<td>${totalAmount}</td>
<td>${totalFees}</td>
<td colspan="2"></td><td></td>
<td>${totalRecovery}</td><td colspan="2"></td>
</tr></table>
<br><center><a href="/logout/list">🚪 Déconnexion</a></center>
</body></html>`;

  res.send(html);
});

app.post('/auth/list', (req, res) => {
  if (req.body.code === '147') req.session.listAccess = true;
  res.redirect('/users/all');
});

app.get('/logout/list', (req, res) => {
  req.session.listAccess = false;
  res.redirect('/users/all');
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Serveur lancé sur le port', PORT));
