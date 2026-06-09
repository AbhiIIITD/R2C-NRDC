import logging
from typing import Dict, Any

from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


EXTRACTION_PROMPT = """Analyze the following company requirement query and extract structured information.

Query: {query}

Extract and return a JSON object with these exact fields:
- domain: one of "Renewable Energy", "Buildings & Infrastructure", "Industrial Production"
- sub_domain: specific subdomain (e.g., Solar, Wind, Green Hydrogen, Battery Energy Storage, Smart Buildings, Green Buildings, Industrial Automation, etc.)
- problem_statement: clear 2-3 sentence problem description
- technology_needed: type of technology required
- keywords: comma-separated relevant keywords
- required_trl: required Technology Readiness Level as integer 1-9
- deployment_scale: one of "Small", "Medium", "Large"

Respond with valid JSON only."""


class IndustryRequirementExtractor:
    async def extract(self, query: str) -> Dict[str, Any]:
        try:
            prompt = EXTRACTION_PROMPT.format(query=query)
            response = await llm_service.generate_json(prompt)

            required_fields = ["domain", "sub_domain", "problem_statement", "technology_needed"]
            for field in required_fields:
                if field not in response:
                    raise ValueError(f"Missing required field: {field}")

            return response
        except Exception as e:
            logger.error(f"Error extracting requirement: {str(e)}")
            raise
