# SUTRA AI Agents API

6 AI-powered agents for Industry Requirement Extraction, Technology Discovery, Fit Evaluation, Compliance, Commercialization, and Citation Verification - specifically designed for the Indian market.

## Overview

SUTRA AI Agents API is a comprehensive AI-powered platform that helps companies discover, evaluate, and commercialize technologies for the Indian market. The system uses advanced LLM models (OpenAI GPT-5.5 or Google Gemini) to analyze requirements, match technologies, ensure regulatory compliance, and provide actionable commercialization insights.

## Features

- **Industry Requirement Extraction** - Extract structured requirements from natural language queries
- **Technology Discovery** - Match technologies to requirements using semantic search
- **Industry Fit Evaluation** - Evaluate how well technologies fit specific industry needs
- **Compliance Advisory** - Check Indian regulatory compliance and certification requirements
- **Commercialization Advisory** - Analyze licensing, tech transfer, and market readiness
- **Citation Verification** - Verify claims with evidence from government sources

## Tech Stack

- **Framework:** FastAPI (Python 3.14)
- **Database:** PostgreSQL with pgvector extension (Supabase)
- **LLM Providers:** OpenAI GPT-5.5 / Google Gemini 3.5 Flash
- **Cache:** Redis (optional)
- **Testing:** pytest with pytest-asyncio
- **Database Migrations:** Alembic

## Quick Start

### Prerequisites

- Python 3.14+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key or Google Gemini API key
- Supabase account (recommended for database)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sutra-ai-agents

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Configuration

```bash
# Copy environment example
cp .env.example .env

# Edit .env with your settings
```

**Required Environment Variables:**
```bash
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=INFO

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# LLM Provider Selection
LLM_PROVIDER=openai  # or gemini

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your_actual_openai_api_key_here
OPENAI_MODEL=gpt-5.5

# Gemini Configuration (Alternative)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

### Database Setup

**Supabase Setup:**

1. Create a project at [supabase.com](https://supabase.com)
2. Enable pgvector extension in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Get connection string from Dashboard → Project Settings → Database → Connection string (URI)
4. Set it as `DATABASE_URL` in `.env`

**Run Migrations:**
```bash
alembic upgrade head
```

### Start the Server

```bash
python run.py
```

The API will be available at `http://localhost:8000` with interactive docs at `http://localhost:8000/docs`.

## API Endpoints

### Health Check
- `GET /` - Service information
- `GET /health/` - Detailed health status

### Company Management
- `POST /company/register` - Register company and extract requirements
- `GET /company/{id}` - Get company profile

### Technology Management
- `POST /technology/register` - Register a technology
- `POST /technology/match` - Match technologies to requirements
- `POST /technology/industry-fit` - Evaluate industry fit
- `POST /technology/compliance` - Check compliance requirements
- `POST /technology/license` - Analyze commercialization

### Reports
- `POST /report/generate` - Generate comprehensive analysis report

### Evidence
- `POST /evidence/verify` - Verify claims with citations
- `POST /evidence/add` - Add evidence source

## AI Agents

### 1. Industry Requirement Extractor

Extracts structured information from natural language requirement queries.

**Input:** Natural language query about technology requirements
**Output:** Structured JSON with domain, sub-domain, problem statement, technology needed, keywords, TRL, deployment scale

**Example:**
```python
POST /company/register
{
  "company_name": "Solar Solutions Inc",
  "description": "We need solar panel technology for 5MW commercial installation in Gujarat with TRL 8 and BIS certification"
}
```

### 2. Technology Discovery Agent

Searches and matches technologies to requirements using semantic search and scoring algorithms.

**Input:** Domain, sub-domain, keywords, required TRL
**Output:** List of matched technologies with scores and match reasons

**Example:**
```python
POST /technology/match
{
  "domain": "Renewable Energy",
  "sub_domain": "Solar",
  "keywords": ["solar", "panel", "photovoltaic"],
  "required_trl": 8
}
```

### 3. Industry Fit Evaluator

Evaluates how well a technology matches an industry requirement using multi-factor scoring.

**Input:** Technology profile and industry requirement
**Output:** Fit score, strengths, risks, reasons, confidence score

**Example:**
```python
POST /technology/industry-fit
{
  "technology_id": 1,
  "requirement_id": 1
}
```

### 4. Compliance Advisor

Checks Indian regulatory compliance and certification requirements with actionable recommendations.

**Input:** Domain, sub-domain, available certifications
**Output:** Required certifications, missing certifications, approval status, recommendations

**Example:**
```python
POST /technology/compliance
{
  "domain": "Renewable Energy",
  "sub_domain": "Solar",
  "available_certifications": ["IEC 61215"]
}
```

### 5. Commercialization Advisor

Analyzes licensing options, tech transfer feasibility, and market readiness.

**Input:** Technology name, TRL, patent status, manufacturing readiness
**Output:** License recommendation, tech transfer timeline, market readiness, deployment roadmap

**Example:**
```python
POST /technology/license
{
  "technology_name": "Advanced Solar Panel",
  "trl_level": 8,
  "patent_status": "Granted",
  "manufacturing_readiness": "Ready",
  "domain": "Renewable Energy"
}
```

