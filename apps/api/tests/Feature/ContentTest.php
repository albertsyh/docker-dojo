<?php

namespace Tests\Feature;

use App\Support\Content;
use App\Support\Quiz;
use App\Support\Translations;
use Tests\TestCase;

/**
 * Guards the rules in CLAUDE.md ("Writing exercises") so a content edit
 * can't quietly break the workshop.
 */
class ContentTest extends TestCase
{
    /** Every string anywhere in a JSON structure. */
    private function strings(array $data): array
    {
        $out = [];
        array_walk_recursive($data, function ($value) use (&$out) {
            if (is_string($value)) {
                $out[] = $value;
            }
        });

        return $out;
    }

    /** Core plus every take-home track, published or not, keyed by track id. */
    private function tracks(): array
    {
        return array_merge(
            [Content::CORE],
            array_column(Content::takeHomeTracks(includeUnpublished: true), 'id'),
        );
    }

    /** Every exercise in every track. */
    private function allExercises(): array
    {
        return array_merge(...array_map(Content::trackExercises(...), $this->tracks()));
    }

    public function test_take_home_tracks_are_well_formed(): void
    {
        $tracks = Content::takeHomeTracks(includeUnpublished: true);
        $this->assertSame(count($tracks), count(array_unique(array_column($tracks, 'id'))), 'Track ids must be unique.');

        foreach ($tracks as $t) {
            $this->assertMatchesRegularExpression('/^[a-z0-9]+$/', $t['id']);
            $this->assertNotSame(Content::CORE, $t['id']);
            foreach (['title', 'label', 'summary'] as $field) {
                $this->assertNotEmpty($t[$field] ?? null, "Track {$t['id']} needs a $field.");
            }
            $this->assertIsBool($t['published'] ?? null, "Track {$t['id']} needs published: true or false.");
            $this->assertNotEmpty(Content::trackExercises($t['id']), "Track {$t['id']} has no exercises.");
            // The prefix keeps ids unique across tracks and says where an id belongs.
            foreach (Content::trackExercises($t['id']) as $e) {
                $this->assertStringStartsWith($t['id'].'-', $e['id'], "{$e['id']} should start with {$t['id']}-.");
            }
        }
    }

    public function test_exercises_have_unique_ids_and_required_fields(): void
    {
        $exercises = $this->allExercises();
        $ids = array_column($exercises, 'id');

        // Unique across tracks too: completions are stored by exercise id alone.
        $this->assertSame(count($ids), count(array_unique($ids)), 'Exercise ids must be unique.');
        foreach ($exercises as $e) {
            $this->assertMatchesRegularExpression('/^[a-z0-9-]+$/', $e['id']);
            foreach (['title', 'summary', 'expected'] as $field) {
                $this->assertNotEmpty($e[$field] ?? null, "{$e['id']} needs a $field.");
            }
            $this->assertIsInt($e['minutes']);
            $this->assertNotEmpty($e['steps'], "{$e['id']} needs steps.");
            foreach ($e['steps'] as $i => $step) {
                $this->assertNotEmpty($step['text'] ?? null, "{$e['id']} step $i needs text.");
                if (isset($step['code'])) {
                    $this->assertNotEmpty($step['label'] ?? null, "{$e['id']} step $i has code but no label.");
                }
                foreach ($step['notes'] ?? [] as $note) {
                    $this->assertNotEmpty($note['for']);
                    $this->assertNotEmpty($note['text']);
                }
            }
            foreach ($e['files']['entries'] ?? [] as $entry) {
                $this->assertNotEmpty($entry['path']);
            }
        }
    }

    /**
     * A step with "diff": true shows a change to one file: its label is the file name, and every
     * line of its code starts with "-" (removed), "+" (added) or a space (unchanged).
     */
    public function test_diff_steps_are_well_formed(): void
    {
        foreach ($this->allExercises() as $e) {
            foreach ($e['steps'] as $i => $step) {
                if (! array_key_exists('diff', $step)) {
                    continue;
                }
                $where = "{$e['id']} step ".($i + 1);
                $this->assertTrue($step['diff'], "$where: diff is true or left out.");
                $this->assertNotContains($step['label'] ?? null, [null, 'terminal', 'inside the container'], "$where: a diff's label is the file it changes.");
                $lines = explode("\n", $step['code'] ?? '');
                foreach ($lines as $line) {
                    $this->assertMatchesRegularExpression('/^[-+ ]/', $line, "$where: every diff line starts with -, + or a space.");
                }
                $this->assertNotEmpty(preg_grep('/^[-+]/', $lines), "$where: a diff changes at least one line.");
            }
        }
    }

