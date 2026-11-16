import { useRef, useState, Dispatch, SetStateAction } from 'react';
import { extractYouTubeVideoId } from '@/lib/videoUtils';
import { CODE_TEMPLATES } from '../editorConstants';

export function useEditorFormatting(content: string, setContent: Dispatch<SetStateAction<string>>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [showCalloutDropdown, setShowCalloutDropdown] = useState(false);
  const [videoInputUrl, setVideoInputUrl] = useState('');
  const [videoCustomTitle, setVideoCustomTitle] = useState('');
  const [videoInsertNotice, setVideoInsertNotice] = useState<string | null>(null);

  const detectedVideoId = extractYouTubeVideoId(videoInputUrl);

  const handleInsertCallout = (kind: 'NOTE' | 'TIP' | 'WARNING') => {
    let snippet = '';
    if (kind === 'NOTE') {
      snippet = `\n\n> [!NOTE]\n> Nêu bối cảnh quan trọng, điều kiện bắt buộc hoặc kiến thức cần có.\n\n`;
    } else if (kind === 'TIP') {
      snippet = `\n\n> [!TIP]\n> Nêu cách làm được khuyến nghị, cách tối ưu hoặc số liệu so sánh.\n\n`;
    } else if (kind === 'WARNING') {
      snippet = `\n\n> [!WARNING]\n> Nêu rủi ro vận hành, thay đổi gây lỗi hoặc cạm bẫy khi xử lý đồng thời.\n\n`;
    }
    insertMarkdown(snippet, '', '');
    setShowCalloutDropdown(false);
  };

  const handleInsertCodeBlock = (lang: string) => {
    const template = CODE_TEMPLATES[lang.toLowerCase()] || '// viết code ở đây';
    insertMarkdown(`\n\n\`\`\`${lang.toLowerCase()}\n${template}\n\`\`\`\n\n`, '', '');
    setShowCodeDropdown(false);
  };

  const insertMarkdown = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => `${prev}\n\n${prefix}${defaultText}${suffix}\n\n`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || defaultText;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = before + replacement + after;
    setContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + selected.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 25);
  };

  const handleInsertVideo = () => {
    if (!detectedVideoId) return;
    // Dựng đường dẫn chuẩn từ mã video đã nhận diện, không dùng chuỗi người dùng nhập (có thể đã bọc @[youtube](...)).
    const cleanUrl = `https://www.youtube.com/watch?v=${detectedVideoId}`;
    const cleanTitle = videoCustomTitle.trim();
    const snippet = cleanTitle
      ? `\n\n@[youtube](${cleanUrl} "${cleanTitle}")\n\n`
      : `\n\n@[youtube](${cleanUrl})\n\n`;

    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = content.substring(0, start);
      const after = content.substring(end);
      const nextContent = before + snippet + after;
      setContent(nextContent);
      setTimeout(() => {
        textarea.focus();
        const newPos = start + snippet.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 50);
    } else {
      setContent((prev) => `${prev.trim()}${snippet}`);
    }

    setVideoInputUrl('');
    setVideoCustomTitle('');
    setShowVideoModal(false);
    setVideoInsertNotice(`Đã chèn video YouTube (${detectedVideoId}) vào nội dung.`);
    setTimeout(() => setVideoInsertNotice(null), 4000);
  };

  return {
    textareaRef,
    showVideoModal,
    setShowVideoModal,
    showCodeDropdown,
    setShowCodeDropdown,
    showCalloutDropdown,
    setShowCalloutDropdown,
    videoInputUrl,
    setVideoInputUrl,
    videoCustomTitle,
    setVideoCustomTitle,
    videoInsertNotice,
    detectedVideoId,
    insertMarkdown,
    handleInsertCallout,
    handleInsertCodeBlock,
    handleInsertVideo,
  };
}
