export type CodeTokenKind = 'plain' | 'kw' | 'ty' | 'str' | 'cm';
export type CodeToken = { text: string; kind: CodeTokenKind };

const KEYWORDS = new Set(
  (
    'abstract as async await break case catch class const continue def default delete do elif else enum except export extends ' +
    'false final finally fn for from function if implements import in instanceof interface is lambda let match namespace new nil ' +
    'none not null of or and package pass private protected public raise readonly return self static struct super switch this ' +
    'throw true try type typeof undefined use var void while with yield'
  ).split(' ')
);
const TYPES = new Set(
  'any array bigint bool boolean byte char dict double float int integer list long map never number object set short str string symbol tuple unknown uint'.split(' ')
);
const SQL_KEYWORDS = new Set(
  'select from where join left right inner outer on group by order having limit insert into values update set delete create alter drop table index primary key foreign references unique not null default and or in as distinct union begin commit rollback'.split(' ')
);
const HASH_COMMENT_LANGS = /^(python|py|sh|bash|shell|yaml|yml|ruby|rb|toml|dockerfile)$/i;
const NO_HIGHLIGHT_LANGS = /^(|text|txt|plain|plaintext|log|output)$/i;

const SLASH_COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//;
const HASH_COMMENT = /#[^\n]*/;
const SQL_COMMENT = /--[^\n]*/;
const STRING = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/;
const WORD = /[A-Za-z_][A-Za-z0-9_]*/;

/**
 * Tô màu nhẹ cho khối code bằng một regex duy nhất: chú thích, chuỗi, từ khóa, kiểu dữ liệu.
 * shortcut: không hiểu cú pháp thật (chuỗi nhiều dòng, template literal lồng nhau), nâng lên thư viện nếu cần chính xác.
 */
export function highlightCode(code: string, language = ''): CodeToken[] {
  if (NO_HIGHLIGHT_LANGS.test(language.trim())) return [{ text: code, kind: 'plain' }];
  const sql = /^sql$/i.test(language);
  const comment = sql ? SQL_COMMENT : HASH_COMMENT_LANGS.test(language) ? HASH_COMMENT : SLASH_COMMENT;
  const re = new RegExp(`(${comment.source})|(${STRING.source})|(${WORD.source})`, 'g');
  const tokens: CodeToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const push = (text: string, kind: CodeTokenKind) => {
    if (!text) return;
    const prev = tokens[tokens.length - 1];
    if (prev && prev.kind === kind) prev.text += text;
    else tokens.push({ text, kind });
  };
  while ((m = re.exec(code)) !== null) {
    push(code.slice(last, m.index), 'plain');
    if (m[1] !== undefined) push(m[1], 'cm');
    else if (m[2] !== undefined) push(m[2], 'str');
    else {
      const w = m[3];
      if (sql ? SQL_KEYWORDS.has(w.toLowerCase()) : KEYWORDS.has(w)) push(w, 'kw');
      else if (TYPES.has(w) || /^[A-Z][A-Za-z0-9]*$/.test(w)) push(w, 'ty');
      else push(w, 'plain');
    }
    last = re.lastIndex;
  }
  push(code.slice(last), 'plain');
  return tokens;
}
