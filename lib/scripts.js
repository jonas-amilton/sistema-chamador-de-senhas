function pad(num, size) {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  }
  
  jQuery(document).ready(function ($) {
    var ultimaSenhaNormal = $("#ultimaSenhaNumero");
    var ultimaSenhaPreferencial = $("#ultimaSenhaNumeroPreferencial");
  
    $("#botaoDireita").on("click", function () {
      var senhaAtual = $("#senhaAtualNumero");
      var senhaNormal = $("#senhaNormal");
      var audioChamada = $("#audioChamada");
  
      ultimaSenhaNormal.html(senhaAtual.html());
      senha = parseInt(senhaNormal.val()) + 1;
      senhaAtual.html(pad(senha, 4));
      senhaNormal.val(pad(senha, 4));
      audioChamada.trigger("play");
    });
  
    $("#botaoEsquerda").on("click", function () {
      var senhaAtual = $("#senhaAtualNumero");
      var senhaNormal = $("#senhaNormal");
  
      ultimaSenhaNormal.html(senhaAtual.html());
      senha = parseInt(senhaNormal.val()) - 1;
      senhaAtual.html(pad(senha, 4));
      senhaNormal.val(pad(senha, 4));
    });
  
    $("#botaoCima").on("click", function () {
      var senhaAtual = $("#senhaAtualNumero");
      var senhaPrior = $("#senhaPrioridade");
      var audioChamada = $("#audioChamada");
  
      ultimaSenhaPreferencial.html(senhaAtual.html());
      senha = parseInt(senhaPrior.val().replace("P", "")) + 1;
      senhaAtual.html("P" + pad(senha, 3));
      senhaPrior.val("P" + pad(senha, 3));
      audioChamada.trigger("play");
    });
  
    $("#botaoBaixo").on("click", function () {
      var senhaAtual = $("#senhaAtualNumero");
      var senhaPrior = $("#senhaPrioridade");
      var proximaSenha = $("#proximaSenhaNumero");
  
      ultimaSenhaPreferencial.html(senhaAtual.html());
      senha = parseInt(senhaPrior.val().replace("P", "")) - 1;
      senhaAtual.html("P" + pad(senha, 3));
      senhaPrior.val("P" + pad(senha, 3));
      proximaSenha.html(pad(parseInt(senhaNormal.val()) + 1, 4));
    });
  });
  