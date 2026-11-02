<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\CreateTagRequest;
use App\Services\Content\TagService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TagController extends Controller
{
    public function __construct(
        protected TagService $tagService
    ) {}

    /**
     * List all tags.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 50);
        $tags = $this->tagService->getAll($perPage);

        return response()->json($tags);
    }

    /**
     * Create a new tag (Contributor or Admin).
     */
    public function store(CreateTagRequest $request): JsonResponse
    {
        $tag = $this->tagService->create($request->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Tag created successfully.',
            'data' => $tag,
        ], Response::HTTP_CREATED);
    }
}

