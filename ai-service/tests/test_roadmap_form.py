import io
import json
import unittest
from unittest.mock import AsyncMock, patch

import httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

from app import main


def sample_pdf(with_text=True, pages=1):
    """Create a real small PDF; a blank page models a scanned/no-text CV."""
    writer = PdfWriter()
    for _ in range(pages):
        page = writer.add_blank_page(width=400, height=300)
        if with_text:
            font = DictionaryObject({
                NameObject("/Type"): NameObject("/Font"),
                NameObject("/Subtype"): NameObject("/Type1"),
                NameObject("/BaseFont"): NameObject("/Helvetica"),
            })
            font_ref = writer._add_object(font)
            page[NameObject("/Resources")] = DictionaryObject({
                NameObject("/Font"): DictionaryObject({NameObject("/F1"): font_ref}),
            })
            stream = DecodedStreamObject()
            stream.set_data(b"BT /F1 12 Tf 30 250 Td (Python and SQL projects) Tj ET")
            page[NameObject("/Contents")] = writer._add_object(stream)
    result = io.BytesIO()
    writer.write(result)
    return result.getvalue()


PROFILE = {
    "goal": "Become a data engineer", "level": "beginner", "weeks": 12,
    "hours_per_week": 8, "constraints": [], "skills": ["SQL", "Python"],
}


class CVExtractTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict("os.environ", {"AI_SERVICE_TOKEN": "internal"})
        self.env.start()
        self.client = TestClient(main.app)

    def tearDown(self):
        self.client.close()
        self.env.stop()

    def upload(self, data, mime="application/pdf", token="internal"):
        return self.client.post(
            "/v1/roadmaps/cv/extract",
            headers={"X-Service-Token": token},
            files={"file": ("cv.pdf", data, mime)},
        )

    def test_valid_pdf_extracts_real_text_and_page_count(self):
        response = self.upload(sample_pdf(pages=2))
        self.assertEqual(200, response.status_code)
        self.assertEqual(2, response.json()["page_count"])
        self.assertIn("Python and SQL projects", response.json()["text"])

    def test_scanned_or_empty_pdf_is_rejected(self):
        response = self.upload(sample_pdf(with_text=False))
        self.assertEqual(422, response.status_code)
        self.assertEqual("cv_no_text", response.json()["detail"]["code"])

    def test_mime_magic_size_pages_and_token_are_checked(self):
        for data, mime, status in (
            (sample_pdf(), "application/octet-stream", 422),
            (b"not a PDF", "application/pdf", 422),
            (b"%PDF" + b"x" * main.MAX_CV_BYTES, "application/pdf", 413),
            (sample_pdf(pages=11), "application/pdf", 422),
        ):
            self.assertEqual(status, self.upload(data, mime).status_code)
        self.assertEqual(401, self.upload(sample_pdf(), token="wrong").status_code)


class FormIntentTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.env = patch.dict("os.environ", {"AI_SERVICE_TOKEN": "internal", "DEEPSEEK_API_KEY": "provider"})
        self.env.start()

    def tearDown(self):
        self.env.stop()

    def request(self, cv_text=None):
        return main.FormIntentInput(
            career_goal="Become a data engineer", current_level="I know basic SQL and am new to data engineering",
            target_job_requirements="Must know SQL and Python", weeks=12,
            hours_per_week=8, cv_text=cv_text,
        )

    async def test_no_cv_returns_null_analysis_and_sends_job_requirements(self):
        output = main.FormIntentOutput(profile=PROFILE, cv_analysis=None)
        with patch.object(main, "_structured_completion", new=AsyncMock(return_value=output)) as completion:
            result = await main.roadmap_form_intent(self.request(), "internal")
        self.assertIsNone(result["cv_analysis"])
        self.assertIn("Must know SQL", str(completion.call_args.args[1]))

    async def test_cv_strength_requires_verbatim_evidence(self):
        cv = "Built Python and SQL projects for data teams."
        analysis = {"strengths": [{"skill": "Python", "evidence": "Python and SQL projects"}],
                    "gaps": ["SQL"], "recommendations": ["Practice SQL queries"]}
        valid = main.FormIntentOutput(profile=PROFILE, cv_analysis=analysis)
        with patch.object(main, "_structured_completion", new=AsyncMock(return_value=valid)):
            result = await main.roadmap_form_intent(self.request(cv), "internal")
        self.assertEqual("Python and SQL projects", result["cv_analysis"]["strengths"][0]["evidence"])

        invalid = main.FormIntentOutput(profile=PROFILE, cv_analysis={
            **analysis, "strengths": [{"skill": "Python", "evidence": "Invented work experience"}],
        })
        with patch.object(main, "_structured_completion", new=AsyncMock(return_value=invalid)):
            with self.assertRaises(HTTPException) as error:
                await main.roadmap_form_intent(self.request(cv), "internal")
        self.assertEqual(502, error.exception.status_code)

    async def test_provider_cannot_change_user_level_or_study_time(self):
        output = main.FormIntentOutput(profile={**PROFILE, "weeks": 24}, cv_analysis=None)
        with patch.object(main, "_structured_completion", new=AsyncMock(return_value=output)):
            with self.assertRaises(HTTPException) as error:
                await main.roadmap_form_intent(self.request(), "internal")
        self.assertEqual(502, error.exception.status_code)

    async def test_provider_configuration_error_is_safe(self):
        with patch.dict("os.environ", {"DEEPSEEK_API_KEY": ""}):
            with self.assertRaises(HTTPException) as error:
                await main.roadmap_form_intent(self.request(), "internal")
        self.assertEqual(503, error.exception.status_code)
        self.assertEqual("provider_configuration", error.exception.detail["code"])


if __name__ == "__main__":
    unittest.main()
