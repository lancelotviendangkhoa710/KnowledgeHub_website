import Link from 'next/link';

/** Biểu tượng KnowledgeHub (phương án C): nút gốc vàng nối hai nhánh. Màu theo `currentColor`. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="kh-logo__mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M11 8v24M11 20 28 8M11 20l17 12" stroke="currentColor" strokeWidth="2.4" fill="none" />
      <circle cx="11" cy="8" r="4.2" fill="currentColor" />
      <circle cx="11" cy="32" r="4.2" fill="currentColor" />
      <circle cx="28" cy="8" r="4.2" fill="currentColor" />
      <circle cx="28" cy="32" r="4.2" fill="currentColor" />
      <circle cx="11" cy="20" r="5.6" fill="#FFD84A" />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link className="kh-logo" href="/" aria-label="KnowledgeHub, về trang chủ">
      <LogoMark />
      <span>KnowledgeHub</span>
    </Link>
  );
}
