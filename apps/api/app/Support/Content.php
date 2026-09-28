<?php

namespace App\Support;

/**
 * Exercises, quiz, glossary and references live in resources/content/*.json so they can be edited
 * without touching PHP. Quiz answers never leave the server before grading (see Quiz).
 *
 * The workshop itself is the "core" track: exercises.json and quiz.json. Take-home tracks
 * are listed in take-home/tracks.json, and each has its own take-home/<id>/exercises.json
 * and quiz.json. Only published tracks are served. Exercise ids are unique across every
 * track, because completions are stored by exercise id alone.
 */
class Content
{
    public const CORE = 'core';

    /** @var array<string, array> */
    private static array $files = [];

    /** The core (workshop) exercises, in course order. */
    public static function exercises(): array
    {
        return self::load('exercises.json');
    }

    public static function exerciseIds(): array
    {
        return array_column(self::exercises(), 'id');
    }

    /**
     * Take-home tracks, in order: id, title, label, summary and published.
     * Pass true to include unpublished ones (the content tests check those too).
     */
    public static function takeHomeTracks(bool $includeUnpublished = false): array
    {
        $tracks = self::load('take-home/tracks.json');

        return $includeUnpublished ? $tracks : array_values(array_filter($tracks, fn (array $t) => $t['published'] ?? false));
    }

    public static function takeHomeTrackIds(): array
    {
        return array_column(self::takeHomeTracks(), 'id');
    }

    /** Core, or a published take-home track. */
    public static function isTrack(string $track): bool
    {
        return $track === self::CORE || in_array($track, self::takeHomeTrackIds(), true);
    }

    public static function trackExercises(string $track): array
    {
        return $track === self::CORE ? self::exercises() : self::load("take-home/$track/exercises.json");
    }

    /** Every exercise id a participant can complete: core plus published take-home tracks. */
    public static function allExerciseIds(): array
    {
        $ids = self::exerciseIds();
        foreach (self::takeHomeTrackIds() as $track) {
            $ids = [...$ids, ...array_column(self::trackExercises($track), 'id')];
        }

        return $ids;
    }

    public static function quiz(string $track = self::CORE): array
    {
        return self::load($track === self::CORE ? 'quiz.json' : "take-home/$track/quiz.json");
    }

    public static function glossary(): array
    {
        return self::load('glossary.json');
    }

    public static function references(): array
    {
        return self::load('references.json');
    }

    private static function load(string $file): array
    {
        return self::$files[$file] ??= json_decode(file_get_contents(resource_path('content/'.$file)), true, flags: JSON_THROW_ON_ERROR);
    }
}
