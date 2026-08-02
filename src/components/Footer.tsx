import React from 'react';
import { ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
      <p className="flex items-center justify-center space-x-1.5 font-medium text-slate-700 dark:text-slate-300">
        <span>Phát triển dành riêng cho Giáo viên Việt Nam</span>
        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline" />
      </p>
      <p className="font-medium text-[11px]">
        Tác giả: <strong className="text-slate-900 dark:text-white">Đinh Văn Thành</strong> — Zalo/Hotline: <strong className="text-teal-600 dark:text-teal-400">0915.213717</strong> — Web tổng hợp Công cụ AI cho Giáo viên:{' '}
        <a
          href="https://giao-vien-ai-toan-nang3.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center space-x-0.5"
        >
          <span>giao-vien-ai-toan-nang3.vercel.app</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </p>
    </footer>
  );
};
