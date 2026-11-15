'use client';

/** Đổi sáng/tối: ghi `data-theme` lên <html> và lưu `kh-theme`. Biểu tượng đổi bằng CSS nên không lệch khi hydrate. */
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('kh-theme', next);
    } catch {
      // Trình duyệt chặn lưu trữ: vẫn đổi được trong phiên này.
    }
  }

  return (
    <button type="button" className="kh-icon-btn kh-theme-toggle" onClick={toggle} aria-label="Đổi giao diện sáng tối">
      <svg className="kh-i kh-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
      <svg className="kh-i kh-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></svg>
    </button>
  );
}
