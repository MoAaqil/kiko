import React from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import AuthPage from './components/AuthPage.jsx';
import KikoShell from './components/KikoShell.jsx';

function AppContent() {
  const { token, currentUser } = useApp();

  if (token && !currentUser) {
    return (
      <div className="jumping-squares-backdrop">
        <div className="jumping-squares-modal">
          <div className="jumping-squares-loader">
            <div className="jumping-square"></div>
            <div className="jumping-square"></div>
          </div>
        </div>
      </div>
    );
  }

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
