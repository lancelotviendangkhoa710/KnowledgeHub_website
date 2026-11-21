"""RAG-lite contract tests; all provider calls are mocked."""

import io
import logging
import os
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from openai import RateLimitError
from pypdf import PdfWriter

from app import rag_lite
from app.main import app as private_app


def pdf(pages):
    """Create minimal PDF bytes; text extraction is mocked in endpoint tests."""
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=100, height=100)
    data = io.BytesIO()
    writer.write(data)
    return data.getvalue()


class FakeReply:
    content = "Python is a programming language."


class RagLiteTests(unittest.TestCase):
    def setUp(self):
        self.host = FastAPI(docs_url=None, redoc_url=None)
        self.host.mount("/rag-lite", rag_lite.app)
        self.client = TestClient(self.host)
        self.env = patch.dict(os.environ, {"DEEPSEEK_API_KEY": "test-key", "AI_MODEL": "deepseek-flash"})
        self.env.start()
        self.invoke_patcher = patch.object(rag_lite.ChatOpenAI, "ainvoke", new=AsyncMock(return_value=FakeReply()))
        self.invoke = self.invoke_patcher.start()

    def tearDown(self):
        self.invoke_patcher.stop()
        self.env.stop()
        self.client.close()

    def request(self, body=None, question="What is Python?", content_type="application/pdf"):
        return self.client.post(f"/rag-lite/ask?question={question}", content=body, headers={"content-type": content_type})

    def text_pdf(self, pages):
        return patch.object(rag_lite, "_documents", return_value=[
            rag_lite.Document(page_content=text, metadata={"page": number})
            for number, text in enumerate(pages, start=1)
        ])

    def test_grounded_answer_has_real_one_based_citation(self):
        with self.text_pdf(["Python is a programming language."]):
            response = self.request(pdf(1))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], FakeReply.content)
        self.assertEqual(response.json()["citations"][0], {"page": 1, "excerpt": "Python is a programming language."})
        self.assertEqual(self.invoke.call_count, 1)

    def test_no_context_returns_fallback_without_provider_call(self):
        with self.text_pdf(["Only astronomy is discussed here."]):
            response = self.request(pdf(1), "What is Python?")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"answer": rag_lite.NO_CONTEXT_ANSWER, "citations": [], "chunks_used": 0})
        self.invoke.assert_not_called()

    def test_rejects_empty_wrong_type_invalid_and_oversize_pdf(self):
        self.assertEqual(self.request(b"").json()["detail"]["code"], "empty_pdf")
        self.assertEqual(self.request(b"not a pdf").json()["detail"]["code"], "invalid_pdf")
        self.assertEqual(self.request(b"x", content_type="text/plain").json()["detail"]["code"], "unsupported_media_type")
        response = self.request(b"%PDF-" + b"x" * rag_lite.MAX_PDF_BYTES)
        self.assertEqual((response.status_code, response.json()["detail"]["code"]), (413, "pdf_too_large"))

    def test_accepts_thirty_pages_and_rejects_thirty_one(self):
        with self.text_pdf(["Python"]):
            self.assertEqual(self.request(pdf(30)).status_code, 200)
        response = self.request(pdf(31))
        self.assertEqual((response.status_code, response.json()["detail"]["code"]), (422, "page_limit_exceeded"))

    def test_rejects_encrypted_and_textless_pdfs(self):
        encrypted = PdfWriter()
        encrypted.add_blank_page(width=100, height=100)
        encrypted.encrypt("secret")
        data = io.BytesIO()
        encrypted.write(data)
        self.assertEqual(self.request(data.getvalue()).json()["detail"]["code"], "encrypted_pdf")
        self.assertEqual(self.request(pdf(1)).json()["detail"]["code"], "pdf_no_text")

    def test_ranking_limits_to_three_and_breaks_ties_by_chunk_order(self):
        chunks = [rag_lite.Document(page_content="Python", metadata={"page": number}) for number in range(1, 6)]
        self.assertEqual([item.metadata["page"] for item in rag_lite._rank("Python", chunks)], [1, 2, 3])

    def test_provider_errors_are_mapped_safely(self):
        chunks = [rag_lite.Document(page_content="Python", metadata={"page": 1})]
        rate_response = httpx.Response(429, request=httpx.Request("POST", "https://api.deepseek.com"))
        for error, expected in ((TimeoutError(), (504, "timeout")),
                                (RateLimitError("limited", response=rate_response, body=None), (503, "rate_limited")),
                                (Exception(), (502, "provider_unavailable"))):
            with self.subTest(error=type(error).__name__), patch.object(rag_lite.ChatOpenAI, "ainvoke", new=AsyncMock(side_effect=error)):
                response = self.request_with_chunks(chunks)
            self.assertEqual((response.status_code, response.json()["detail"]["code"]), expected)
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": ""}):
            response = self.request_with_chunks(chunks)
        self.assertEqual((response.status_code, response.json()["detail"]["code"]), (503, "provider_configuration"))

    def request_with_chunks(self, chunks):
        with patch.object(rag_lite, "_documents", return_value=chunks):
            return self.request(pdf(1))

    def test_docs_and_health_path_can_be_exposed_without_private_docs(self):
        self.assertEqual(self.client.get("/rag-lite/docs").status_code, 200)
        self.assertEqual(self.client.get("/docs").status_code, 404)
        private_client = TestClient(private_app)
        try:
            self.assertEqual(private_client.get("/health").json(), {"status": "ok"})
            self.assertEqual(private_client.get("/docs").status_code, 404)
        finally:
            private_client.close()

    def test_private_values_are_not_logged(self):
        private_marker = "PRIVATE-PDF-QUESTION-ANSWER"
        with self.text_pdf([private_marker]), self.assertNoLogs(level=logging.WARNING):
            response = self.request(pdf(1), private_marker)
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
