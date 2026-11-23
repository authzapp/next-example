# OfficeUp — exemplo mínimo do AuthZapp

Uma tela com QR Code, botão **Entrar com WhatsApp** e confirmação automática.
Depois do login, mostra somente o telefone verificado e **Sair**.

## Configuração

Copie `.env.example` para `.env.local` e preencha:

- `APP_URL`: origem exata da demo; em produção, `https://example.authzapp.com`.
- `DATABASE_URL`: connection string PostgreSQL do Neon, com TLS (`sslmode=require`).
- `AUTH_SECRET`: segredo aleatório com pelo menos 32 caracteres, usado no cookie de sessão.
- `AZ_APP_KEY` e `AZ_APP_SECRET`: credenciais do aplicativo externo no AuthZapp.
- `AZ_WEBHOOK_SECRET`: segredo do webhook cadastrado nesse mesmo aplicativo.
- `AZ_BASE_URL`: opcional; padrão `https://authzapp.com`.

No AuthZapp, o domínio do aplicativo deve ser `example.authzapp.com` e o webhook
`https://example.authzapp.com/api/authzapp/webhook`. A API externa precisa retornar
`session_id`, `auth_url`, `whatsapp_url` e `expires_at`.

```sh
npm ci
npm run db:migrate
npm run dev
```

Na Vercel, configure as variáveis em **Production**. O build aplica o schema
idempotente antes de compilar (`vercel.json`); a senha do Neon pode continuar
marcada como sensível. Preview precisa de suas próprias variáveis e origem.

## Fluxo

1. O servidor chama `POST /api/v2/auth/sessions` com as credenciais do aplicativo.
2. A demo guarda o ID da sessão e o hash de um token aleatório do navegador na
   única tabela, `officeup_logins`. O token fica num cookie HttpOnly.
3. O QR Code é gerado na demo a partir de `whatsapp_url`, sem serviço externo de imagens.
4. O AuthZapp confirma o telefone no WhatsApp e entrega `auth.completed` ao webhook.
5. O webhook confere HMAC-SHA256 dos bytes originais, timestamp (até 5 minutos),
   ID do evento, telefone verificado e prazo da sessão. Reentregas idênticas são
   aceitas; eventos conflitantes não substituem a identidade.
6. O navegador consulta somente a demo a cada 2 segundos. Uma operação atômica
   consome a confirmação do navegador correto e emite um cookie assinado de 8 horas,
   HttpOnly, Secure em HTTPS e SameSite=Lax. Mutações exigem a origem configurada.

Não há acesso ao banco do AuthZapp nem uso do login interno do console.
Não há cadastro de usuários, perfis, permissões ou dashboard. O cookie assinado
contém o telefone (não é criptografado); a aplicação só o aceita após validar a assinatura.
Sair apaga o cookie do navegador. Revogação central de sessões não faz parte desta demo.

## Schema e limpeza

`migrations/001_login.sql` cria uma tabela temporária com ID de sessão, hash do
navegador, prazo, ID/hash do evento, telefone e instante de consumo. Cada novo
login remove registros expirados há mais de um dia. Em uma instalação sem novos
logins, execute periodicamente:

```sql
DELETE FROM officeup_logins WHERE expires_at < clock_timestamp() - interval '1 day';
```

Uma confirmação expirada ou já consumida nunca cria outra sessão. Se a resposta
HTTP do consumo se perder antes de o navegador receber o cookie, inicie novo login.
O AuthZapp limita pedidos por aplicativo; uma aplicação real pode acrescentar
limites próprios conforme sua carga.

## Verificação

```sh
npm test
npm run lint
npm run build
```

Os testes executam o SQL real em PostgreSQL embarcado (PGlite) e cobrem associação
ao navegador, concorrência, expiração, repetição, conflito de eventos, assinatura,
cookie adulterado, origem e limite de corpo. A confirmação real no WhatsApp exige
uma pessoa enviando a mensagem; testes sintéticos não substituem essa etapa.
