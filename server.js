/* ================= RETRAIT ================= */
app.post('/users/retirer', async (req,res)=>{
  const {id,mode}=req.body;
  if(!["Espèces","Orange Money","Produit","Service"].includes(mode)) 
    return res.status(400).json({message:"Mode invalide"});
  await User.findByIdAndUpdate(id,{
    recoveryMode: mode,
    $push:{retraitHistory:{date:new Date(),mode}}
  });
  res.json({message:`💰 Retrait effectué via ${mode}`});
});

/* ================= LISTE DES TRANSFERTS ================= */
app.get('/users/all', async (req,res)=>{
  if(!req.session.listAccess) return res.redirect('/auth/list');

  const users = await User.find({}).sort({ destinationLocation:1, createdAt:1 });
  const grouped = {};
  let totalAmount=0, totalRecovery=0, totalFees=0;

  users.forEach(u=>{
    if(!grouped[u.destinationLocation]) grouped[u.destinationLocation]=[];
    grouped[u.destinationLocation].push(u);
    totalAmount += (u.amount||0);
    totalRecovery += (u.recoveryAmount||0);
    totalFees += (u.fees||0);
  });

  let html = `<html><head>
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
button.retirer,button.export{padding:5px 10px;border:none;border-radius:4px;cursor:pointer}
button.retirer{background:#28a745;color:#fff} 
button.export{background:#007bff;color:#fff;margin:5px}
select{padding:4px;font-size:13px}
@media(max-width:600px){table,th,td{font-size:12px;padding:4px}}
</style></head><body>
<h2>📋 Liste de tous les transferts groupés par destination</h2>
<button class="export" onclick="exportPDF()">📄 Export PDF</button>
<br><center><button id="logoutBtn">🚪 Déconnexion</button></center>
<script>
document.getElementById('logoutBtn').onclick = () => fetch('/logout/list').then(()=>location.href='/users/all');
function exportPDF(){window.open("/users/export/pdf","_blank")}

async function retirer(id,row){
  // créer div modal
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top='0'; div.style.left='0';
  div.style.width='100%'; div.style.height='100%';
  div.style.backgroundColor='rgba(0,0,0,0.5)';
  div.style.display='flex'; div.style.justifyContent='center'; div.style.alignItems='center';
  div.style.zIndex=9999;

  const selDiv = document.createElement('div');
  selDiv.style.background='#fff';
  selDiv.style.padding='20px';
  selDiv.style.borderRadius='8px';
  selDiv.innerHTML=`
    <h3>Mode de retrait</h3>
    <select id="modeSelect">
      <option value="">-- Choisir --</option>
      <option value="Espèces">Espèces</option>
      <option value="Orange Money">Orange Money</option>
      <option value="Produit">Produit</option>
      <option value="Service">Service</option>
    </select>
    <br><br>
    <button id="confirmRetrait">Valider</button>
    <button id="cancelRetrait">Annuler</button>
  `;
  div.appendChild(selDiv);
  document.body.appendChild(div);

  document.getElementById('cancelRetrait').onclick = () => div.remove();
  document.getElementById('confirmRetrait').onclick = async () => {
    const mode = document.getElementById('modeSelect').value;
    if(!mode){ alert('Veuillez choisir un mode !'); return; }
    const res = await fetch("/users/retirer", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({id, mode})
    });
    const data = await res.json();
    alert(data.message);
    div.remove();
    // changer couleur ligne + mettre montant reçu
    row.style.backgroundColor='orange';
    row.cells[8].innerText = row.cells[3].innerText - row.cells[4].innerText;
  }
}
</script>`;

  for(let dest in grouped){
    const list = grouped[dest];
    let subAmount=0, subRecovery=0, subFees=0;
    html += `<h3>Destination: ${dest}</h3>
<table>
<tr>
<th>Expéditeur</th><th>Tél</th><th>Origine</th>
<th>Montant</th><th>Frais</th>
<th>Destinataire</th><th>Tél Dest.</th><th>Destination</th>
<th>Montant reçu</th><th>Code</th><th>Date</th><th>Action</th>
</tr>`;
    list.forEach(u=>{
      subAmount += (u.amount||0); subRecovery += (u.recoveryAmount||0); subFees += (u.fees||0);
      html+=`<tr>
<td>${u.senderFirstName||''} ${u.senderLastName||''}</td>
<td>${u.senderPhone||''}</td>
<td class="origin">${u.originLocation||''}</td>
<td>${u.amount||0}</td>
<td>${u.fees||0}</td>
<td>${u.receiverFirstName||''} ${u.receiverLastName||''}</td>
<td>${u.receiverPhone||''}</td>
<td class="dest">${u.destinationLocation||''}</td>
<td>${u.recoveryAmount||0}</td>
<td>${u.code||''}</td>
<td>${u.createdAt?new Date(u.createdAt).toLocaleString():''}</td>
<td><button class="retirer" onclick="retirer('${u._id}', this.parentNode)">💰 Retirer</button></td>
</tr>`;
    });
    html+=`<tr class="sub">
<td colspan="3">Sous-total ${dest}</td>
<td>${subAmount}</td><td>${subFees}</td>
<td colspan="2"></td><td></td>
<td>${subRecovery}</td><td colspan="2"></td><td></td>
</tr></table>`;
  }

  html+=`<table><tr class="total">
<td colspan="3">TOTAL GÉNÉRAL</td>
<td>${totalAmount}</td><td>${totalFees}</td>
<td colspan="2"></td><td></td>
<td>${totalRecovery}</td><td colspan="2"></td><td></td>
</tr></table></body></html>`;
  res.send(html);
});
