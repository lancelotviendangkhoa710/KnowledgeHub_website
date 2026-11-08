# AI Companion — Privacy Notice (DRAFT)

**Status:** DRAFT — pending Legal/Privacy review. Not yet published in the product.
**Last updated:** 2026-11-08
**Contact:** `[insert privacy contact email]`

> This is a short, plain-language draft for the KnowledgeHub AI Companion. It must be reviewed and
> approved by the responsible product/privacy owner before it is linked from the app. It is not legal
> advice.

## What the AI Companion does

The AI Companion lets you create conversations, send messages, and save **memories** that you add
explicitly. To generate a reply, KnowledgeHub sends the current conversation content and the active
memories you added to **DeepSeek**, an external AI provider. DeepSeek returns the assistant reply;
KnowledgeHub stores the conversation so you can read it later.

## What we store

- Conversation title and timestamps.
- Message role (`user`/`assistant`), message content, and limited technical metadata (AI provider,
  model name/version, request ID).
- Memories you explicitly add: type (`preference`/`fact`/`goal`), content, optional expiry date.

We do **not** store passwords, payment data, API keys, IP addresses, or user-agent strings in the AI
Companion tables. Application logs do not include message content or authorization headers.

## Who can see it

- **You** can see and manage your own conversations and memories.
- **Other users cannot** see your conversations or memories.
- **Administrators cannot read** conversation or memory content in the current version. This may
  change only after a separate privacy/security review and an audited access process.

## Sharing with the AI provider

When you send a message, the conversation content and your active memories are sent to DeepSeek to
generate a reply. This means the content may be processed outside your country. We do not sell your
data. The provider's own terms and retention practices apply; see `[link to provider terms/DPA]`.

## How long we keep it

- Conversations and messages: until **you delete the conversation**.
- Memories: until **you delete the memory** or its expiry date passes. Deleted memories are marked
  as deleted and excluded from use.
- When your account is deleted, AI Companion data (conversations/messages, memories) is **purged
  after 30 days**. Backup copies may remain for the backup retention period of our database provider.
- Other account data (profile, bookmarks, roadmaps) is managed separately by the platform.

## Your choices

- Delete a conversation or a memory at any time from the AI Companion screen.
- Delete your account; AI Companion data will be purged under the 30-day rule above.
- Contact `[privacy contact]` to ask about your data. Self-service export of all AI data is not yet
  available.

## Security

Content is transmitted over HTTPS. Provider keys are kept only on the backend/AI service and are not
exposed to the browser. Access tokens are kept in memory in the browser rather than in persistent
storage, so a full page reload ends the session.

## Children

The AI Companion is not directed at children. `[Insert age policy after product/legal review.]`

## Changes

We may update this notice; the "Last updated" date will change. Continued use after an update means
you accept the updated notice. `[Legal to confirm wording.]`

---

## Bản tóm tắt tiếng Việt (DRAFT)

AI Companion gửi nội dung hội thoại và các memory bạn tự thêm tới **DeepSeek** để tạo câu trả lời.
KnowledgeHub lưu hội thoại cho đến khi bạn xoá; dữ liệu AI của tài khoản đã xoá được purge sau
**30 ngày** (bản backup có thể lưu lâu hơn theo chính sách nhà cung cấp DB). Người dùng khác và
admin **không đọc** được hội thoại/memory của bạn trong phiên bản hiện tại. Bạn có thể xoá hội
thoại/memory bất kỳ lúc nào; export toàn bộ dữ liệu AI chưa có. Liên hệ `[email privacy]`.
