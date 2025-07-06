import React from 'react';
import { Paper, Typography, Box, Grid } from '@mui/material';

const StatCard = ({ title, value, description, icon, color }) => {
  return (
    <Grid item xs={12} sm={6} md={3}>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          height: 140,
          bgcolor: color || 'primary.light',
          color: 'white'
        }}
        elevation={3}
      >
        <Typography component="h2" variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography component="p" variant="h3">
          {value}
        </Typography>
        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center' }}>
          {icon}
          <Typography variant="body2" sx={{ ml: 1 }}>
            {description}
          </Typography>
        </Box>
      </Paper>
    </Grid>
  );
};

export default StatCard;