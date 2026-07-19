# Guia de Uso — Sistema Chamador de Senhas

## Visão geral

A aplicação gerencia filas de atendimento com quatro interfaces:

| Interface | URL | Acesso |
|---|---|---|
| Totem | `/kiosk/unidade-principal` | Público |
| Painel público | `/display/unidade-principal` | Público |
| Atendente | `/attendant` | Login obrigatório |
| Administração | `/admin` | Admin |

## 1. Totem de autoatendimento

O totem permite que o cidadão retire uma senha sem informar dados pessoais.

### Fluxo

1. Acesse `/kiosk/unidade-principal`
2. Toque no serviço desejado (ex: **Atendimento Geral**)
3. Escolha o tipo: **Normal** ou **Prioritário**
4. Toque em **Emitir minha senha**

### Confirmação

A tela seguinte mostra:
- Código da senha (ex: `N0001` ou `P0001`)
- Serviço e tipo de atendimento
- Data e hora da emissão (no fuso da unidade)
- Botão **Ver comprovante** para imprimir

### Comprovante

A página de comprovante possui CSS específico para impressão em papel de 80 mm. Use o botão **Imprimir** ou `Ctrl+P` no navegador.

### Retry e idempotência

Se a rede falhar, o botão muda para **Tentar novamente**. O totem reenvia a mesma chave (`client_request_id`), e o servidor retorna a senha original sem consumir uma nova sequência.

---

## 2. Painel do atendente

Requer autenticação. O atendente só opera na unidade à qual está vinculado.

### Login

Acesse `/attendant`. Se não estiver autenticado, será redirecionado ao login.

Credenciais padrão de demonstração:

| Papel | E-mail | Senha |
|---|---|---|
| Administrador | `admin@example.test` | `SenhaDemo!123` |
| Atendente | `atendente@example.test` | `SenhaDemo!123` |

### Posto de trabalho

1. Selecione um **guichê** na lista suspensa
2. O serviço associado ao guichê é selecionado automaticamente
3. O painel mostra a contagem de senhas **normais** e **prioritárias** aguardando

### Chamar próxima senha

Toque em **Chamar próxima senha**. O sistema:
- Bloqueia o guichê (impede duas chamadas simultâneas)
- Seleciona a senha mais antiga respeitando a política de prioridade
- Exibe o código e o status **Chamada**

### Operações disponíveis por status

| Status | Ações |
|---|---|
| **Chamada** | Repetir chamada, Iniciar atendimento, Ausência, Retornar p/ fila, Cancelar |
| **Em atendimento** | Finalizar atendimento, Cancelar |
| **Ausente** | Retornar p/ fila, Cancelar |

### Repetir chamada

Atualiza `last_called_at`, transmite novamente ao painel público e registra evento `recalled` sem alterar o status.

### Bloqueio de guichê

Um guichê não pode chamar outra senha enquanto existir um ticket em **Chamada** ou **Em atendimento**. O sistema retorna mensagem de conflito.

### Idempotência

Toda operação envia um `request_id` UUID. Clicar duas vezes não executa a operação duas vezes. Em caso de erro de rede, o mesmo UUID reenvia e obtém o resultado original.

---

## 3. Painel público

Tela cheia para TV, sem necessidade de login.

### Funcionalidades

- **Senha atual** em destaque, com serviço e guichê
- **Últimas 5 chamadas** na lateral
- **Relógio** no fuso da unidade, formato `pt-BR`
- **Indicador de conexão**: Tempo real (Echo ativo) ou Atualização automática (polling)
- **Botão Ativar som**: chime + anúncio de voz opcional

### Conexão e recuperação

- Estado inicial carregado via HTTP
- Atualizações em tempo real via Laravel Reverb (canal `units.{id}.display`)
- Após reconexão, consulta novamente o servidor
- Polling de baixa frequência (padrão 15s) como fallback

### Áudio

- O primeiro áudio exige clique explícito em **Ativar som** (política de autoplay)
- O chime (`chamada.wav`) toca antes do anúncio
- Se `speechSynthesis` estiver disponível, anuncia: *"Senha P zero zero zero um. Dirija-se ao guichê um."*
- Se indisponível, apenas o chime toca

---

## 4. Administração

Acesso exclusivo para usuários com role `admin`.

### Dashboard

Métricas do dia para a unidade selecionada:
- Aguardando normal e prioritário
- Em atendimento
- Concluídos
- Ausentes
- Tempo médio de espera
- Tempo médio de atendimento

### Tickets

Tabela paginada com filtros por unidade, serviço, guichê, status, prioridade e período. Clique em uma senha para ver o histórico completo de eventos.

### CRUD de unidades

Criar, editar e desativar unidades. A desativação não apaga dados históricos.

Campos: nome, slug, timezone (padrão `America/Sao_Paulo`).

### CRUD de serviços

Criar, editar e desativar serviços. Configurar:
- Prefixo normal (padrão `N`)
- Prefixo prioritário (padrão `P`)
- Limite de prioridades consecutivas (padrão `2`)

### CRUD de guichês

Criar, editar e desativar guichês. Associar serviços que o guichê pode atender.

Campos: nome, código (ex: `G01`), unidade.

### CRUD de usuários

Criar, editar e desativar usuários. Atribuir role `admin` ou `attendant`. Atendentes exigem unidade vinculada.

---

## Política de prioridade

Cada serviço possui um `priority_streak_limit`. Com o valor padrão `2`:

1. Existem senhas normais e prioritárias aguardando
2. As duas primeiras chamadas pegam prioritárias
3. A terceira chamada é forçada a pegar uma normal (se existir)
4. Após chamar uma normal, o contador zera e prioritárias voltam a ter preferência
5. Se uma das filas estiver vazia, a outra continua sem restrição

Isso evita que a fila normal sofra starvation (inanição).

---

## Estados da senha

```
waiting  → Aguardando na fila
called   → Chamada no painel
serving  → Em atendimento no guichê
completed → Atendimento concluído
no_show  → Ausente (não compareceu)
cancelled → Cancelada
```

Transições permitidas:

```
waiting → called | cancelled
called  → serving | no_show | waiting | cancelled
serving → completed | cancelled
no_show → waiting | cancelled
```
