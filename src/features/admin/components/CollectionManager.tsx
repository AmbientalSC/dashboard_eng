import { LoadingButton } from '@mui/lab';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../../firebase/app';

interface CollectionItem {
  id: string;
  nome: string;
}

interface CollectionManagerProps {
  collectionPath: string;
  title: string;
  description?: string;
  inputLabel: string;
  addButtonLabel?: string;
  emptyMessage?: string;
  warningDeleteMessage?: string;
}

export const CollectionManager = ({
  collectionPath,
  title,
  description,
  inputLabel,
  addButtonLabel = 'Adicionar',
  emptyMessage = 'Nenhum item cadastrado.',
  warningDeleteMessage,
}: CollectionManagerProps) => {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const itemsQuery = query(collection(db, collectionPath), orderBy('nome'));
    const unsubscribe = onSnapshot(itemsQuery, (snapshot) => {
      setItems(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          nome: docSnap.get('nome') ?? 'Item sem nome',
        })),
      );
    });
    return () => unsubscribe();
  }, [collectionPath]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await addDoc(collection(db, collectionPath), { nome: trimmed });
      setNewName('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: CollectionItem) => {
    if (warningDeleteMessage) {
      const confirmed = window.confirm(warningDeleteMessage.replace('{item}', item.nome));
      if (!confirmed) return;
    }
    await deleteDoc(doc(db, collectionPath, item.id));
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="h6">{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          )}
        </Stack>

        <Stack
          component="form"
          onSubmit={handleCreate}
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <TextField
            label={inputLabel}
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
            fullWidth
          />
          <LoadingButton
            type="submit"
            variant="contained"
            startIcon={<Add />}
            loading={saving}
            sx={{ minWidth: { sm: 200 } }}
          >
            {addButtonLabel}
          </LoadingButton>
        </Stack>

        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Remover">
                      <IconButton
                        aria-label={`Remover ${item.nome}`}
                        onClick={() => void handleDelete(item)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography variant="body2" color="text.secondary">
                      {emptyMessage}
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
};
