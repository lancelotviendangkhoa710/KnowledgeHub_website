<?php

namespace App\Services\Content;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Str;

class CategoryService
{
    /**
     * Get root categories with their nested children for navigation trees.
     *
     * @return Collection<int, Category>
     */
    public function getCategoryTree(): Collection
    {
        return Category::query()
            ->whereNull('parent_id')
            ->with(['children' => function ($query) {
                $query->withCount('articles');
            }])
            ->withCount('articles')
            ->orderBy('name')
            ->get();
    }

    /**
     * Get all categories as a flat list.
     *
     * @return Collection<int, Category>
     */
    public function getAllFlat(): Collection
    {
        return Category::query()
            ->with('parent:id,name,slug')
            ->withCount('articles')
            ->orderBy('name')
            ->get();
    }

    /**
     * Find category by slug with published articles.
     */
    public function getBySlug(string $slug): ?Category
    {
        return Category::query()
            ->where('slug', $slug)
            ->with(['children', 'parent'])
            ->withCount('articles')
            ->first();
    }

    /**
     * Create a new category.
     *
     * @param array{name: string, slug?: ?string, parent_id?: ?string} $data
     */
    public function createCategory(array $data): Category
    {
        $slug = ! empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);

        return Category::create([
            'name' => $data['name'],
            'slug' => $slug,
            'parent_id' => $data['parent_id'] ?? null,
        ]);
    }

    /**
     * Update an existing category.
     *
     * @param array{name: string, slug?: ?string, parent_id?: ?string} $data
     */
    public function updateCategory(Category $category, array $data): Category
    {
        $slug = ! empty($data['slug']) ? Str::slug($data['slug']) : Str::slug($data['name']);

        $category->update([
            'name' => $data['name'],
            'slug' => $slug,
            'parent_id' => $data['parent_id'] ?? $category->parent_id,
        ]);

        return $category->fresh(['parent', 'children']);
    }

    /**
     * Delete a category. Validates restrict constraints.
     *
     * @throws \DomainException
     */
    public function deleteCategory(Category $category): bool
    {
        if ($category->children()->exists()) {
            throw new \DomainException('Cannot delete category with active subcategories. Reassign or delete subcategories first.');
        }

        if ($category->articles()->exists()) {
            throw new \DomainException('Cannot delete category with associated articles. Reassign articles first.');
        }

        return (bool) $category->delete();
    }
}
