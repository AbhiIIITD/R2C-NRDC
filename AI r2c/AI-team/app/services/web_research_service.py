import logging
import re
from typing import Dict, Any, List, Optional
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup

from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


INDIAN_GOV_SOURCES = {
    "patent": {
        "name": "Indian Patent Office",
        "search_url": "https://iprsearch.ipindia.gov.in/PatentSearch/PatentSearch",
        "fallback_url": "https://www.ipindia.gov.in/",
    },
    "bis": {
        "name": "Bureau of Indian Standards",
        "search_url": "https://www.bis.gov.in/",
        "fallback_url": "https://standardsbis.bsbedge.com/",
    },
    "mnre": {
        "name": "Ministry of New & Renewable Energy",
        "search_url": "https://mnre.gov.in/",
    },
    "cpcb": {
        "name": "Central Pollution Control Board",
        "search_url": "https://cpcb.nic.in/",
    },
    "cea": {
        "name": "Central Electricity Authority",
        "search_url": "https://cea.nic.in/",
    },
    "igbc": {
        "name": "Indian Green Building Council",
        "search_url": "https://igbc.in/igbc/",
    },
    "griha": {
        "name": "GRIHA Council",
        "search_url": "https://www.grihaindia.org/",
    },
}


class GovSourceScraper:
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/json,*/*",
            },
        )

    async def close(self):
        await self.client.aclose()

    async def search_patent(self, query: str) -> List[Dict[str, str]]:
        try:
            search_query = quote_plus(query)
            url = f"https://www.google.com/search?q=site:ipindia.gov.in+patent+{search_query}"
            resp = await self.client.get(url)
            if resp.status_code != 200:
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            results = []
            for g in soup.select("div.g")[:5]:
                link = g.select_one("a")
                snippet = g.select_one("span.aCOpRe")
                if link:
                    href = link.get("href", "")
                    if href.startswith("/url?q="):
                        href = href[7:].split("&")[0]
                    results.append({
                        "source": "Indian Patent Office",
                        "title": link.get_text(strip=True),
                        "url": href,
                        "evidence": snippet.get_text(strip=True) if snippet else "",
                    })
            return results
        except Exception as e:
            logger.warning(f"Patent search failed: {str(e)}")
            return []

    async def search_bis_standards(self, domain: str) -> List[Dict[str, str]]:
        try:
            query = quote_plus(f"BIS standard {domain} India certification")
            url = f"https://www.google.com/search?q=site:bis.gov.in+{query}"
            resp = await self.client.get(url)
            if resp.status_code != 200:
                return self._fallback_bis(domain)

            soup = BeautifulSoup(resp.text, "html.parser")
            results = []
            for g in soup.select("div.g")[:5]:
                link = g.select_one("a")
                snippet = g.select_one("span.aCOpRe")
                if link:
                    href = link.get("href", "")
                    if href.startswith("/url?q="):
                        href = href[7:].split("&")[0]
                    results.append({
                        "source": "Bureau of Indian Standards",
                        "title": link.get_text(strip=True),
                        "url": href,
                        "evidence": snippet.get_text(strip=True) if snippet else f"BIS standard related to {domain}",
                    })
            return results if results else self._fallback_bis(domain)
        except Exception as e:
            logger.warning(f"BIS search failed: {str(e)}")
            return self._fallback_bis(domain)

    def _fallback_bis(self, domain: str) -> List[Dict[str, str]]:
        return [{
            "source": "Bureau of Indian Standards",
            "url": "https://www.bis.gov.in/",
            "evidence": f"BIS certification likely required for {domain} products. Contact BIS for specific standards.",
        }]

    async def search_mnre(self, domain: str) -> List[Dict[str, str]]:
        try:
            query = quote_plus(f"MNRE {domain} India recognition approval")
            url = f"https://www.google.com/search?q=site:mnre.gov.in+{query}"
            resp = await self.client.get(url)
            if resp.status_code != 200:
                return [{
                    "source": "Ministry of New & Renewable Energy",
                    "url": "https://mnre.gov.in/",
                    "evidence": f"MNRE recognition may be required for {domain} projects in India.",
                }]

            soup = BeautifulSoup(resp.text, "html.parser")
            results = []
            for g in soup.select("div.g")[:3]:
                link = g.select_one("a")
                snippet = g.select_one("span.aCOpRe")
                if link:
                    href = link.get("href", "")
                    if href.startswith("/url?q="):
                        href = href[7:].split("&")[0]
                    results.append({
                        "source": "MNRE",
                        "title": link.get_text(strip=True),
                        "url": href,
                        "evidence": snippet.get_text(strip=True) if snippet else f"MNRE {domain}",
                    })
            return results if results else self._fallback_bis(domain)
        except Exception as e:
            logger.warning(f"MNRE search failed: {str(e)}")
            return []

    async def research_topic(self, topic: str, max_results: int = 5) -> List[Dict[str, str]]:
        results = []
        query = quote_plus(topic)

        try:
            url = f"https://www.google.com/search?q={query}+India+regulation+standard+2024+2025"
            resp = await self.client.get(url)
            if resp.status_code != 200:
                return []

            soup = BeautifulSoup(resp.text, "html.parser")
            for g in soup.select("div.g")[:max_results]:
                link = g.select_one("a")
                snippet = g.select_one("span.aCOpRe")
                if link:
                    href = link.get("href", "")
                    if href.startswith("/url?q="):
                        href = href[7:].split("&")[0]
                    results.append({
                        "source": "Web Search",
                        "title": link.get_text(strip=True),
                        "url": href,
                        "evidence": snippet.get_text(strip=True) if snippet else topic,
                    })
        except Exception as e:
            logger.warning(f"Research failed: {str(e)}")

        return results

    async def search_indian_gov(self, topic: str) -> Dict[str, Any]:
        gov_sources = {
            "patents": await self.search_patent(topic),
            "standards": await self.search_bis_standards(topic),
            "mnre": await self.search_mnre(topic),
            "web": await self.research_topic(topic),
        }
        return gov_sources
