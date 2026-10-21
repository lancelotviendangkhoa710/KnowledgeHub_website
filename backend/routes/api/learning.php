<?php

use App\Http\Controllers\Learning\RoadmapProgressController;
use App\Http\Controllers\Learning\RoadmapItemPrerequisiteController;
use App\Http\Controllers\Learning\RoadmapController;
use App\Http\Controllers\Learning\RoadmapItemController;
use Illuminate\Support\Facades\Route;

// Domain: Learning / Owner: TEAM_MEMBER_C
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/learning/roadmaps', [RoadmapController::class, 'index']);
    Route::post('/learning/roadmaps', [RoadmapController::class, 'store']);
    Route::get('/learning/roadmaps/{roadmap}', [RoadmapController::class, 'show']);
    Route::put('/learning/roadmaps/{roadmap}', [RoadmapController::class, 'update']);
    Route::delete('/learning/roadmaps/{roadmap}', [RoadmapController::class, 'destroy']);

    Route::post('/learning/roadmaps/{roadmap}/items', [RoadmapItemController::class, 'store']);
    Route::put('/learning/roadmaps/{roadmap}/items/{item}', [RoadmapItemController::class, 'update']);
    Route::delete('/learning/roadmaps/{roadmap}/items/{item}', [RoadmapItemController::class, 'destroy']);
    Route::get('/learning/roadmap-items/{item}/progress', [RoadmapProgressController::class, 'show']);
    Route::patch('/learning/roadmap-items/{item}/progress', [RoadmapProgressController::class, 'update']);
    Route::post('/learning/roadmap-items/{item}/prerequisites', [RoadmapItemPrerequisiteController::class, 'store']);
    Route::delete('/learning/roadmap-items/{item}/prerequisites/{prerequisite}', [RoadmapItemPrerequisiteController::class, 'destroy']);
});