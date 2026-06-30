import React from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import AuthPage from './components/AuthPage.jsx';
import KikoShell from './components/KikoShell.jsx';

function AppContent() {
  const { token, currentUser } = useApp();

  if (!token || !currentUser) {
    return <AuthPage />;
  }

  return <KikoShell />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
