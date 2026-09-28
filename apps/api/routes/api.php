<?php

use App\Http\Controllers\ChatController;
use App\Http\Controllers\DojoController;
use Illuminate\Support\Facades\Route;

Route::get('/content', [DojoController::class, 'content']);
Route::get('/stats', [DojoController::class, 'stats']);
Route::get('/exercises', [DojoController::class, 'exerciseIds']);
Route::get('/chat', [ChatController::class, 'index']);

// Before the {id} group, so "suggestion" isn't read as a participant id.
Route::get('/participants/suggestion', [DojoController::class, 'suggestId'])->middleware('throttle:suggest');
Route::post('/participants', [DojoController::class, 'createParticipant'])->middleware('throttle:join');

Route::prefix('/participants/{id}')->middleware('throttle:participant')->group(function () {
    Route::get('/', [DojoController::class, 'showParticipant']);
    Route::put('/exercises/{exerciseId}', [DojoController::class, 'completeExercise']);
    Route::delete('/exercises/{exerciseId}', [DojoController::class, 'uncompleteExercise']);
    Route::post('/presence', [DojoController::class, 'presence']);
    Route::get('/quiz', [DojoController::class, 'quizPaper']);
    Route::post('/quiz', [DojoController::class, 'submitQuiz'])->middleware('throttle:quiz');
    // Take-home tracks have their own quiz. The controller 404s an unknown or unpublished track.
    Route::get('/quiz/{track}', [DojoController::class, 'quizPaper'])->where('track', '[a-z0-9-]+');
    Route::post('/quiz/{track}', [DojoController::class, 'submitQuiz'])->where('track', '[a-z0-9-]+')->middleware('throttle:quiz');
    Route::get('/chat', [ChatController::class, 'show']);
    Route::post('/chat', [ChatController::class, 'store'])->middleware('throttle:chat');
    Route::delete('/chat/{messageId}', [ChatController::class, 'destroy'])->whereNumber('messageId');
    Route::put('/chat/{messageId}/me-too', [ChatController::class, 'meToo'])->whereNumber('messageId');
    Route::delete('/chat/{messageId}/me-too', [ChatController::class, 'notMeToo'])->whereNumber('messageId');
});
