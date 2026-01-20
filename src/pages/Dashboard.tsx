import { useState } from 'react';
import { Button, Chip, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { BarChart, CalendarMonth, Checklist, Domain, Settings } from '@mui/icons-material';
import dayjs from 'dayjs';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { ContextSelection } from '../features/dashboard/ContextSelection';
import { IndicatorsForm } from '../features/dashboard/IndicatorsForm';
import { type IndicatorsContext } from '../features/dashboard/types';
import { AdminAnalytics } from '../features/dashboard/AdminAnalytics';
import { AdminSettingsDialog } from '../features/admin/AdminSettingsDialog';
// Graficos feature removed
import { useAuth } from '../providers/AuthProvider';

const formatMonth = (value: string) => {
  const parsed = dayjs(value, 'YYYY-MM');
  return parsed.isValid() ? parsed.format('MM/YYYY') : value;
};

const OperatorDashboard = () => {
  const [context, setContext] = useState<IndicatorsContext | null>(null);

  /* hero intentionally omitted: header text rendered inline in layout when needed */

  return (
    <DashboardLayout
      title="Lançamento de indicadores"
      description="Centralize os dados operacionais mensais da unidade selecionada."
      // hero={hero}
      // centerContent={
      //   context ? (
      //     <Stack direction="row" spacing={1} alignItems="center" sx={{ pointerEvents: 'none' }}>
      //       <Chip
      //         icon={<Domain fontSize="small" sx={{ color: 'primary.main' }} />}
      //         label={context.filialNome}
      //         color="primary"
      //         variant="outlined"
      //         size="small"
      //       />
      //       <Chip
      //         icon={<CalendarMonth fontSize="small" sx={{ color: 'primary.main' }} />}
      //         label={`Mês ${formatMonth(context.mesReferencia)}`}
      //         color="primary"
      //         variant="outlined"
      //         size="small"
      //       />
      //     </Stack>
      //   ) : undefined
      // }
      density="compact"
    >
      {context ? (
        <IndicatorsForm context={context} onChangeContext={() => setContext(null)} />
      ) : (
        <ContextSelection onResolve={setContext} standalone={false} autoResolve={true} />
      )}
    </DashboardLayout>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'entries' | 'analytics'>('entries');
  const [context, setContext] = useState<IndicatorsContext | null>(null);
  const [autoResolve, setAutoResolve] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const heroSpacing = context ? 1.25 : 1.5;
      const hero = (
    <Stack spacing={heroSpacing}>
        <Tabs
        value={activeTab}
        onChange={(_, value) => setActiveTab(value)}
        aria-label="Seções do administrador"
        sx={{ width: '100%' }}
      >
        <Tab value="entries" icon={<Checklist />} iconPosition="start" label="Lançamentos" />
            <Tab value="analytics" icon={<BarChart />} iconPosition="start" label="Dashboard" />
      </Tabs>

      {activeTab === 'entries' ? (
        context ? (
          <Stack spacing={0.75}>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary" maxWidth={560}>
            Selecione uma unidade e o mês de referência que deseja administrar. Utilize a
            configuração automática ou escolha manualmente na lista.
          </Typography>
        )
      ) : activeTab === 'analytics' ? (
        <Typography variant="body2" color="text.secondary" maxWidth={560}>
          {/* Explore o acompanhamento de custos consolidados por categoria e ano. Combine diferentes
          períodos para obter insights comparativos. */}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" maxWidth={560}>
          Crie, edite e visualize gráficos customizados para apresentar os indicadores que desejar.
        </Typography>
      )}
    </Stack>
  );

  const actions = (
    <Tooltip title="Gerenciar filiais, usuários e permissões">
      <Button
        variant="contained"
        startIcon={<Settings />}
        onClick={() => setSettingsOpen(true)}
        sx={{ whiteSpace: 'nowrap' }}
      >
        Configurar ambiente
      </Button>
    </Tooltip>
  );

  return (
    <>
      <DashboardLayout
        title="Painel administrativo"
        description="Acompanhe lançamentos, visualize indicadores consolidados e ajuste o ambiente de trabalho."
        hero={hero}
        centerContent={
          context ? (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pointerEvents: 'none' }}>
              <Chip
                icon={<Domain fontSize="small" sx={{ color: 'primary.main' }} />}
                label={context.filialNome}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<CalendarMonth fontSize="small" sx={{ color: 'primary.main' }} />}
                label={`Mês ${formatMonth(context.mesReferencia)}`}
                color="primary"
                variant="outlined"
                size="small"
              />
            </Stack>
          ) : undefined
        }
        actions={actions}
        // manter mesma proporção (density compact) para ambas as abas conforme pedido
        density="compact"
      >
        {activeTab === 'entries' ? (
          context ? (
            <IndicatorsForm
              context={context}
              onChangeContext={() => {
                setContext(null);
                setAutoResolve(false);
              }}
            />
          ) : (
          <ContextSelection
            onResolve={(value) => {
              setContext(value);
              setAutoResolve(false);
            }}
            standalone={false}
            autoResolve={autoResolve}
          />
          )
          ) : activeTab === 'analytics' ? (
            <AdminAnalytics />
          ) : null
          }
      </DashboardLayout>
      <AdminSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
};

export const Dashboard = () => {
  const { profile } = useAuth();

  if (!profile) {
    return null;
  }

  return profile.role === 'ADM' ? <AdminDashboard /> : <OperatorDashboard />;
};
