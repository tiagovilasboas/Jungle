---
name: code-review
description: Checklist prático e cirúrgico de code review pré-push e harness guide para o projeto Jungle (NestJS, TypeScript, Postgres, SQS). Compatível com Claude, Cursor e Antigravity.
---

# Code Review Pré-Push & Harness Guide — Jungle

> **Para uso com LLMs (Claude, Cursor, Antigravity) ou desenvolvedores:**  
> Carregue este documento como prompt de sistema ou skill para auditar diffs antes de commitar ou abrir PRs.

---

## 1. Guia & Sensor (Modelo Harness - Fowler)

- **Guia (Feedforward):** As convenções de SRP, Clean Architecture e invariantes descritos na seção 2 e em `.harness/rules/architecture.md`.
- **Sensor (Feedback Computacional):** Execute `./scripts/harness-verify.sh` antes de qualquer push:
  ```bash
  ./scripts/harness-verify.sh
  ```
  *(Verifica TypeScript, pureza arquitetural do `src/domain` e executa a suite de testes).*

---

## 2. Arquitetura Mínima & SRP (Single Responsibility)

A aplicação segue uma separação limpa que deve ser rigorosamente mantida:

1. **`src/domain` (Puro):**
   - Não importa nada de NestJS (`@nestjs/*`), banco (`pg`), AWS SDK ou adaptadores de entrada/saída.
   - Trata exclusivamente de regras de negócio e cálculo monetário.
   - Use classes tipadas herdando de `DomainError` em vez de `throw new Error("texto")`.
2. **`src/application` (Casos de Uso & Portas):**
   - Orquestra os fluxos chamando as entidades e interfaces (Ports).
   - Controla a fronteira transacional via Unit of Work (`WalletUnitOfWork`).
3. **`src/infrastructure` (Adaptadores):**
   - **HTTP (Controllers & DTOs):** Validação de schema na borda com `class-validator`. Controllers só delegam para Use Cases e mapeiam erros via `ExceptionFilter`.
   - **Database (Repos & Migrations):** SQL parametrizado, `SELECT ... FOR UPDATE` para concorrência e constraints únicas.
   - **Queue (Workers & Consumers):** Um poll por vez (sem sobreposição de long-polling) e isolamento por mensagem (`try/catch`).

---

## 3. Lentes Senior Staff: Invariantes Críticos

### 💰 Integridade Financeira & Moeda
- [ ] **Precisão decimal:** Proibido usar `number` nativo para saldo/dinheiro. Use sempre `Money` com `decimal.js` e `NUMERIC(18,2)` no banco.
- [ ] **Zero e Negativos:** Garanta que operações rejeitem valores `<= 0` (lembre-se: `Decimal.isPositive()` é verdadeiro para zero no `decimal.js`, use `.greaterThan(0)`).
- [ ] **Concorrência (Pessimistic Lock):** Operações que alteram saldo de uma carteira exigem `SELECT ... FOR UPDATE` para evitar lost updates.

### 🛡️ Idempotência & Dual Write
- [ ] **Dupla Checagem:** Checar idempotência antes do lock (fast path em leitura) e após o lock (evita race condition de inserts concorrentes).
- [ ] **Atomicidade Dual Write:** Alteração de saldo + Ledger + Outbox devem ser commitados na **mesma** transação SQL (`BEGIN ... COMMIT`). Nunca faça split de escrita em banco e envio de fila.
- [ ] **SQS at-least-once:** Consumers devem ser idempotentes e mensagens com falha não devem ser apagadas (`DeleteMessage`) silenciosamente; registre erro com `Logger.error`.

### 🔒 Segurança & Borda
- [ ] **Fail-closed:** Em produção (`NODE_ENV=production`), secrets e credenciais (`API_KEY`) são obrigatórios no boot da aplicação.
- [ ] **Comparação de Segredos:** Use `crypto.timingSafeEqual` ao validar tokens/chaves para evitar timing attacks.
- [ ] **Validação Exaustiva:** Valide formatos na borda (ex.: `@IsUUID('loose')`) antes que o payload atinja a camada de persistência.

---

## 4. Anti-Patterns (O que NÃO fazer)
- ❌ **`catch (() => undefined)`:** Nunca engula exceções em workers ou consumers.
- ❌ **I/O de rede dentro de transação de banco:** Evite chamadas HTTP ou SDK de filas externas segurando transação/lock no Postgres.
- ❌ **Condicionais mágicas por texto de erro:** Evite `if (err.message.includes('currency'))`. Lance classes de erro tipadas (`DomainError`).
