<?php

namespace App\Support;

use App\Models\QuizAttempt;
use Illuminate\Support\Arr;

/**
 * The quiz is a pool of questions in three levels (resources/content/quiz.json).
 * Every quiz ("paper") draws a fixed number from each level, preferring questions
 * the participant has seen least, so retakes get new ones.
 *
 *   easy      multiple choice
 *   medium    fill in the blanks: code with {{1}}, {{2}}... and accepted answers per blank
 *   advanced  multiple choice about one full compose file (a "scenario")
 *
 * A paper is signed rather than stored: the client sends back the question ids with
 * the signature, and each signature can be submitted once.
 *
 * Every track has its own pool: the workshop ("core") and each take-home track
 * (see Content). Question ids are unique across pools.
 */
class Quiz
{
    public const LEVELS = ['easy', 'medium', 'advanced'];

    /** What the app shows before a quiz starts. */
    public static function summary(string $track = Content::CORE): array
    {
        $quiz = Content::quiz($track);

        return [
            'passMark' => $quiz['passMark'],
            'minutes' => $quiz['minutes'],
            'split' => $quiz['split'],
            'questionCount' => array_sum($quiz['split']),
        ];
    }

    /** A fresh paper for this participant, without answers. */
    public static function paper(string $participantId, string $track = Content::CORE, string $lang = Content::ENGLISH): array
    {
        $quiz = Content::quiz($track, $lang);
        $seen = self::seenCounts($participantId, $track);
        $pool = collect($quiz['questions']);

        $questions = [];
        foreach (['easy', 'medium'] as $level) {
            $candidates = $pool->where('level', $level)->all();
            $questions = [...$questions, ...self::leastSeen($candidates, $seen, $quiz['split'][$level])];
        }

        // Advanced questions all come from one compose file: the one with the most unseen questions.
        $wanted = $quiz['split']['advanced'];
        $bestScenario = collect($quiz['scenarios'])
            ->shuffle()
            ->map(function (array $scenario) use ($pool, $seen, $wanted) {
                $picked = self::leastSeen($pool->where('scenario', $scenario['id'])->all(), $seen, $wanted);

                return ['picked' => $picked, 'cost' => array_sum(array_map(fn ($q) => $seen[$q['id']] ?? 0, $picked))];
            })
            ->sortBy('cost')
            ->first();
        // Keep the file's own order, so the questions read top to bottom.
        $order = $pool->pluck('id')->flip();
        $advanced = collect($bestScenario['picked'])->sortBy(fn ($q) => $order[$q['id']])->values()->all();
        $questions = [...$questions, ...$advanced];

        $ids = array_column($questions, 'id');

        return [
            'token' => self::sign($participantId, $ids, $track),
            ...self::publicPaper($quiz, $questions),
        ];
    }

    /**
     * The questions of a paper already drawn, in another language, without answers. Lets a student
     * switch language mid-quiz without drawing a new paper. Null if an id isn't in this quiz.
     */
    public static function questions(array $questionIds, string $track = Content::CORE, string $lang = Content::ENGLISH): ?array
    {
        $quiz = Content::quiz($track, $lang);
        $byId = collect($quiz['questions'])->keyBy('id');
        if (collect($questionIds)->contains(fn ($id) => ! $byId->has($id))) {
            return null;
        }

        return self::publicPaper($quiz, array_map(fn ($id) => $byId[$id], $questionIds));
    }

    /** Questions as a student may see them, and the compose files the advanced ones are about. */
    private static function publicPaper(array $quiz, array $questions): array
    {
        $scenarioIds = array_unique(array_filter(array_column($questions, 'scenario')));

        return [
            'questions' => array_map(self::publicQuestion(...), $questions),
            'scenarios' => collect($quiz['scenarios'])
                ->whereIn('id', $scenarioIds)
                ->map(fn (array $s) => [...$s, 'code' => self::code($s['code'])])
                ->values()->all(),
        ];
    }

