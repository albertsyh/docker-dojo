<?php

namespace App\Support;

/**
 * Exercises and quiz live in resources/content/*.json so they can be edited
 * without touching PHP. Quiz answers are only ever returned after grading.
 */
class Content
{
    private static ?array $exercises = null;

    private static ?array $quiz = null;

    public static function exercises(): array
    {
        return self::$exercises ??= self::load('exercises.json');
    }

    public static function exerciseIds(): array
    {
        return array_column(self::exercises(), 'id');
    }

    public static function quiz(): array
    {
        return self::$quiz ??= self::load('quiz.json');
    }

    public static function publicQuiz(): array
    {
        $quiz = self::quiz();

        return [
            'passMark' => $quiz['passMark'],
            'questions' => array_map(
                fn (array $q) => array_diff_key($q, ['answer' => 1, 'explanation' => 1]),
                $quiz['questions'],
            ),
        ];
    }

    private static function load(string $file): array
    {
        return json_decode(file_get_contents(resource_path('content/'.$file)), true, flags: JSON_THROW_ON_ERROR);
    }
}
