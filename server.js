app.get('/users/all', async (req, res) => {
  const users = await User.find({}, { password: 0 });

  let html = `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
  <meta charset="UTF-8">
  <title>Liste des transferts</title>
  <style>
    body { font-family: Arial; background:#f4f4f4; }
    table { width:98%; margin:30px auto; border-collapse:collapse; background:#fff; }
    th, td { border:1px solid #ccc; padding:8px; font-size:13px; text-align:center; }
    th { background:#007bff; color:#fff; }
    .exp { background:#e9f1ff; }       /* bleu clair pour expéditeur */
    .dest { background:#ffd6d6; }      /* rose clair pour destinataire */
  </style>
  </head>
  <body>
  <h2 style="text-align:center;">📋 Liste des transferts</h2>

  <table>
  <tr>
    <th colspan="7" class="exp">EXPÉDITEUR</th>
    <th colspan="6" class="dest">DESTINATAIRE</th>
    <th>Date</th>
  </tr>
  <tr>
    <th>Prénom</th><th>Nom</th><th>Tél</th><th>Pays départ</th><th>Montant</th><th>Frais</th><th>Code</th>
    <th>Prénom</th><th>Nom</th><th>Tél</th><th>Pays destination</th><th>Montant reçu</th><th>Mode</th>
    <th></th>
  </tr>`;

  users.forEach(u => {
    html += `
    <tr>
      <td>${u.senderFirstName}</td>
      <td>${u.senderLastName}</td>
      <td>${u.senderPhone}</td>
      <td>${u.originLocation}</td>
      <td>${u.amount}</td>
      <td>${u.fees}</td>
      <td>${u.code}</td>

      <td>${u.receiverFirstName}</td>
      <td>${u.receiverLastName}</td>
      <td>${u.receiverPhone}</td>
      <td>${u.destinationLocation}</td>
      <td>${u.recoveryAmount}</td>
      <td>${u.recoveryMode}</td>

      <td>${new Date(u.createdAt).toLocaleString()}</td>
    </tr>`;
  });

  html += `</table></body></html>`;
  res.send(html);
});
