<?php

// ╔══════════════════════════════════════════╗
// ║  Domain: Content                        ║
// ║  Owner:  TEAM_MEMBER_B (p2)             ║
// ║  CHỈ p2 được sửa file này              ║
// ╚══════════════════════════════════════════╝

use App\Http\Controllers\Content\ArticleController;
use App\Http\Controllers\Content\BookmarkController;
use App\Http\Controllers\Content\CategoryController;
use App\Http\Controllers\Content\TagController;
use Illuminate\Support\Facades\Route;

// ── Public Content Endpoints ──────────────────────────────────────────────────
Route::get('/articles', [ArticleController::class, 'index']);
Route::get('/articles/{identifier}', [ArticleController::class, 'show']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/categories/{slug}', [CategoryController::class, 'show']);
Route::get('/tags', [TagController::class, 'index']);
Route::get('/tags/{slug}', [TagController::class, 'show']);

// ── Authenticated Content Endpoints ──────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {
    // Bookmarks (Learners & Users)
    Route::get('/bookmarks', [BookmarkController::class, 'index']);
    Route::post('/articles/{articleId}/bookmark', [BookmarkController::class, 'toggle']);

    // Contributor / Admin course lifecycle
    Route::post('/articles', [ArticleController::class, 'store']);
    Route::put('/articles/{article}', [ArticleController::class, 'update']);
    Route::post('/articles/{article}/publish', [ArticleController::class, 'publish']);
    Route::post('/articles/{article}/archive', [ArticleController::class, 'archive']);
    Route::delete('/articles/{article}', [ArticleController::class, 'destroy']);

    // Admin category management
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{category}', [CategoryController::class, 'update']);
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
});
