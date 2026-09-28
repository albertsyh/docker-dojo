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
    /** Everything a page needs, in the language asked for (?lang=, see SetLanguage). */
    public function content(): JsonResponse
    {
        $lang = $this->lang();

        return response()->json([
            'language' => $lang,
            'exercises' => Content::exercises($lang),
            'quiz' => Quiz::summary(),
            // Self-paced tracks for after the workshop. Each has its own exercises and quiz.
            'takeHome' => array_map(fn (array $t) => [
                'id' => $t['id'],
                'title' => $t['title'],
                'label' => $t['label'],
                'summary' => $t['summary'],
                'exercises' => Content::trackExercises($t['id'], $lang),
                'quiz' => Quiz::summary($t['id']),
            ], Content::takeHomeTracks(lang: $lang)),
            'glossary' => Content::glossary($lang),
            'references' => Content::references($lang),
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
        $list = fn (array $exercises) => array_map(fn (array $e, int $i) => [
            'number' => $i + 1,
            'id' => $e['id'],
            'title' => $e['title'],
            'minutes' => $e['minutes'],
            'page' => '/exercises/'.$e['id'],
            'live' => '/live?embed&exercise='.$e['id'],
        ], $exercises, array_keys($exercises));
        $exercises = $list(Content::exercises());

        return response()->json([
            'exercises' => $exercises,
            'totalMinutes' => array_sum(array_column($exercises, 'minutes')),
            'takeHome' => array_map(fn (array $t) => [
                'id' => $t['id'],
                'title' => $t['title'],
                'exercises' => $list(Content::trackExercises($t['id'])),
            ], Content::takeHomeTracks()),
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
        abort_unless(Participant::isValidId($id), 422, __('dojo.invalid_id'));

        try {
            Participant::create(['id' => $id, 'last_seen_at' => now()]);
        } catch (UniqueConstraintViolationException) {
            abort(409, __('dojo.id_taken'));
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
        abort_unless(in_array($exerciseId, Content::allExerciseIds(), true), 404, __('dojo.unknown_exercise'));

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
        abort_unless($exercise === null || in_array($exercise, Content::allExerciseIds(), true), 404, __('dojo.unknown_exercise'));

        if ($participant->current_exercise_id !== $exercise) {
            $participant->forceFill(['current_exercise_id' => $exercise])->save();
            Stats::broadcast();
        }

        return response()->json(['exercise' => $exercise]);
    }

    /** A new quiz for this participant: questions without answers, and a one-time token. */
    public function quizPaper(string $id, string $track = Content::CORE): JsonResponse
    {
        abort_unless(Content::isTrack($track), 404, __('dojo.unknown_quiz'));
        $participant = $this->touch($id);
        // On the quiz, so no longer on an exercise, even if the page's goodbye never arrived.
        $participant->current_exercise_id = null;
        // Only the workshop quiz counts as "taking it now" on the tracker.
        if ($track === Content::CORE) {
            $participant->quiz_opened_at = now();
        }
        $participant->save();
        $paper = Quiz::paper($id, $track, $this->lang());
        // Opening a first quiz moves someone to "taking it now" on the tracker.
        if ($track === Content::CORE && ! QuizAttempt::where('participant_id', $id)->where('track', Content::CORE)->exists()) {
            Stats::broadcast();
        }

        return response()->json($paper);
    }

    public function submitQuiz(Request $request, string $id, string $track = Content::CORE): JsonResponse
    {
        abort_unless(Content::isTrack($track), 404, __('dojo.unknown_quiz'));
        $this->touch($id);
        $quiz = Content::quiz($track);
        $size = array_sum($quiz['split']);

        $input = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'questions' => ['required', 'array', "size:$size"],
            'questions.*' => ['required', 'string', 'distinct', 'max:80'],
            'answers' => ['required', 'array', "size:$size"],
        ]);
        abort_unless(hash_equals(Quiz::sign($id, $input['questions'], $track), $input['token']), 422, __('dojo.quiz_invalid'));

        $results = Quiz::grade($input['questions'], $input['answers'], $track, $this->lang());
        abort_if($results === null, 422, __('dojo.answers_invalid'));

        $score = count(array_filter(array_column($results, 'correct')));
        $passed = $score / $size >= $quiz['passMark'];

        try {
            QuizAttempt::create([
                'participant_id' => $id,
                'track' => $track,
                'paper_token' => $input['token'],
                'score' => $score,
                'total' => $size,
                'passed' => $passed,
                'answers' => array_map(fn ($qid, $answer) => ['id' => $qid, 'answer' => $answer], $input['questions'], $input['answers']),
            ]);
        } catch (UniqueConstraintViolationException) {
            // Otherwise you could submit, read the answers, and submit the same paper again.
            abort(409, __('dojo.quiz_submitted'));
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

    /**
     * The questions of a paper the student already has, in another language, without answers.
     * The paper itself (its token and questions) stays the same, so no answers are lost.
     */
    public function quizQuestions(Request $request, string $id, string $track = Content::CORE): JsonResponse
    {
        abort_unless(Content::isTrack($track), 404, __('dojo.unknown_quiz'));
        $this->touch($id);
        $size = array_sum(Content::quiz($track)['split']);
        $input = $request->validate([
            'ids' => ['required', 'array', "size:$size"],
            'ids.*' => ['required', 'string', 'distinct', 'max:80'],
        ]);
        $paper = Quiz::questions($input['ids'], $track, $this->lang());
        abort_if($paper === null, 422, __('dojo.quiz_invalid'));

        return response()->json($paper);
    }

    public function stats(): JsonResponse
    {
        return response()->json(Stats::snapshot());
    }

    /** Set from ?lang= by the SetLanguage middleware. */
    private function lang(): string
    {
        return Content::language(app()->getLocale());
    }

    private function touch(string $id): Participant
    {
        return Participant::touchOrFail($id);
    }

    private function progress(string $id): array
    {
        $trackQuizzes = [];
        foreach (Content::takeHomeTrackIds() as $track) {
            $trackQuizzes[$track] = $this->quizProgress($id, $track);
        }

        return [
            'id' => $id,
            'completed' => ExerciseCompletion::where('participant_id', $id)->pluck('exercise_id'),
            'quiz' => $this->quizProgress($id, Content::CORE),
            'trackQuizzes' => (object) $trackQuizzes,
        ];
    }

    /** The best attempt at one track's quiz, or null before the first. */
    private function quizProgress(string $id, string $track): ?array
    {
        $attempts = QuizAttempt::where('participant_id', $id)->where('track', $track);
        $best = (clone $attempts)->orderByDesc('score')->orderByDesc('id')->first(['score', 'total', 'passed']);

        return $best ? [
            'bestScore' => $best->score,
            'total' => $best->total,
            'passed' => $best->passed,
            'attempts' => $attempts->count(),
        ] : null;
    }
}
