import styles from './authForm.module.css';

/** Nút Google theo hướng dẫn thương hiệu. Điều hướng cả trang vì màn đồng ý của Google không phải XHR. */
export default function GoogleButton({ onClick, label = 'Đăng nhập bằng Google' }: { onClick?: () => void; label?: string }) {
  return (
    <a className={styles.google} href="/api/auth/google/redirect" onClick={onClick}>
      {/* Logo chữ G chính thức của Google, giữ nguyên màu, không vẽ lại. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/google-g.png" width={20} height={20} alt="" />
      {label}
    </a>
  );
}
