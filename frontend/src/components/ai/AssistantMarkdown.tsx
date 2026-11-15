import type { ReactNode } from 'react';

/**
 * Hiển thị markdown gọn của trợ lý: đoạn văn, tiêu đề, danh sách, khối mã, in đậm, mã nội dòng.
 * Chỉ dựng phần tử React (không dùng innerHTML) nên nội dung từ AI không thể chèn HTML.
 * shortcut: không hỗ trợ bảng, ảnh, liên kết; thêm khi trợ lý bắt đầu trả về các dạng đó.
 */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'code'; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = /^\s{0,3}(`{3,})/.exec(line);
    if (open) {
      flush();
      const code: string[] = [];
      // CommonMark: the closing fence is only backticks, at least as long as the opening one.
      const close = new RegExp('^\\s{0,3}`{' + open[1].length + ',}\\s*$');
      for (i++; i < lines.length && !close.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    const heading = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line);
    if (heading) { flush(); blocks.push({ kind: 'h', text: heading[1] }); continue; }
    const item = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/.exec(line);
    if (item) {
      flush();
      const kind = item[1] ? 'ul' : 'ol';
      const last = blocks[blocks.length - 1];
      if (last && last.kind === kind) last.items.push(item[3]);
      else blocks.push({ kind, items: [item[3]] });
      continue;
    }
    if (!line.trim()) { flush(); continue; }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

export default function AssistantMarkdown({ content }: { content: string }) {
  return (
    <>
      {parse(content).map((block, index) => {
        if (block.kind === 'h') return <h3 key={index}>{inline(block.text)}</h3>;
        if (block.kind === 'code') return <pre key={index}><code>{block.text}</code></pre>;
        if ('items' in block) {
          const items = block.items.map((text, i) => <li key={i}>{inline(text)}</li>);
          return block.kind === 'ul' ? <ul key={index}>{items}</ul> : <ol key={index}>{items}</ol>;
        }
        return <p key={index}>{inline(block.text)}</p>;
      })}
    </>
  );
}
