<?php

// ╔══════════════════════════════════════════╗
// ║  Domain: Content                        ║
// ║  Owner:  TEAM_MEMBER_B (p2)             ║
// ║  CHỈ p2 được sửa file này               ║
// ╚══════════════════════════════════════════╝

use App\Http\Controllers\Content\ArticleAttachmentController;
use App\Http\Controllers\Content\ArticleController;
use App\Http\Controllers\Content\BookmarkController;
use App\Http\Controllers\Content\CategoryController;
use App\Http\Controllers\Content\TagController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ── Public Content Endpoints ───────────────────────────────────────────
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('categories/{slug}', [CategoryController::class, 'show']);

    Route::get('tags', [TagController::class, 'index']);

    Route::get('articles', [ArticleController::class, 'index']);
    Route::get('articles/{slugOrId}', [ArticleController::class, 'show']);
    Route::get('articles/{article}/versions', [ArticleController::class, 'versions']);
    Route::get('versions/{versionId}/attachments', [ArticleAttachmentController::class, 'index']);

    // ── Authenticated Content Endpoints ────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {
        // Bookmarks (Authenticated Users / Learners)
        Route::get('bookmarks', [BookmarkController::class, 'index']);
        Route::post('articles/{articleId}/bookmark', [BookmarkController::class, 'store']);
        Route::delete('articles/{articleId}/bookmark', [BookmarkController::class, 'destroy']);

        // Articles Management (Contributors & Admins)
        Route::post('articles', [ArticleController::class, 'store']);
        Route::post('articles/{article}/versions', [ArticleController::class, 'update']);
        Route::post('articles/{article}/publish', [ArticleController::class, 'publish']);
        Route::post('articles/{article}/archive', [ArticleController::class, 'archive']);
        Route::delete('articles/{article}', [ArticleController::class, 'destroy']);

        // Tags Management (Contributors & Admins)
        Route::post('tags', [TagController::class, 'store']);

        // Attachments Management (Contributors & Admins)
        Route::post('versions/{version}/attachments', [ArticleAttachmentController::class, 'store']);
        Route::delete('attachments/{attachmentId}', [ArticleAttachmentController::class, 'destroy']);

        // Category Management (Admins only)
        Route::post('categories', [CategoryController::class, 'store']);
        Route::put('categories/{category}', [CategoryController::class, 'update']);
        Route::delete('categories/{category}', [CategoryController::class, 'destroy']);
    });
});

