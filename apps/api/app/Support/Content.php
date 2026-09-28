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

    /** English is the source; other languages are overlays of its prose (see Translations). */
    public const ENGLISH = 'en';

    public const LANGUAGES = [self::ENGLISH, 'ms'];

    /** @var array<string, array> */
    private static array $files = [];

    /** A supported language code, or English. */
    public static function language(?string $lang): string
    {
        return in_array($lang, self::LANGUAGES, true) ? $lang : self::ENGLISH;
    }

    /** The core (workshop) exercises, in course order. */
    public static function exercises(string $lang = self::ENGLISH): array
    {
        return self::load('exercises.json', $lang);
    }

    public static function exerciseIds(): array
    {
        return array_column(self::exercises(), 'id');
    }

    /**
     * Take-home tracks, in order: id, title, label, summary and published.
     * Pass true to include unpublished ones (the content tests check those too).
     */
    public static function takeHomeTracks(bool $includeUnpublished = false, string $lang = self::ENGLISH): array
    {
        $tracks = self::load('take-home/tracks.json', $lang);

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

    public static function trackExercises(string $track, string $lang = self::ENGLISH): array
    {
        return $track === self::CORE ? self::exercises($lang) : self::load("take-home/$track/exercises.json", $lang);
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

    public static function quiz(string $track = self::CORE, string $lang = self::ENGLISH): array
    {
        return self::load(self::quizFile($track), $lang);
    }

    public static function quizFile(string $track): string
    {
        return $track === self::CORE ? 'quiz.json' : "take-home/$track/quiz.json";
    }

    public static function glossary(string $lang = self::ENGLISH): array
    {
        return self::load('glossary.json', $lang);
    }

    public static function references(string $lang = self::ENGLISH): array
    {
        return self::load('references.json', $lang);
    }

    /** Every content file, relative to resources/content: the ones a translation can mirror. */
    public static function files(): array
    {
        $files = ['exercises.json', 'quiz.json', 'glossary.json', 'references.json', 'take-home/tracks.json'];
        foreach (array_column(self::takeHomeTracks(includeUnpublished: true), 'id') as $track) {
            $files[] = "take-home/$track/exercises.json";
            $files[] = "take-home/$track/quiz.json";
        }

        return $files;
    }

    /** The English file as written. */
    public static function english(string $file): array
    {
        return self::$files[$file] ??= self::read(resource_path('content/'.$file));
    }

    /** A language's translation of one file, or [] when it has none yet. */
    public static function translation(string $file, string $lang): array
    {
        $path = resource_path("content/$lang/$file");

        return self::$files["$lang/$file"] ??= is_file($path) ? self::read($path) : [];
    }

    /** For tests: use this translation instead of the file on disk, until forgetFakes(). */
    public static function fakeTranslation(string $file, string $lang, array $overlay): void
    {
        self::$files["$lang/$file"] = $overlay;
        unset(self::$files["$lang+$file"]);
    }

    /** Drops every cached translation (fakes included). English stays cached. */
    public static function forgetFakes(): void
    {
        // Translations are cached as "ms/<file>" (as written) and "ms+<file>" (merged).
        self::$files = array_filter(self::$files, fn (string $key) => ! preg_match('#^[a-z]{2}[/+]#', $key), ARRAY_FILTER_USE_KEY);
    }

    private static function load(string $file, string $lang = self::ENGLISH): array
    {
        if ($lang === self::ENGLISH) {
            return self::english($file);
        }

        return self::$files["$lang+$file"] ??= Translations::merge($file, self::english($file), self::translation($file, $lang));
    }

    private static function read(string $path): array
    {
        return json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
    }
}
