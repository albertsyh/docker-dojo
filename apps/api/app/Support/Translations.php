<?php

namespace App\Support;

/**
 * Translations of the course content. The English in resources/content/*.json is the source of
 * truth. A translation lives in resources/content/<lang>/ under the same file names and holds only
 * prose, keyed by id:
 *
 *     { "<collection>": { "<key>": { "source": "<hash>", ...the prose fields... } } }
 *
 * It is merged onto the English at load time, along the prose fields only (see prose()). So ids,
 * code, blanks, answers, labels and minutes always come from the English, and anything missing
 * falls back to it. "source" is a hash of the English prose the entry was translated from: the
 * content tests fail once the English changes, until the translation is updated and re-stamped
 * (php artisan content:translations).
 */
class Translations
{
    /** The collections each kind of file has, in the order a report lists them. */
    private const COLLECTIONS = [
        'exercises' => ['exercises'],
        'tracks' => ['tracks'],
        'quiz' => ['questions', 'scenarios'],
        'glossary' => ['groups', 'terms'],
        'references' => ['groups', 'links'],
    ];

    public static function kind(string $file): string
    {
        return match (true) {
            $file === 'take-home/tracks.json' => 'tracks',
            str_ends_with($file, 'exercises.json') => 'exercises',
            str_ends_with($file, 'quiz.json') => 'quiz',
            $file === 'glossary.json' => 'glossary',
            $file === 'references.json' => 'references',
        };
    }

    /** The English file with a translation laid over it. */
    public static function merge(string $file, array $english, array $overlay): array
    {
        $over = fn (string $collection, string $key, array $unit) => self::apply(
            $unit,
            $overlay[$collection][$key] ?? null,
            self::prose(self::kind($file), $collection, $unit),
        );

        return match (self::kind($file)) {
            'exercises' => array_map(fn (array $e) => $over('exercises', $e['id'], $e), $english),
            'tracks' => array_map(fn (array $t) => $over('tracks', $t['id'], $t), $english),
            'quiz' => [
                ...$english,
                'questions' => array_map(fn (array $q) => $over('questions', $q['id'], $q), $english['questions']),
                'scenarios' => array_map(fn (array $s) => $over('scenarios', $s['id'], $s), $english['scenarios']),
            ],
            'glossary' => array_map(fn (array $g) => [
                ...$over('groups', $g['id'], $g),
                'terms' => array_map(fn (array $t) => $over('terms', $t['term'], $t), $g['terms']),
            ], $english),
            'references' => array_map(fn (array $g) => [
                ...$over('groups', $g['id'], $g),
                'links' => array_map(fn (array $l) => $over('links', $l['url'], $l), $g['links']),
            ], $english),
        };
    }

    /**
     * Everything a translation of this file can hold: collection => key => the English prose.
     *
     * @return array<string, array<string, array>>
     */
    public static function units(string $file, array $english): array
    {
        $kind = self::kind($file);
        // An entry with no English prose (a link without a note) has nothing to translate, so it isn't listed.
        $keyed = fn (string $collection, array $items, string $key) => array_filter(array_combine(
            array_column($items, $key),
            array_map(fn (array $item) => self::prose($kind, $collection, $item), $items),
        ), self::hasText(...));

        return match ($kind) {
            'exercises' => ['exercises' => $keyed('exercises', $english, 'id')],
            'tracks' => ['tracks' => $keyed('tracks', $english, 'id')],
            'quiz' => [
                'questions' => $keyed('questions', $english['questions'], 'id'),
                'scenarios' => $keyed('scenarios', $english['scenarios'], 'id'),
            ],
            'glossary' => [
                'groups' => $keyed('groups', $english, 'id'),
                'terms' => $keyed('terms', array_merge(...array_column($english, 'terms')), 'term'),
            ],
            'references' => [
                'groups' => $keyed('groups', $english, 'id'),
                'links' => $keyed('links', array_merge(...array_column($english, 'links')), 'url'),
            ],
        };
    }

    private static function hasText(mixed $prose): bool
    {
        return is_string($prose) || (is_array($prose) && array_filter($prose, self::hasText(...)) !== []);
    }

    /** A short hash of one entry's English prose, stored as the translation's "source". */
    public static function hash(array $prose): string
    {
        return substr(sha1(json_encode($prose, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)), 0, 8);
    }

