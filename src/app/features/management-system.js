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
  let ultimaSenhaNormal = document.getElementById("ultimaSenhaNumero");
  let ultimaSenhaPreferencial = document.getElementById(
    "ultimaSenhaNumeroPreferencial"
  );

  callNormal(ultimaSenhaNormal);
  callPreferencial(ultimaSenhaPreferencial);
});

function callNormal(passwordCall) {
  // Adiciona um ouvinte de evento ao botão "Normal"
  document
    .getElementById("proximaNormal")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let senhaNormal = document.getElementById("senhaNormal");
      let audioChamada = document.getElementById("audioChamada");

      // Atualiza a última senha normal e gera uma nova senha
      passwordCall.innerHTML = senhaAtual.innerHTML;

      let senha = parseInt(senhaNormal.value) + 1;

      senhaAtual.innerHTML = select(senha, 4);
      senhaNormal.value = select(senha, 4);

      // Reproduz o áudio de chamada
      audioChamada.play();
    });

  // Adiciona um ouvinte de evento ao botão "Anterior Normal"
  document
    .getElementById("anteriorNormal")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let senhaNormal = document.getElementById("senhaNormal");

      // Atualiza a próxima senha normal
      passwordCall.innerHTML = select(
        parseInt(document.getElementById("senhaNormal").value) + 1,
        4
      );

      // Atualiza a última senha normal e gera uma nova senha decrementada
      passwordCall.innerHTML = senhaAtual.innerHTML;
      let senha = parseInt(senhaNormal.value) - 1;
      senhaAtual.innerHTML = select(senha, 4);
      senhaNormal.value = select(senha, 4);
    });
}

function callPreferencial(passwordCall) {
  //Adiciona um ouvinte de evento ao botão "Preferencial"

  document
    .getElementById("proximaPreferencial")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let senhaPrior = document.getElementById("senhaPrioridade");
      let audioChamada = document.getElementById("audioChamada");

      // Atualiza a última senha preferencial e gera uma nova senha de prioridade
      passwordCall.innerHTML = senhaAtual.innerHTML;
      let senha = parseInt(senhaPrior.value.replace("P", "")) + 1;
      senhaAtual.innerHTML = "P" + select(senha, 3);
      senhaPrior.value = "P" + select(senha, 3);

      // Reproduz o áudio de chamada
      audioChamada.play();
    });

  // Adiciona um ouvinte de evento ao botão "Anterior Preferencial"
  document
    .getElementById("anteriorPreferencial")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let senhaPrior = document.getElementById("senhaPrioridade");

      // Atualiza a próxima senha preferencial
      passwordCall.innerHTML = select(
        parseInt(document.getElementById("senhaPrioridade").value) + 1,
        4
      );

      // Atualiza a última senha preferencial e gera uma nova senha de prioridade decrementada
      passwordCall.innerHTML = senhaAtual.innerHTML;
      let senha = parseInt(senhaPrior.value.replace("P", "")) - 1;
      senhaAtual.innerHTML = "P" + select(senha, 3);
      senhaPrior.value = "P" + select(senha, 3);
    });
}
