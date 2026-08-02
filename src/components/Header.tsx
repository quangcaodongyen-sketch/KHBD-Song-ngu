import React from 'react';
import { BookOpenCheck, Settings, Moon, Sun, Library, History, Edit3, HelpCircle, Key, Sparkles } from 'lucide-react';
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
    <header className="app-header sticky top-0 z-40 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:px-8 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all">
      <div className="header-logo flex items-center space-x-3.5">
        <div className="logo-icon-wrapper w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold shadow-lg shadow-teal-500/20">
          <BookOpenCheck className="w-6 h-6" />
        </div>
        <div className="logo-text">
          <h1 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white leading-tight flex items-center gap-2">
            <span>Giáo Án Song Ngữ Pro</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-black px-2 py-0.5 rounded-full border border-teal-300/40">
              v2.5
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Công cụ Biên soạn KHBD Việt - Anh Chuẩn Bộ GD&ĐT (CV 5512 / QĐ 3439)
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-inner">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'editor'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          <span>Biên soạn</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'library'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Library className="w-4 h-4" />
          <span>Thư viện</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'guide'
              ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Hướng dẫn</span>
        </button>
      </nav>

      {/* Header Actions & Red API Key button */}
      <div className="header-actions flex items-center space-x-2.5">
        <button
          onClick={onSettingsClick}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/80 border border-red-200 dark:border-red-800 transition-all text-xs font-extrabold text-red-600 dark:text-red-400 shadow-sm animate-pulse"
          title="Nhập hoặc đổi API Key Gemini miễn phí"
        >
          <Key className="w-4 h-4 text-red-500 shrink-0" />
          <span>Lấy API key để sử dụng app</span>
        </button>

        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/60 dark:border-slate-700/60"
          title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
