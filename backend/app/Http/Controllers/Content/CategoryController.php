<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\CreateCategoryRequest;
use App\Http\Requests\Content\UpdateCategoryRequest;
use App\Models\Category;
use App\Services\Content\CategoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CategoryController extends Controller
{
    public function __construct(
        protected CategoryService $categoryService
    ) {}

    /**
     * Get category tree hierarchy.
     */
    public function index(): JsonResponse
    {
        $categories = $this->categoryService->getTree();

        return response()->json([
            'status' => 'success',
            'data' => $categories,
        ]);
    }

    /**
     * Get a specific category by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $category = $this->categoryService->findBySlug($slug);

        if (!$category) {
            return response()->json([
                'status' => 'error',
                'message' => 'Category not found.',
            ], Response::HTTP_NOT_FOUND);
        }

        return response()->json([
            'status' => 'success',
            'data' => $category,
        ]);
    }

    /**
     * Create a new category (Admin only).
     */
    public function store(CreateCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->create($request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Category created successfully.',
            'data' => $category,
        ], Response::HTTP_CREATED);
    }

    /**
     * Update an existing category (Admin only).
     */
    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        try {
            $updated = $this->categoryService->update($category, $request->validated());

            return response()->json([
                'status' => 'success',
                'message' => 'Category updated successfully.',
                'data' => $updated,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }

    /**
     * Delete a category (Admin only).
     */
    public function destroy(Request $request, Category $category): JsonResponse
    {
        // Admin authorization check
        $user = $request->user();
        $isAdmin = false;
        if ($user) {
            if (isset($user->role) && $user->role === 'admin') {
                $isAdmin = true;
            } elseif (method_exists($user, 'hasRole') && $user->hasRole('admin')) {
                $isAdmin = true;
            } else {
                $isAdmin = \Illuminate\Support\Facades\DB::table('user_roles')
                    ->join('roles', 'roles.id', '=', 'user_roles.role_id')
                    ->where('user_roles.user_id', $user->id)
                    ->where('roles.name', 'admin')
                    ->exists();
            }
        }

        if (!$isAdmin) {
            return response()->json([
                'status' => 'error',
                'message' => 'This action is unauthorized.',
            ], Response::HTTP_FORBIDDEN);
        }

        try {
            $this->categoryService->delete($category);

            return response()->json([
                'status' => 'success',
                'message' => 'Category deleted successfully.',
            ]);
        } catch (\RuntimeException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
    }
}

