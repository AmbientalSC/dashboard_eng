import { LoadingButton } from '@mui/lab';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { BrandLogo } from '../components/BrandLogo';
import { auth } from '../firebase/app';

const highlights = [
  {
    title: 'Indicadores consolidados',
    description: 'Acompanhe custos mensais por categoria com visualizações intuitivas.',
  },
  {
    title: 'Gestão por unidade',
    description: 'Gerencie filiais, permissões e lançamentos em um único painel.',
  },
  {
    title: 'Resultados confiáveis',
    description: 'Dados integrados, sempre alinhados ao padrão Ambiental.',
  },
];

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      console.error('Erro ao autenticar usuário', err);
      setError('Não foi possível autenticar. Verifique suas credenciais.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        backgroundColor: 'transparent',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 6,
          px: { md: 6, lg: 8 },
          py: { md: 6, lg: 8 },
          background: (theme) =>
            `linear-gradient(140deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 55%, rgba(255,255,255,0.35) 100%)`,
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.35,
            background:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4) 0%, transparent 50%)',
          }}
        />

        <Stack spacing={5} sx={{ position: 'relative' }}>
          <BrandLogo size={60} withSubtitle />

          <Stack spacing={3} maxWidth={420}>
            {highlights.map((item) => (
              <Box key={item.title}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85 }}>
                  {item.description}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>

        <Typography variant="caption" sx={{ position: 'relative', opacity: 0.85 }}>
          Ambiental {new Date().getFullYear()} - Todos os direitos reservados.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: { xs: 3, sm: 6 },
          py: { xs: 6, sm: 8 },
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 440 }}>
          <CardContent sx={{ p: { xs: 4, sm: 5 }, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Stack spacing={1}>
              <Typography variant="h4">Bem-vindo(a)</Typography>
              <Typography variant="body1" color="text.secondary">
                Entre com seu e-mail corporativo para acessar os indicadores ambientais.
              </Typography>
            </Stack>

            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                {error && (
                  <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
                <TextField
                  label="E-mail corporativo"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  fullWidth
                  autoFocus
                />
                <TextField
                  label="Senha"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  fullWidth
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <LoadingButton
                  type="submit"
                  variant="contained"
                  size="large"
                  loading={submitting}
                  disabled={submitting}
                >
                  Entrar
                </LoadingButton>
              </Stack>
            </form>

            <Divider flexItem />

            <Typography variant="body2" color="text.secondary" textAlign="center">
              Esqueceu a senha ou precisa de ajuda?{' '}
              <Link href="mailto:suporte@ambiental.br" underline="hover">
                Fale com o administrador.
              </Link>
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
