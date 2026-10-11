# database-design

## Purpose

Design and evolve relational database schemas for KnowledgeHub using PostgreSQL 16 conventions, Laravel migration patterns, and project constraints.

## When to activate

- Creating new tables, columns, indexes, or constraints
- Modifying existing schema structure
- Evaluating entity relationships or normalization
- Reviewing proposed schema changes before implementation
- Investigating foreign key cascades or deletion behavior

## Project context

**Database**: PostgreSQL 16  
**ORM**: Laravel 11 migrations (Eloquent)  
**Environment**: Docker Compose development

**Existing conventions** (see `docs/DATABASE.md`):
- Primary keys: UUID v4 (`$table->uuid('id')->primary()`)
- Timestamps: `timestampTz` everywhere
- Foreign keys: Explicit on every relationship with cascade rules
- Enums: VARCHAR + CHECK constraint (not native ENUM)
- Money: NUMERIC(12,2)
- Currency: CHAR(3) ISO 4217
- Soft deletes: users + content tables only (not junction tables)
- JSONB: Only when genuinely variable (messages.metadata)

## Workflow

1. **Inspect existing schema**
   - Read `docs/DATABASE.md` and `docs/ERD.md`
   - Check `database/migrations/` for current structure
   - Identify related tables and constraints

2. **Design entity structure**
   - Define primary key (UUID), required columns, nullable fields
   - Specify data types matching project conventions
   - Apply CHECK constraints for enums and validation
   - Add timestamps (created_at, updated_at, deleted_at if soft delete)

3. **Define relationships**
   - Foreign keys with explicit names: `fk_{table}_{column}`
   - Cascade rules: `onDelete('cascade')` or `onDelete('restrict')`
   - Composite unique constraints for junction tables
   - Indexes on foreign keys and frequently queried columns

4. **Validate design**
   - Check normalization: no redundant data unless justified
   - Verify referential integrity: orphaned records prevented
   - Test deletion scenarios: what happens when parent deleted?
   - Confirm naming matches project conventions

5. **Document decision**
   - Update `docs/DATABASE.md` with new table structure
   - Update `docs/ERD.md` with relationship diagram
   - Create migration with descriptive name and rollback support
   - Note any breaking changes or required data migration

## Examples

### New table with foreign key (course enrollment)
```php
Schema::create('enrollments', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('user_id');
    $table->uuid('course_id');
    $table->string('status', 20)->default('active');
    $table->timestampTz('enrolled_at');
    $table->timestampTz('created_at')->nullable();
    $table->timestampTz('updated_at')->nullable();

    $table->unique(['user_id', 'course_id']); // one enrollment per user per course

    $table->foreign('user_id', 'fk_enrollments_user')
          ->references('id')->on('users')
          ->onDelete('restrict');
    $table->foreign('course_id', 'fk_enrollments_course')
          ->references('id')->on('courses')
          ->onDelete('restrict');

    $table->check("status IN ('active','completed','dropped')");

    $table->index('user_id');
    $table->index('course_id');
});
```

### Self-referencing hierarchy
```php
Schema::create('categories', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('parent_id')->nullable();
    $table->string('name');
    $table->string('slug')->unique();
    $table->timestampTz('created_at');
    $table->timestampTz('updated_at');
    
    $table->foreign('parent_id', 'fk_categories_parent')
          ->references('id')->on('categories')
          ->onDelete('cascade'); // Remove children when parent deleted
    
    $table->index('parent_id');
});
```

### Many-to-many with composite PK
```php
Schema::create('article_tags', function (Blueprint $table) {
    $table->uuid('article_id');
    $table->uuid('tag_id');
    $table->timestampTz('created_at');
    
    $table->primary(['article_id', 'tag_id']); // Composite PK = uniqueness
    
    $table->foreign('article_id', 'fk_article_tags_article')
          ->references('id')->on('articles')
          ->onDelete('cascade');
    $table->foreign('tag_id', 'fk_article_tags_tag')
          ->references('id')->on('tags')
          ->onDelete('cascade');
});
```

## Validation requirements

- Run migration on fresh database: `docker compose exec app php artisan migrate:fresh`
- Verify constraints: `docker compose exec postgres psql -U knowledgehub -d knowledgehub -c "\d tablename"`
- Test constraint violations (should fail): Insert invalid enum, duplicate unique key
- Check foreign key cascades: Delete parent, verify child behavior
- Update `docs/DATABASE.md` and `docs/ERD.md` to match implementation

## Common mistakes to avoid

- Using `integer` instead of `uuid` for primary/foreign keys
- Omitting foreign key cascade rules (causes orphaned records)
- Using native ENUM (requires ALTER TYPE for changes)
- Storing files in database instead of S3 metadata
- Missing indexes on foreign keys (slow joins)
- Soft deleting junction tables (complicates queries)
- JSONB for structured data that belongs in columns
- Float/double for money (precision loss)

## Prohibited actions

- Never DROP table without team approval and backup verification
- Never ALTER production schema without migration and rollback plan
- Never store plaintext passwords, API keys, or card numbers
- Never expose database publicly (even in development)
- Never remove foreign key constraints to "fix" deletion errors

## Coordination with other skills

- **postgresql-sql**: Implement queries and indexes after schema designed
- **data-pipelines**: Design staging tables and transformation structure
- **data-quality-testing**: Define validation rules matching constraints
