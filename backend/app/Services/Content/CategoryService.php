<?php

namespace App\Services\Content;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class CategoryService
{
    /**
     * Get full category hierarchy (roots with eager-loaded children).
     */
    public function getTree(): Collection
    {
        return Category::whereNull('parent_id')
            ->with(['children' => function ($query) {
                $query->withCount('articles');
            }])
            ->withCount('articles')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get flat list of all categories.
     */
    public function getAll(): Collection
    {
        return Category::orderBy('name')->get();
    }

    /**
     * Find category by slug.
     */
    public function findBySlug(string $slug): ?Category
    {
        return Category::where('slug', $slug)
            ->with(['parent', 'children'])
            ->withCount('articles')
            ->first();
    }

    /**
     * Create a new category.
     */
    public function create(array $data): Category
    {
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        // Ensure unique slug
        $baseSlug = $data['slug'];
        $counter = 1;
        while (Category::where('slug', $data['slug'])->exists()) {
            $data['slug'] = "{$baseSlug}-{$counter}";
            $counter++;
        }

        return Category::create([
            'name' => $data['name'],
            'slug' => $data['slug'],
            'parent_id' => $data['parent_id'] ?? null,
        ]);
    }

    /**
     * Update an existing category.
     */
    public function update(Category $category, array $data): Category
    {
        if (isset($data['parent_id']) && $data['parent_id'] === $category->id) {
            throw new \InvalidArgumentException('A category cannot be its own parent.');
        }

        if (isset($data['name']) && empty($data['slug'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        if (isset($data['slug']) && $data['slug'] !== $category->slug) {
            $baseSlug = $data['slug'];
            $counter = 1;
            while (Category::where('slug', $data['slug'])->where('id', '!=', $category->id)->exists()) {
                $data['slug'] = "{$baseSlug}-{$counter}";
                $counter++;
            }
        }

        $category->update(array_filter([
            'name' => $data['name'] ?? $category->name,
            'slug' => $data['slug'] ?? $category->slug,
            'parent_id' => array_key_exists('parent_id', $data) ? $data['parent_id'] : $category->parent_id,
        ], fn ($val) => $val !== null || array_key_exists('parent_id', $data)));

        return $category->fresh();
    }

    /**
     * Delete a category.
     * Respects database RESTRICT constraints on children and articles.
     */
    public function delete(Category $category): void
    {
        if ($category->children()->exists()) {
            throw new \RuntimeException('Cannot delete category with existing child categories.');
        }

        if ($category->articles()->exists()) {
            throw new \RuntimeException('Cannot delete category with associated articles.');
        }

        $category->delete();
    }
}

