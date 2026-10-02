# data-quality-testing

## Purpose

Validate data integrity, schema constraints, and business rules in KnowledgeHub database through automated tests and quality checks.

## When to activate

- Writing tests for new schema or constraints
- Validating data after migration or pipeline execution
- Investigating data quality issues or anomalies
- Creating regression tests for bug fixes
- Implementing reconciliation checks for data synchronization
- Verifying referential integrity and cascade behavior

## Project context

**Database**: PostgreSQL 16 with explicit constraints (CHECK, FK, unique)  
**Testing layers**:
- Schema validation: Constraints enforced by database
- Unit tests: Laravel feature tests for models and relationships
- Integration tests: End-to-end workflow validation
- Data quality: SQL-based validation queries

**Validation script**: `docs/validation_tests.sql` contains constraint test cases

## Workflow

1. **Identify validation requirements**
   - Extract rules from schema: NOT NULL, CHECK, FK, unique constraints
   - Document business rules: status transitions, calculation logic
   - Define data quality metrics: completeness, accuracy, consistency
   - Identify critical data flows requiring reconciliation

2. **Write schema validation tests**
   - Test constraint enforcement: attempt to violate, expect error
   - Verify unique constraints prevent duplicates
   - Test foreign key cascades: delete parent, check child behavior
   - Validate CHECK constraints reject invalid enums/values
   - Confirm NULL constraints block missing required fields

3. **Write data quality queries**
   - Completeness: COUNT nulls in required business fields
   - Uniqueness: Find duplicates violating business logic
   - Referential integrity: Detect orphaned records
   - Range validation: Identify out-of-bounds values
   - Consistency: Cross-table reconciliation

4. **Implement unit tests**
   - Test model relationships return expected results
   - Verify soft delete filters applied correctly
   - Test factory data generation respects constraints
   - Cover edge cases: empty strings, boundary values

5. **Create integration tests**
   - Test complete workflows: create article → publish → bookmark
   - Verify transaction rollback on validation failure
   - Test API endpoints enforce data rules

## Examples

### Schema constraint validation
```sql
-- Test CHECK constraint (expects ERROR)
INSERT INTO users (id, name, email, password, status, created_at, updated_at)
VALUES (gen_random_uuid(), ''Test'', ''test@x.com'', ''hash'', ''invalid'', NOW(), NOW());
```

### Data quality queries
```sql
-- Orphaned records
SELECT b.user_id, b.article_id
FROM bookmarks b
LEFT JOIN articles a ON b.article_id = a.id
WHERE a.id IS NULL OR a.deleted_at IS NOT NULL;

-- Missing required metadata
SELECT id, title FROM articles
WHERE author_id IS NULL AND deleted_at IS NULL;
```

### Laravel feature test
```php
public function test_cannot_create_article_with_invalid_status()
{
    $this->expectException(\Illuminate\Database\QueryException::class);
    Article::create([''status'' => ''invalid_status'']);
}
```

## Common mistakes to avoid

- Testing only happy path, not constraint violations
- Missing soft delete filters in validation queries
- Not testing cascade delete behavior
- No reconciliation after data migration
- Hardcoded test data that becomes stale

## Prohibited actions

- Never disable constraints to make tests pass
- Never run destructive tests against production database
- Never ignore failing data quality checks in CI/CD
- Never skip reconciliation after data migration

## Coordination with other skills

- **database-design**: Define testable constraints in schema design
- **postgresql-sql**: Write efficient validation queries
- **data-pipelines**: Implement reconciliation checks after pipeline execution
