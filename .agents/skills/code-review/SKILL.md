---
name: code-review
description: Checklist prático e cirúrgico de code review pré-push para o projeto Jungle (NestJS, TypeScript, Postgres, SQS).
---

# Code Review Pré-Push — Jungle

Use este guia antes de fazer `git push` ou abrir uma PR. O objetivo é pegar falhas de produção, segurança e consistência financeira cedo.

---

## 1. Regra de Ouro: Validação Computacional (Obrigatório)

Antes de qualquer revisão manual ou envio, garanta localmente:
```bash
npm run typecheck
npm test
npm run test:integration  # com o docker compose do postgres no ar
```
> Nenhum código deve ser enviado com tipagem quebrada ou testes em falha.

---

## 2. Arquitetura Mínima & SRP (Single Responsibility)

A aplicação segue uma separação limpa que deve ser preservada:

1. **`src/domain` (Puro):**
   - Não importa nada de infraestrutura, NestJS ou banco (`pg`).
   - Lida apenas com regras de negócio e cálculos monetários.
   - Use sempre classes tipadas (`DomainError`) em vez de `throw new Error("texto")`.
2. **`src/application` (Casos de Uso & Portas):**
   - Orquestra os fluxos chamando as entidades e interfaces (Ports).
   - Controla a fronteira transacional via Unit of Work.
3. **`src/infrastructure` (Adaptadores):**
   - **HTTP (Controllers & DTOs):** Validação de schema na borda com `class-validator`. Controllers só delegam para Use Cases e mapeiam erros via `ExceptionFilter`.
   - **Database (Repos & Migrations):** SQL bruto, `SELECT FOR UPDATE` para concorrência e constraints únicas.
   - **Queue (Workers & Consumers):** Um poll por vez (sem sobreposição) e isolamento por mensagem (`try/catch`).

---

## 3. Lentes Essenciais de Revisão

### 💰 Integridade Financeira & Moeda
- [ ] **Precisão decimal:** Proibido usar `number` nativo para saldo/dinheiro. Use sempre `Money` com `decimal.js` e `NUMERIC(18,2)` no banco.
- [ ] **Zero e Negativos:** Garanta que operações rejeitem valores `<= 0` (lembre-se: `Decimal.isPositive()` é verdadeiro para zero, use `.greaterThan(0)`).
- [ ] **Concorrência:** Operações que alteram saldo de uma carteira exigem `SELECT ... FOR UPDATE`.

### 🛡️ Idempotência & Mensageria
- [ ] **Duplicidade:** Toda transação financeira deve checar idempotência antes e depois do lock.
- [ ] **Dual Write Problem:** Alteração de saldo + Ledger + Outbox devem ser commitados na **mesma** transação SQL.
- [ ] **Consumers SQS:** Mensagens com falha não devem ser apagadas (`DeleteMessage`) silenciosamente; registre erro com `Logger.error`.

### 🔒 Segurança & Borda
- [ ] **Fail-closed:** Em produção (`NODE_ENV=production`), secrets e credenciais (`API_KEY`) são obrigatórios no boot da aplicação.
- [ ] **Comparação de Segredos:** Use `crypto.timingSafeEqual` ao validar tokens/chaves para evitar timing attacks.
- [ ] **Validação Exaustiva:** Valide formatos na borda (ex.: `@IsUUID('loose')`) antes que o payload atinja o banco.

---

## 4. Anti-Patterns (O que NÃO fazer)
- ❌ **`catch (() => undefined)`:** Nunca engula exceções em workers ou consumers.
- ❌ **I/O longo dentro de transação de banco:** Evite chamadas HTTP ou de rede para filas externas segurando lock de banco desnecessariamente.
- ❌ **Condicionais mágicas por texto de erro:** Evite `if (err.message.includes('currency'))`. Lance erros tipados.
