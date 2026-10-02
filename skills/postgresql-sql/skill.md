# postgresql-sql

## Purpose

Write, optimize, and debug PostgreSQL 16 queries for KnowledgeHub, following Laravel conventions and project performance requirements.

## When to activate

- Writing SELECT, INSERT, UPDATE, DELETE statements
- Optimizing slow queries or analyzing execution plans
- Implementing database triggers, functions, or views
- Debugging query errors or constraint violations
- Reviewing SQL before execution
- Writing raw queries in Laravel when Eloquent insufficient

## Project context

**Database**: PostgreSQL 16  
**ORM**: Laravel 11 Eloquent (prefer when possible)  
**Schema conventions**: UUID PKs, timestamptz, explicit FKs  
**Environment**: Docker Compose, accessible via `docker compose exec postgres psql -U knowledgehub -d knowledgehub`

**Access patterns**:
- Primary: Laravel Eloquent models and query builder
- Raw SQL: Use `DB::raw()` or `DB::statement()` with parameter binding
- Migrations: Schema builder preferred; raw SQL for complex constraints only

## Workflow

1. **Understand requirement**
   - Identify tables, columns, relationships from `docs/DATABASE.md`
   - Determine query type: lookup, aggregation, reporting, mutation
   - Check for existing indexes on query columns

2. **Write query**
   - Use explicit column names (not `SELECT *`)
   - Parameterize user input (prevent SQL injection)
   - Join tables using foreign keys with proper ON clauses
   - Filter soft-deleted records: `WHERE deleted_at IS NULL`
   - Use CTEs for complex logic instead of nested subqueries

3. **Optimize for performance**
   - Add indexes on WHERE, JOIN, ORDER BY columns
   - Use EXPLAIN ANALYZE to check execution plan
   - Avoid N+1 queries: use JOINs or eager loading
   - Limit result sets with pagination
   - Consider materialized views for expensive aggregations

4. **Test query**
   - Run on development database with realistic data volume
   - Verify correct results and expected row count
   - Check execution time: queries should be <100ms typically
   - Test with NULL values, empty results, edge cases
   - Confirm transaction isolation if needed

5. **Document and integrate**
   - Add query to appropriate Laravel model or repository
   - Include comments for complex logic
   - Write test case covering query behavior
   - Update documentation if query reveals schema issue

## Examples

### Safe parameterized query
```php
// Good: Parameter binding prevents SQL injection
$articles = DB::table(''articles'')
    ->join(''users'', ''articles.author_id'', ''='', ''users.id'')
    ->where(''articles.status'', ''='', ''published'')
    ->whereNull(''articles.deleted_at'')
    ->whereNull(''users.deleted_at'')
    ->select(''articles.*'', ''users.name as author_name'')
    ->orderBy(''articles.published_at'', ''desc'')
    ->limit(20)
    ->get();
```

### Efficient aggregation with CTE
```sql
WITH active_articles AS (
    SELECT id, category_id, author_id
    FROM articles
    WHERE status = ''published'' AND deleted_at IS NULL
)
SELECT c.name AS category_name, COUNT(a.id) AS article_count
FROM categories c
LEFT JOIN active_articles a ON c.id = a.category_id
GROUP BY c.id, c.name
ORDER BY article_count DESC;
```

### Transaction for data consistency
```php
DB::transaction(function () use ($articleId, $decision) {
    DB::table(''article_reviews'')->insert([
        ''id'' => Str::uuid(),
        ''article_version_id'' => $articleId,
        ''decision'' => $decision,
        ''created_at'' => now(),
    ]);
    
    if ($decision === ''approved'') {
        DB::table(''articles'')
            ->where(''id'', $articleId)
            ->update([''status'' => ''published'']);
    }
});
```

## Common mistakes to avoid

- String concatenation for user input (SQL injection risk)
- Missing soft-delete filter (`deleted_at IS NULL`)
- Using `SELECT *` in production queries
- Sequential scans on large tables (add indexes)
- N+1 queries in loops (use JOINs or eager loading)
- Comparing NULL with `= NULL` (use `IS NULL`)

## Prohibited actions

- Never run UPDATE/DELETE without WHERE clause in production
- Never disable foreign key constraints to force invalid data
- Never execute unparameterized user input
- Never DROP or TRUNCATE production tables without backup

## Coordination with other skills

- **database-design**: Verify schema supports required queries efficiently
- **data-pipelines**: Write bulk insert/upsert patterns for ETL
- **data-quality-testing**: Implement validation queries for constraints
