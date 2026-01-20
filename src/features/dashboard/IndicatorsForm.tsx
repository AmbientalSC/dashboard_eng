import CircularProgress from '@mui/material/CircularProgress';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  MenuItem,
  Stack,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  Typography,
  Snackbar,
  Alert,
} from '@mui/material';
import { Add, Autorenew, Delete, Refresh, Save, Edit, Close } from '@mui/icons-material';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  addDoc,
  // setDoc,
} from 'firebase/firestore';
import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { db } from '../../firebase/app';
import type { IndicatorsContext, IndicatorEntry } from './types';

type TabValue = 'energia' | 'agua' | 'residuos' | 'servicos';

interface IndicatorCategory {
  id: string;
  nome: string;
}

interface IndicatorSection {
  id: string;
  title: string;
  type: 'category' | 'missing' | 'uncategorized';
}

type CreateOption = { inputValue: string; label: string };
type OptionType = string | CreateOption;

interface RenderIndicatorSectionsProps {
  sections: IndicatorSection[];
  entries: IndicatorEntry[];
  typeOptions: string[];
  categories: IndicatorCategory[];
  onAdd: (categoriaId?: string) => void;
  onUpdate: (id: string, patch: Partial<IndicatorEntry>) => void;
  onRemove: (id: string) => void;
  description: string;
  monthlyMap: Record<string, Record<string, number | ''>>;
  onMonthValueChange: (month: string, id: string, value: number | '') => void;
  domain: TabValue;
  onRequestCreate: (kind: 'tipo' | 'fonte', domain: TabValue, value: string) => void;
  fonteOptions: string[];
  editingMonth: string | null;
  onToggleEditMonth: (month: string) => void;
}

  interface IndicatorsFormProps {
    context: IndicatorsContext;
    onChangeContext: () => void;
  }

const parseNumberInput = (value: string): number | '' => {
  if (value === '') return '';
  const parsed = Number(value.replace(',', '.'));
  return Number.isNaN(parsed) ? '' : parsed;
};

const createId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const emptyEntry = (categoriaId?: string): IndicatorEntry => ({
  id: createId(),
  tipo: '',
  categoriaId: categoriaId ?? '',
  valor: '',
  fonteDado: 'manual',
});

const buildSections = (
  entries: IndicatorEntry[],
  categories: IndicatorCategory[],
): IndicatorSection[] => {
  const baseSections: IndicatorSection[] = categories.map((category) => ({
    id: category.id,
    title: category.nome,
    type: 'category',
  }));

  const missingSections = new Map<string, IndicatorSection>();
  let hasUncategorized = false;

  entries.forEach((entry) => {
    if (!entry.categoriaId) {
      hasUncategorized = true;
      return;
    }
    if (
      !categories.some((category) => category.id === entry.categoriaId) &&
      !missingSections.has(entry.categoriaId)
    ) {
      missingSections.set(entry.categoriaId, {
        id: entry.categoriaId,
        title: 'Categoria removida',
        type: 'missing',
      });
    }
  });

  const sections: IndicatorSection[] = [...baseSections, ...missingSections.values()];
  sections.push({ id: '__uncategorized__', title: 'Sem categoria', type: 'uncategorized' });

  if (!hasUncategorized && entries.length === 0 && categories.length === 0) {
    return [{ id: '__uncategorized__', title: 'Sem categoria', type: 'uncategorized' }];
  }

  return sections;
};