    /**
     * "requires" lists the exercises whose files this one carries on from. They must come earlier
     * in the same track, so the exercise page can link back to them.
     */
    public function test_requirements_point_at_earlier_exercises_in_the_same_track(): void
    {
        foreach ($this->tracks() as $track) {
            $ids = array_column(Content::trackExercises($track), 'id');
            foreach (Content::trackExercises($track) as $i => $e) {
                if (! array_key_exists('requires', $e)) {
                    continue;
                }
                $this->assertIsList($e['requires'], "{$e['id']}: requires is a list of exercise ids.");
                $this->assertNotEmpty($e['requires'], "{$e['id']}: leave requires out rather than empty.");
                foreach ($e['requires'] as $id) {
                    $this->assertContains($id, array_slice($ids, 0, $i), "{$e['id']} requires $id, which is not an earlier exercise in its track.");
                }
            }
        }
    }

    public function test_the_workshop_fits_its_time_budget(): void
    {
        $minutes = array_sum(array_column(Content::exercises(), 'minutes'));

        // Exercises plus a ten-minute quiz, about ninety minutes in all. Take-home tracks are not timed.
        $this->assertLessThanOrEqual(80, $minutes);
    }

    public function test_terminal_commands_work_in_every_shell(): void
    {
        foreach ($this->allExercises() as $e) {
            foreach ($e['steps'] as $i => $step) {
                if (($step['label'] ?? null) !== 'terminal' || ! isset($step['code'])) {
                    continue;
                }
                $where = "{$e['id']} step $i";
                // PowerShell has no backslash line continuation.
                $this->assertDoesNotMatchRegularExpression('/\\\\\n/', $step['code'], "$where: no \\ line continuations.");
                // Host-side $VAR and $(...) differ between bash and PowerShell. Inside single quotes they reach the container untouched.
                $outsideSingleQuotes = preg_replace("/'[^']*'/", "''", $step['code']);
                $this->assertStringNotContainsString('$', $outsideSingleQuotes, "$where: \$ outside single quotes expands on the host.");
            }
        }
    }

    public function test_copy_has_no_em_dashes(): void
    {
        $all = [...$this->strings(Content::glossary()), ...$this->strings(Content::references()), ...$this->strings(Content::takeHomeTracks(includeUnpublished: true))];
        foreach ($this->tracks() as $track) {
            $all = [...$all, ...$this->strings(Content::trackExercises($track)), ...$this->strings(Content::quiz($track))];
        }

        foreach ($all as $text) {
            $this->assertStringNotContainsString('—', $text, "Em-dash in: $text");
        }
    }

    /**
     * Translations (resources/content/<lang>/) hold only prose that follows the English: same
     * steps, notes and options, the same `code`, no em-dashes. And none is out of date: when the
     * English changes, update the translation, then php artisan content:translations --stamp=<file>.
     */
    public function test_translations_follow_the_english(): void
    {
        foreach (array_diff(Content::LANGUAGES, [Content::ENGLISH]) as $lang) {
            foreach (Content::files() as $file) {
                $report = Translations::check($file, Content::english($file), Content::translation($file, $lang));
                $this->assertSame([], $report['problems'], "$lang/$file");
                $this->assertSame([], $report['stale'], "$lang/$file: the English changed since this was translated. Update the translation, then run php artisan content:translations --stamp=$file");
            }
        }
    }

    public function test_quiz_question_ids_are_unique_across_tracks(): void
    {
        $ids = array_merge(...array_map(fn ($t) => array_column(Content::quiz($t)['questions'], 'id'), $this->tracks()));

        $this->assertSame(count($ids), count(array_unique($ids)), 'Question ids must be unique across every quiz.');
    }

    public function test_quiz_questions_are_well_formed(): void
    {
        foreach ($this->tracks() as $track) {
            $this->assertQuizWellFormed(Content::quiz($track));
        }
    }

