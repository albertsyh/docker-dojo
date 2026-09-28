<?php

namespace App\Support;

/**
 * Exercises, quiz and glossary live in resources/content/*.json so they can be edited
 * without touching PHP. Quiz answers never leave the server before grading (see Quiz).
 */
class Content
{
    private static ?array $exercises = null;

    private static ?array $quiz = null;

    private static ?array $glossary = null;

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

    public static function glossary(): array
    {
        return self::$glossary ??= self::load('glossary.json');
    }

    private static function load(string $file): array
    {
        return json_decode(file_get_contents(resource_path('content/'.$file)), true, flags: JSON_THROW_ON_ERROR);
    }
}
