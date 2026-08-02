import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <p>© 2026 - Công cụ Giáo án Song ngữ Việt - Anh cho giáo viên Việt Nam.</p>
      <p className="mt-1 font-medium">
        Tác giả: Đinh Văn Thành - Điện thoại / Zalo: 0915.213717 — Web tổng hợp AI:{' '}
        <a
          href="https://giao-vien-ai-toan-nang3.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-500 hover:underline"
        >
          https://giao-vien-ai-toan-nang3.vercel.app/
        </a>
      </p>
    </footer>
  );
};
