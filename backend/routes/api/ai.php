<?php

use App\Http\Controllers\AI\ConversationController;
use App\Http\Controllers\AI\MessageController;
use App\Http\Controllers\AI\RoadmapGenerationController;
use App\Http\Controllers\AI\UserMemoryController;
use Illuminate\Support\Facades\Route;

// AI service routes. AI-05 route/schema owner is TEAM_MEMBER_C; AI-01..03 owner must be
// assigned in docs/team/OWNERSHIP.md before merge (still TBD at the time of writing).

Route::middleware('auth:sanctum')->group(function () {
    // AI-05 Roadmap Assistant - TEAM_MEMBER_C
    Route::post('/ai/roadmaps/preview', [RoadmapGenerationController::class, 'preview']);
    Route::post('/ai/roadmaps/confirm', [RoadmapGenerationController::class, 'confirm']);

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
