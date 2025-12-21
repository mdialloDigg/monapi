const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: 'transfert-secret',
    resave: false,
    saveUninitialized: false
  })
);

// ===== MONGODB =====
mongoose
  .connect(
    'mongodb+srv://mlaminediallo_db_user:amSYetCmMskMw9Cm@cluster0.iaplugg.mongodb.net/test'
  )
  .then(() => console.log('✅ MongoDB connecté'))
  .catch(console.error);

// ===== SCHEMA =====
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

// ===== GET /users (FORMULAIRE) =====
app.get('/users', (req, res) => {
  if (!req.session.formAccess) {
    return res.send(`
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="text-align:center;font-family:Arial;padding-top:50px">
<h2>🔒 Accès au formulaire</h2>
<form method="post" action="/auth/form">
<input type="password" name="code" placeholder="Code d'accès" required><br><br>
<button>Valider</button>
</form>
</body></html>`);
  }

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
input,select,button{width:100%;padding:9px;margin-top:8px;font-size:14px}
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
<input id="senderFirstName" placeholder="Prénom" required>
<input id="senderLastName" placeholder="Nom" required>
<input id="senderPhone" placeholder="Téléphone" required>

<select id="originLocation" required>
<option value="">Origine</option>
<option>France</option>
<option>Labé</option>
<option>Belgique</option>
<option>Conakry</option>
<option>Suisse</option>
<option>Atlanta</option>
<option>New York</option>
<option>Allemagne</option>
</select>

<input id="amount" type="number" placeholder="Montant envoyé" required>
<input id="fees" type="number" placeholder="Frais" required>
<input id="feePercent" type="number" placeholder="% Frais" required>
</div>

<div class="box dest">
<h4>📥 Destinataire</h4>
<input id="receiverFirstName" placeholder="Prénom" required>
<input id="receiverLastName" placeholder="Nom" required>
<input id="receiverPhone" placeholder="Téléphone" required>

<select id="destinationLocation" required>
<option value="">Destination</option>
<option>France</option>
<option>Labé</option>
<option>Belgique</option>
<option>Conakry</option>
<option>Suisse</option>
<option>Atlanta</option>
<option>New York</option>
<option>Allemagne</option>
</select>

<input id="recoveryAmount" type="number" placeholder="Montant reçu" required>

<select id="recoveryMode" required>
<option value="">Mode de retrait</option>
<option>Espèces</option>
<option>Orange Money</option>
<option>Wave</option>
<option>MTN Money</option>
<option>Virement bancaire</option>
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
const response = await fetch('/users',{
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
const data = await response.json();
message.innerText = data.message + ' | Code: ' + data.code;
lastCode = data.code;
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

// ===== POST /users =====
app.post('/users', async (req, res) => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await new User({...req.body, code}).save();
  res.json({message:'✅ Transfert enregistré', code});
});

// ===== AUTH FORMULAIRE =====
app.post('/auth/form', (req, res) => {
  if (req.body.code === '123') req.session.formAccess = true;
  res.redirect('/users');
});

// ===== LISTE DES TRANSFERTS =====
app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="text-align:center;font-family:Arial;padding-top:60px">
<h2>🔒 Accès liste</h2>
<form method="post" action="/auth/list">
<input type="password" name="code" placeholder="Code d'accès" required><br><br>
<button>Entrer</button>
</form>
</body></html>
`);
  }

  const users = await User.find().sort({ createdAt: -1 });

  const grouped = {};
  let totalAmount = 0;
  let totalRecovery = 0;
  let totalFees = 0;

  users.forEach(u => {
    grouped[u.destinationLocation] = grouped[u.destinationLocation] || [];
    grouped[u.destinationLocation].push(u);

    totalAmount += u.amount;
    totalRecovery += u.recoveryAmount;
    totalFees += u.fees;
  });

  let html = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Liste transferts</title>
<style>
body{font-family:Arial;background:#eef2f7;margin:0}
h2{text-align:center;padding:15px}
.section{margin:20px}
.section-title{background:#343a40;color:white;padding:10px;border-radius:6px}
.table-wrap{overflow-x:auto;background:#fff;border-radius:6px;margin-bottom:30px}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{border:1px solid #ccc;padding:6px;text-align:center}
th{background:#007bff;color:white}
.sender{background:#e3f2fd}
.receiver{background:#e8f5e9}
.total{background:#212529;color:white;font-weight:bold}
.logout{text-align:center;margin-bottom:15px}
@media(max-width:768px){
  table,thead,tbody,tr,td,th{font-size:12px}
}
</style>
</head>
<body>

<h2>📋 Transferts par destination</h2>
<div class="logout"><a href="/logout/list">🚪 Déconnexion</a></div>
`;

  for (const destination in grouped) {
    let dAmount = 0, dRecovery = 0, dFees = 0;

    html += `
<div class="section">
<div class="section-title">🌍 Destination : ${destination}</div>
<div class="table-wrap"><table>
<tr>
<th colspan="8">EXPÉDITEUR</th>
<th colspan="7">DESTINATAIRE</th>
<th>Date</th>
</tr>
<tr>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Origine</th>
<th>Montant</th><th>Frais</th><th>%</th><th>Code</th>

<th>Prénom</th><th>Nom</th><th>Tél</th><th>Destination</th>
<th>Reçu</th><th>Mode</th><th></th>

<th></th>
</tr>
`;

    grouped[destination].forEach(u => {
      dAmount += u.amount;
      dRecovery += u.recoveryAmount;
      dFees += u.fees;

      html += `
<tr>
<td class="sender">${u.senderFirstName}</td>
<td class="sender">${u.senderLastName}</td>
<td class="sender">${u.senderPhone}</td>
<td class="sender">${u.originLocation}</td>
<td class="sender">${u.amount}</td>
<td class="sender">${u.fees}</td>
<td class="sender">${u.feePercent}%</td>
<td class="sender">${u.code}</td>

<td class="receiver">${u.receiverFirstName}</td>
<td class="receiver">${u.receiverLastName}</td>
<td class="receiver">${u.receiverPhone}</td>
<td class="receiver">${u.destinationLocation}</td>
<td class="receiver">${u.recoveryAmount}</td>
<td class="receiver">${u.recoveryMode}</td>
<td class="receiver"></td>

<td>${new Date(u.createdAt).toLocaleString()}</td>
</tr>
`;
    });

    html += `
<tr class="total">
<td colspan="4">TOTAL ${destination}</td>
<td>${dAmount}</td><td>${dFees}</td><td></td><td></td>
<td colspan="4"></td><td>${dRecovery}</td><td colspan="3"></td><td></td>
</tr>
</table></div></div>
`;
  }

  html += `
<div class="section">
<table>
<tr class="total">
<td colspan="4">TOTAL GÉNÉRAL</td>
<td>${totalAmount}</td><td>${totalFees}</td><td colspan="6"></td><td>${totalRecovery}</td><td colspan="3"></td><td></td>
</tr>
</table></div>

</body>
</html>
`;

  res.send(html);
});

// ===== AUTH LISTE =====
app.post('/auth/list', (req, res) => {
  if (req.body.code === '147') req.session.listAccess = true;
  res.redirect('/users/all');
});

// ===== LOGOUT =====
app.get('/logout/form', (req, res) => {req.session.formAccess = false;res.redirect('/users');});
app.get('/logout/list', (req, res) => {req.session.listAccess = false;res.redirect('/users/all');});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 Serveur lancé sur le port',PORT));
