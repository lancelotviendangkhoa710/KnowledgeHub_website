<?php

namespace Tests\Unit\Content;

use App\Models\Category;
use App\Services\Content\CategoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CategoryModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_category_uses_uuid_primary_key(): void
    {
        $category = Category::create([
            'name' => 'Backend Engineering',
            'slug' => 'backend-engineering',
        ]);

        $this->assertNotEmpty($category->id);
        $this->assertTrue(Str::isUuid($category->id));
        $this->assertEquals('Backend Engineering', $category->name);
    }

    public function test_category_supports_hierarchy(): void
    {
        $parent = Category::create([
            'name' => 'Development',
            'slug' => 'development',
        ]);

        $child1 = Category::create([
            'name' => 'PHP',
            'slug' => 'php',
            'parent_id' => $parent->id,
        ]);

        $child2 = Category::create([
            'name' => 'Go',
            'slug' => 'go',
            'parent_id' => $parent->id,
        ]);

        $this->assertEquals($parent->id, $child1->parent->id);
        $this->assertCount(2, $parent->children);
    }

    public function test_category_service_prevents_self_referencing_parent(): void
    {
        $category = Category::create([
            'name' => 'Web',
            'slug' => 'web',
        ]);

        $service = new CategoryService();

        $this->expectException(\InvalidArgumentException::class);
        $service->update($category, ['parent_id' => $category->id]);
    }
}