### 6. Citation Verifier

Verifies claims with evidence from government sources and provides citations.

**Input:** Claim to verify, domain, sub-domain
**Output:** Verified answer, confidence score, sources, verification status

**Example:**
```python
POST /evidence/verify
{
  "claim": "Technology has TRL level 8 and patent granted",
  "domain": "Renewable Energy",
  "sub_domain": "Solar"
}
```

## LLM Provider Selection

**Choose OpenAI for best accuracy and reliability; choose Gemini for cost efficiency and speed.**

| Provider | Model | Speed | Accuracy | Cost | Use Case |
|----------|-------|-------|----------|------|----------|
| **OpenAI** | GPT-5.5 | 16s | ⭐⭐⭐⭐⭐ | Higher | Production, accuracy-critical |
| **OpenAI** | GPT-4o | 1.0s | ⭐⭐⭐⭐ | Medium | Fast responses |
| **Gemini** | Gemini 3.5 Flash | 6.2s | ⭐⭐⭐⭐ | Lower | Development, high-volume |
| **Gemini** | Gemini 2.5 Pro | 14.8s | ⭐⭐⭐⭐ | Medium | Balanced performance |

**Configuration:**
```bash
# For OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.5

# For Gemini
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-3.5-flash
```

## Testing

Run the test suite:

```bash
pytest tests/ -v
```

Run specific test file:

```bash
pytest test_agents_prompts.py -v -s
```

**Test Coverage:**
- 34 tests covering all 6 AI agents
- Unit tests for individual agent methods
- Integration tests for agent workflows
- Tests for scoring algorithms and fallback logic

## Project Structure

```
sutra-ai-agents/
├── app/
│   ├── agents/              # AI agent implementations
│   │   ├── industry_extractor.py
│   │   ├── technology_discovery.py
│   │   ├── industry_fit_evaluator.py
│   │   ├── compliance_advisor.py
│   │   ├── commercialization_advisor.py
│   │   ├── citation_verifier.py
│   │   └── comprehensive_analyzer.py
│   ├── config.py           # Configuration settings
│   ├── database.py         # Database connection
│   ├── main.py             # FastAPI application
│   ├── middleware.py       # Custom middleware
│   ├── models/             # SQLAlchemy models
│   ├── routes/             # API routes
│   ├── schemas/            # Pydantic schemas
│   └── services/           # Business logic services
├── alembic/                # Database migrations
├── tests/                  # Test suite
├── .env.example            # Environment variables template
├── requirements.txt        # Python dependencies
├── run.py                  # Application entry point
├── AGENT_TECHNICAL_GUIDE.md # Detailed agent architecture
├── DEPLOYMENT.md           # Deployment guide
└── README.md               # This file
```

## Architecture

For detailed technical architecture of all 6 agents, see [AGENT_TECHNICAL_GUIDE.md](AGENT_TECHNICAL_GUIDE.md).

**Key Components:**
- **FastAPI** - High-performance async web framework
- **SQLAlchemy** - ORM for database operations
- **Alembic** - Database migration tool
- **OpenAI/Gemini** - LLM providers for AI capabilities
- **Supabase** - Managed PostgreSQL with pgvector
- **Redis** - Optional caching layer

## Deployment

For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

**Quick Deployment Options:**
- **Render** - Recommended for ease of use
- **Railway** - Good for beginners
- **Fly.io** - Global deployment
- **Docker** - Self-hosting

## Security Best Practices

1. **Never commit API keys** - Use environment variables
2. **Restrict CORS origins** in production
3. **Enable SSL** for database connections
4. **Use secret management** services (AWS Secrets Manager, etc.)
5. **Monitor API usage** to control costs
6. **Regular security audits** of dependencies

## Cost Considerations

**LLM API Costs:**
- OpenAI GPT-5.5: ~$0.03/1K input tokens, $0.06/1K output tokens
- Gemini 3.5 Flash: ~$0.001/1K input tokens, $0.002/1K output tokens

**Database Costs:**
- Supabase Free: 500MB database, 1GB bandwidth
- Supabase Pro: $25/month, 8GB database, 50GB bandwidth

**Optimization:**
- Use caching for repeated queries
- Implement request batching
- Monitor usage regularly
- Use smaller models for simple tasks

## Troubleshooting

**Database Connection Issues:**
- Verify `DATABASE_URL` is correct
- Check if Supabase project is active
- Ensure pgvector extension is enabled

**LLM API Errors:**
- Verify API key is correct
- Check if API key has sufficient credits
- Ensure `LLM_PROVIDER` matches the API key
- Test API key locally first

**Migration Failures:**
```bash
alembic current
alembic downgrade base
alembic upgrade head
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pytest tests/ -v`
5. Submit a pull request

## License

[Specify your license here]

## Support

- **Documentation:** [AGENT_TECHNICAL_GUIDE.md](AGENT_TECHNICAL_GUIDE.md)
- **Deployment:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Issues:** Report issues via GitHub Issues

## Acknowledgments

- Built with FastAPI and modern Python async patterns
- LLM capabilities powered by OpenAI and Google Gemini
- Database infrastructure by Supabase
- Designed for the Indian market context

---

**Version:** 1.0.0  
**Last Updated:** 2026
