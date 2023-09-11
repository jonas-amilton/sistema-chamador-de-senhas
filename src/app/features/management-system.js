// todo: instalar node js

let passwordList = [];

if (localStorage.getItem("database") !== null) {
  let databaseString = localStorage.getItem("database");
  let database = JSON.parse(databaseString);

  for (let i = 0; i < database.length; i++) {
    if (database[i] === "normal") {
      passwordList.push(`NORMAL ${[i]}`);
    } else if (database[i] === "preferencial") {
      passwordList.push(`PREFERENCIAL ${[i]}`);
    } else {
      console.log("cadastre uma senha");
    }
  }
} else {
  alert("Nenhuma senha cadastrada.");
}

console.log(passwordList);

// let fakeDb = [1, 2, 3, 4, 5];

let currentIndex = 0; // Variável para rastrear o índice atual no array fakeDb

// Função que preenche um número com zeros à esquerda para atingir o tamanho desejado
function select(currentPassword, size) {
  let password = currentPassword + "";

  while (password.length < size) {
    password = "0" + password;
  }

  return password;
}

// Espera até que o DOM esteja completamente carregado para executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Obtém elementos do DOM necessários
  let ultimaSenha = document.getElementById("ultimaSenhaNumero");

  callPassword(ultimaSenha);
});

function callPassword(passwordCall) {
  // Adiciona um ouvinte de evento ao botão "Normal"
  document
    .getElementById("proximaNormal")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let ultimaSenha = document.getElementById("senhaAnterior");
      let audioChamada = document.getElementById("audioChamada");

      // Verifica se há senhas restantes no array fakeDb
      if (currentIndex < passwordList.length) {
        // Obtém a próxima senha do array
        let senha = passwordList[currentIndex];

        // Atualiza as senhas nos elementos do DOM
        passwordCall.innerHTML = senhaAtual.innerHTML;
        senhaAtual.innerHTML = select(senha, 4);
        ultimaSenha.value = select(senha, 4);

        // Incrementa o índice para a próxima chamada
        currentIndex++;

        // Reproduz o áudio de chamada
        audioChamada.play();
      } else {
        // Caso não haja mais senhas no array, você pode exibir uma mensagem ou tomar alguma ação apropriada.
        alert("Não há mais senhas disponíveis.");
      }
    });

  // Adiciona um ouvinte de evento ao botão "Anterior Normal"
  document
    .getElementById("anteriorNormal")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let ultimaSenha = document.getElementById("senhaAnterior");

      // Verifica se é possível voltar para uma senha anterior
      if (currentIndex > 0) {
        // Obtém a senha anterior do array
        currentIndex--;
        let senha = passwordList[currentIndex];

        // Atualiza as senhas nos elementos do DOM
        passwordCall.innerHTML = senhaAtual.innerHTML;
        senhaAtual.innerHTML = select(senha, 4);
        ultimaSenha.value = select(senha, 4);
      } else {
        // Caso não haja senhas anteriores, você pode exibir uma mensagem ou tomar alguma ação apropriada.
        alert("Não há mais senhas anteriores.");
      }
    });
}
