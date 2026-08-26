# NX CRM

CRM modular construído com Next.js App Router, React, Tailwind CSS e Firebase Authentication/Firestore.

## Funcionalidades

- Leads sincronizados em tempo real com `onSnapshot`.
- Criação, edição completa, exclusão e movimentação de status.
- Tarefas anexadas ao lead com validação contra horários passados.
- Alertas internos disparados 15 minutos antes das tarefas.
- Orçamentos persistidos em centavos, com moeda `BRL`.
- Análise de conversão, volume por status e projeção de vendas.
- Controle financeiro de faturamento, vendas do mês e pipeline futuro.

## Arquivos principais

```text
app/dashboard/page.js                         Orquestra autenticação, dados e módulos
components/dashboard/lead-modal.js            Criação/edição, orçamento e tarefas
components/dashboard/leads-view.js            Funil e filtros
components/dashboard/lead-card.js             Ações rápidas de cada lead
components/dashboard/analytics-view.js        Aba de análise
components/dashboard/financial-view.js        Aba financeira
components/dashboard/charts.js                Gráficos leves e acessíveis, sem dependência extra
components/dashboard/notification-center.js   Alertas internos
hooks/use-auth-user.js                         Estado de autenticação
hooks/use-leads.js                             Listener Firestore em tempo real
hooks/use-task-notifications.js                Agendador dos lembretes
lib/crm.js                                     Regras, formatação e métricas
firestore.rules                                Isolamento e validação por cliente
```

## Estrutura dos novos campos no Firestore

```js
{
  valorOrcamentoCentavos: 150000, // R$ 1.500,00
  moeda: "BRL",
  tarefas: [
    {
      id: "uuid",
      descricao: "Retornar orçamento",
      agendadaPara: Timestamp,
      concluida: false
    }
  ],
  updatedAt: serverTimestamp(),
  closedAt: serverTimestamp() // definido ao entrar em "fechado"
}
```

## Configuração

Copie `.env.example` para `.env.local` e preencha apenas no ambiente local/Vercel. O código continua usando:

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Instale e execute:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Publique as regras antes de usar escrita pelo navegador:

```bash
firebase deploy --only firestore:rules
```

## Observação sobre lembretes

O navegador agenda um `setTimeout` para o instante exato de 15 minutos antes e mantém uma verificação de segurança a cada 30 segundos. Como navegadores suspendem abas inativas, alertas realmente garantidos com a aplicação fechada exigem uma função backend agendada e push notification; o módulo atual atende a notificação dentro do painel aberto.
