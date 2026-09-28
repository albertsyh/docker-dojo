<?php

use App\Http\Controllers\DojoController;
use Illuminate\Support\Facades\Route;

Route::get('/content', [DojoController::class, 'content']);
Route::get('/stats', [DojoController::class, 'stats']);

// Before the {id} group, so "suggestion" isn't read as a participant id.
Route::get('/participants/suggestion', [DojoController::class, 'suggestId'])->middleware('throttle:suggest');
Route::post('/participants', [DojoController::class, 'createParticipant'])->middleware('throttle:join');

Route::prefix('/participants/{id}')->middleware('throttle:participant')->group(function () {
    Route::get('/', [DojoController::class, 'showParticipant']);
    Route::put('/exercises/{exerciseId}', [DojoController::class, 'completeExercise']);
    Route::delete('/exercises/{exerciseId}', [DojoController::class, 'uncompleteExercise']);
    Route::post('/quiz', [DojoController::class, 'submitQuiz'])->middleware('throttle:quiz');
});