    /**
     * What is wrong with a translation, as messages naming the file and entry.
     * Stale entries are listed separately, since fixing them is a translator's job.
     *
     * @return array{problems: list<string>, stale: list<string>, missing: list<string>, translated: int, total: int}
     */
    public static function check(string $file, array $english, array $overlay): array
    {
        $units = self::units($file, $english);
        $report = ['problems' => [], 'stale' => [], 'missing' => [], 'translated' => 0, 'total' => 0];

        foreach (array_diff(array_keys($overlay), array_keys($units)) as $unknown) {
            $report['problems'][] = "$file: there is no \"$unknown\" to translate. It has: ".implode(', ', array_keys($units)).'.';
        }
        foreach ($units as $collection => $entries) {
            $report['total'] += count($entries);
            foreach (array_diff(array_keys($overlay[$collection] ?? []), array_keys($entries)) as $unknown) {
                $report['problems'][] = "$file: $collection \"$unknown\" is not in the English.";
            }
            foreach ($entries as $key => $prose) {
                $where = "$file: $collection \"$key\"";
                $entry = $overlay[$collection][$key] ?? null;
                if ($entry === null) {
                    $report['missing'][] = $where;

                    continue;
                }
                $report['translated']++;
                if (! is_array($entry)) {
                    $report['problems'][] = "$where must be an object.";

                    continue;
                }
                if (($entry['source'] ?? null) !== self::hash($prose)) {
                    $report['stale'][] = $where;
                }
                unset($entry['source']);
                array_push($report['problems'], ...self::shapeProblems($entry, $prose, $where));
            }
        }

        return $report;
    }

    /**
     * The translation must follow the English prose exactly: only its fields, lists of the same
     * length, text where it has text. Inline code (backticks) and em-dashes are checked on each text.
     */
    private static function shapeProblems(mixed $given, mixed $english, string $where): array
    {
        if (is_string($english)) {
            if (! is_string($given)) {
                return ["$where: should be text."];
            }
            $problems = [];
            if (str_contains($given, '—')) {
                $problems[] = "$where: has an em-dash. Use a colon, a full stop or brackets.";
            }
            if (self::codeSpans($given) !== self::codeSpans($english)) {
                $problems[] = "$where: the `code` must match the English exactly (".implode(' ', self::codeSpans($english) ?: ['none']).').';
            }

            return $problems;
        }
        if (! is_array($given)) {
            return ["$where: should be ".(array_is_list($english) ? 'a list' : 'an object').'.'];
        }
        if (array_is_list($english) && $english !== [] && count($given) !== count($english)) {
            return ["$where: has ".count($given).' items where the English has '.count($english).'.'];
        }
        $problems = [];
        foreach ($given as $key => $value) {
            if (! array_key_exists($key, $english)) {
                $problems[] = "$where: \"$key\" can't be translated. Only prose can: ".implode(', ', array_keys($english)).'.';

                continue;
            }
            array_push($problems, ...self::shapeProblems($value, $english[$key], is_int($key) ? "$where [$key]" : "$where.$key"));
        }

        return $problems;
    }

    /** @return list<string> */
    private static function codeSpans(string $text): array
    {
        preg_match_all('/`[^`]*`/', $text, $m);

        return $m[0];
    }

    /** The prose fields of one entry, in the same shape as the entry. Everything else stays English. */
    private static function prose(string $kind, string $collection, array $item): array
    {
        $pick = fn (array $from, array $keys) => array_intersect_key($from, array_flip($keys));

        return match ("$kind.$collection") {
            'exercises.exercises' => [
                ...$pick($item, ['title', 'summary', 'expected']),
                'steps' => array_map(fn (array $s) => [
                    ...$pick($s, ['text']),
                    ...(isset($s['notes']) ? ['notes' => array_map(fn (array $n) => $pick($n, ['text']), $s['notes'])] : []),
                ], $item['steps']),
                ...(isset($item['files']) ? ['files' => [
                    ...$pick($item['files'], ['note']),
                    ...(isset($item['files']['entries']) ? ['entries' => array_map(fn (array $f) => $pick($f, ['note']), $item['files']['entries'])] : []),
                ]] : []),
            ],
            'tracks.tracks' => $pick($item, ['title', 'summary']),
            'quiz.questions' => $pick($item, ['prompt', 'context', 'options', 'explanation']),
            'quiz.scenarios' => $pick($item, ['title', 'intro']),
            'glossary.groups', 'references.groups' => $pick($item, ['title', 'intro']),
            'glossary.terms' => $pick($item, ['text']),
            'references.links' => $pick($item, ['note']),
        };
    }

    /** Lays translated text over the English, only where the prose shape has text. */
    private static function apply(mixed $english, mixed $given, mixed $prose): mixed
    {
        if (is_string($prose)) {
            return is_string($given) && $given !== '' ? $given : $english;
        }
        if (! is_array($prose) || ! is_array($given) || ! is_array($english)) {
            return $english;
        }
        foreach ($prose as $key => $inner) {
            if (array_key_exists($key, $given) && array_key_exists($key, $english)) {
                $english[$key] = self::apply($english[$key], $given[$key], $inner);
            }
        }

        return $english;
    }
}
