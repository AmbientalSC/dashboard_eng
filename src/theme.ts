import { alpha, createTheme } from '@mui/material/styles';

const primaryMain = '#0f7a66';
const secondaryMain = '#1e88e5';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      light: '#49a08b',
      dark: '#085643',
      contrastText: '#ffffff',
    },
    secondary: {
      main: secondaryMain,
      light: '#64b5f6',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f2f7f7',
      paper: '#ffffff',
    },
    success: {
      main: '#2fa26a',
    },
    warning: {
      main: '#f9a826',
    },
    error: {
      main: '#d9534f',
    },
    divider: alpha('#1b4d4a', 0.12),
    text: {
      primary: '#143942',
      secondary: '#5c6f79',
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: `'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif`,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '#root': {
          minHeight: '100vh',
        },
        body: {
          background: `radial-gradient(circle at 0% 0%, ${alpha(primaryMain, 0.12)} 0%, transparent 45%), radial-gradient(circle at 110% 10%, ${alpha(
            secondaryMain,
            0.14,
          )} 0%, transparent 40%), #f2f7f7`,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: alpha('#ffffff', 0.9),
          color: '#12343f',
          backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${alpha('#0b2f33', 0.08)}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow:
            '0px 10px 30px rgba(13, 64, 63, 0.08), 0px 1px 10px rgba(13, 64, 63, 0.04)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        title: {
          fontWeight: 600,
        },
        subheader: {
          color: '#5c6f79',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingInline: 24,
        },
        sizeLarge: {
          paddingBlock: 12,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        notchedOutline: {
          borderColor: alpha('#0b2f33', 0.16),
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: alpha(primaryMain, 0.06),
          '& .MuiTableCell-root': {
            fontWeight: 600,
            color: '#13424c',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default appTheme;
