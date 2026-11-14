<?php

use App\Http\Controllers\AI\ConversationController;
use App\Http\Controllers\AI\CompanionRoadmapController;
use App\Http\Controllers\AI\FormRoadmapController;
use App\Http\Controllers\AI\MessageController;
use App\Http\Controllers\AI\RetentionPurgeController;
use App\Http\Controllers\AI\RoadmapGenerationController;
use App\Http\Controllers\AI\UserMemoryController;
use App\Http\Controllers\AI\UserCvController;
use Illuminate\Support\Facades\Route;

// Internal retention trigger for hosts without a scheduler. Protected by
// X-Retention-Token (RETENTION_CRON_TOKEN), not Sanctum, and rate-limited.
Route::post('/internal/ai/purge-deleted-users', RetentionPurgeController::class);

// AI service routes. AI-05 route/schema owner is TEAM_MEMBER_C; AI-01..03 owner must be
// assigned in docs/team/OWNERSHIP.md before merge (still TBD at the time of writing).

Route::middleware('auth:sanctum')->group(function () {
    // AI-05 Roadmap Assistant - TEAM_MEMBER_C
    Route::post('/ai/roadmaps/preview', [RoadmapGenerationController::class, 'preview']);
    Route::post('/ai/roadmaps/confirm', [RoadmapGenerationController::class, 'confirm']);
    Route::post('/ai/roadmaps/form-preview', [FormRoadmapController::class, 'preview']);
    Route::post('/ai/roadmaps/form-confirm', [FormRoadmapController::class, 'confirm']);

    // AI-05 Companion flow; owner-scoped conversation context and signed preview.
    Route::post('/ai/conversations/{conversation}/roadmaps/preview', [CompanionRoadmapController::class, 'preview'])
        ->whereUuid('conversation');
    Route::post('/ai/conversations/{conversation}/roadmaps/confirm', [CompanionRoadmapController::class, 'confirm'])
        ->whereUuid('conversation');

    // CV-02 owner-scoped saved CV.
    Route::get('/ai/cv', [UserCvController::class, 'show']);
    Route::post('/ai/cv', [UserCvController::class, 'store']);
    Route::get('/ai/cv/download', [UserCvController::class, 'download']);
    Route::delete('/ai/cv', [UserCvController::class, 'destroy']);

    // AI-01 Conversations
    Route::get('/ai/conversations', [ConversationController::class, 'index']);
    Route::post('/ai/conversations', [ConversationController::class, 'store']);
    Route::get('/ai/conversations/{conversation}', [ConversationController::class, 'show'])
        ->whereUuid('conversation');
    Route::patch('/ai/conversations/{conversation}', [ConversationController::class, 'update'])
        ->whereUuid('conversation');
    Route::delete('/ai/conversations/{conversation}', [ConversationController::class, 'destroy'])
        ->whereUuid('conversation');

    // AI-02 Message History
    Route::get('/ai/conversations/{conversation}/messages', [MessageController::class, 'index'])
        ->whereUuid('conversation');
    Route::post('/ai/conversations/{conversation}/messages', [MessageController::class, 'store'])
        ->whereUuid('conversation');

    // AI-03 User Memory
    Route::get('/ai/memories', [UserMemoryController::class, 'index']);
    Route::post('/ai/memories', [UserMemoryController::class, 'store']);
    Route::patch('/ai/memories/{memory}', [UserMemoryController::class, 'update'])
        ->whereUuid('memory');
    Route::delete('/ai/memories/{memory}', [UserMemoryController::class, 'destroy'])
        ->whereUuid('memory');
});
