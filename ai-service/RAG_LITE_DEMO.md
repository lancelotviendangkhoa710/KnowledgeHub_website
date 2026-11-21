# RAG-lite PDF Q&A demo

This seminar-only endpoint accepts a text PDF in memory and answers one question without retaining the PDF, question, chunks, or answer.

## Run

Set `DEEPSEEK_API_KEY` and optionally `AI_MODEL` (defaults to `deepseek-flash`), then start the existing AI service. After the Lead mounts the sub-app, open `http://localhost:8000/rag-lite/docs`.

```powershell
curl.exe -X POST "http://localhost:8000/rag-lite/ask?question=What%20does%20this%20document%20say%20about%20Python%3F" -H "Content-Type: application/pdf" --data-binary "@demo.pdf"
```

The response contains the generated answer and application-generated citations (`page` starts at 1; each `excerpt` comes from a selected chunk). No matching keyword returns exactly `Không tìm thấy thông tin trong tài liệu.` and does not contact DeepSeek.

## Five-minute demo

1. Open `/rag-lite/docs` and select `POST /ask`.
2. Upload a small, text-based PDF as the raw `application/pdf` body and ask a term contained in it.
3. Show the answer, the one-based source page, and the excerpt.
4. Ask an unrelated question and show the fallback with zero chunks.
5. Try a non-PDF file or a scan-only PDF to show safe validation.

## Limits and privacy

- PDF body is read only in memory, up to 2 MiB and 30 pages. Encrypted, invalid, and textless PDFs are not accepted.
- The request has no authentication and is for seminar/development use only; do not send personal or confidential PDFs.
- Logs must not contain PDFs, questions, chunks, prompts, answers, authorization data, or provider keys.
- Selected context is sent to DeepSeek only when keyword retrieval finds a match. Provider privacy/DPA review remains open; see the AI Companion privacy ADR.
- This is a RAG-lite demo using deterministic keyword retrieval, not semantic or vector retrieval. Persistent CV-RAG is a separate approved phase with its own authorization, lifecycle, privacy, and evaluation controls.
