# data-pipelines

## Purpose

Design and implement Python-based ETL/ELT data pipelines for KnowledgeHub, focusing on reliability, idempotency, and maintainability.

## When to activate

- Building data ingestion from external sources
- Implementing transformation logic for staging-to-production
- Designing batch or incremental data processing
- Migrating data between schema versions
- Implementing data synchronization workflows

## Project context

**Stack**: Python (planned: FastAPI service) + PostgreSQL 16  
**Current state**: Not yet implemented; AI service marked "future" in stack  
**Integration**: Will connect to same PostgreSQL instance as Laravel backend  
**Environment**: Docker Compose for all services

**Requirements**:
- Idempotent: Re-running pipeline produces same result
- Transactional: All-or-nothing for consistency
- Logged: Track execution, errors, row counts
- Tested: Unit tests for transforms, integration tests for end-to-end
- Recoverable: Can resume from failure point

## Workflow

1. **Design pipeline architecture**
   - Identify source (API, file, database) and target (staging, production tables)
   - Determine full-refresh vs. incremental pattern
   - Define data quality requirements and failure handling
   - Document schema mapping and transformation logic

2. **Implement extraction**
   - Fetch data from source with error handling and retries
   - Validate source data format and required fields
   - Log extraction metrics: row count, timestamp, source version
   - Handle pagination, rate limits, authentication

3. **Implement transformation**
   - Clean and normalize data (trim strings, parse dates, handle nulls)
   - Apply business logic (calculations, lookups, enrichment)
   - Validate constraints match target schema (CHECK, FK, unique)
   - Keep transforms pure functions: same input = same output

4. **Implement loading**
   - Use transactions for atomic load operations
   - For incremental: upsert based on natural key or timestamp
   - For full refresh: load to temp table, swap atomically
   - Log load metrics: inserted, updated, skipped, failed

5. **Test and validate**
   - Unit test each transformation function with edge cases
   - Integration test full pipeline with realistic data
   - Verify idempotency: run twice, check result identical
   - Test failure scenarios: network error, constraint violation

## Examples

### Idempotent upsert pattern
```python
import psycopg2
from psycopg2.extras import execute_values

def load_articles_incremental(conn, articles):
    """Upsert articles based on external_id natural key."""
    with conn.cursor() as cur:
        data = [(a[''external_id''], a[''title''], a[''content'']) for a in articles]
        query = """
            INSERT INTO staging_articles (external_id, title, content)
            VALUES %s
            ON CONFLICT (external_id) 
            DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content
            WHERE staging_articles.updated_at < EXCLUDED.updated_at;
        """
        execute_values(cur, query, data)
        conn.commit()
```

### Transactional pipeline
```python
def run_pipeline(source_url, db_config):
    conn = psycopg2.connect(**db_config)
    try:
        raw_data = fetch_from_api(source_url)
        transformed = [transform_record(r) for r in raw_data]
        load_to_database(conn, transformed)
        conn.commit()
    except Exception as e:
        conn.rollback()
        logging.error(f"Pipeline failed: {e}")
        raise
    finally:
        conn.close()
```

## Common mistakes to avoid

- Non-idempotent operations (generates duplicates on retry)
- Missing transaction boundaries (partial load on error)
- No logging or observability
- Hardcoded credentials (use environment variables)
- No retry logic for transient failures
- Missing data quality validation before load

## Prohibited actions

- Never run pipeline against production without testing on staging
- Never delete source data before verifying target load
- Never commit credentials to repository
- Never load untrusted data without validation

## Coordination with other skills

- **database-design**: Design staging tables and target schema
- **postgresql-sql**: Implement efficient bulk insert/upsert queries
- **data-quality-testing**: Define validation rules and reconciliation tests
