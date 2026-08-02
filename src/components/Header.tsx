import React from 'react';
import { BookOpenCheck, Settings, Moon, Sun } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  setIsDarkMode,
  onSettingsClick,
}) => {
  return (
    <header className="app-header">
      <div className="header-logo">
        <div className="logo-icon-wrapper">
          <BookOpenCheck className="w-6 h-6" />
        </div>
        <div className="logo-text">
          <h1>Giáo Án Song Ngữ</h1>
          <p className="logo-subtitle">Việt - Anh từ File Word</p>
          <p className="logo-author">
            Phát triển bởi Đinh Văn Thành - Web tổng hợp tool AI cho giáo viên:{' '}
            <a href="https://giao-vien-ai-toan-nang3.vercel.app/" target="_blank" rel="noopener noreferrer">
              https://giao-vien-ai-toan-nang3.vercel.app/
            </a>
          </p>
        </div>
      </div>

      <div className="header-actions">
        <button
          onClick={onSettingsClick}
          className="btn-icon"
          title="Cài đặt API Key"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="btn-icon"
          title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};