const renderIndicatorSections = ({
  sections,
  entries,
  typeOptions,
  categories,
  onAdd,
  onUpdate,
  onRemove,
  description,
  monthlyMap,
  onMonthValueChange,
  domain,
  onRequestCreate,
  fonteOptions,
  editingMonth,
  onToggleEditMonth,
}: RenderIndicatorSectionsProps) => {
  const categoryOptions: IndicatorCategory[] = [{ id: '', nome: 'Sem categoria' }, ...categories];
  const monthOrder = Object.keys(monthlyMap || {});
  const monthLabels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return sections.map((section) => {
    const sectionRows = entries.filter((entry) => {
      const normalized = entry.categoriaId || '__uncategorized__';
      return normalized === (section.id === '__uncategorized__' ? '__uncategorized__' : section.id);
    });
    const isMissing = section.type === 'missing';
    const isUncategorized = section.type === 'uncategorized';

    return (
      <Paper key={section.id} variant="outlined" sx={{ p: { xs: 1.75, md: 2.5 } }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
          >
            <Stack spacing={0.5}>
              <Typography variant="subtitle1">{section.title}</Typography>
              {isMissing ? (
                <Typography variant="caption" color="warning.main">
                  Categoria removida. Reatribua as linhas para uma categoria ativa.
                </Typography>
              ) : isUncategorized ? (
                <Typography variant="body2" color="text.secondary">
                  Registros sem categoria definida. Utilize o seletor ao lado para organizar.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Stack>
            <Button
              startIcon={<Add />}
              variant="outlined"
              onClick={() => onAdd(isMissing || isUncategorized ? undefined : section.id)}
              disabled={isMissing}
            >
              {isMissing ? 'Categoria inativa' : 'Adicionar linha'}
            </Button>
          </Stack>

            <Box sx={{ overflowX: 'hidden' }}>
            <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', '& .MuiTableCell-root': { paddingTop: 0.5, paddingBottom: 0.5, paddingLeft: 1, paddingRight: 1 } }}>
              <TableHead>
                <TableRow>
                    <TableCell sx={{ minWidth: 200, width: 200 }}>Tipo</TableCell>
                    {monthOrder.map((m, i) => (
                      <TableCell key={m} align="right" sx={{ width: 50 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          <Typography variant="body2">{monthLabels[i] ?? m}</Typography>
                          <IconButton size="small" onClick={() => onToggleEditMonth(m)} aria-label={editingMonth === m ? 'Fechar edição' : 'Editar mês'}>
                            {editingMonth === m ? <Close fontSize="small" /> : <Edit fontSize="small" />}
                          </IconButton>
                        </Box>
                      </TableCell>
                    ))}
                    <TableCell sx={{ minWidth: 120, width: 120 }}>Fonte do dado</TableCell>
                  <TableCell sx={{ width: 56 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {sectionRows.length ? (
                  sectionRows.map((row) => {
                    const showCategorySelect = section.type !== 'category';
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Stack spacing={showCategorySelect ? 1 : 0}>
                            {typeOptions.length ? (
                              <Autocomplete
                                freeSolo
                                options={typeOptions}
                                value={row.tipo || ''}
                                getOptionLabel={(option: OptionType) => (typeof option === 'string' ? option : (option.inputValue ?? option.label ?? ''))}
                                onChange={(_, value) => {
                                  if (typeof value === 'string') {
                                    if (!typeOptions.includes(value)) {
                                      onRequestCreate('tipo', domain, value);
                                    } else {
                                      onUpdate(row.id, { tipo: value });
                                    }
                                  } else if (value && typeof value === 'object' && 'inputValue' in value) {
                                    const iv = (value as { inputValue?: string }).inputValue;
                                    if (iv) onRequestCreate('tipo', domain, iv);
                                  } else if (value == null) {
                                    onUpdate(row.id, { tipo: '' });
                                  } else {
                                    onUpdate(row.id, { tipo: value as string });
                                  }
                                }}
                                renderInput={(params) => (
                                  <TextField {...params} fullWidth placeholder="Selecione" size="small" sx={{ minWidth: 240 }} />
                                )}
                                filterOptions={(options, params) => {
                                  const filteredOptions: Array<string | CreateOption> = options.filter((o) =>
                                    String(o).toLowerCase().includes((params.inputValue || '').toLowerCase()),
                                  );
                                  const input = params.inputValue?.trim();
                                  if (input && !options.some((o) => String(o).toLowerCase() === input.toLowerCase())) {
                                    filteredOptions.push({ inputValue: input, label: `Adicionar "${input}"` });
                                  }
                                  return filteredOptions as unknown as string[];
                                }}
                                renderOption={(props, option: OptionType) =>
                                  typeof option === 'string' ? (
                                    <li {...props} key={option}>{option}</li>
                                  ) : (
                                    <li {...props} key={(option.inputValue ?? option.label)}>
                                      <Stack direction="row" alignItems="center" spacing={1}>
                                        <Add fontSize="small" />
                                        <span>{option.label ?? option.inputValue}</span>
                                      </Stack>
                                    </li>
                                  )
                                }
                              />
                            ) : (
                              <TextField
                                fullWidth
                                size="small"
                                sx={{ minWidth: 240 }}
                                value={row.tipo}
                                onChange={(event) => onUpdate(row.id, { tipo: event.target.value })}
                                placeholder="Informe o tipo"
                              />
                            )}
                            {showCategorySelect && (
                              <TextField
                                select
                                size="small"
                                label="Categoria"
                                value={row.categoriaId || ''}
                                onChange={(event) =>
                                  onUpdate(row.id, { categoriaId: event.target.value as string })
                                }
                              >
                                {categoryOptions.map((option) => (
                                  <MenuItem key={option.id} value={option.id}>
                                    {option.nome}
                                  </MenuItem>
                                ))}
                              </TextField>
                            )}
                          </Stack>
                        </TableCell>
                        

                        {monthOrder.map((m) => (
                          <TableCell key={m} align="right">
                            {editingMonth === m ? (
                              <TextField
                                size="small"
                                type="text"
                                inputMode="decimal"
                                value={
                                  (monthlyMap?.[m]?.[row.id] === undefined || monthlyMap[m][row.id] === null)
                                    ? ''
                                    : String(monthlyMap[m][row.id]).replace('.', ',')
                                }
                                onChange={(event) =>
                                  onMonthValueChange(m, row.id, parseNumberInput(event.target.value) as number | '')
                                }
                                sx={{ minWidth: 50, width: 50 }}
                                inputProps={{
                                  inputMode: 'decimal',
                                  pattern: '[0-9.,]*',
                                  style: { textAlign: 'right', padding: '6px 6px', fontSize: '0.9rem' },
                                }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ textAlign: 'right' }}>
                                {(monthlyMap?.[m]?.[row.id] === undefined || monthlyMap[m][row.id] === null)
                                  ? ''
                                  : String(monthlyMap[m][row.id]).replace('.', ',')}
                              </Typography>
                            )}
                          </TableCell>
                        ))}
                        <TableCell sx={{ minWidth: 200 }}>
                          <Autocomplete
                            freeSolo
                            options={fonteOptions}
                            value={row.fonteDado || 'manual'}
                            getOptionLabel={(option: OptionType) => (typeof option === 'string' ? option : (option.inputValue ?? option.label ?? ''))}
                            onChange={(_, value) => {
                              if (typeof value === 'string') {
                                if (!fonteOptions.includes(value)) {
                                  onRequestCreate('fonte', domain, value);
                                } else {
                                  onUpdate(row.id, { fonteDado: value as IndicatorEntry['fonteDado'] });
                                }
                              } else if (value && typeof value === 'object' && 'inputValue' in value) {
                                const iv = (value as { inputValue?: string }).inputValue;
                                if (iv) onRequestCreate('fonte', domain, iv);
                              } else if (value == null) {
                                onUpdate(row.id, { fonteDado: 'manual' });
                              }
                            }}
                            renderInput={(params) => (
                              <TextField {...params} size="small" />
                            )}
                            filterOptions={(options, params) => {
                              const filteredOptions: Array<string | CreateOption> = options.filter((o) =>
                                String(o).toLowerCase().includes((params.inputValue || '').toLowerCase()),
                              );
                              const input = params.inputValue?.trim();
                              if (input && !options.some((o) => String(o).toLowerCase() === input.toLowerCase())) {
                                filteredOptions.push({ inputValue: input, label: `Adicionar "${input}"` });
                              }
                              return filteredOptions as unknown as string[];
                            }}
                            renderOption={(props, option: OptionType) =>
                              typeof option === 'string' ? (
                                <li {...props} key={option}>{option}</li>
                              ) : (
                                <li {...props} key={(option.inputValue ?? option.label)}>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Add fontSize="small" />
                                    <span>{option.label ?? option.inputValue}</span>
                                  </Stack>
                                </li>
                              )
                            }
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remover linha">
                            <span>
                              <IconButton
                                aria-label="Remover linha"
                                onClick={() => onRemove(row.id)}
                                disabled={entries.length === 1}
                              >
                                <Delete />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">
                        Nenhum registro nesta categoria.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Stack>
      </Paper>
    );
  });
};

export const IndicatorsForm = ({ context, onChangeContext }: IndicatorsFormProps) => {
  const [tab, setTab] = useState<TabValue>('energia');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  // Year selector for the sheet view (shows Jan..Dec)
  const [selectedYear, setSelectedYear] = useState<number>(dayjs().year());

  // which month is currently editable (e.g. '01'..'12')
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const handleToggleEditMonth = (month: string) => setEditingMonth((prev) => (prev === month ? null : month));

  const [energiaEntries, setEnergiaEntries] = useState<IndicatorEntry[]>([emptyEntry()]);
  const [aguaEntries, setAguaEntries] = useState<IndicatorEntry[]>([emptyEntry()]);
  const [residuos, setResiduos] = useState<IndicatorEntry[]>([emptyEntry()]);
  const [servicos, setServicos] = useState<IndicatorEntry[]>([emptyEntry()]);

  // monthly values: outer key = '01'..'12', inner map: entryId -> value
  const emptyMonthly = () => ({}) as Record<string, number | ''>;
  const defaultMonthlyMap = () => Object.fromEntries(Array.from({ length: 12 }).map((_, i) => [String(i + 1).padStart(2, '0'), emptyMonthly()]));

  const [energiaMonthly, setEnergiaMonthly] = useState<Record<string, Record<string, number | ''>>>(defaultMonthlyMap());
  const [aguaMonthly, setAguaMonthly] = useState<Record<string, Record<string, number | ''>>>(defaultMonthlyMap());
  const [residuosMonthly, setResiduosMonthly] = useState<Record<string, Record<string, number | ''>>>(defaultMonthlyMap());
  const [servicosMonthly, setServicosMonthly] = useState<Record<string, Record<string, number | ''>>>(defaultMonthlyMap());

  const [energiaTypes, setEnergiaTypes] = useState<string[]>([]);
  const [aguaTypes, setAguaTypes] = useState<string[]>([]);
  const [residueTypes, setResidueTypes] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [fonteOptions, setFonteOptions] = useState<string[]>(['manual','energia','agua','residuos','servicos']);

  const [energiaCategories, setEnergiaCategories] = useState<IndicatorCategory[]>([]);
  const [aguaCategories, setAguaCategories] = useState<IndicatorCategory[]>([]);
  const [residueCategories, setResidueCategories] = useState<IndicatorCategory[]>([]);
  const [serviceCategories, setServiceCategories] = useState<IndicatorCategory[]>([]);

  // filial selection (admins can choose any filial or consolidated view)
  const { profile } = useAuth();
  const [filiaisOptions, setFiliaisOptions] = useState<IndicatorCategory[]>([]);
  const [selectedFilialId, setSelectedFilialId] = useState<string>(context.filialId);

  // compute a safe value for the filial select: if filiaisOptions not loaded yet, fall back to ''
  const displaySelectedFilialId =
    profile && profile.role === 'ADM'
      ? filiaisOptions.some((f) => f.id === selectedFilialId)
        ? selectedFilialId
        : selectedFilialId === 'consolidado'
        ? 'consolidado'
        : ''
      : selectedFilialId;

  const energiaTypeOptions = useMemo(
    () =>
      Array.from(new Set(energiaTypes)).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      ),
    [energiaTypes],
  );
  const aguaTypeOptions = useMemo(
    () =>
      Array.from(new Set(aguaTypes)).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      ),
    [aguaTypes],
  );
  const residueTypeOptions = useMemo(
    () =>
      Array.from(new Set(residueTypes)).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      ),
    [residueTypes],
  );
  const serviceTypeOptions = useMemo(
    () =>
      Array.from(new Set(serviceTypes)).sort((a, b) =>
        a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
      ),
    [serviceTypes],
  );

  const energiaSections = useMemo(
    () => buildSections(energiaEntries, energiaCategories),
    [energiaEntries, energiaCategories],
  );
  const aguaSections = useMemo(
    () => buildSections(aguaEntries, aguaCategories),
    [aguaEntries, aguaCategories],
  );
  const residueSections = useMemo(
    () => buildSections(residuos, residueCategories),
    [residuos, residueCategories],
  );
  const serviceSections = useMemo(
    () => buildSections(servicos, serviceCategories),
    [servicos, serviceCategories],
  );

  useEffect(() => {
    setTab('energia');
  }, [context]);

  useEffect(() => {
    // when year changes, reload data
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const handleMonthValueChange = (
    setter: React.Dispatch<React.SetStateAction<Record<string, Record<string, number | ''>>>>,
  ) => (month: string, id: string, value: number | '') => {
    setter((prev) => ({
      ...prev,
      [month]: { ...(prev[month] ?? {}), [id]: value },
    }));
  };

  const onEnergiaMonthChange = handleMonthValueChange(setEnergiaMonthly);
  const onAguaMonthChange = handleMonthValueChange(setAguaMonthly);
  const onResiduosMonthChange = handleMonthValueChange(setResiduosMonthly);
  const onServicosMonthChange = handleMonthValueChange(setServicosMonthly);

  // creation modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createKind, setCreateKind] = useState<'tipo' | 'fonte'>('tipo');
  const [createDomain, setCreateDomain] = useState<TabValue>('energia');
  const [createName, setCreateName] = useState('');

  const openCreate = (kind: 'tipo' | 'fonte', domain: TabValue, value: string) => {
    setCreateKind(kind);
    setCreateDomain(domain);
    setCreateName(value);
    setCreateOpen(true);
  };

  const handleCreateSave = async () => {
    const name = createName.trim();
    if (!name) return;
    try {
      if (createKind === 'tipo') {
        const collectionName = `${createDomain}_tipos`;
        // add as new doc in <domain>_tipos
        await addDoc(collection(db, collectionName), { nome: name });
        // update local list
        if (createDomain === 'energia') setEnergiaTypes((s) => Array.from(new Set([...s, name])));
        if (createDomain === 'agua') setAguaTypes((s) => Array.from(new Set([...s, name])));
        if (createDomain === 'residuos') setResidueTypes((s) => Array.from(new Set([...s, name])));
        if (createDomain === 'servicos') setServiceTypes((s) => Array.from(new Set([...s, name])));
      } else {
        // fonte
        await addDoc(collection(db, 'fontes_dado'), { nome: name });
        setFonteOptions((s) => Array.from(new Set([...s, name])));
      }
    } catch (error) {
      console.error('Erro ao criar item', error);
    } finally {
      setCreateOpen(false);
      setCreateName('');
    }
  };

  // snackbar for save confirmation
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const handleCloseSnack = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackOpen(false);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'energia_tipos'), orderBy('nome')), (snapshot) => {
      setEnergiaTypes(snapshot.docs.map((docSnap) => docSnap.get('nome') ?? 'Indicador de energia'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'energia_categorias'), orderBy('nome')),
      (snapshot) => {
        setEnergiaCategories(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, nome: docSnap.get('nome') ?? 'Categoria' })),
        );
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'agua_tipos'), orderBy('nome')), (snapshot) => {
      setAguaTypes(snapshot.docs.map((docSnap) => docSnap.get('nome') ?? 'Indicador de água'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'agua_categorias'), orderBy('nome')),
      (snapshot) => {
        setAguaCategories(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, nome: docSnap.get('nome') ?? 'Categoria' })),
        );
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'residuos_tipos'), orderBy('nome')), (snapshot) => {
      setResidueTypes(snapshot.docs.map((docSnap) => docSnap.get('nome') ?? 'Resíduo'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'residuos_categorias'), orderBy('nome')),
      (snapshot) => {
        setResidueCategories(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, nome: docSnap.get('nome') ?? 'Categoria' })),
        );
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'servicos_tipos'), orderBy('nome')), (snapshot) => {
      setServiceTypes(snapshot.docs.map((docSnap) => docSnap.get('nome') ?? 'Serviço'));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // load custom fontes if present
    const unsubscribe = onSnapshot(query(collection(db, 'fontes_dado'), orderBy('nome')), (snapshot) => {
      const remote = snapshot.docs.map((d) => d.get('nome') as string).filter(Boolean);
      setFonteOptions(Array.from(new Set(['manual','energia','agua','residuos','servicos', ...remote])));
    });
    return () => unsubscribe();
  }, []);

  // load filiais list for admin selector
  useEffect(() => {
    if (!profile || profile.role !== 'ADM') return;
    void (async () => {
      try {
        const snaps = await getDocs(collection(db, 'filiais'));
        const list = snaps.docs.map((d) => {
          const data = d.data() as Record<string, unknown> | undefined;

          // helper: try common fields first, then fallback to a recursive search
          const tryFields = (obj?: Record<string, unknown>) => {
            if (!obj) return undefined;
            const candidates = [
              'nome',
              'name',
              'nomeCache',
              'nome_filial',
              'nome_cache',
              'nomeFantasia',
              'fantasia',
              'displayName',
              'razaoSocial',
              'razao_social',
            ];
            for (const key of candidates) {
              const v = (obj as Record<string, unknown>)[key];
              if (typeof v === 'string' && v.trim() !== '') return v;
            }
            return undefined;
          };

          const recursiveSearch = (obj?: Record<string, unknown>): string | undefined => {
            if (!obj) return undefined;
            // shallow try first
            const quick = tryFields(obj);
            if (quick) return quick;
            for (const [k, v] of Object.entries(obj)) {
              if (typeof v === 'string' && /nome|name|fantasia|display|razao/i.test(k) && v.trim() !== '') {
                return v as string;
              }
              if (typeof v === 'object' && v !== null) {
                try {
                  const nested = recursiveSearch(v as Record<string, unknown>);
                  if (nested) return nested;
                } catch {
                  // ignore
                }
              }
            }
            return undefined;
          };

          const nameFromFields = tryFields(data);
          const name = nameFromFields ?? recursiveSearch(data) ?? d.id;
          if (!name || name === d.id) console.debug('Filial sem nome amigável detectado, usando id:', d.id, data);
          return { id: d.id, nome: name };
        });
        setFiliaisOptions(list as IndicatorCategory[]);
      } catch (error) {
        console.error('Erro ao carregar filiais', error);
      }
    })();
  }, [profile]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'servicos_categorias'), orderBy('nome')),
      (snapshot) => {
        setServiceCategories(
          snapshot.docs.map((docSnap) => ({ id: docSnap.id, nome: docSnap.get('nome') ?? 'Categoria' })),
        );
      },
    );
    return () => unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const year = selectedYear;
      const months = Array.from({ length: 12 }).map((_, i) => String(i + 1).padStart(2, '0'));

      const energiaMap = Object.fromEntries(months.map((m) => [m, {} as Record<string, number | ''>]));
      const aguaMap = Object.fromEntries(months.map((m) => [m, {} as Record<string, number | ''>]));
      const residuosMap = Object.fromEntries(months.map((m) => [m, {} as Record<string, number | ''>]));
      const servicosMap = Object.fromEntries(months.map((m) => [m, {} as Record<string, number | ''>]));

      const energiaEntriesMap = new Map<string, IndicatorEntry>();
      const aguaEntriesMap = new Map<string, IndicatorEntry>();
      const residuosEntriesMap = new Map<string, IndicatorEntry>();
      const servicosEntriesMap = new Map<string, IndicatorEntry>();

      // determine if we're loading a single filial or consolidated
      const isConsolidated = selectedFilialId === 'consolidado';
      let filiaisToQuery: { id: string; nome?: string }[] = [];
      if (isConsolidated) {
        // load all filiais from collection
        const snaps = await getDocs(collection(db, 'filiais'));
        filiaisToQuery = snaps.docs.map((d) => ({ id: d.id, nome: d.get('nome') ?? d.get('nomeCache') }));
      } else {
        filiaisToQuery = [{ id: selectedFilialId || context.filialId }];
      }

      // helper to read doc rows
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const readEntry = (row: any): IndicatorEntry => ({
        id: row.id,
        tipo: row.get('tipo') ?? '',
        categoriaId: row.get('categoria_id') ?? '',
        valor:
          row.get('valor') ?? row.get('quantidade_kg') ?? row.get('custo') ?? row.get('consumo') ?? '',
        fonteDado: (row.get('fonte_dado') as string) ?? 'manual',
      });

      for (const month of months) {
        const mesReferencia = `${year}-${month}`;
        // for each filial (single or multiple)
        for (const filial of filiaisToQuery) {
          const docRef = doc(db, 'indicadores_mensais', `${filial.id}_${mesReferencia}`);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) continue;

          // energia
          const energiaSnap = await getDocs(collection(docRef, 'energia_itens'));
          energiaSnap.docs.forEach((d) => {
            const e = readEntry(d);
            if (isConsolidated) {
              const key = (e.tipo || '').trim().toLowerCase() || e.id;
              const aggId = `consol_energia_${key}`;
              energiaMap[month][aggId] = (Number(energiaMap[month][aggId] ?? 0) || 0) + (Number(e.valor ?? 0) || 0);
              if (!energiaEntriesMap.has(aggId)) energiaEntriesMap.set(aggId, { id: aggId, tipo: e.tipo || 'Consolidado', categoriaId: '', valor: '' });
            } else {
              energiaMap[month][e.id] = e.valor as number | '';
              if (!energiaEntriesMap.has(e.id)) energiaEntriesMap.set(e.id, { ...e, valor: '' });
            }
          });

          // agua
          const aguaSnap = await getDocs(collection(docRef, 'agua_itens'));
          aguaSnap.docs.forEach((d) => {
            const e = readEntry(d);
            if (isConsolidated) {
              const key = (e.tipo || '').trim().toLowerCase() || e.id;
              const aggId = `consol_agua_${key}`;
              aguaMap[month][aggId] = (Number(aguaMap[month][aggId] ?? 0) || 0) + (Number(e.valor ?? 0) || 0);
              if (!aguaEntriesMap.has(aggId)) aguaEntriesMap.set(aggId, { id: aggId, tipo: e.tipo || 'Consolidado', categoriaId: '', valor: '' });
            } else {
              aguaMap[month][e.id] = e.valor as number | '';
              if (!aguaEntriesMap.has(e.id)) aguaEntriesMap.set(e.id, { ...e, valor: '' });
            }
          });

          // residuos
          const residuosSnap = await getDocs(collection(docRef, 'residuos'));
          residuosSnap.docs.forEach((d) => {
            const e = readEntry(d);
            if (isConsolidated) {
              const key = (e.tipo || '').trim().toLowerCase() || e.id;
              const aggId = `consol_residuos_${key}`;
              residuosMap[month][aggId] = (Number(residuosMap[month][aggId] ?? 0) || 0) + (Number(e.valor ?? 0) || 0);
              if (!residuosEntriesMap.has(aggId)) residuosEntriesMap.set(aggId, { id: aggId, tipo: e.tipo || 'Consolidado', categoriaId: '', valor: '' });
            } else {
              residuosMap[month][e.id] = e.valor as number | '';
              if (!residuosEntriesMap.has(e.id)) residuosEntriesMap.set(e.id, { ...e, valor: '' });
            }
          });

          // servicos
          const servicosSnap = await getDocs(collection(docRef, 'servicos_gerais'));
          servicosSnap.docs.forEach((d) => {
            const e = readEntry(d);
            if (isConsolidated) {
              const key = (e.tipo || '').trim().toLowerCase() || e.id;
              const aggId = `consol_servicos_${key}`;
              servicosMap[month][aggId] = (Number(servicosMap[month][aggId] ?? 0) || 0) + (Number(e.valor ?? 0) || 0);
              if (!servicosEntriesMap.has(aggId)) servicosEntriesMap.set(aggId, { id: aggId, tipo: e.tipo || 'Consolidado', categoriaId: '', valor: '' });
            } else {
              servicosMap[month][e.id] = e.valor as number | '';
              if (!servicosEntriesMap.has(e.id)) servicosEntriesMap.set(e.id, { ...e, valor: '' });
            }
          });
        }
      }

      setEnergiaMonthly(energiaMap);
      setAguaMonthly(aguaMap);
      setResiduosMonthly(residuosMap);
      setServicosMonthly(servicosMap);

  setEnergiaEntries(energiaEntriesMap.size ? Array.from(energiaEntriesMap.values()) : [emptyEntry()]);
  setAguaEntries(aguaEntriesMap.size ? Array.from(aguaEntriesMap.values()) : [emptyEntry()]);
  setResiduos(residuosEntriesMap.size ? Array.from(residuosEntriesMap.values()) : [emptyEntry()]);
  setServicos(servicosEntriesMap.size ? Array.from(servicosEntriesMap.values()) : [emptyEntry()]);

      setLastLoadedAt(new Date());
    } finally {
      setLoading(false);
    }
      // NOTE: keep context in deps intentionally omitted to avoid reloads when context changes externally
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear, selectedFilialId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateEntries = (
    setter: React.Dispatch<React.SetStateAction<IndicatorEntry[]>>,
    id: string,
    patch: Partial<IndicatorEntry>,
  ) => {
    setter((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeEntry = (
    setter: React.Dispatch<React.SetStateAction<IndicatorEntry[]>>,
    id: string,
  ) => {
    setter((rows) => (rows.length === 1 ? rows : rows.filter((row) => row.id !== id)));
  };

  const addEntry = (
    setter: React.Dispatch<React.SetStateAction<IndicatorEntry[]>>,
    categoriaId?: string,
  ) => {
    setter((rows) => [...rows, emptyEntry(categoriaId)]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const year = selectedYear;
      const months = Array.from({ length: 12 }).map((_, i) => String(i + 1).padStart(2, '0'));

      for (const month of months) {
        const mesReferencia = `${year}-${month}`;
        const docRef = doc(db, 'indicadores_mensais', `${context.filialId}_${mesReferencia}`);

        batch.set(docRef, {
          filial_ref: doc(db, 'filiais', context.filialId),
          mes_ano: mesReferencia,
          atualizado_em: dayjs().toDate(),
        });

        const persistEntriesForMonth = async (
          entries: IndicatorEntry[],
          subcollection: string,
          monthlyMap: Record<string, Record<string, number | ''>>,
        ) => {
          const subcollectionRef = collection(docRef, subcollection);
          const snapshot = await getDocs(subcollectionRef);
          const existingIds = snapshot.docs.map((snapshot) => snapshot.id);

          entries.forEach((entry) => {
            const rowRef = doc(subcollectionRef, entry.id);
            const value = monthlyMap[month]?.[entry.id];
            batch.set(rowRef, {
              tipo: entry.tipo,
              categoria_id: entry.categoriaId || null,
              valor: value === '' || value === undefined ? null : value,
              fonte_dado: entry.fonteDado ?? 'manual',
            });
          });

          existingIds
            .filter((persistedId) => !entries.some((entry) => entry.id === persistedId))
            .forEach((obsoleteId) => batch.delete(doc(subcollectionRef, obsoleteId)));
        };

        // persist each subcollection for this month
        await persistEntriesForMonth(energiaEntries, 'energia_itens', energiaMonthly);
        await persistEntriesForMonth(aguaEntries, 'agua_itens', aguaMonthly);
        await persistEntriesForMonth(residuos, 'residuos', residuosMonthly);
        await persistEntriesForMonth(servicos, 'servicos_gerais', servicosMonthly);
      }

      await batch.commit();
      setLastLoadedAt(new Date());
      // show success confirmation
      setSnackMessage('Dados salvos com sucesso. Você pode sair da página.');
      setSnackSeverity('success');
      setSnackOpen(true);
    } catch (error) {
      console.error('Erro ao salvar', error);
      setSnackMessage('Erro ao salvar os dados. Verifique a conexão e tente novamente.');
      setSnackSeverity('error');
      setSnackOpen(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1.5}
      >
        <Typography variant="caption" color="text.secondary">
          {lastLoadedAt
            ? `Dados carregados em ${dayjs(lastLoadedAt).format('DD/MM/YYYY HH:mm')}`
            : 'Dados ainda não carregados neste contexto.'}
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Autorenew />}
            onClick={onChangeContext}
            sx={{ minWidth: { xs: '100%', sm: 180 } }}
          >
            Trocar contexto
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Refresh />}
            onClick={() => loadData()}
            disabled={loading}
          >
            {loading ? (
              <>
                <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                Recarregando...
              </>
            ) : (
              'Recarregar dados'
            )}
          </Button>
        </Stack>
      </Stack>
      <Card sx={{ maxWidth: 'none', width: 'calc(100% + 64px)', ml: '-32px', mr: '-32px' }}>
        <CardHeader
          // title="Cadastro de indicadores"
          // subheader="Preencha os dados referentes ao período selecionado. Você pode atualizar as informações a qualquer momento."
          titleTypographyProps={{ variant: 'h6' }}
          subheaderTypographyProps={{ variant: 'body2' }}
          sx={{ pb: 2 }}
        />
        <CardContent sx={{ pt: 0 }}>
          <Stack spacing={2.5}>
            <Tabs
              value={tab}
              onChange={(_, value) => setTab(value)}
              aria-label="Categorias de indicadores"
              variant="scrollable"
              allowScrollButtonsMobile
            >
              <Tab value="energia" label="Energia" />
              <Tab value="agua" label="Água" />
              <Tab value="residuos" label="Resíduos" />
              <Tab value="servicos" label="Serviços gerais" />
            </Tabs>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <DatePicker
                label="Ano"
                views={["year"]}
                value={dayjs().year(selectedYear)}
                onChange={(value) => value && setSelectedYear(value.year())}
                slotProps={{ textField: { size: 'small' } }}
              />
              {profile && profile.role === 'ADM' && (
                <TextField
                  select
                  size="small"
                  label="Filial / Consolidado"
                  value={displaySelectedFilialId}
                  onChange={(e) => setSelectedFilialId(e.target.value)}
                  sx={{ minWidth: 260 }}
                >
                  <MenuItem value="consolidado">Consolidado (todas as filiais)</MenuItem>
                  {filiaisOptions.map((f) => (
                    <MenuItem key={f.id} value={f.id}>{f.nome}</MenuItem>
                  ))}
                </TextField>
              )}
              <Typography variant="body2" color="text.secondary">
                Ano atual: {selectedYear}. Os valores podem ser editados por mês na planilha abaixo.
              </Typography>
            </Stack>

            {tab === 'energia' && (
              <Stack spacing={2.5}>
                {renderIndicatorSections({
                  sections: energiaSections,
                  entries: energiaEntries,
                  typeOptions: energiaTypeOptions,
                  categories: energiaCategories,
                  onAdd: (categoriaId) => addEntry(setEnergiaEntries, categoriaId),
                  onUpdate: (id, patch) => updateEntries(setEnergiaEntries, id, patch),
                  onRemove: (id) => removeEntry(setEnergiaEntries, id),
                  description: 'Registre os indicadores de energia pertencentes a este grupo.',
                  monthlyMap: energiaMonthly,
                  onMonthValueChange: onEnergiaMonthChange,
                  domain: 'energia',
                  onRequestCreate: openCreate,
                  fonteOptions: fonteOptions,
                  editingMonth: editingMonth,
                  onToggleEditMonth: handleToggleEditMonth,
                })}
              </Stack>
            )}

            {tab === 'agua' && (
              <Stack spacing={2.5}>
                {renderIndicatorSections({
                  sections: aguaSections,
                  entries: aguaEntries,
                  typeOptions: aguaTypeOptions,
                  categories: aguaCategories,
                  onAdd: (categoriaId) => addEntry(setAguaEntries, categoriaId),
                  onUpdate: (id, patch) => updateEntries(setAguaEntries, id, patch),
                  onRemove: (id) => removeEntry(setAguaEntries, id),
                  description: 'Registre os indicadores de água pertencentes a este grupo.',
                  monthlyMap: aguaMonthly,
                  onMonthValueChange: onAguaMonthChange,
                  domain: 'agua',
                  onRequestCreate: openCreate,
                  fonteOptions: fonteOptions,
                  editingMonth: editingMonth,
                  onToggleEditMonth: handleToggleEditMonth,
                })}
              </Stack>
            )}

            {tab === 'residuos' && (
              <Stack spacing={2.5}>
                {renderIndicatorSections({
                  sections: residueSections,
                  entries: residuos,
                  typeOptions: residueTypeOptions,
                  categories: residueCategories,
                  onAdd: (categoriaId) => addEntry(setResiduos, categoriaId),
                  onUpdate: (id, patch) => updateEntries(setResiduos, id, patch),
                  onRemove: (id) => removeEntry(setResiduos, id),
                  description: 'Registre os resíduos pertencentes a este grupo.',
                  monthlyMap: residuosMonthly,
                  onMonthValueChange: onResiduosMonthChange,
                  domain: 'residuos',
                  onRequestCreate: openCreate,
                  fonteOptions: fonteOptions,
                  editingMonth: editingMonth,
                  onToggleEditMonth: handleToggleEditMonth,
                })}
              </Stack>
            )}

            {tab === 'servicos' && (
              <Stack spacing={2.5}>
                {renderIndicatorSections({
                  sections: serviceSections,
                  entries: servicos,
                  typeOptions: serviceTypeOptions,
                  categories: serviceCategories,
                  onAdd: (categoriaId) => addEntry(setServicos, categoriaId),
                  onUpdate: (id, patch) => updateEntries(setServicos, id, patch),
                  onRemove: (id) => removeEntry(setServicos, id),
                  description: 'Registre os serviços pertencentes a este grupo.',
                  monthlyMap: servicosMonthly,
                  onMonthValueChange: onServicosMonthChange,
                  domain: 'servicos',
                  onRequestCreate: openCreate,
                  fonteOptions: fonteOptions,
                  editingMonth: editingMonth,
                  onToggleEditMonth: handleToggleEditMonth,
                })}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{createKind === 'tipo' ? 'Criar novo tipo' : 'Criar nova fonte do dado'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {createKind === 'tipo'
              ? 'Insira o nome do novo tipo. Ele ficará disponível para seleção nesta aba.'
              : 'Insira o nome da nova fonte de dado. Ela ficará disponível nas opções.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={createKind === 'tipo' ? 'Nome do tipo' : 'Nome da fonte'}
            fullWidth
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button onClick={() => void handleCreateSave()} variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<Refresh />}
            onClick={() => loadData()}
            disabled={loading}
          >
            {loading ? (
              <>
                <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                Recarregando...
              </>
            ) : (
              'Recarregar dados'
            )}
          </Button>
          <Tooltip title={selectedFilialId === 'consolidado' ? 'Não é possível salvar no modo consolidado' : 'Salvar todas as informações do contexto atual'}>
            <span>
              <Button
                variant="contained"
                size="large"
                startIcon={<Save />}
                disabled={saving || loading || selectedFilialId === 'consolidado'}
                onClick={handleSave}
                sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' }, px: { sm: 4 } }}
              >
                {saving ? (
                  <>
                    <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                    Salvando...
                  </>
                ) : (
                  'Salvar tudo'
                )}
              </Button>
            </span>
          </Tooltip>
        </Stack>
        <Snackbar open={snackOpen} autoHideDuration={5000} onClose={handleCloseSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <Alert onClose={handleCloseSnack} severity={snackSeverity} sx={{ width: '100%' }}>
            {snackMessage}
          </Alert>
        </Snackbar>
    </Stack>
  );
};
