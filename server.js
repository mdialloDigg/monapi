<script>
let lastCode = '';

document.getElementById('form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const payload = {
    senderFirstName: senderFirstName.value,
    senderLastName: senderLastName.value,
    senderPhone: senderPhone.value,
    originLocation: originLocation.value,
    amount: Number(amount.value),
    fees: Number(fees.value),
    feePercent: Number(feePercent.value),
    receiverFirstName: receiverFirstName.value,
    receiverLastName: receiverLastName.value,
    receiverPhone: receiverPhone.value,
    destinationLocation: destinationLocation.value,
    recoveryAmount: Number(recoveryAmount.value),
    recoveryMode: recoveryMode.value,
    password: password.value
  };

  const res = await fetch('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();

  message.style.color = res.ok ? 'green' : 'red';
  message.innerText = data.message + ' | Code: ' + data.code;

  if (res.ok) {
    lastCode = data.code;
  }
});

/* ====== IMPRESSION SANS BUG ====== */
function printReceipt() {
  if (!lastCode) {
    alert("Veuillez d'abord enregistrer le transfert");
    return;
  }

  const printWindow = window.open('', '', 'width=400,height=400');

  printWindow.document.write(
    '<html><head><title>Reçu</title></head><body>' +
    '<h2>📄 Reçu de transfert</h2>' +
    '<p><strong>Code :</strong> ' + lastCode + '</p>' +
    '<p><strong>Destinataire :</strong> ' +
      receiverFirstName.value + ' ' + receiverLastName.value + '</p>' +
    '<p><strong>Destination :</strong> ' + destinationLocation.value + '</p>' +
    '</body></html>'
  );

  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
</script>
