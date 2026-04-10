import React, { createContext, useState, useContext } from 'react';

// 1. Criamos a nossa "Nuvem"
const ThemeContext = createContext<any>(null);

// 2. O Provedor que vai envolver a aplicação toda
export const ThemeProvider = ({ children }: any) => {
  const [isDark, setIsDark] = useState(false); // Começa no modo claro

  // A nossa paleta de cores inteligente
  const theme = {
    isDark,
    bg: isDark ? '#121212' : '#F4F6F9',
    card: isDark ? '#1E1E1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#121212',
    textSec: isDark ? '#AAAAAA' : '#8E8E93',
    iconBg: isDark ? '#2C2C2C' : '#fdf3ea',
    border: isDark ? '#333333' : '#E5E5EA',
    orange: '#FF6B00',
    green: '#34C759'
  };

  const toggleTheme = (valor: boolean) => {
    setIsDark(valor);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 3. O "Gancho" mágico que as páginas vão usar para aceder às cores
export const useTheme = () => useContext(ThemeContext);