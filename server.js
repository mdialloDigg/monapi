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
/* (inchangé — identique à ta version précédente) */

/* ======================================================
   📋 LISTE DES TRANSFERTS — GROUPÉE PAR DESTINATION
====================================================== */
app.get('/users/all', async (req, res) => {
  if (!req.session.listAccess) {
    return res.send(`
      <h2 style="text-align:center;margin-top:60px">🔒 Accès liste</h2>
      <form method="post" action="/auth/list" style="text-align:center">
        <input type="password" name="code" placeholder="Code d'accès" required>
        <br><br>
        <button>Valider</button>
      </form>
    `);
  }

  const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });

  /* ===== GROUPEMENT PAR DESTINATION ===== */
  const grouped = {};
  let grandTotalAmount = 0;
  let grandTotalRecovery = 0;

  users.forEach(u => {
    if (!grouped[u.destinationLocation]) {
      grouped[u.destinationLocation] = [];
    }
    grouped[u.destinationLocation].push(u);

    grandTotalAmount += u.amount;
    grandTotalRecovery += u.recoveryAmount;
  });

  let html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Liste des transferts</title>
<style>
body{font-family:Arial;background:#f4f6f9}
table{width:98%;margin:20px auto;border-collapse:collapse;background:#fff}
th,td{border:1px solid #ccc;padding:6px;font-size:13px;text-align:center}
th{background:#007bff;color:#fff}
.origin{background:#eef4ff;font-weight:bold}
.destination{background:#ecfff1;font-weight:bold}
.total{background:#222;color:#fff;font-weight:bold}
.section-title{
  width:98%;
  margin:30px auto 5px;
  padding:10px;
  background:#343a40;
  color:#fff;
  font-size:18px;
  border-radius:4px;
}
.logout{text-align:center;margin:10px}
</style>
</head>
<body>

<h2 style="text-align:center">📋 Liste des transferts par destination</h2>
<div class="logout">
  <a href="/logout/list">🚪 Se déconnecter</a>
</div>
`;

  /* ===== AFFICHAGE PAR DESTINATION ===== */
  for (const destination in grouped) {
    let totalAmount = 0;
    let totalRecovery = 0;

    grouped[destination].forEach(u => {
      totalAmount += u.amount;
      totalRecovery += u.recoveryAmount;
    });

    html += `
<div class="section-title">🌍 Destination : ${destination}</div>

<table>
<tr>
<th colspan="7">EXPÉDITEUR</th>
<th colspan="6">DESTINATAIRE</th>
<th>Date</th>
</tr>
<tr>
<th>Prénom</th><th>Nom</th><th>Tél</th><th>Origine</th>
<th>Montant</th><th>Frais</th><th>Code</th>
<th>Prénom</th><th>Nom</th><th>Tél</th>
<th>Destination</th><th>Reçu</th><th>Mode</th>
<th></th>
</tr>
`;

    grouped[destination].forEach(u => {
      html += `
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
</tr>
`;
    });

    html += `
<tr class="total">
<td colspan="4">TOTAL ${destination}</td>
<td>${totalAmount}</td>
<td colspan="6"></td>
<td>${totalRecovery}</td>
<td colspan="2"></td>
</tr>
</table>
`;
  }

  /* ===== TOTAL GÉNÉRAL ===== */
  html += `
<table>
<tr class="total">
<td colspan="4">TOTAL GÉNÉRAL</td>
<td>${grandTotalAmount}</td>
<td colspan="6"></td>
<td>${grandTotalRecovery}</td>
<td colspan="2"></td>
</tr>
</table>

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

/* ================= LOGOUT ================= */
app.get('/logout/list', (req, res) => {
  req.session.listAccess = false;
  res.redirect('/users/all');
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log('🚀 Serveur lancé sur le port', PORT)
);
