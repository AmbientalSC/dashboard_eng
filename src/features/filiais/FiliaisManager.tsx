import { LoadingButton } from '@mui/lab';
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit } from '@mui/icons-material';
import { db } from '../../firebase/app';

interface Filial {
  id: string;
  nomeFantasia: string;
  cnpj: string;
  ativo: boolean;
}

interface FilialFormData {
  nomeFantasia: string;
  cnpj: string;
  ativo: boolean;
}

const emptyForm: FilialFormData = {
  nomeFantasia: '',
  cnpj: '',
  ativo: true,
};

interface FiliaisManagerProps {
  compact?: boolean;
}

export const FiliaisManager = ({ compact = false }: FiliaisManagerProps) => {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FilialFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const filiaisQuery = query(collection(db, 'filiais'), orderBy('nome_fantasia'));
    const unsubscribe = onSnapshot(
      filiaisQuery,
      (snapshot) => {
        setFiliais(
          snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            nomeFantasia: docSnap.get('nome_fantasia') ?? 'Filial',
            cnpj: docSnap.get('cnpj') ?? '',
            ativo: docSnap.get('ativo') ?? true,
          })),
        );
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao carregar filiais', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const title = useMemo(() => (editingId ? 'Editar filial' : 'Nova filial'), [editingId]);

  const openCreateDialog = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEditDialog = (filial: Filial) => {
    setFormData({
      nomeFantasia: filial.nomeFantasia,
      cnpj: filial.cnpj,
      ativo: filial.ativo,
    });
    setEditingId(filial.id);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleChange =
    (field: keyof FilialFormData) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = field === 'ativo' ? event.target.checked : event.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload = {
        nome_fantasia: formData.nomeFantasia.trim(),
        cnpj: formData.cnpj.trim(),
        ativo: formData.ativo,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'filiais', editingId), payload);
      } else {
        await addDoc(collection(db, 'filiais'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      setDialogOpen(false);
    } catch (error) {
      console.error('Erro ao salvar filial', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (filial: Filial) => {
    const confirmed = window.confirm(
      `Tem certeza de que deseja remover a filial "${filial.nomeFantasia}"?`,
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, 'filiais', filial.id));
    } catch (error) {
      console.error('Erro ao excluir filial', error);
    }
  };

  const tableContent = loading ? (
    <Typography color="text.secondary">Carregando filiais...</Typography>
  ) : filiais.length === 0 ? (
    <Typography color="text.secondary">Nenhuma filial cadastrada no momento.</Typography>
  ) : (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Nome fantasia</TableCell>
          <TableCell>CNPJ</TableCell>
          <TableCell>Ativa</TableCell>
          <TableCell align="right">Ações</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filiais.map((filial) => (
          <TableRow key={filial.id}>
            <TableCell>{filial.nomeFantasia}</TableCell>
            <TableCell>{filial.cnpj || 'Não informado'}</TableCell>
            <TableCell>{filial.ativo ? 'Sim' : 'Não'}</TableCell>
            <TableCell align="right">
              <IconButton aria-label="Editar filial" onClick={() => openEditDialog(filial)} size="small">
                <Edit />
              </IconButton>
              <IconButton
                aria-label="Excluir filial"
                onClick={() => handleDelete(filial)}
                color="error"
                size="small"
              >
                <Delete />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <>
      {compact ? (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
            <Box>
              <Typography variant="h6">Filiais</Typography>
              <Typography variant="body2" color="text.secondary">
                Controle as unidades disponíveis para lançamentos.
              </Typography>
            </Box>
            <Button startIcon={<Add />} variant="contained" onClick={openCreateDialog}>
              Nova filial
            </Button>
          </Stack>
          <Paper variant="outlined" sx={{ maxHeight: 360, overflow: 'auto' }}>
            {tableContent}
          </Paper>
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            gap={2}
            mb={3}
          >
            <Box>
              <Typography variant="h6">Gerenciamento de filiais</Typography>
              <Typography variant="body2" color="text.secondary">
                Cadastre, edite e desative filiais disponíveis para os usuários.
              </Typography>
            </Box>
            <Button startIcon={<Add />} variant="contained" onClick={openCreateDialog}>
              Nova filial
            </Button>
          </Stack>
          {tableContent}
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          <Stack
            component="form"
            onSubmit={handleSubmit}
            spacing={3}
            sx={{ mt: 1 }}
          >
            <TextField
              label="Nome fantasia"
              value={formData.nomeFantasia}
              onChange={handleChange('nomeFantasia')}
              required
              autoFocus
            />
            <TextField
              label="CNPJ"
              value={formData.cnpj}
              onChange={handleChange('cnpj')}
              inputProps={{ maxLength: 18 }}
              helperText="Opcional. Utilize apenas números ou o formato 00.000.000/0000-00."
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography>Ativa</Typography>
              <Switch checked={formData.ativo} onChange={handleChange('ativo')} />
            </Stack>
            <LoadingButton type="submit" variant="contained" loading={saving}>
              Salvar filial
            </LoadingButton>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={saving}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
