import React, { useState, useEffect } from 'react';
import { LessonPlanDocument } from './types';
import { createBlankDocument } from './data/sampleLessonPlans';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EditorView } from './components/EditorView';
import { ApiKeyModal, loadSavedApiKey } from './components/ApiKeyModal';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>(loadSavedApiKey());

  // Initialize main document state
  const [currentDoc, setCurrentDoc] = useState<LessonPlanDocument>(createBlankDocument);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    setIsApiKeyModalOpen(false);
  };

  const handleMockMode = () => {
    setIsApiKeyModalOpen(false);
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Header
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onSettingsClick={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main App Layout */}
      <EditorView
        currentDoc={currentDoc}
        setCurrentDoc={setCurrentDoc}
        onSaveToLibrary={() => {}}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
      />

      {/* Footer */}
      <Footer />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleSaveApiKey}
        onMockMode={handleMockMode}
        currentKey={apiKey}
      />
    </div>
  );
}
