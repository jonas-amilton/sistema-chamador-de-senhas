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

      console.log(senhaAtual);

      // Atualiza a última senha normal e gera uma nova senha
      passwordCall.innerHTML = senhaAtual.innerHTML;

      let senha = parseInt(ultimaSenha.value) + 1;

      senhaAtual.innerHTML = select(senha, 4);
      ultimaSenha.value = select(senha, 4);

      // Reproduz o áudio de chamada
      audioChamada.play();
    });

  // Adiciona um ouvinte de evento ao botão "Anterior Normal"
  document
    .getElementById("anteriorNormal")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let ultimaSenha = document.getElementById("senhaAnterior");

      // Atualiza a última senha normal e gera uma nova senha decrementada
      passwordCall.innerHTML = senhaAtual.innerHTML;

      let senha = parseInt(ultimaSenha.value) - 1;

      senhaAtual.innerHTML = select(senha, 4);
      ultimaSenha.value = select(senha, 4);
    });
}
