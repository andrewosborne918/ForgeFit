"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system'; // Allow 'system'

interface ThemeContextType {
  theme: 'light' | 'dark'; // Actual resolved theme will be light or dark
  setTheme: (theme: Theme) => void; // Allow setting to light, dark, or system
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme; // Can be light, dark, or system
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system', 
  storageKey = 'vite-ui-theme', 
  ...props 
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme | null) || defaultTheme;
    }
    return defaultTheme;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const applyTheme = (currentTheme: Theme) => {
      let resolvedTheme: 'light' | 'dark';
      if (currentTheme === 'system') {
        resolvedTheme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        resolvedTheme = currentTheme;
      }
      
      root.classList.remove('light', 'dark');
      root.classList.add(resolvedTheme);
      localStorage.setItem(storageKey, currentTheme); // Store the preference (light, dark, or system)
    };

    applyTheme(theme);

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, storageKey]);

  const toggleTheme = () => {
    setThemeState(prevTheme => {
      if (prevTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        return systemTheme === 'light' ? 'dark' : 'light';
      }
      return prevTheme === 'light' ? 'dark' : 'light';
    });
  };
  
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const value = {
    theme: theme === 'system' 
      ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') 
      : theme,
    setTheme, // Expose setTheme
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value} {...props}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
