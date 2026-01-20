import CircularProgress from '@mui/material/CircularProgress';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { httpsCallable } from 'firebase/functions';
import { collection, getDocs, orderBy, query, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { FiliaisManager } from '../filiais/FiliaisManager';
import { ResidueTypesManager } from '../residuos/ResidueTypesManager';
import { ResidueCategoriesManager } from '../residuos/ResidueCategoriesManager';
import { ServiceTypesManager } from '../servicos/ServiceTypesManager';
import { ServiceCategoriesManager } from '../servicos/ServiceCategoriesManager';
import { EnergyTypesManager } from '../energia/EnergyTypesManager';
import { EnergyCategoriesManager } from '../energia/EnergyCategoriesManager';
import { WaterTypesManager } from '../agua/WaterTypesManager';
import { WaterCategoriesManager } from '../agua/WaterCategoriesManager';
import { db, functions, firebaseApp, auth } from '../../firebase/app';

interface AdminSettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

type Role = 'ADM' | 'USUARIO';

interface FilialOption {
  id: string;
  nome: string;
}

interface UserSummary {
  id: string;
  nome: string;
  email: string;
  role: Role;
  filiais: string[];
  ativo?: boolean;
}

const defaultRole: Role = 'USUARIO';

export const AdminSettingsDialog = ({ open, onClose }: AdminSettingsDialogProps) => {
  const [tab, setTab] = useState<
    'filiais' | 'usuarios' | 'energia' | 'agua' | 'residuos' | 'servicos'
  >('filiais');
  const [filiais, setFiliais] = useState<FilialOption[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(defaultRole);
  const [selectedFiliais, setSelectedFiliais] = useState<FilialOption[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string }>();
  const [editSaving, setEditSaving] = useState(false);
  const [generateTempPassword, setGenerateTempPassword] = useState(false);
  const [ativo, setAtivo] = useState(true);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string }>();

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const filiaisSnap = await getDocs(query(collection(db, 'filiais'), orderBy('nome_fantasia')));
        setFiliais(
          filiaisSnap.docs.map((docSnap) => ({
            id: docSnap.id,
            nome: docSnap.get('nome_fantasia') ?? 'Filial',
          })),
        );

        const usersSnap = await getDocs(query(collection(db, 'usuarios'), orderBy('nome')));
        setUsers(
          usersSnap.docs.map((docSnap) => {
            const rawFiliais = docSnap.get('filiais_acesso');
            const filiaisArray = Array.isArray(rawFiliais)
              ? (rawFiliais as Array<{ nomeCache?: string }>)
              : rawFiliais && typeof rawFiliais === 'object'
              ? Object.values(rawFiliais as Record<string, { nomeCache?: string }>)
              : [];

            return {
              id: docSnap.id,
              nome: docSnap.get('nome') ?? 'Usuário',
              email: docSnap.get('email') ?? '',
              role: docSnap.get('role') ?? defaultRole,
              filiais: filiaisArray.map((item) => item?.nomeCache ?? 'Filial'),
              ativo: typeof docSnap.get('ativo') === 'boolean' ? docSnap.get('ativo') : true,
            };
          }),
        );
      } catch (error) {
        console.error('Erro ao carregar filiais/usuarios', error);
      }
    })();

    return () => {
      // no-op: we used one-time fetches instead of real-time listeners
    };
  }, [open]);

  const openEditDialog = async (userId: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'usuarios', userId));
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setEditingUserId(userId);
      setNome((data?.nome as string) ?? '');
      setEmail((data?.email as string) ?? '');
      setRole((data?.role as Role) ?? defaultRole);
      const rawFiliais = data?.filiais_acesso;
      const filiaisArray = Array.isArray(rawFiliais)
        ? (rawFiliais as Array<{ filialId?: string; nomeCache?: string }>)
        : rawFiliais && typeof rawFiliais === 'object'
        ? Object.values(rawFiliais as Record<string, { filialId?: string; nomeCache?: string }>)
        : [];
      const selected = filiaisArray
        .map((item) => filiais.find((f) => f.id === item.filialId) ?? { id: item.filialId ?? '', nome: item.nomeCache ?? 'Filial' })
        .filter((f) => f && f.id);
      setSelectedFiliais(selected as FilialOption[]);
      setAtivo(Boolean(data?.ativo ?? true));
    } catch (error) {
      console.error('Erro ao abrir edição do usuário', error);
    }
  };

  useEffect(() => {
    if (!open) {
      setTab('filiais');
      setFeedback(undefined);
      setNome('');
      setEmail('');
      setPassword('');
      setRole(defaultRole);
      setSelectedFiliais([]);
    }
  }, [open]);

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(undefined);

    try {
      if (!nome.trim() || !email.trim() || !password.trim()) {
        throw new Error('Preencha todos os campos obrigatórios.');
      }
      if (role !== 'ADM' && selectedFiliais.length === 0) {
        throw new Error('Selecione ao menos uma filial para o usuário.');
      }

      const callable = httpsCallable(functions, 'createUser');
      await callable({
        nome: nome.trim(),
        email: email.trim(),
        password,
        role,
        filiais:
          role === 'ADM' ? filiais.map((item) => item.id) : selectedFiliais.map((item) => item.id),
      });

      setFeedback({ type: 'success', message: 'Usuário criado com sucesso.' });
      setNome('');
      setEmail('');
      setPassword('');
      setRole(defaultRole);
      setSelectedFiliais([]);
    } catch (error: unknown) {
      console.error('Erro ao criar usuário', error);
      const message = error instanceof Error ? error.message : String(error ?? 'Não foi possível criar o usuário.');
      setFeedback({
        type: 'error',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFiliaisChange = (_: unknown, values: FilialOption[]) => {
    setSelectedFiliais(values);
  };

  const handleEditClose = () => {
    setEditingUserId(null);
    setEditFeedback(undefined);
    setGenerateTempPassword(false);
    setPassword('');
    setNome('');
    setEmail('');
    setRole(defaultRole);
    setSelectedFiliais([]);
    setAtivo(true);
  };

  const generatePassword = () => {
    try {
      const arr = new Uint8Array(12);
      crypto.getRandomValues(arr);
      // convert bytes to base64-like string (safe chars)
      const pw = Array.from(arr).map((v) => (v % 36).toString(36)).join('');
      return pw;
    } catch {
      // fallback
      return Math.random().toString(36).slice(2, 14);
    }
  };

  const handleEditSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUserId) return;
    setEditSaving(true);
    setEditFeedback(undefined);
    try {
      const callable = httpsCallable(functions, 'updateUser');
      let newPassword = password;
      if (generateTempPassword) {
        newPassword = generatePassword();
      }
      const payload: Record<string, unknown> = { uid: editingUserId };
      if (nome) payload.nome = nome.trim();
      if (email) payload.email = email.trim();
      if (typeof newPassword === 'string' && newPassword.length) payload.password = newPassword;
      if (typeof role === 'string') payload.role = role;
      if (typeof ativo === 'boolean') payload.ativo = ativo;
      // build filiais id list
      if (role === 'ADM') {
        payload.filiais = filiais.map((f) => f.id);
      } else {
        payload.filiais = selectedFiliais.map((f) => f.id);
      }

      let called = false;
      try {
        await callable(payload);
        called = true;
      } catch (err) {
        // try fallback to HTTP endpoint if CORS blocks callable
        console.warn('Callable updateUser failed, trying HTTP fallback', err);
      }

      if (!called) {
        // Build URL using project id from firebaseApp config
        try {
          const projectId = (firebaseApp.options as any).projectId;
          const url = `https://southamerica-east1-${projectId}.cloudfunctions.net/updateUserHttp`;
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) throw new Error('HTTP updateUser failed');
        } catch (error) {
          throw error;
        }
      }
      setEditFeedback({ type: 'success', message: 'Usuário atualizado com sucesso.' });
      if (generateTempPassword && newPassword) {
        setEditFeedback({ type: 'success', message: `Usuário atualizado. Senha temporária: ${newPassword}` });
      }
      // reset after success
      setTimeout(() => handleEditClose(), 1500);
    } catch (error: unknown) {
      console.error('Erro ao atualizar usuário', error);
      const message = error instanceof Error ? error.message : String(error ?? 'Erro');
      setEditFeedback({ type: 'error', message });
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Gerenciar ambiente</DialogTitle>
      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        <Stack spacing={3}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            aria-label="Configurações administrativas"
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label="Filiais" value="filiais" />
            <Tab label="Usuários" value="usuarios" />
            <Tab label="Energia" value="energia" />
            <Tab label="Água" value="agua" />
            <Tab label="Resíduos" value="residuos" />
            <Tab label="Serviços" value="servicos" />
          </Tabs>

          {tab === 'filiais' && <FiliaisManager compact />}

          {tab === 'usuarios' && (
            <Stack spacing={4}>
              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Stack component="form" onSubmit={handleCreateUser} spacing={2}>
                  <Typography variant="h6">Criar novo usuário</Typography>
                  {feedback && (
                    <Alert
                      severity={feedback.type}
                      onClose={() => setFeedback(undefined)}
                      variant="outlined"
                    >
                      {feedback.message}
                    </Alert>
                  )}
                  <TextField
                    label="Nome completo"
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    required
                  />
                  <TextField
                    label="E-mail corporativo"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <TextField
                    label="Senha temporária"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <FormControl fullWidth>
                    <InputLabel id="role-select-label">Perfil de acesso</InputLabel>
                    <Select
                      labelId="role-select-label"
                      label="Perfil de acesso"
                      value={role}
                      onChange={(event) => setRole(event.target.value as Role)}
                    >
                      <MenuItem value="ADM">Administrador</MenuItem>
                      <MenuItem value="USUARIO">Usuário</MenuItem>
                    </Select>
                  </FormControl>

                  {role !== 'ADM' && (
                    <Autocomplete
                      multiple
                      options={filiais}
                      value={selectedFiliais}
                      getOptionLabel={(option) => option.nome}
                      onChange={handleFiliaisChange}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Filiais autorizadas"
                          helperText="Selecione todas as unidades que o usuário poderá acessar."
                        />
                      )}
                    />
                  )}
                  <FormControlLabel
                    control={<Switch checked={ativo} onChange={() => setAtivo((v) => !v)} />}
                    label={ativo ? 'Ativo' : 'Desativado'}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
                  >
                    {saving ? (
                      <>
                        <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                        Criando...
                      </>
                    ) : (
                      'Criar usuário'
                    )}
                  </Button>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" gutterBottom>
                  Usuários ativos
                </Typography>
                <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nome</TableCell>
                        <TableCell>E-mail</TableCell>
                        <TableCell>Perfil</TableCell>
                        <TableCell>Filiais</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                          {users.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell>{user.nome}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>{user.role}</TableCell>
                              <TableCell>
                                {user.role === 'ADM'
                                  ? 'Todas'
                                  : user.filiais.length
                                  ? user.filiais.join(', ')
                                  : 'Nenhuma'}
                              </TableCell>
                              <TableCell>{user.ativo ? 'Ativo' : 'Desativado'}</TableCell>
                              <TableCell>
                                <Button size="small" variant="outlined" onClick={() => void openEditDialog(user.id)}>
                                  Editar
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                  </Table>
                </Box>
              </Paper>
            </Stack>
          )}

          {/* Edit user dialog */}
          <Dialog open={Boolean(editingUserId)} onClose={handleEditClose} fullWidth maxWidth="sm">
            <DialogTitle>Editar usuário</DialogTitle>
            <Box component="form" onSubmit={handleEditSave}>
              <DialogContent dividers>
                {editFeedback && (
                  <Alert severity={editFeedback.type} onClose={() => setEditFeedback(undefined)} variant="outlined">
                    {editFeedback.message}
                  </Alert>
                )}
                <Stack spacing={2} sx={{ mt: 1 }}>
                  <TextField label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} required />
                  <TextField label="E-mail corporativo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <FormControl fullWidth>
                    <InputLabel id="edit-role-select">Perfil de acesso</InputLabel>
                    <Select labelId="edit-role-select" label="Perfil de acesso" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                      <MenuItem value="ADM">Administrador</MenuItem>
                      <MenuItem value="USUARIO">Usuário</MenuItem>
                    </Select>
                  </FormControl>
                  {role !== 'ADM' && (
                    <Autocomplete
                      multiple
                      options={filiais}
                      value={selectedFiliais}
                      getOptionLabel={(option) => option.nome}
                      onChange={(_, values) => setSelectedFiliais(values)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Filiais autorizadas"
                          helperText="Selecione todas as unidades que o usuário poderá acessar."
                        />
                      )}
                    />
                  )}
                  <FormControlLabel
                    control={<Switch checked={generateTempPassword} onChange={() => setGenerateTempPassword((v) => !v)} />}
                    label="Gerar nova senha temporária"
                  />
                </Stack>
              </DialogContent>
                <DialogActions>
                <Button onClick={handleEditClose}>Cancelar</Button>
                <Button type="submit" variant="contained" disabled={editSaving}>
                  {editSaving ? (
                    <>
                      <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </DialogActions>
            </Box>
          </Dialog>

          {tab === 'energia' && (
            <Stack spacing={3}>
              <EnergyTypesManager />
              <EnergyCategoriesManager />
            </Stack>
          )}

          {tab === 'agua' && (
            <Stack spacing={3}>
              <WaterTypesManager />
              <WaterCategoriesManager />
            </Stack>
          )}

          {tab === 'residuos' && (
            <Stack spacing={3}>
              <ResidueTypesManager />
              <ResidueCategoriesManager />
            </Stack>
          )}

          {tab === 'servicos' && (
            <Stack spacing={3}>
              <ServiceTypesManager />
              <ServiceCategoriesManager />
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fechar</Button>
      </DialogActions>
    </Dialog>
  );
};
