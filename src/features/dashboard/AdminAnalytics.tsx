import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import dayjs from 'dayjs';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Bar,
  AreaChart,
  Area,
} from 'recharts';
import { db } from '../../firebase/app';
import { useMonthlyCosts } from './hooks/useMonthlyCosts';

interface FilialOption {
  id: string;
  nome: string;
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const seriesColors = ['#0f7a66', '#1e88e5', '#fb8500', '#763bff'];

export const AdminAnalytics = () => {
  const [filiais, setFiliais] = useState<FilialOption[]>([]);
  const [selectedFilialId, setSelectedFilialId] = useState<string>('consolidado');
  const currentYear = dayjs().year();
  const [yearPrimary, setYearPrimary] = useState(currentYear);
  const [yearComparison, setYearComparison] = useState(currentYear - 1);

  useEffect(() => {
    const load = async () => {
      const snapshot = await getDocs(query(collection(db, 'filiais'), orderBy('nome_fantasia')));
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        nome: docSnap.get('nome_fantasia') ?? 'Filial',
      }));
      setFiliais(items);
    };
    void load();
  }, []);

  const yearsToLoad = useMemo(() => {
    const set = new Set<number>();
    if (!Number.isNaN(yearPrimary)) set.add(yearPrimary);
    if (!Number.isNaN(yearComparison) && yearComparison !== 0) set.add(yearComparison);
    return Array.from(set.values()).filter(Boolean);
  }, [yearPrimary, yearComparison]);

  const { loading, data, error } = useMonthlyCosts(
    selectedFilialId || null,
    yearsToLoad.length ? yearsToLoad : [currentYear],
  );

  const monthLabels = useMemo(
    () => Array.from({ length: 12 }, (_, index) => dayjs().month(index).format('MMM').toUpperCase()),
    [],
  );

  const totals = useMemo(() => {
    const result: Record<string, number> = {};
    Object.entries(data).forEach(([year, months]) => {
      result[year] = months.reduce((sum, month) => sum + month.total, 0);
    });
    return result;
  }, [data]);

  const comparisonData = useMemo(() => {
    if (!yearsToLoad.length) return [];
    return monthLabels.map((label, index) => {
      const row: Record<string, number | string> = { mes: label };
      yearsToLoad.forEach((year) => {
        const months = data[String(year)];
        row[String(year)] = months ? months[index]?.total ?? 0 : 0;
      });
      return row;
    });
  }, [data, monthLabels, yearsToLoad]);

  const primaryKey = String(yearPrimary);
  const primaryData = data[primaryKey];

  const compositionData = useMemo(() => {
    if (!primaryData) return [];
    return primaryData.map((month) => ({
      mes: month.month,
      Energia: month.energia,
      Agua: month.agua,
      Residuos: month.residuos,
      'Servicos Gerais': month.servicos,
    }));
  }, [primaryData]);

  const handleYearChange =
    (setter: (value: number) => void) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      setter(Number.isNaN(value) ? 0 : value);
    };

  const selectedFilial =
    selectedFilialId === 'consolidado'
      ? { nome: 'Consolidado' }
      : filiais.find((filial) => filial.id === selectedFilialId);

  const hasComparisonData = comparisonData.length > 0;
  const hasCompositionData = compositionData.length > 0;

  return (
    <Stack spacing={4}>
      <Card>
        {/* Header customizado: título à esquerda e contexto (filial + mês) centralizado */}
        <Box sx={{ position: 'relative' }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="h6">Visão geral de custos</Typography>
            <Typography variant="body2" color="text.secondary">
              Explore tendências mensais e compare a composição de gastos entre períodos.
            </Typography>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              left: '50%',
              top: 12,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label={selectedFilial ? selectedFilial.nome : 'Consolidado'}
                color="primary"
                variant="outlined"
                size="small"
              />
              <Chip
                label={`Mês ${String(dayjs().month() + 1).padStart(2, '0')}/${yearPrimary}`}
                variant="outlined"
                size="small"
              />
            </Stack>
          </Box>
        </Box>
        <CardContent>
          <Stack spacing={4}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="analytics-filial-select">Contexto</InputLabel>
                <Select
                  labelId="analytics-filial-select"
                  value={selectedFilialId}
                  label="Contexto"
                  onChange={(event) => setSelectedFilialId(event.target.value)}
                >
                  <MenuItem value="consolidado">Consolidado</MenuItem>
                  {filiais.map((filial) => (
                    <MenuItem key={filial.id} value={filial.id}>
                      {filial.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Ano principal"
                type="number"
                value={yearPrimary}
                onChange={handleYearChange(setYearPrimary)}
                fullWidth
              />
              <TextField
                label="Ano de comparação"
                type="number"
                value={yearComparison}
                onChange={handleYearChange(setYearComparison)}
                helperText="Informe 0 para remover a comparação"
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selectedFilial && (
                <Chip
                  label={`Visão: ${selectedFilial.nome}`}
                  color="primary"
                  variant="outlined"
                />
              )}
              {yearsToLoad.map((year) => (
                <Chip
                  key={year}
                  label={`Total ${year}: ${formatCurrency(totals[String(year)] ?? 0)}`}
                  variant="outlined"
                />
              ))}
            </Stack>

            {error && (
              <Typography color="error">
                {error}
              </Typography>
            )}

            {!error && (
              <Stack spacing={4}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
                  {yearsToLoad.map((year, index) => (
                    <Box
                      key={year}
                      sx={{
                        flex: 1,
                        p: 3,
                        borderRadius: 3,
                        background: alpha(seriesColors[index % seriesColors.length], 0.08),
                        border: '1px solid',
                        borderColor: alpha(seriesColors[index % seriesColors.length], 0.3),
                      }}
                    >
                      <Typography variant="subtitle2" color="text.secondary">
                        Total acumulado {year}
                      </Typography>
                      <Typography variant="h5" sx={{ mt: 1 }}>
                        {formatCurrency(totals[String(year)] ?? 0)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>

                <Box
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Comparativo mensal de custos totais
                  </Typography>
                  <Box sx={{ height: 340 }}>
                    {hasComparisonData ? (
                      <ResponsiveContainer>
                        <BarChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mes" />
                          <YAxis />
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          {yearsToLoad.map((year, index) => (
                            <Bar
                              key={year}
                              dataKey={String(year)}
                              fill={seriesColors[index % seriesColors.length]}
                              name={`Ano ${year}`}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum dado encontrado para o período selecionado.
                      </Typography>
                    )}
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: { xs: 2, md: 3 },
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Composição mensal por categoria ({yearPrimary})
                  </Typography>
                  <Box sx={{ height: 340 }}>
                    {hasCompositionData ? (
                      <ResponsiveContainer>
                        <AreaChart data={compositionData}>
                          <defs>
                            <linearGradient id="colorEnergia" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={seriesColors[0]} stopOpacity={0.65} />
                              <stop offset="95%" stopColor={seriesColors[0]} stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="colorAgua" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={seriesColors[1]} stopOpacity={0.65} />
                              <stop offset="95%" stopColor={seriesColors[1]} stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="colorResiduos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={seriesColors[2]} stopOpacity={0.65} />
                              <stop offset="95%" stopColor={seriesColors[2]} stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="colorServicos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={seriesColors[3]} stopOpacity={0.65} />
                              <stop offset="95%" stopColor={seriesColors[3]} stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mes" />
                          <YAxis />
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="Energia"
                            stroke={seriesColors[0]}
                            fill="url(#colorEnergia)"
                            stackId="1"
                          />
                          <Area
                            type="monotone"
                            dataKey="Agua"
                            stroke={seriesColors[1]}
                            fill="url(#colorAgua)"
                            stackId="1"
                          />
                          <Area
                            type="monotone"
                            dataKey="Residuos"
                            stroke={seriesColors[2]}
                            fill="url(#colorResiduos)"
                            stackId="1"
                          />
                          <Area
                            type="monotone"
                            dataKey="Servicos Gerais"
                            stroke={seriesColors[3]}
                            fill="url(#colorServicos)"
                            stackId="1"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Ainda não há lançamentos para apresentar esta visão.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Stack>
            )}

            {loading && (
              <Typography variant="body2" color="text.secondary">
                Carregando dados...
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
};
