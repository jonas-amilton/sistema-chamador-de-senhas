// Função para preencher um número com zeros à esquerda até atingir um determinado tamanho
function pad(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

// Quando o documento estiver pronto (carregado), executar as seguintes instruções
jQuery(document).ready(function ($) {

  // Selecionar elementos DOM relevantes
  var ultimaSenhaNormal = $("#ultimaSenhaNumero");
  var ultimaSenhaPreferencial = $("#ultimaSenhaNumeroPreferencial");

  // Ao clicar no botão "Direita"
  $("#botaoDireita").on("click", function () {
    var senhaAtual = $("#senhaAtualNumero");
    var senhaNormal = $("#senhaNormal");
    var audioChamada = $("#audioChamada");

    // Atualizar a última senha normal exibida
    ultimaSenhaNormal.html(senhaAtual.html());

    // Incrementar a senha normal e atualizar elementos relacionados
    senha = parseInt(senhaNormal.val()) + 1;
    senhaAtual.html(pad(senha, 4));
    senhaNormal.val(pad(senha, 4));

    // Acionar a reprodução do áudio de chamada
    audioChamada.trigger("play");
  });

  // Ao clicar no botão "Esquerda"
  $("#botaoEsquerda").on("click", function () {
    var senhaAtual = $("#senhaAtualNumero");
    var senhaNormal = $("#senhaNormal");

    // Atualizar a última senha normal exibida
    ultimaSenhaNormal.html(senhaAtual.html());

    // Decrementar a senha normal e atualizar elementos relacionados
    senha = parseInt(senhaNormal.val()) - 1;
    senhaAtual.html(pad(senha, 4));
    senhaNormal.val(pad(senha, 4));
  });

  // Ao clicar no botão "Cima"
  $("#botaoCima").on("click", function () {
    var senhaAtual = $("#senhaAtualNumero");
    var senhaPrior = $("#senhaPrioridade");
    var audioChamada = $("#audioChamada");

    // Atualizar a última senha preferencial exibida
    ultimaSenhaPreferencial.html(senhaAtual.html());

    // Incrementar a senha de prioridade e atualizar elementos relacionados
    senha = parseInt(senhaPrior.val().replace("P", "")) + 1;
    senhaAtual.html("P" + pad(senha, 3));
    senhaPrior.val("P" + pad(senha, 3));

    // Acionar a reprodução do áudio de chamada
    audioChamada.trigger("play");
  });

  // Ao clicar no botão "Baixo"
  $("#botaoBaixo").on("click", function () {
    var senhaAtual = $("#senhaAtualNumero");
    var senhaPrior = $("#senhaPrioridade");
    var proximaSenha = $("#proximaSenhaNumero");

    // Atualizar a última senha preferencial exibida
    ultimaSenhaPreferencial.html(senhaAtual.html());

    // Decrementar a senha de prioridade e atualizar elementos relacionados
    senha = parseInt(senhaPrior.val().replace("P", "")) - 1;
    senhaAtual.html("P" + pad(senha, 3));
    senhaPrior.val("P" + pad(senha, 3));

    // Atualizar a próxima senha normal
    proximaSenha.html(pad(parseInt(senhaNormal.val()) + 1, 4));
  });
});
