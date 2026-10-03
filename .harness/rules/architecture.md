# Harness Rules: Architecture & Invariants (Jungle)

Essas regras atuam como **Guias** (feedforward) para os Coding Agents (Claude, Cursor, Antigravity) e definem os invariantes inegociáveis do sistema.

## 1. Regras Canônicas de Dependência (Clean / Hexagonal)
- `src/domain` é a raiz de dependência. Nunca importe `@nestjs/*`, `pg`, `@aws-sdk/*` ou `src/infrastructure/*` dentro do domínio.
- Erros de negócio devem herdar de `DomainError` (`src/domain/errors.ts`). Nunca lance erros genéricos (`throw new Error('...')`).

## 2. Invariantes Financeiros & Concorrência
- **Dinheiro:** Proibido usar tipo primitivo `number` para montantes de saldo. Use sempre o Value Object `Money` (`decimal.js`).
- **Pessimistic Locking:** Operações de carteira exigem `SELECT ... FOR UPDATE` via `WalletUnitOfWork`.
- **Atomicidade Dual Write:** Alteração de saldo, inclusão no ledger e outbox message devem obrigatoriamente estar na **mesma** transação SQL (`BEGIN ... COMMIT`).

## 3. Mensageria & Idempotência
- Consumers SQS não devem descartar mensagens falhas sem envio para DLQ ou retentativa após `VisibilityTimeout`.
- Idempotência deve ser validada tanto em memória pré-lock quanto em persistência pós-lock para barrar race conditions concorrentes.
