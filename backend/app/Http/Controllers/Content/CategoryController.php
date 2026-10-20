<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\CategoryRequest;
use App\Models\Category;
use App\Services\Content\CategoryService;
use Illuminate\Http\JsonResponse;

class CategoryController extends Controller
{
    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * Display a tree listing of categories.
     */
    public function index(): JsonResponse
    {
        $categories = $this->categoryService->getCategoryTree();

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    /**
     * Display the specified category by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $category = $this->categoryService->getBySlug($slug);

        if (! $category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Category not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $category,
        ]);
    }

    /**
     * Store a newly created category (Admin only).
     */
    public function store(CategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->createCategory($request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Category created successfully.',
            'data' => $category,
        ], 201);
    }

    /**
     * Update the specified category (Admin only).
     */
    public function update(CategoryRequest $request, Category $category): JsonResponse
    {
        $updatedCategory = $this->categoryService->updateCategory($category, $request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Category updated successfully.',
            'data' => $updatedCategory,
        ]);
    }

    /**
     * Remove the specified category (Admin only, enforces RESTRICT constraints).
     */
    public function destroy(Category $category): JsonResponse
    {
        try {
            $this->categoryService->deleteCategory($category);

            return response()->json([
                'status' => 'success',
                'message' => 'Category deleted successfully.',
            ]);
        } catch (\DomainException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
