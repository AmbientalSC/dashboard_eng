import { Logout } from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { BrandLogo } from '../BrandLogo';
import { useAuth } from '../../providers/AuthProvider';

const getInitials = (value?: string) =>
  value
    ?.split(' ')
    .map((chunk) => chunk.trim().charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || undefined;

interface DashboardLayoutProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  hero?: ReactNode;
  centerContent?: ReactNode;
  children: ReactNode;
  density?: 'comfortable' | 'compact';
}

export const DashboardLayout = ({
  title,
  description,
  actions,
  hero,
  centerContent,
  children,
  density = 'comfortable',
}: DashboardLayoutProps) => {
  const { profile, signOut } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const initials = getInitials(profile?.nome);
  const isCompact = density === 'compact';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppBar position="sticky" color="transparent">
        <Toolbar sx={{ gap: { xs: 2, sm: 3 }, py: 1.5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <BrandLogo size={isMobile ? 36 : 44} sx={{ display: 'flex' }} />
            <Box>
              <Typography variant="subtitle1" sx={{ lineHeight: 1.2 }}>
                Ambiental Indicadores
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Painel de monitoramento
              </Typography>
            </Box>
          </Stack>

          {/* center content (e.g. selected context) positioned visually in the middle of the appbar */}
          {centerContent && (
            <Box
              sx={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: { xs: 'none', sm: 'flex' },
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {centerContent}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {actions && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>{actions}</Box>
          )}

          {profile && (
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack spacing={0.5} sx={{ textAlign: 'right', display: { xs: 'none', sm: 'flex' } }}>
                <Typography variant="subtitle2">{profile.nome}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {profile.role === 'ADM' ? 'Administrador' : 'Usuário'}
                </Typography>
              </Stack>
              <Avatar
                alt={profile.nome}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.18),
                  color: theme.palette.primary.dark,
                  fontWeight: 600,
                }}
              >
                {initials}
              </Avatar>
              {isMobile ? (
                <Tooltip title="Sair">
                  <IconButton color="inherit" onClick={() => void signOut()}>
                    <Logout />
                  </IconButton>
                </Tooltip>
              ) : (
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<Logout />}
                  onClick={() => void signOut()}
                >
                  Sair
                </Button>
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {hero && (
        <Box
          sx={{
            background: `linear-gradient(135deg, ${alpha(
              theme.palette.primary.main,
              0.16,
            )} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ py: isCompact ? { xs: 2.5, md: 3.5 } : { xs: 4, md: 5.5 } }}>{hero}</Box>
          </Container>
        </Box>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          width: '100%',
          py: isCompact ? { xs: 3, md: 4 } : { xs: 4, md: 6 },
        }}
      >
        <Container maxWidth="xl">
          {(title || description) && (
            <Stack spacing={1.25} sx={{ mb: isCompact ? { xs: 2.5, md: 3.5 } : { xs: 3, md: 4 } }}>
              {title && (
                <Typography
                  variant={isMobile ? 'h6' : isCompact ? 'h5' : 'h4'}
                  color="text.primary"
                >
                  {title}
                </Typography>
              )}
              {description && (
                <Typography
                  variant={isCompact ? 'body2' : 'body1'}
                  color="text.secondary"
                  maxWidth={720}
                >
                  {description}
                </Typography>
              )}
            </Stack>
          )}
          {children}
        </Container>
      </Box>
    </Box>
  );
};
