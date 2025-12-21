async function retirer(id,row){
  if(row.classList.contains('retiré')) return;

  const div = document.createElement('div');
  div.style.position='fixed';
  div.style.top='0'; div.style.left='0';
  div.style.width='100%'; div.style.height='100%';
  div.style.backgroundColor='rgba(0,0,0,0.5)';
  div.style.display='flex';
  div.style.justifyContent='center';
  div.style.alignItems='center';
  div.style.zIndex=9999;

  const selDiv = document.createElement('div');
  selDiv.style.background='#fff';
  selDiv.style.padding='20px';
  selDiv.style.borderRadius='8px';
  selDiv.innerHTML = `
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

    row.classList.add('retiré');
    row.cells[8].innerText = data.recoveryAmount;
    row.cells[11].innerText = "Montant retiré";
  }
}
