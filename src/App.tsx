import React, { useState, useEffect } from 'react';
import { LessonPlanDocument, NavTab } from './types';
import { createBlankDocument } from './data/sampleLessonPlans';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { EditorView } from './components/EditorView';
import { LibraryView } from './components/LibraryView';
import { HistoryView } from './components/HistoryView';
import { GuideView } from './components/GuideView';
import { ApiKeyModal, loadSavedApiKey } from './components/ApiKeyModal';
import {
  getSavedLibrary,
  saveToLibrary,
  deleteFromLibrary,
  getSavedHistory,
  addToHistory,
} from './utils/libraryStorage';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('editor');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>(loadSavedApiKey());

  // Main document state
  const [currentDoc, setCurrentDoc] = useState<LessonPlanDocument>(createBlankDocument);

  // Library & History states
  const [libraryDocs, setLibraryDocs] = useState<LessonPlanDocument[]>([]);
  const [historyList, setHistoryList] = useState<LessonPlanDocument[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial load of library and history from LocalStorage
  useEffect(() => {
    setLibraryDocs(getSavedLibrary());
    setHistoryList(getSavedHistory());
  }, []);

  // Sync dark mode class on <html>
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    setIsApiKeyModalOpen(false);
    showToast('Đã lưu API Key thành công!');
  };

  const handleMockMode = () => {
    setIsApiKeyModalOpen(false);
    showToast('Đã chuyển sang chế độ Mock/Chạy thử!');
  };

  const handleSaveToLibrary = (doc: LessonPlanDocument) => {
    const updated = saveToLibrary(doc);
    setLibraryDocs(updated);
    // Also track in history
    const updatedHistory = addToHistory(doc);
    setHistoryList(updatedHistory);
    showToast('Đã lưu Giáo án vào Thư viện thành công!');
  };

  const handleOpenDoc = (doc: LessonPlanDocument) => {
    setCurrentDoc(doc);
    setActiveTab('editor');
    showToast(`Đã mở giáo án "${doc.title}"`);
  };

  const handleUpdateLibraryDoc = (doc: LessonPlanDocument) => {
    const updated = saveToLibrary(doc);
    setLibraryDocs(updated);
    showToast('Đã cập nhật giáo án!');
  };

  const handleDeleteLibraryDoc = (id: string) => {
    const updated = deleteFromLibrary(id);
    setLibraryDocs(updated);
    showToast('Đã xóa giáo án khỏi Thư viện!');
  };

  const handleClearHistory = () => {
    localStorage.removeItem('khbd_bilingual_history_v2');
    setHistoryList([]);
    showToast('Đã xóa toàn bộ lịch sử!');
  };

  return (
    <div className="app-container min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-blue-600 font-bold text-xs shadow-2xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header with Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        onSettingsClick={() => setIsApiKeyModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-6">
        {activeTab === 'editor' && (
          <EditorView
            currentDoc={currentDoc}
            setCurrentDoc={(newDocOrFn) => {
              setCurrentDoc((prev) => {
                const next = typeof newDocOrFn === 'function' ? newDocOrFn(prev) : newDocOrFn;
                // Auto track in history when edited
                addToHistory(next);
                return next;
              });
            }}
            onSaveToLibrary={handleSaveToLibrary}
            onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            libraryDocs={libraryDocs}
            onOpenDoc={handleOpenDoc}
            onUpdateDoc={handleUpdateLibraryDoc}
            onDeleteDoc={handleDeleteLibraryDoc}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            historyList={historyList}
            onOpenDoc={handleOpenDoc}
            onClearHistory={handleClearHistory}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'guide' && <GuideView />}
      </main>

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