    private function assertQuizWellFormed(array $quiz): void
    {
        $ids = array_column($quiz['questions'], 'id');
        $scenarioIds = array_column($quiz['scenarios'], 'id');

        $this->assertSame(count($ids), count(array_unique($ids)), 'Question ids must be unique.');
        $this->assertGreaterThan(0, $quiz['passMark']);
        $this->assertLessThanOrEqual(1, $quiz['passMark']);
        $this->assertSame(Quiz::LEVELS, array_keys($quiz['split']));

        foreach ($quiz['questions'] as $q) {
            $this->assertContains($q['level'], Quiz::LEVELS, "{$q['id']} has an unknown level.");
            $this->assertNotEmpty($q['prompt']);
            $this->assertNotEmpty($q['explanation']);

            if ($q['level'] === 'medium') {
                $this->assertNotEmpty($q['context'] ?? null, "{$q['id']} needs context up front.");
                $this->assertNotEmpty($q['label'] ?? null);
                $code = implode("\n", (array) $q['code']);
                $this->assertNotEmpty($q['blanks']);
                foreach ($q['blanks'] as $n => $accepted) {
                    $marker = '{{'.($n + 1).'}}';
                    $this->assertSame(1, substr_count($code, $marker), "{$q['id']} must contain $marker exactly once.");
                    $this->assertNotEmpty($accepted, "{$q['id']} blank ".($n + 1).' needs an answer.');
                }
                $this->assertSame(0, substr_count($code, '{{'.(count($q['blanks']) + 1).'}}'), "{$q['id']} has more markers than blanks.");

                continue;
            }

            $this->assertCount(4, $q['options'], "{$q['id']} needs four options.");
            $this->assertIsInt($q['answer']);
            $this->assertArrayHasKey($q['answer'], $q['options'], "{$q['id']} answer is out of range.");
            if ($q['level'] === 'advanced') {
                $this->assertContains($q['scenario'] ?? null, $scenarioIds, "{$q['id']} needs a known scenario.");
            }
        }

        // The right answer should not always sit in the same place.
        $choice = array_filter($quiz['questions'], fn ($q) => isset($q['answer']));
        $this->assertGreaterThanOrEqual(4, count(array_unique(array_column($choice, 'answer'))));
    }

    public function test_the_pool_is_big_enough_for_retakes_without_repeats(): void
    {
        foreach ($this->tracks() as $track) {
            $this->assertPoolBigEnough(Content::quiz($track));
        }
    }

    private function assertPoolBigEnough(array $quiz): void
    {
        $pool = collect($quiz['questions']);

        foreach (['easy', 'medium'] as $level) {
            $this->assertGreaterThanOrEqual(2 * $quiz['split'][$level], $pool->where('level', $level)->count(), "Not enough $level questions for two different quizzes.");
        }
        $this->assertGreaterThanOrEqual(2, count($quiz['scenarios']), 'Need at least two compose files for advanced retakes.');
        foreach ($quiz['scenarios'] as $scenario) {
            $this->assertNotEmpty($scenario['title']);
            $this->assertStringContainsString('services:', implode("\n", (array) $scenario['code']));
            $this->assertGreaterThanOrEqual($quiz['split']['advanced'], $pool->where('scenario', $scenario['id'])->count(), "{$scenario['id']} needs enough questions to fill the advanced section.");
        }
    }

    public function test_glossary_links_point_at_real_exercises(): void
    {
        $exerciseIds = array_column($this->allExercises(), 'id');
        $terms = [];

        foreach (Content::glossary() as $group) {
            $this->assertNotEmpty($group['id']);
            $this->assertNotEmpty($group['terms']);
            foreach ($group['terms'] as $term) {
                $terms[] = strtolower($term['term']);
                $this->assertNotEmpty($term['text']);
                foreach ($term['seenIn'] ?? [] as $id) {
                    $this->assertContains($id, $exerciseIds, "{$term['term']} links to unknown exercise $id.");
                }
            }
        }
        $this->assertSame(count($terms), count(array_unique($terms)), 'Glossary terms must be unique.');
    }

    public function test_references_are_well_formed(): void
    {
        $groups = Content::references();
        $this->assertNotEmpty($groups);
        $this->assertSame(count($groups), count(array_unique(array_column($groups, 'id'))), 'Reference group ids must be unique.');
        $urls = [];

        foreach ($groups as $group) {
            $this->assertMatchesRegularExpression('/^[a-z0-9-]+$/', $group['id'], 'Group ids are used as page anchors.');
            $this->assertNotEmpty($group['title']);
            $this->assertNotEmpty($group['links'], "{$group['id']} has no links.");
            foreach ($group['links'] as $link) {
                $urls[] = $link['url'];
                $this->assertNotEmpty($link['title']);
                $this->assertNotEmpty($link['source'] ?? null, "{$link['title']} needs a source (who made it, and when).");
                $this->assertContains($link['kind'], ['video', 'reading'], "{$link['title']} has an unknown kind.");
                $this->assertStringStartsWith('https://', $link['url'], "{$link['title']} must link over https.");
                $this->assertNotFalse(filter_var($link['url'], FILTER_VALIDATE_URL), "{$link['title']} has a malformed url.");
            }
        }
        $this->assertSame(count($urls), count(array_unique($urls)), 'Each link should appear once.');
    }

    public function test_host_ports_do_not_clash_with_the_dojo(): void
    {
        foreach ($this->allExercises() as $e) {
            foreach ($e['steps'] as $step) {
                // -p 8084:3000 and -p 127.0.0.1:8084:3000 both publish 8084.
                preg_match_all('/-p (?:[\d.]+:)?(\d+):/', $step['code'] ?? '', $m);
                foreach ($m[1] as $port) {
                    $this->assertNotSame('8000', $port, "{$e['id']} publishes 8000, which the Dojo itself uses.");
                }
            }
        }
    }
}
