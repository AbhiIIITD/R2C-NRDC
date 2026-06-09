"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-05
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "company_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("company_name", sa.String(255), nullable=False, index=True),
        sa.Column("sector", sa.String(100), nullable=False),
        sa.Column("sub_sector", sa.String(100), nullable=False),
        sa.Column("location", sa.String(255), nullable=False),
        sa.Column("company_size", sa.String(50), nullable=False),
        sa.Column("business_objective", sa.Text(), nullable=True),
        sa.Column("technology_interest", sa.Text(), nullable=True),
        sa.Column("contact_details", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "evidence_sources",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("source_name", sa.String(255), nullable=False),
        sa.Column("source_url", sa.String(1000), nullable=True),
        sa.Column("source_type", sa.String(100), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=False),
        sa.Column("verification_status", sa.String(50), nullable=False),
        sa.Column("content_hash", sa.String(255), unique=True, nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "technology_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("technology_name", sa.String(255), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("domain", sa.String(100), nullable=False, index=True),
        sa.Column("sub_domain", sa.String(100), nullable=False, index=True),
        sa.Column("trl_level", sa.Integer(), nullable=False),
        sa.Column("technology_readiness_status", sa.String(50), nullable=False),
        sa.Column("patent_status", sa.String(50), nullable=False),
        sa.Column("patent_number", sa.String(100), nullable=True),
        sa.Column("patent_owner", sa.String(255), nullable=True),
        sa.Column("manufacturing_readiness", sa.String(50), nullable=False),
        sa.Column("manufacturing_location", sa.String(255), nullable=True),
        sa.Column("manufacturing_capacity", sa.String(100), nullable=True),
        sa.Column("market_potential", sa.String(100), nullable=True),
        sa.Column("market_demand", sa.String(50), nullable=True),
        sa.Column("estimated_market_size", sa.String(100), nullable=True),
        sa.Column("scalability", sa.String(50), nullable=False),
        sa.Column("deployment_timeline", sa.String(100), nullable=True),
        sa.Column("license_available", sa.Integer(), default=0),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("certifications_available", postgresql.JSON(), default=list),
        sa.Column("certifications_required", postgresql.JSON(), default=list),
        sa.Column("embedding_vector", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "industry_requirements",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("company_id", sa.Integer(), sa.ForeignKey("company_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("problem_statement", sa.Text(), nullable=False),
        sa.Column("technology_needed", sa.String(255), nullable=False),
        sa.Column("domain", sa.String(100), nullable=False, index=True),
        sa.Column("sub_domain", sa.String(100), nullable=False),
        sa.Column("keywords", sa.Text(), nullable=True),
        sa.Column("required_trl", sa.Integer(), nullable=False),
        sa.Column("deployment_scale", sa.String(50), nullable=False),
        sa.Column("budget", sa.String(100), nullable=True),
        sa.Column("timeline", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "certification_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("technology_id", sa.Integer(), nullable=False),
        sa.Column("certification_name", sa.String(255), nullable=False),
        sa.Column("certification_body", sa.String(255), nullable=False),
        sa.Column("certification_status", sa.String(50), nullable=False),
        sa.Column("compliance_domain", sa.String(100), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "market_profiles",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("technology_id", sa.Integer(), nullable=False),
        sa.Column("market_segment", sa.String(255), nullable=False),
        sa.Column("market_size", sa.String(100), nullable=True),
        sa.Column("market_growth_rate", sa.Float(), nullable=True),
        sa.Column("demand_level", sa.String(50), nullable=False),
        sa.Column("competitive_landscape", sa.Text(), nullable=True),
        sa.Column("adoption_barriers", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("market_profiles")
    op.drop_table("certification_profiles")
    op.drop_table("industry_requirements")
    op.drop_table("technology_profiles")
    op.drop_table("evidence_sources")
    op.drop_table("company_profiles")
