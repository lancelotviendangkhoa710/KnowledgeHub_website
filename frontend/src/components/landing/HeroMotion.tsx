'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Khối hero của trang chủ kèm khoảnh khắc chuyển động duy nhất của giao diện: chữ mờ trượt vào,
 * đĩa vàng nhô lên, rồi các phần tử `data-motion="item"` hiện lần lượt. Bỏ qua hoàn toàn khi người
 * dùng bật giảm chuyển động. GSAP chỉ được tải ở trang này (import động trong effect).
 */
export default function HeroMotion({ className, children }: { className: string; children: ReactNode }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let revert: (() => void) | undefined;
    let cancelled = false;
    import('gsap').then(({ gsap }) => {
      if (cancelled) return;
      const ctx = gsap.context(() => {
        gsap.from('[data-motion="ghost"]', { x: 80, opacity: 0, duration: 1.1, ease: 'power3.out' });
        gsap.from('[data-motion="disc"]', { y: 120, duration: 0.9, ease: 'power3.out' });
        gsap.from('[data-motion="item"]', { y: 22, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', clearProps: 'all' });
      }, el);
      revert = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return (
    <section ref={root} className={className}>
      {children}
    </section>
  );
}
