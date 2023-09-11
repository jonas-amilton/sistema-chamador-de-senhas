let database = [];

function addPassword() {

  let newPassword = Number(
    prompt(
      "DIGITE O NUMERO PARA RETIRAR SUA SENHA \n \n 1) Normal \n 2) Preferencial"
    )
  );

  if (newPassword === 1) {
    let normal = {
      password: 'Normal',
    };

    database.push(normal);

  } else if (newPassword === 2) {
    let preferencial = {
      password: 'Preferencial',
    };

    database.push(preferencial);

  }else{
    alert('Operação Cancelada')
  }

  console.log(database);

  // Convertendo o objeto JavaScript em uma string JSON
  let databaseLocalStorage = JSON.stringify(database);

  // Armazenando a string JSON no localStorage
  localStorage.setItem('database', databaseLocalStorage);

}

