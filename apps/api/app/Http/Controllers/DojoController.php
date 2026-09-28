<?php

namespace App\Http\Controllers;

use App\Models\ExerciseCompletion;
use App\Models\Participant;
use App\Models\QuizAttempt;
use App\Support\Content;
use App\Support\Quiz;
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
            'quiz' => Quiz::summary(),
            'glossary' => Content::glossary(),
            'references' => Content::references(),
            // The Reverb app key is public by design; the secret never leaves the server.
            'realtime' => ['key' => config('broadcasting.connections.reverb.key')],
        ]);
    }

    /**
     * The exercise ids in course order, with the paths that use them. For trainers and
     * scripts (docs/exercise-ids.md is the same list). Paths are relative, so they hold
     * behind any host or TLS proxy.
     */
    public function exerciseIds(): JsonResponse
    {
        $exercises = array_map(fn (array $e, int $i) => [
            'number' => $i + 1,
            'id' => $e['id'],
            'title' => $e['title'],
            'minutes' => $e['minutes'],
            'page' => '/exercises/'.$e['id'],
            'live' => '/live?embed&exercise='.$e['id'],
        ], Content::exercises(), array_keys(Content::exercises()));

        return response()->json([
            'exercises' => $exercises,
            'totalMinutes' => array_sum(array_column($exercises, 'minutes')),
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

    /**
     * Which exercise page the participant has open (null when they leave it). The page
     * sends this on arrival, then every minute as a heartbeat, which keeps last_seen_at fresh.
     * Only a change of page is broadcast; the tracker's own refresh catches people who drift off.
     */
    public function presence(Request $request, string $id): JsonResponse
    {
        $participant = $this->touch($id);
        $exercise = $request->validate(['exercise' => ['present', 'nullable', 'string', 'max:64']])['exercise'];
        abort_unless($exercise === null || in_array($exercise, Content::exerciseIds(), true), 404, 'Unknown exercise.');

        if ($participant->current_exercise_id !== $exercise) {
            $participant->forceFill(['current_exercise_id' => $exercise])->save();
            Stats::broadcast();
        }

        return response()->json(['exercise' => $exercise]);
    }

    /** A new quiz for this participant: questions without answers, and a one-time token. */
    public function quizPaper(string $id): JsonResponse
    {
        // On the quiz, so no longer on an exercise, even if the page's goodbye never arrived.
        $this->touch($id)->forceFill(['quiz_opened_at' => now(), 'current_exercise_id' => null])->save();
        $paper = Quiz::paper($id);
        // Opening a first quiz moves someone to "taking it now" on the tracker.
        if (! QuizAttempt::where('participant_id', $id)->exists()) {
            Stats::broadcast();
        }

        return response()->json($paper);
    }

    public function submitQuiz(Request $request, string $id): JsonResponse
    {
        $this->touch($id);
        $quiz = Content::quiz();
        $size = array_sum($quiz['split']);

        $input = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'questions' => ['required', 'array', "size:$size"],
            'questions.*' => ['required', 'string', 'distinct', 'max:80'],
            'answers' => ['required', 'array', "size:$size"],
        ]);
        abort_unless(hash_equals(Quiz::sign($id, $input['questions']), $input['token']), 422, 'That quiz is not valid. Start a new one.');

        $results = Quiz::grade($input['questions'], $input['answers']);
        abort_if($results === null, 422, 'Some answers do not fit their questions. Start a new quiz.');

        $score = count(array_filter(array_column($results, 'correct')));
        $passed = $score / $size >= $quiz['passMark'];

        try {
            QuizAttempt::create([
                'participant_id' => $id,
                'paper_token' => $input['token'],
                'score' => $score,
                'total' => $size,
                'passed' => $passed,
                'answers' => array_map(fn ($qid, $answer) => ['id' => $qid, 'answer' => $answer], $input['questions'], $input['answers']),
            ]);
        } catch (UniqueConstraintViolationException) {
            // Otherwise you could submit, read the answers, and submit the same paper again.
            abort(409, 'This quiz was already submitted. Start a new one.');
        }
        Stats::broadcast();

        return response()->json([
            'score' => $score,
            'total' => $size,
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
    private function touch(string $id): Participant
    {
        abort_unless(Participant::isValidId($id), 404, 'Unknown participant.');
        // Not update()'s row count: MySQL reports 0 affected rows when the timestamp
        // is unchanged (two requests in the same second), which isn't "not found".
        $participant = Participant::find($id);
        abort_unless($participant, 404, 'Unknown participant.');
        $participant->forceFill(['last_seen_at' => now()])->save();

        return $participant;
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
