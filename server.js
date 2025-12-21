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

/* ================= LISTE DES TRANSFERTS ================= */
app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{text-align:center;font-family:Arial;background:#f0f2f5;padding-top:60px}
input,button{padding:12px;font-size:16px;width:90%;max-width:320px}
button{background:#28a745;color:white;border:none}
</style>
</head>
<body>
<h2>🔒 Accès liste</h2>
<form method="post" action="/auth/list">
<input type="password" name="code" placeholder="Code d'accès" required><br><br>
<button>Entrer</button>
</form>
</body>
</html>
`);
  }

  const users = await User.find().sort({ createdAt: -1 });

  const grouped = {};
  let totalAmount = 0;
  let totalRecovery = 0;
  let totalFees = 0;

  users.forEach(u => {
    if (!grouped[u.destinationLocation]) {
      grouped[u.destinationLocation] = [];
    }
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
.section-title{
  background:#343a40;
  color:white;
  padding:10px;
  border-radius:6px;
}
table{
  width:100%;
  border-collapse:collapse;
  background:white;
  margin-bottom:25px;
}
th,td{
  border:1px solid #ccc;
  padding:6px;
  font-size:13px;
  text-align:center;
}
th{background:#007bff;color:white}
.sender{background:#e3f2fd}
.receiver{background:#e8f5e9}
.total{background:#212529;color:white;font-weight:bold}
.logout{text-align:center;margin-bottom:15px}
@media(max-width:768px){
  table,thead,tbody,tr,td,th{font-size:11px}
}
</style>
</head>
<body>

<h2>📋 Liste des transferts</h2>
<div class="logout">
  <a href="/logout/list">🚪 Déconnexion</a>
</div>
`;

  for (const destination in grouped) {
    let dAmount = 0;
    let dRecovery = 0;
    let dFees = 0;

    html += `
<div class="section">
<div class="section-title">🌍 Destination : ${destination}</div>
<table>
<tr>
<th colspan="8">EXPÉDITEUR</th>
<th colspan="7">DESTINATAIRE</th>
<th>Date</th>
</tr>
<tr>
<th>Prénom</th>
<th>Nom</th>
<th>Tél</th>
<th>Origine</th>
<th>Montant</th>
<th>Frais</th>
<th>%</th>
<th>Code</th>

<th>Prénom</th>
<th>Nom</th>
<th>Tél</th>
<th>Destination</th>
<th>Reçu</th>
<th>Mode</th>
<th></th>

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
<td class="sender">${u.feePercent}% </td>
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
<td>${dAmount}</td>
<td>${dFees}</td>
<td></td>
<td></td>
<td colspan="4"></td>
<td>${dRecovery}</td>
<td colspan="2"></td>
<td></td>
</tr>
</table>
</div>
`;
  }

  html += `
<div class="section">
<table>
<tr class="total">
<td colspan="4">TOTAL GÉNÉRAL</td>
<td>${totalAmount}</td>
<td>${totalFees}</td>
<td colspan="6"></td>
<td>${totalRecovery}</td>
<td colspan="2"></td>
<td></td>
</tr>
</table>
</div>

</body>
</html>
`;

  res.send(html);
});

/* ================= AUTH ================= */
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
app.listen(PORT, () =>
  console.log('🚀 Serveur lancé sur le port', PORT)
);
