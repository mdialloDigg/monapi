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

  // Récupérer tous les transferts, sans filtre sur "status"
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
