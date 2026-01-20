import { Box, Typography, type BoxProps } from '@mui/material';
import ambientalLogo from '/ambiental.svg?url';

export type BrandLogoVariant = 'stacked' | 'horizontal';

interface BrandLogoProps extends BoxProps {
  size?: number;
  variant?: BrandLogoVariant;
  withSubtitle?: boolean;
}

export const BrandLogo = ({
  size = 40,
  variant = 'horizontal',
  withSubtitle = false,
  sx,
  ...rest
}: BrandLogoProps) => {
  const image = (
    <Box
      component="img"
      src={ambientalLogo}
      alt="Ambiental"
      sx={{ display: 'block', height: size, width: 'auto' }}
    />
  );

  if (!withSubtitle) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: variant === 'horizontal' ? 'center' : 'flex-start',
          gap: 1,
          ...sx,
        }}
        {...rest}
      >
        {image}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: variant === 'horizontal' ? 'flex-start' : 'center',
        gap: 1,
        ...sx,
      }}
      {...rest}
    >
      {image}
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        Indicadores de desempenho ambiental
      </Typography>
    </Box>
  );
};
