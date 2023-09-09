// Função que preenche um número com zeros à esquerda para atingir o tamanho desejado
function pad(num, size) {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

// Espera até que o DOM esteja completamente carregado para executar o código
document.addEventListener("DOMContentLoaded", function () {
  // Obtém elementos do DOM necessários
  let ultimaSenhaNormal = document.getElementById("ultimaSenhaNumero");
  let ultimaSenhaPreferencial = document.getElementById(
    "ultimaSenhaNumeroPreferencial"
  );

  // Adiciona um ouvinte de evento ao botão "Normal"
  document
    .getElementById("botaoDireita")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let senhaNormal = document.getElementById("senhaNormal");
      let audioChamada = document.getElementById("audioChamada");

      // Atualiza a última senha normal e gera uma nova senha
      ultimaSenhaNormal.innerHTML = senhaAtual.innerHTML;

      let senha = parseInt(senhaNormal.value) + 1;

      senhaAtual.innerHTML = pad(senha, 4);
      senhaNormal.value = pad(senha, 4);

      // Reproduz o áudio de chamada
      audioChamada.play();
    });

  // Adiciona um ouvinte de evento ao botão "Anterior Normal"
  document
    .getElementById("botaoEsquerda")
    .addEventListener("click", function () {
      // Obtém elementos do DOM necessários para manipulação
      let senhaAtual = document.getElementById("senhaAtualNumero");
      let senhaNormal = document.getElementById("senhaNormal");

      // Atualiza a última senha normal e gera uma nova senha decrementada
      ultimaSenhaNormal.innerHTML = senhaAtual.innerHTML;
      let senha = parseInt(senhaNormal.value) - 1;
      senhaAtual.innerHTML = pad(senha, 4);
      senhaNormal.value = pad(senha, 4);
    });

  // Adiciona um ouvinte de evento ao botão "Preferencial"
  // document.getElementById("botaoCima").addEventListener("click", function () {
  //   // Obtém elementos do DOM necessários para manipulação
  //   let senhaAtual = document.getElementById("senhaAtualNumero");
  //   let senhaPrior = document.getElementById("senhaPrioridade");
  //   let audioChamada = document.getElementById("audioChamada");

  //   // Atualiza a última senha preferencial e gera uma nova senha de prioridade
  //   ultimaSenhaPreferencial.innerHTML = senhaAtual.innerHTML;
  //   let senha = parseInt(senhaPrior.value.replace("P", "")) + 1;
  //   senhaAtual.innerHTML = "P" + pad(senha, 3);
  //   senhaPrior.value = "P" + pad(senha, 3);

  //   // Reproduz o áudio de chamada
  //   audioChamada.play();
  // });

  // // Adiciona um ouvinte de evento ao botão "Anterior Preferencial"
  // document.getElementById("botaoBaixo").addEventListener("click", function () {
  //   // Obtém elementos do DOM necessários para manipulação
  //   let senhaAtual = document.getElementById("senhaAtualNumero");
  //   let senhaPrior = document.getElementById("senhaPrioridade");
  //   let proximaSenha = document.getElementById("proximaSenhaNumero");

  //   // Atualiza a última senha preferencial e gera uma nova senha de prioridade decrementada
  //   ultimaSenhaPreferencial.innerHTML = senhaAtual.innerHTML;
  //   let senha = parseInt(senhaPrior.value.replace("P", "")) - 1;
  //   senhaAtual.innerHTML = "P" + pad(senha, 3);
  //   senhaPrior.value = "P" + pad(senha, 3);

  //   // Atualiza a próxima senha normal
  //   proximaSenha.innerHTML = pad(
  //     parseInt(document.getElementById("senhaNormal").value) + 1,
  //     4
  //   );

  //   // Atualiza a próxima senha preferencial
  //   proximaSenha.innerHTML = pad(
  //     parseInt(document.getElementById("senhaPrioridade").value) + 1,
  //     4
  //   );
  // });
});
