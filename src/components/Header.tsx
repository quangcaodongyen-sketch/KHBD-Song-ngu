import React from 'react';
import { BookOpenCheck, Settings, Moon, Sun, Library, History, Edit3, HelpCircle, Key } from 'lucide-react';
import { NavTab } from '../types';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  onSettingsClick,
}) => {
  return (
    <header className="app-header flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="header-logo flex items-center space-x-3">
        <div className="logo-icon-wrapper w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
          <BookOpenCheck className="w-6 h-6" />
        </div>
        <div className="logo-text">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            <span>Giáo Án Song Ngữ Pro</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-extrabold px-2 py-0.5 rounded-full">v2.5</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dịch thuật & Biên soạn KHBD chuẩn Bộ GD&ĐT (CV 5512 / QĐ 3439)
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'editor'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Biên soạn</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'library'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Library className="w-4 h-4" />
          <span>Thư viện</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'guide'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Hướng dẫn</span>
        </button>
      </nav>

      {/* Header Actions & Red API Key button */}
      <div className="header-actions flex items-center space-x-2">
        <button
          onClick={onSettingsClick}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/80 border border-red-200 dark:border-red-800 transition-all text-xs font-bold text-red-600 dark:text-red-400 animate-pulse shadow-sm"
          title="Nhập hoặc đổi API Key Gemini miễn phí"
        >
          <Key className="w-4 h-4 text-red-500" />
          <span>Lấy API key để sử dụng app</span>
        </button>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
