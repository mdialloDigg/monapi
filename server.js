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
app.post('/auth/form',(req,res)=>{if(req.body.code==='123')req.session.formAccess=true;res.redirect('/users');});

/* ======================================================
   📞 RECHERCHE PAR TÉLÉPHONE (CRÉATION)
====================================================== */
app.get('/users/lookup',(req,res)=>{
if(!req.session.formAccess)return res.redirect('/users');
res.send(`
<html><body style="text-align:center;padding-top:60px;font-family:Arial;background:#eef2f7">
<h3>📞 Numéro expéditeur</h3>
<form method="post" action="/users/lookup">
<input name="phone" required placeholder="Téléphone"><br><br>
<button>Continuer</button>
</form>
<br>
<a href="/users/edit">✏️ Modifier un transfert existant</a>
</body></html>`);
});
app.post('/users/lookup',async(req,res)=>{
const u=await User.findOne({senderPhone:req.body.phone}).sort({createdAt:-1});
req.session.prefill=u||{senderPhone:req.body.phone};
res.redirect('/users/form');
});

/* ======================================================
   ✏️ RECHERCHE PAR CODE (ÉDITION)
====================================================== */
app.get('/users/edit',(req,res)=>{
if(!req.session.formAccess)return res.redirect('/users');
res.send(`
<html><body style="text-align:center;padding-top:60px;font-family:Arial;background:#f8f9fa">
<h3>✏️ Modifier un transfert</h3>
<form method="post" action="/users/edit">
<input name="code" placeholder="Code de transfert" required><br><br>
<button>Rechercher</button>
</form>
</body></html>`);
});

app.post('/users/edit',async(req,res)=>{
const u=await User.findOne({code:req.body.code});
if(!u)return res.send('<h3 style="text-align:center;color:red">❌ Code introuvable</h3><a href="/users/edit">Retour</a>');
req.session.editId=u._id;
req.session.prefill=u;
res.redirect('/users/form');
});

/* ======================================================
   📝 FORMULAIRE (CRÉATION + ÉDITION)
====================================================== */
app.get('/users/form',(req,res)=>{
if(!req.session.formAccess)return res.redirect('/users');
const u=req.session.prefill||{};
const isEdit=!!req.session.editId;

res.send(`
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:Arial;background:#dde5f0}
form{background:#fff;max-width:950px;margin:20px auto;padding:15px;border-radius:8px}
.container{display:flex;gap:15px;flex-wrap:wrap}
.box{flex:1;min-width:260px;padding:15px;border-radius:6px}
.origin{background:#e3f0ff}.dest{background:#ffe3e3}
input,select,button{width:100%;padding:9px;margin-top:8px}
button{color:#fff;border:none}
#save{background:#007bff}#logout{background:#dc3545}
</style></head><body>

<form id="form">
<h3 style="text-align:center">${isEdit?'✏️ Modifier':'💸 Nouveau'} transfert</h3>

<div class="container">
<div class="box origin">
<h4>📤 Expéditeur</h4>
<input id="senderFirstName" value="${u.senderFirstName||''}" placeholder="Prénom">
<input id="senderLastName" value="${u.senderLastName||''}" placeholder="Nom">
<input id="senderPhone" value="${u.senderPhone||''}" required placeholder="Téléphone">
<select id="originLocation">
<option value="">Origine</option>
${['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne']
.map(o=>`<option ${u.originLocation===o?'selected':''}>${o}</option>`).join('')}
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
<option value="">Destination</option>
${['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne']
.map(d=>`<option ${u.destinationLocation===d?'selected':''}>${d}</option>`).join('')}
</select>
<input id="recoveryAmount" type="number" value="${u.recoveryAmount||''}" placeholder="Montant reçu">
<select id="recoveryMode">
<option value="">Mode retrait</option>
${['Espèces','Orange Money','Wave','MTN Money','Virement bancaire']
.map(m=>`<option ${u.recoveryMode===m?'selected':''}>${m}</option>`).join('')}
</select>
</div>
</div>

<button id="save">${isEdit?'💾 Mettre à jour':'💾 Enregistrer'}</button>
<button type="button" id="logout" onclick="location.href='/logout/form'">🚪 Déconnexion</button>
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
</script>

</body></html>`);
});

/* ================= ENREGISTREMENT ================= */
app.post('/users',async(req,res)=>{
const code=Math.floor(100000+Math.random()*900000).toString();
await new User({...req.body,code}).save();
res.json({message:'✅ Transfert enregistré | Code '+code});
});

/* ================= MISE À JOUR ================= */
app.post('/users/update',async(req,res)=>{
await User.findByIdAndUpdate(req.session.editId,req.body);
req.session.editId=null;
res.json({message:'✏️ Transfert mis à jour'});
});

/* ================= LOGOUT ================= */
app.get('/logout/form',(req,res)=>{
req.session.formAccess=false;
req.session.prefill=null;
req.session.editId=null;
res.redirect('/users');
});

/* ================= SERVER ================= */
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('🚀 Serveur lancé sur le port',PORT));
