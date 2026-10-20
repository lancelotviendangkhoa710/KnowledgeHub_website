<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;

class TagController extends Controller
{
    /**
     * Display a listing of all tags.
     */
    public function index(): JsonResponse
    {
        $tags = Tag::query()
            ->withCount(['articles' => function ($query) {
                $query->published();
            }])
            ->orderBy('name')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $tags,
        ]);
    }

    /**
     * Display the specified tag by slug with associated published articles.
     */
    public function show(string $slug): JsonResponse
    {
        $tag = Tag::query()
            ->where('slug', $slug)
            ->with(['articles' => function ($query) {
                $query->published()->with(['author:id,name', 'category', 'publishedVersion']);
            }])
            ->first();

        if (! $tag) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tag not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $tag,
        ]);
    }
}
