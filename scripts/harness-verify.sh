#!/usr/bin/env bash
set -euo pipefail

echo "🔍 [Harness Sensor] Iniciando verificações computacionais..."

# 1. Verificação Estática de Tipos
echo "▶ 1/3: Verificando TypeScript (typecheck)..."
npm run typecheck

# 2. Verificação de Regras de Arquitetura (Domain purity)
echo "▶ 2/3: Verificando pureza do Domínio (sem imports de infra)..."
if grep -rnE "from ['\"](@nestjs|pg|@aws-sdk|express|\.\./infrastructure)" src/domain/; then
  echo "❌ ERRO: Violação arquitetural detectada! O domínio não pode importar infraestrutura ou libs externas."
  exit 1
fi
echo "✔ Domínio 100% puro."

# 3. Testes Unitários e Contrato
echo "▶ 3/3: Executando suite de testes..."
npm test

echo "✅ [Harness Sensor] Todas as travas passaram com sucesso!"
