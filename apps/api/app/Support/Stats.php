<?php

namespace App\Support;

use App\Events\StatsUpdated;
use Illuminate\Support\Facades\DB;
use Throwable;

/** Aggregate progress across every participant, for the live tracker. */
class Stats
{
    public const ACTIVE_WINDOW_MINUTES = 5;

    public static function snapshot(): array
    {
        $exerciseIds = Content::exerciseIds();
        $exerciseCount = count($exerciseIds);

        $participants = DB::table('participants')->count();
        $active = DB::table('participants')
            ->where('last_seen_at', '>=', now()->subMinutes(self::ACTIVE_WINDOW_MINUTES))
            ->count();

        $perExercise = DB::table('exercise_completions')
            ->whereIn('exercise_id', $exerciseIds)
            ->groupBy('exercise_id')
            ->pluck(DB::raw('COUNT(*)'), 'exercise_id');

        $finishedAll = DB::query()->fromSub(
            DB::table('exercise_completions')
                ->select('participant_id')
                ->whereIn('exercise_id', $exerciseIds)
                ->groupBy('participant_id')
                ->havingRaw('COUNT(*) = ?', [$exerciseCount]),
            'done',
        )->count();

        $quiz = DB::table('quiz_attempts')
            ->selectRaw('COUNT(DISTINCT participant_id) AS attempted')
            ->selectRaw('COUNT(DISTINCT CASE WHEN passed THEN participant_id END) AS passed')
            ->first();

        $avgBest = DB::query()->fromSub(
            DB::table('quiz_attempts')
                ->selectRaw('MAX(score / total) AS best')
                ->groupBy('participant_id'),
            'b',
        )->avg('best');

        $totalCompletions = array_sum($perExercise->all());

        return [
            'participants' => $participants,
            'activeNow' => $active,
            'activeWindowMinutes' => self::ACTIVE_WINDOW_MINUTES,
            'exerciseCompletionPct' => $participants && $exerciseCount
                ? round($totalCompletions / ($participants * $exerciseCount) * 100, 1)
                : 0,
            'finishedAllExercises' => $finishedAll,
            'exercises' => array_map(fn (array $e) => [
                'id' => $e['id'],
                'title' => $e['title'],
                'completed' => (int) ($perExercise[$e['id']] ?? 0),
            ], Content::exercises()),
            'quiz' => [
                'attempted' => (int) $quiz->attempted,
                'passed' => (int) $quiz->passed,
                'averageBestPct' => $avgBest === null ? null : round($avgBest * 100, 1),
            ],
            'updatedAt' => now()->toIso8601String(),
        ];
    }

    /**
     * Push a fresh snapshot to every open tracker. A Reverb outage must never
     * fail the student's own request, so errors are reported and swallowed.
     */
    public static function broadcast(): void
    {
        try {
            StatsUpdated::dispatch(self::snapshot());
        } catch (Throwable $e) {
            report($e);
        }
    }
}
