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
input,select,button{width:100%;padding:8px;margin-top:8px}
button{border:none;color:#fff;font-size:15px}
#save{background:#007bff}
#print{background:#28a745}
#logout{background:#dc3545}
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

<input id="amount" type="number" placeholder="Montant" required>
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
recoveryMode:recoveryMode.value
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
  await new User({...req.body,code}).save();
  res.json({message:'✅ Transfert enregistré',code});
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

/* ================= LISTE ================= */
app.get('/users/all', async (req,res)=>{
  if(!req.session.listAccess){
    return res.send(`<form method="post" action="/auth/list" style="text-align:center;margin-top:60px">
<input type="password" name="code" placeholder="Code d'accès" required><br><br><button>Valider</button></form>`);
  }

  const users = await User.find({}, {__v:0});
  const grouped={}; let ta=0,tr=0;
  users.forEach(u=>{
    grouped[u.destinationLocation]=grouped[u.destinationLocation]||[];
    grouped[u.destinationLocation].push(u);
    ta+=u.amount; tr+=u.recoveryAmount;
  });

  let html='<h2 style="text-align:center">📋 Transferts par destination</h2><div style="text-align:center"><a href="/logout/list">🚪 Déconnexion</a></div>';
  for(const d in grouped){
    let a=0,r=0;
    html+=`<h3 style="margin-left:20px">${d}</h3><table border="1" width="98%" style="margin:auto">`;
    grouped[d].forEach(u=>{
      a+=u.amount; r+=u.recoveryAmount;
      html+=`<tr><td>${u.senderFirstName}</td><td>${u.receiverFirstName}</td><td>${u.amount}</td><td>${u.recoveryAmount}</td></tr>`;
    });
    html+=`<tr><td colspan="2">TOTAL</td><td>${a}</td><td>${r}</td></tr></table>`;
  }
  html+=`<h3 style="text-align:center">TOTAL GÉNÉRAL : ${ta} / ${tr}</h3>`;
  res.send(html);
});

/* ================= LOGOUT ================= */
app.get('/logout/form',(req,res)=>{req.session.formAccess=false;res.redirect('/users');});
app.get('/logout/list',(req,res)=>{req.session.listAccess=false;res.redirect('/users/all');});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('🚀 Serveur en ligne sur le port',PORT));
