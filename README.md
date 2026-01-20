# Ambiental Indicadores (PWA)

Aplicação web para coleta de indicadores mensais de Energia, Água, Resíduos e Serviços Gerais por filial, construída com React + Vite + TypeScript e integrada ao ecossistema Firebase.

## Principais recursos

- Autenticação por e-mail/senha via Firebase Authentication com `AuthProvider` centralizando perfil, role e filiais autorizadas (`src/providers/AuthProvider.tsx`).
- Seleção de contexto pós-login (unidade + mês/ano) com regras específicas para ADM vs. operador (`src/features/dashboard/ContextSelection.tsx`).
- Formulário tabulado com persistência unificada (Energia/Água 1:1 e Resíduos/Serviços 1:N) e tabelas editáveis (`src/features/dashboard/IndicatorsForm.tsx`).
- Configuração PWA com `vite-plugin-pwa` e ícones básicos em `public/icons/`.
- Exemplo de Cloud Function `createUser` para criação segura de usuários sob controle de perfis ADM (`functions/src/index.ts`).

## Estrutura do Firestore sugerida

- `filiais/{filialId}`: metadados das unidades (nome, CNPJ, status).
- `usuarios/{uid}`: perfil estendido (nome, role, ativo, filiais_acesso[] com `{filialId, filialPath, nomeCache}`).
- `indicadores_mensais/{filialId_mes}`: documento mestre com `filial_ref`, `mes_ano`, `energia`, `agua`, `atualizado_em`.
  - `indicadores_mensais/{filialId_mes}/residuos/{autoId}`: linhas 1:N (tipo, quantidade_kg, destinacao, custo).
  - `indicadores_mensais/{filialId_mes}/servicos_gerais/{autoId}`: linhas 1:N (tipo, fornecedor, custo, horas).

Use custom claims (`role`, `filiais`) para reforçar regras em Firestore/Functions.

## Pré-requisitos

- Node.js 20+
- Conta Firebase com Firestore, Authentication e Functions habilitados.

## Configuração rápida

```bash
npm install
cp .env.example .env.local
# preencha as variáveis do Firebase no arquivo copiado
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Firebase Functions

```bash
cd functions
npm install
npm run build
# deploy (após configurar firebase-tools):
firebase deploy --only functions:createUser
```

A função `createUser` valida se o chamador é ADM, cria o usuário no Auth, define custom claims e sincroniza o documento em `/usuarios`.

## Próximos passos

1. Configurar regras de segurança do Firestore e do Storage usando os claims de role/filiais.
2. Mapear dropdowns (tipos de resíduos/serviços) segundo o modelo Excel e, se necessário, centralizar listas em `/config`.
3. Implementar fluxo de criação/edição de usuários no front chamando a Cloud Function.
4. (Opcional) Adicionar testes (React Testing Library / Vitest) para o fluxo de seleção e persistência.
