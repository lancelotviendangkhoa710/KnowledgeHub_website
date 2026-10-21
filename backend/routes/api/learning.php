<?php

use App\Http\Controllers\Learning\RoadmapItemController;
use App\Http\Controllers\Learning\RoadmapItemPrerequisiteController;
use App\Http\Controllers\Learning\RoadmapController;
use App\Http\Controllers\Learning\RoadmapProgressController;
use Illuminate\Support\Facades\Route;

// Domain: Learning / Owner: TEAM_MEMBER_C
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/learning/roadmaps', [RoadmapController::class, 'index']);
    Route::post('/learning/roadmaps', [RoadmapController::class, 'store']);
    Route::get('/learning/roadmaps/{roadmap}', [RoadmapController::class, 'show'])->whereUuid('roadmap');
    Route::put('/learning/roadmaps/{roadmap}', [RoadmapController::class, 'update'])->whereUuid('roadmap');
    Route::delete('/learning/roadmaps/{roadmap}', [RoadmapController::class, 'destroy'])->whereUuid('roadmap');

    Route::post('/learning/roadmaps/{roadmap}/items', [RoadmapItemController::class, 'store'])->whereUuid('roadmap');
    Route::put('/learning/roadmaps/{roadmap}/items/{item}', [RoadmapItemController::class, 'update'])
        ->whereUuid('roadmap')
        ->whereUuid('item');
    Route::delete('/learning/roadmaps/{roadmap}/items/{item}', [RoadmapItemController::class, 'destroy'])
        ->whereUuid('roadmap')
        ->whereUuid('item');

    Route::get('/learning/roadmap-items/{item}/progress', [RoadmapProgressController::class, 'show'])->whereUuid('item');
    Route::patch('/learning/roadmap-items/{item}/progress', [RoadmapProgressController::class, 'update'])->whereUuid('item');

    Route::post('/learning/roadmap-items/{item}/prerequisites', [RoadmapItemPrerequisiteController::class, 'store'])
        ->whereUuid('item');
    Route::delete('/learning/roadmap-items/{item}/prerequisites/{prerequisite}', [RoadmapItemPrerequisiteController::class, 'destroy'])
        ->whereUuid('item')
        ->whereUuid('prerequisite');
});
