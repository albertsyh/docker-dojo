<?php

namespace App\Http\Controllers;

use App\Models\ExerciseCompletion;
use App\Models\Participant;
use App\Models\QuizAttempt;
use App\Support\Content;
use App\Support\Stats;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DojoController extends Controller
{
    public function content(): JsonResponse
    {
        return response()->json([
            'exercises' => Content::exercises(),
            'quiz' => Content::publicQuiz(),
            // The Reverb app key is public by design; the secret never leaves the server.
            'realtime' => ['key' => config('broadcasting.connections.reverb.key')],
        ]);
    }

    /** A candidate id for the student to accept or reroll. Nothing is stored. */
    public function suggestId(): JsonResponse
    {
        do {
            $id = Participant::newId();
        } while (Participant::whereKey($id)->exists());

        return response()->json(['id' => $id]);
    }

    /** Claim a suggested id. 409 if someone else claimed it first. */
    public function createParticipant(Request $request): JsonResponse
    {
        $id = (string) $request->validate(['id' => ['required', 'string', 'max:40']])['id'];
        abort_unless(Participant::isValidId($id), 422, 'That is not a valid participant id.');

        try {
            Participant::create(['id' => $id, 'last_seen_at' => now()]);
        } catch (UniqueConstraintViolationException) {
            abort(409, 'That id was just taken by someone else.');
        }
        Stats::broadcast();

        return response()->json($this->progress($id), 201);
    }

    public function showParticipant(string $id): JsonResponse
    {
        $this->touch($id);

        return response()->json($this->progress($id));
    }

    public function completeExercise(string $id, string $exerciseId): JsonResponse
    {
        $this->touch($id);
        abort_unless(in_array($exerciseId, Content::exerciseIds(), true), 404, 'Unknown exercise.');

        ExerciseCompletion::insertOrIgnore([
            'participant_id' => $id,
            'exercise_id' => $exerciseId,
            'completed_at' => now(),
        ]);
        Stats::broadcast();

        return response()->json($this->progress($id));
    }

    public function uncompleteExercise(string $id, string $exerciseId): JsonResponse
    {
        $this->touch($id);

        ExerciseCompletion::where('participant_id', $id)->where('exercise_id', $exerciseId)->delete();
        Stats::broadcast();

        return response()->json($this->progress($id));
    }

    public function submitQuiz(Request $request, string $id): JsonResponse
    {
        $this->touch($id);
        $quiz = Content::quiz();
        $total = count($quiz['questions']);

        $answers = $request->validate([
            'answers' => ['required', 'array', "size:$total"],
            'answers.*' => ['required', 'integer', 'min:0', 'max:9'],
        ])['answers'];

        $results = [];
        $score = 0;
        foreach ($quiz['questions'] as $i => $q) {
            $correct = (int) $answers[$i] === $q['answer'];
            $score += (int) $correct;
            $results[] = [
                'questionId' => $q['id'],
                'chosen' => (int) $answers[$i],
                'answer' => $q['answer'],
                'correct' => $correct,
                'explanation' => $q['explanation'],
            ];
        }
        $passed = $score / $total >= $quiz['passMark'];

        QuizAttempt::create([
            'participant_id' => $id,
            'score' => $score,
            'total' => $total,
            'passed' => $passed,
            'answers' => array_map('intval', $answers),
        ]);
        Stats::broadcast();

        return response()->json([
            'score' => $score,
            'total' => $total,
            'passed' => $passed,
            'results' => $results,
            'progress' => $this->progress($id),
        ]);
    }

    public function stats(): JsonResponse
    {
        return response()->json(Stats::snapshot());
    }

    /** 404 for unknown ids, and record activity for the "active now" count. */
    private function touch(string $id): void
    {
        abort_unless(Participant::isValidId($id), 404, 'Unknown participant.');
        // Not update()'s row count: MySQL reports 0 affected rows when the timestamp
        // is unchanged (two requests in the same second), which isn't "not found".
        $participant = Participant::find($id);
        abort_unless($participant, 404, 'Unknown participant.');
        $participant->forceFill(['last_seen_at' => now()])->save();
    }

    private function progress(string $id): array
    {
        $best = QuizAttempt::where('participant_id', $id)
            ->orderByDesc('score')->orderByDesc('id')
            ->first(['score', 'total', 'passed']);

        return [
            'id' => $id,
            'completed' => ExerciseCompletion::where('participant_id', $id)->pluck('exercise_id'),
            'quiz' => $best ? [
                'bestScore' => $best->score,
                'total' => $best->total,
                'passed' => $best->passed,
                'attempts' => QuizAttempt::where('participant_id', $id)->count(),
            ] : null,
        ];
    }
}
