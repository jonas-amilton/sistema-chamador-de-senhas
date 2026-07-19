# Guia de Desenvolvimento — Sistema Chamador de Senhas

## Requisitos

- PHP 8.3+ com extensões: `pdo_mysql`, `pdo_sqlite`, `mbstring`, `openssl`, `pcntl`
- Composer 2
- Node.js 22+ e npm
- MySQL 8 para desenvolvimento e produção. MariaDB compatível.

## Primeira execução

```bash
git clone https://github.com/jonas-amilton/sistema-chamador-de-senhas.git
cd sistema-chamador-de-senhas
composer install
npm ci
cp .env.example .env
php artisan key:generate
```

Crie o banco. O nome contém hífens, use crases:

```sql
CREATE DATABASE `chamador-senhas-mvp`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
```

Configure o `.env` com suas credenciais locais:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=chamador-senhas-mvp
DB_USERNAME=seu_usuario
DB_PASSWORD=sua_senha
```

Execute migrações e seeders:

```bash
php artisan migrate
php artisan db:seed
```

Build do frontend:

```bash
npm run build
```

## Ambiente de desenvolvimento

O comando principal inicia todos os processos:

```bash
composer run dev
```

Isso executa, via `php artisan dev`:

| Processo | Comando |
|---|---|
| Servidor HTTP | `php artisan serve --host=localhost` |
| Vite | `npm run dev` |
| Queue worker | `php artisan queue:listen --tries=3 --timeout=0` |
| Reverb | `php artisan reverb:start` |
| Logs | `php artisan pail --timeout=0` (requer `pcntl`) |

Para diagnóstico, execute os processos separadamente:

```bash
# Terminal 1
php artisan serve

# Terminal 2
npm run dev

# Terminal 3
php artisan queue:work --tries=3 --backoff=1,5,15

# Terminal 4
php artisan reverb:start
```

## URLs locais

| Interface | URL |
|---|---|
| Totem | `http://localhost:8000/kiosk/unidade-principal` |
| Painel público | `http://localhost:8000/display/unidade-principal` |
| Atendente | `http://localhost:8000/attendant` |
| Administração | `http://localhost:8000/admin` |
| Health check | `http://localhost:8000/up` |

## Credenciais de demonstração

O seeder cria usuários apenas em ambiente `local`/`testing`:

| Papel | E-mail | Senha |
|---|---|---|
| Administrador | `admin@example.test` | `SenhaDemo!123` |
| Atendente | `atendente@example.test` | `SenhaDemo!123` |

Para alterar, defina no `.env`:

```dotenv
SEED_ADMIN_EMAIL=seu-admin@exemplo.com
SEED_ADMIN_PASSWORD=SuaSenha!123
SEED_ATTENDANT_EMAIL=seu-atendente@exemplo.com
SEED_ATTENDANT_PASSWORD=SuaSenha!456
```

Depois execute `php artisan db:seed`. O seeder é idempotente (usa `updateOrCreate`).

## Comandos de qualidade

| Verificação | Comando |
|---|---|
| Pint (PHP) | `vendor/bin/pint --test` |
| PHPStan | `composer types:check` |
| ESLint | `npm run lint:check` |
| Prettier | `npm run format:check` |
| TypeScript | `npm run types:check` |

Correção automática:

```bash
vendor/bin/pint          # PHP
npm run lint             # JS/TS
npm run format           # Prettier
```

## Testes

### Testes portáteis (SQLite)

```bash
php artisan test --exclude-group=mysql-integration
```

### Testes de concorrência (MySQL)

Requer um banco MySQL dedicado. O comando executa `migrate:fresh` e **destroi** os dados do banco apontado.

```bash
RUN_MYSQL_INTEGRATION=true \
APP_ENV=testing \
DB_CONNECTION=mysql \
DB_DATABASE=queue_test \
BROADCAST_CONNECTION=null \
CACHE_STORE=array \
QUEUE_CONNECTION=sync \
SESSION_DRIVER=array \
php artisan test tests/Integration/MySql --group=mysql-integration
```

### Testes frontend

```bash
npm test               # run único
npm run test:watch     # watch mode
```

### Testes E2E

Instale o Chromium uma vez:

```bash
npx playwright install chromium
```

Execute:

```bash
npm run test:e2e
```

O E2E executa `migrate:fresh --seed` no banco configurado antes do fluxo. Use um banco de teste.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `KIOSK_RATE_LIMIT` | `120` | Requisições/minuto por IP no totem |
| `DISPLAY_POLL_SECONDS` | `15` | Intervalo do polling de fallback |
| `ADMIN_PER_PAGE_MAX` | `100` | Limite máximo de paginação no admin |
| `SEED_ADMIN_EMAIL` | `admin@example.test` | E-mail do admin no seeder |
| `SEED_ADMIN_PASSWORD` | `SenhaDemo!123` | Senha do admin no seeder |
| `SEED_ATTENDANT_EMAIL` | `atendente@example.test` | E-mail do atendente no seeder |
| `SEED_ATTENDANT_PASSWORD` | `SenhaDemo!123` | Senha do atendente no seeder |

## Recriar banco limpo

```bash
php artisan migrate:fresh --seed
```

## Build de produção

```bash
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

## Debug

Para logs em tempo real durante desenvolvimento:

```bash
php artisan pail
```

Para inspecionar o banco com Tinker:

```bash
php artisan tinker
```

Exemplos:

```php
// Ver senhas aguardando
App\Models\Ticket::where('status', 'waiting')->count();

// Ver senhas chamadas hoje
App\Models\Ticket::where('status', 'called')->whereDate('business_date', now('America/Sao_Paulo')->toDateString())->get();

// Ver eventos de uma senha
App\Models\Ticket::first()->events;
```
