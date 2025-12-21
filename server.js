/* ================= IMPORTS ================= */
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

/* ================= LISTE DES TRANSFERTS ================= */
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

  const users = await User.find({}).sort({ destinationLocation: 1, createdAt: 1 });

  const grouped = {};
  let totalAmount = 0, totalRecovery = 0, totalFees = 0;

  users.forEach(u => {
    if (!grouped[u.destinationLocation]) grouped[u.destinationLocation] = [];
    grouped[u.destinationLocation].push(u);

    totalAmount += u.amount || 0;
    totalRecovery += u.recoveryAmount || 0;
    totalFees += u.fees || 0;
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
button.retirer{padding:5px 10px;background:#28a745;color:#fff;border:none;border-radius:4px;cursor:pointer}
</style>
</head>
<body>
<h2>📋 Liste de tous les transferts groupés par destination</h2>
<script>
async function retirer(id){
  let mode = prompt("Mode de retrait : Espèces, Orange Money, Produit, Service");
  if(!mode) return;
  mode = mode.trim();
  if(!["Espèces","Orange Money","Produit","Service"].includes(mode)){
    alert("Mode invalide !");
    return;
  }
  const res = await fetch("/users/retirer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id, mode})});
  const data = await res.json();
  alert(data.message);
  location.reload();
}
</script>
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
<th>Montant reçu</th><th>Code</th><th>Date</th><th>Action</th>
</tr>`;

    list.forEach(u => {
      subAmount += u.amount || 0;
      subRecovery += u.recoveryAmount || 0;
      subFees += u.fees || 0;

      html += `<tr>
<td>${u.senderFirstName || ''} ${u.senderLastName || ''}</td>
<td>${u.senderPhone || ''}</td>
<td class="origin">${u.originLocation || ''}</td>
<td>${u.amount || 0}</td>
<td>${u.fees || 0}</td>
<td>${u.receiverFirstName || ''} ${u.receiverLastName || ''}</td>
<td>${u.receiverPhone || ''}</td>
<td class="dest">${u.destinationLocation || ''}</td>
<td>${u.recoveryAmount || 0}</td>
<td>${u.code || ''}</td>
<td>${u.createdAt ? new Date(u.createdAt).toLocaleString() : ''}</td>
<td><button class="retirer" onclick="retirer('${u._id}')">💰 Retirer</button></td>
</tr>`;
    });

    html += `<tr class="sub">
<td colspan="3">Sous-total ${dest}</td>
<td>${subAmount}</td><td>${subFees}</td>
<td colspan="2"></td><td></td>
<td>${subRecovery}</td><td colspan="2"></td><td></td>
</tr></table>`;
  }

  html += `<table><tr class="total">
<td colspan="3">TOTAL GÉNÉRAL</td>
<td>${totalAmount}</td>
<td>${totalFees}</td>
<td colspan="2"></td><td></td>
<td>${totalRecovery}</td><td colspan="2"></td><td></td>
</tr></table>
<br><center><a href="/logout/list">🚪 Déconnexion</a></center>
</body></html>`;

  res.send(html);
});

// Endpoint retirer
app.post('/users/retirer', async (req, res) => {
  const { id, mode } = req.body;
  if (!["Espèces","Orange Money","Produit","Service"].includes(mode)) {
    return res.status(400).json({ message: "Mode invalide" });
  }
  await User.findByIdAndUpdate(id, { recoveryMode: mode });
  res.json({ message: `💰 Retrait effectué via ${mode}` });
});

/* ================= AUTRES ROUTES ET LOGIN ================= */
// Code 147 pour liste
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
