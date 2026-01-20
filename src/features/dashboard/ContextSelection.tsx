import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/app';
import { useAuth } from '../../providers/AuthProvider';
import { type IndicatorsContext } from './types';

interface ContextSelectionProps {
  onResolve: (value: IndicatorsContext) => void;
  autoResolve?: boolean;
  standalone?: boolean;
}

interface FilialOption {
  id: string;
  nome: string;
}

export const ContextSelection = ({
  onResolve,
  autoResolve = false,
  standalone = true,
}: ContextSelectionProps) => {
  const { profile } = useAuth();
  const [filiais, setFiliais] = useState<FilialOption[]>([]);
  const [selectedFilialId, setSelectedFilialId] = useState('');
  const [referenceMonth, setReferenceMonth] = useState<Dayjs>(dayjs().startOf('month'));
  const [loadingFiliais, setLoadingFiliais] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const autoResolveTriggered = useRef(false);

  useEffect(() => {
    autoResolveTriggered.current = false;
  }, [autoResolve]);

  const isAdm = profile?.role === 'ADM';

  useEffect(() => {
    if (!profile) return;

    if (isAdm) {
      const load = async () => {
        setLoadingFiliais(true);
        setLoadError(undefined);
        try {
          const filiaisQuery = query(collection(db, 'filiais'), orderBy('nome_fantasia'));
          const snapshot = await getDocs(filiaisQuery);
          setFiliais(
            snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              nome: docSnap.get('nome_fantasia') ?? 'Filial',
            })),
          );
        } catch (error) {
          console.error('Erro ao carregar lista de filiais', error);
          setLoadError('Não foi possível carregar as filiais. Tente novamente.');
        } finally {
          setLoadingFiliais(false);
        }
      };
      void load();
      return;
    }

    setFiliais(
      profile.filiais.map((item) => ({
        id: item.filialId,
        nome: item.nome,
      })),
    );
  }, [isAdm, profile]);

  useEffect(() => {
    if (!profile) return;
    if (isAdm && filiais.length > 0) {
      setSelectedFilialId((current) => current || filiais[0].id);
      return;
    }
    if (!isAdm && profile.filiais.length === 1) {
      setSelectedFilialId(profile.filiais[0].filialId);
    }
  }, [filiais, isAdm, profile]);

  useEffect(() => {
    // Auto-resolve when requested. For ADM we pick the first filial,
    // for non-ADM we auto-resolve only when the user has a single filial.
    if (!autoResolve) return;
    if (!profile) return;
    if (!filiais.length) return;
    if (autoResolveTriggered.current) return;

    const shouldAuto = isAdm || (!isAdm && profile.filiais.length === 1);
    if (!shouldAuto) return;

    const filial = filiais[0];
    autoResolveTriggered.current = true;
    setSelectedFilialId(filial.id);
    onResolve({
      filialId: filial.id,
      filialNome: filial.nome,
      mesReferencia: referenceMonth.format('YYYY-MM'),
    });
  }, [autoResolve, filiais, isAdm, onResolve, profile, referenceMonth]);

  const canSubmit = useMemo(() => {
    if (!profile) return false;
    if (isAdm) return Boolean(selectedFilialId);
    if (profile.filiais.length <= 1) return true;
    return Boolean(selectedFilialId);
  }, [isAdm, profile, selectedFilialId]);

  const handleContinue = () => {
    const fallbackFilial = filiais.length === 1 ? filiais[0] : undefined;
    const filial = filiais.find((item) => item.id === selectedFilialId) ?? fallbackFilial;
    if (!filial) return;

    onResolve({
      filialId: filial.id,
      filialNome: filial.nome,
      mesReferencia: referenceMonth.format('YYYY-MM'),
    });
  };

  const containerStyles = standalone
    ? {
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
      }
    : {
        justifyContent: 'center',
        alignItems: 'flex-start',
      };

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        ...containerStyles,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 560 }}>
        <CardHeader
          title="Selecionar contexto"
          subheader={
            isAdm
              ? 'Escolha a unidade e o mês de referência para lançar ou revisar os indicadores.'
              : 'Confirme o mês de referência para atualizar os indicadores da sua unidade.'
          }
        />
        <CardContent>
          <Stack spacing={3}>
            {loadError && <Alert severity="error">{loadError}</Alert>}

            {profile &&
              (isAdm || profile.filiais.length > 1 ? (
                <FormControl fullWidth disabled={loadingFiliais}>
                  <InputLabel id="filial-label">Unidade</InputLabel>
                  <Select
                    labelId="filial-label"
                    value={selectedFilialId}
                    label="Unidade"
                    onChange={(event) => setSelectedFilialId(event.target.value)}
                  >
                    {filiais.map((filial) => (
                      <MenuItem key={filial.id} value={filial.id}>
                        {filial.nome}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {isAdm
                      ? 'Visualize qualquer filial cadastrada.'
                      : 'Selecione qual filial deseja atualizar.'}
                  </FormHelperText>
                </FormControl>
              ) : (
                <Alert severity="info" variant="outlined">
                  Acesso vinculado à filial{' '}
                  <strong>{profile.filiais[0]?.nome ?? 'Filial'}</strong>. Basta confirmar o mês
                  para continuar.
                </Alert>
              ))}

            {loadingFiliais ? (
              <Box display="flex" justifyContent="center" py={2}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <DatePicker
                label="Mês de referência"
                views={['year', 'month']}
                value={referenceMonth}
                onChange={(value) => value && setReferenceMonth(value.startOf('month'))}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    helperText: 'Selecione o mês que deseja administrar.',
                  },
                }}
              />
            )}

            <Button
              variant="contained"
              size="large"
              disabled={!canSubmit || loadingFiliais}
              onClick={handleContinue}
              sx={{ alignSelf: 'flex-start', px: 5 }}
            >
              Carregar dados
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};
