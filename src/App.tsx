import { CircularProgress, CssBaseline, Box } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt-br';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import appTheme from './theme';

const AppContent = () => {
  const { firebaseUser, loading } = useAuth();

  if (loading) {
    return (
      <Box minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return firebaseUser ? <Dashboard /> : <Login />;
};

export const App = () => (
  <ThemeProvider theme={appTheme}>
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LocalizationProvider>
  </ThemeProvider>
);

export default App;
