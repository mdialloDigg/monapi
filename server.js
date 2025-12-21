app.get('/users/form', (req,res)=>{
  if(!req.session.formAccess) return res.redirect('/users');
  const u=req.session.prefill||{};
  const isEdit=!!req.session.editId;
  const locations=['France','Labé','Belgique','Conakry','Suisse','Atlanta','New York','Allemagne'];

  res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{
  font-family:Arial;
  background:#f2f4f8;
  margin:0;
  padding:0
}
form{
  background:#fff;
  max-width:500px;
  margin:10px auto;
  padding:15px;
  border-radius:10px;
}
h3{text-align:center}
label{font-weight:bold;font-size:14px}
input,select,button{
  width:100%;
  padding:12px;
  margin-top:6px;
  margin-bottom:12px;
  font-size:16px;
  border-radius:6px;
  border:1px solid #ccc;
}
button{
  border:none;
  color:white;
  font-size:16px;
}
#save{background:#007bff}
#logout{background:#6c757d}
.box{background:#eef3ff;padding:10px;border-radius:8px;margin-bottom:15px}
.orange{background:#ffe5cc}
</style>
</head>
<body>

<form id="form">
<h3>${isEdit?'✏️ Modifier transfert':'💸 Nouveau transfert'}</h3>

<div class="box">
<label>📤 Expéditeur</label>
<input id="senderFirstName" value="${u.senderFirstName||''}" placeholder="Prénom">
<input id="senderLastName" value="${u.senderLastName||''}" placeholder="Nom">
<input id="senderPhone" value="${u.senderPhone||''}" placeholder="Téléphone" required>
<select id="originLocation">${locations.map(v=>`<option ${u.originLocation===v?'selected':''}>${v}</option>`).join('')}</select>
</div>

<div class="box">
<label>💰 Montant</label>
<input id="amount" type="number" value="${u.amount||''}" placeholder="Montant envoyé">
<input id="feePercent" type="number" value="${u.feePercent||''}" placeholder="% Frais">
<input id="fees" type="number" value="${u.fees||''}" placeholder="Frais calculés" readonly>
</div>

<div class="box orange">
<label>📥 Destinataire</label>
<input id="receiverFirstName" value="${u.receiverFirstName||''}" placeholder="Prénom">
<input id="receiverLastName" value="${u.receiverLastName||''}" placeholder="Nom">
<input id="receiverPhone" value="${u.receiverPhone||''}" placeholder="Téléphone">
<select id="destinationLocation">${locations.map(v=>`<option ${u.destinationLocation===v?'selected':''}>${v}</option>`).join('')}</select>
<input id="recoveryAmount" type="number" value="${u.recoveryAmount||''}" placeholder="Montant reçu" readonly>
</div>

<button id="save">${isEdit?'💾 Mettre à jour':'💾 Enregistrer'}</button>
<button type="button" id="logout" onclick="location.href='/logout/form'">🚪 Déconnexion</button>

<p id="message"></p>
</form>

<script>
function calculer(){
  const montant = parseFloat(amount.value)||0;
  const percent = parseFloat(feePercent.value)||0;
  const frais = montant * percent / 100;
  fees.value = frais.toFixed(2);
  recoveryAmount.value = (montant - frais).toFixed(2);
}

amount.oninput = calculer;
feePercent.oninput = calculer;

form.onsubmit = async e=>{
  e.preventDefault();
  const url='${isEdit?'/users/update':'/users'}';
  const r=await fetch(url,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      senderFirstName:senderFirstName.value,
      senderLastName:senderLastName.value,
      senderPhone:senderPhone.value,
      originLocation:originLocation.value,
      amount:+amount.value,
      feePercent:+feePercent.value,
      fees:+fees.value,
      receiverFirstName:receiverFirstName.value,
      receiverLastName:receiverLastName.value,
      receiverPhone:receiverPhone.value,
      destinationLocation:destinationLocation.value,
      recoveryAmount:+recoveryAmount.value
    })
  });
  const d=await r.json();
  message.innerText=d.message;
};
</script>

</body>
</html>`);
});
