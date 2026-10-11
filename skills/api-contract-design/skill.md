# API Contract Design Skill

## Má»¥c Ä‘Ã­ch
Äáº£m báº£o Agent tuÃ¢n thá»§ chuáº©n REST API vÃ  cáº­p nháº­t docs/API.md trÆ°á»›c/trong khi code.

## Quy chuáº©n
- Äá»‹nh dáº¡ng response: { "data": ..., "message": ..., "status": "success|error" }
- PhÃ¢n trang chuáº©n: { "data": [...], "meta": { "current_page": 1, "per_page": 15, "total": 100 } }
- Tráº£ vá» mÃ£ lá»—i 401, 403, 404, 422 rÃµ rÃ ng theo schema.
- KhÃ´ng tá»± Ã½ sá»­a chá»¯ kÃ½ endpoint hiá»‡n táº¡i mÃ  chÆ°a thá»‘ng nháº¥t cross-domain.