    /** The track is part of the signature, so a paper only counts for the quiz it came from. */
    public static function sign(string $participantId, array $questionIds, string $track = Content::CORE): string
    {
        // Core keeps its original format, so papers already open survive a deploy.
        $prefix = $track === Content::CORE ? '' : $track.'|';

        return hash_hmac('sha256', $prefix.$participantId.'|'.implode(',', $questionIds), (string) config('app.key'));
    }

    /**
     * Grade one submitted paper. $answers lines up with $questionIds:
     * an option index for multiple choice, a list of strings for blanks.
     * Returns null for an answer that doesn't fit its question.
     */
    public static function grade(array $questionIds, array $answers, string $track = Content::CORE, string $lang = Content::ENGLISH): ?array
    {
        // Only the explanations are in the chosen language. Answers and blanks are the same in every one.
        $byId = collect(Content::quiz($track, $lang)['questions'])->keyBy('id');
        $results = [];
        foreach ($questionIds as $i => $id) {
            $question = $byId[$id] ?? null;
            $answer = $answers[$i] ?? null;
            if (! $question) {
                return null;
            }
            if (isset($question['blanks'])) {
                if (! is_array($answer) || count($answer) !== count($question['blanks']) || ! collect($answer)->every(fn ($a) => is_string($a) && mb_strlen($a) <= 200)) {
                    return null;
                }
                $blankCorrect = array_map(
                    fn (array $accepted, string $given) => in_array(self::normalise($given), array_map(self::normalise(...), $accepted), true),
                    $question['blanks'],
                    $answer,
                );
                $results[] = [
                    'questionId' => $id,
                    'correct' => ! in_array(false, $blankCorrect, true),
                    'chosen' => $answer,
                    'answer' => array_map(fn (array $accepted) => $accepted[0], $question['blanks']),
                    'blankCorrect' => $blankCorrect,
                    'explanation' => $question['explanation'],
                ];
            } else {
                if (! is_int($answer) || ! array_key_exists($answer, $question['options'])) {
                    return null;
                }
                $results[] = [
                    'questionId' => $id,
                    'correct' => $answer === $question['answer'],
                    'chosen' => $answer,
                    'answer' => $question['answer'],
                    'explanation' => $question['explanation'],
                ];
            }
        }

        return $results;
    }

    /** Case, surrounding spaces or quotes, and doubled spaces don't matter in a blank. */
    public static function normalise(string $text): string
    {
        $text = trim(mb_strtolower($text));
        $text = trim($text, "\"'` ");

        return preg_replace('/\s+/', ' ', $text);
    }

    private static function publicQuestion(array $q): array
    {
        $public = Arr::only($q, ['id', 'level', 'prompt', 'options', 'scenario', 'context', 'label']);
        if (isset($q['blanks'])) {
            $public['kind'] = 'blanks';
            $public['code'] = self::code($q['code']);
            $public['blanks'] = count($q['blanks']);
        } else {
            $public['kind'] = 'choice';
        }

        return $public;
    }

    /** Code may be written as a list of lines in the JSON, to keep long files readable. */
    private static function code(string|array $code): string
    {
        return is_array($code) ? implode("\n", $code) : $code;
    }

    /** How many times this participant has been asked each question. */
    private static function seenCounts(string $participantId, string $track): array
    {
        $seen = [];
        foreach (QuizAttempt::where('participant_id', $participantId)->where('track', $track)->pluck('answers') as $answers) {
            foreach ((array) $answers as $entry) {
                if (is_array($entry) && isset($entry['id'])) {
                    $seen[$entry['id']] = ($seen[$entry['id']] ?? 0) + 1;
                }
            }
        }

        return $seen;
    }

    /** $count questions, least seen first, random among equals. */
    private static function leastSeen(array $questions, array $seen, int $count): array
    {
        return collect($questions)
            ->shuffle()
            ->sortBy(fn (array $q) => $seen[$q['id']] ?? 0)
            ->take($count)
            ->values()
            ->all();
    }
}
