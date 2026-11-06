<?php

use App\Http\Controllers\AI\RoadmapGenerationController;
use Illuminate\Support\Facades\Route;

// AI-05 Roadmap Assistant - TEAM_MEMBER_C
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/ai/roadmaps/preview', [RoadmapGenerationController::class, 'preview']);
    Route::post('/ai/roadmaps/confirm', [RoadmapGenerationController::class, 'confirm']);
});
