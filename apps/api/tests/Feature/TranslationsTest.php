<?php

namespace Tests\Feature;

use App\Support\Translations;
use Tests\TestCase;

/**
 * The translation checker and merge, on a small made-up exercise and quiz, so each way a
 * translation can go wrong is tried once. ContentTest runs the same checks on the real files.
 */
class TranslationsTest extends TestCase
{
    private const EXERCISES = [[
        'id' => 'hello',
        'title' => 'Hello',
        'minutes' => 3,
        'summary' => 'Say hello.',
        'steps' => [
            ['text' => 'Run `docker run hello-world` in a terminal.', 'code' => 'docker run hello-world', 'label' => 'terminal', 'notes' => [['for' => 'Windows', 'text' => 'Start Docker Desktop first.']]],
            ['text' => 'Look at the output.'],
        ],
        'expected' => 'A greeting.',
    ]];

    private const QUIZ = [
        'passMark' => 0.7, 'minutes' => 10, 'split' => ['easy' => 1, 'medium' => 0, 'advanced' => 0], 'scenarios' => [],
        'questions' => [['id' => 'q1', 'level' => 'easy', 'prompt' => 'Which?', 'options' => ['a', 'b', 'c', 'd'], 'answer' => 2, 'explanation' => 'Because.']],
    ];

    /** A correct, up-to-date Malay entry for the exercise above. */
    private function entry(array $changes = []): array
    {
        $units = Translations::units('exercises.json', self::EXERCISES);

        return array_replace_recursive([
            'source' => Translations::hash($units['exercises']['hello']),
            'title' => 'Helo',
            'summary' => 'Ucapkan helo.',
            'steps' => [
                ['text' => 'Jalankan `docker run hello-world` dalam terminal.', 'notes' => [['text' => 'Mulakan Docker Desktop dahulu.']]],
                ['text' => 'Lihat output.'],
            ],
            'expected' => 'Satu ucapan.',
        ], $changes);
    }

    private function check(array $entry): array
    {
        return Translations::check('exercises.json', self::EXERCISES, ['exercises' => ['hello' => $entry]]);
    }

    public function test_a_good_translation_passes_and_merges_prose_only(): void
    {
        $report = $this->check($this->entry());
        $this->assertSame([], $report['problems']);
        $this->assertSame([], $report['stale']);
        $this->assertSame(1, $report['translated']);

        $merged = Translations::merge('exercises.json', self::EXERCISES, ['exercises' => ['hello' => $this->entry()]])[0];
        $this->assertSame('Helo', $merged['title']);
        $this->assertSame('Mulakan Docker Desktop dahulu.', $merged['steps'][0]['notes'][0]['text']);
        // Everything that isn't prose is still the English.
        $this->assertSame('docker run hello-world', $merged['steps'][0]['code']);
        $this->assertSame('terminal', $merged['steps'][0]['label']);
        $this->assertSame('Windows', $merged['steps'][0]['notes'][0]['for']);
        $this->assertSame(3, $merged['minutes']);
        $this->assertArrayNotHasKey('source', $merged);
    }

    public function test_it_goes_stale_when_the_english_changes(): void
    {
        $changed = self::EXERCISES;
        $changed[0]['steps'][1]['text'] = 'Read the output carefully.';
        $report = Translations::check('exercises.json', $changed, ['exercises' => ['hello' => $this->entry()]]);

        $this->assertSame(['exercises.json: exercises "hello"'], $report['stale']);
    }

    public function test_it_rejects_a_step_the_english_does_not_have(): void
    {
        $entry = $this->entry();
        $entry['steps'][] = ['text' => 'Langkah tambahan.'];

        $this->assertSame(['exercises.json: exercises "hello".steps: has 3 items where the English has 2.'], $this->check($entry)['problems']);
    }

    public function test_it_rejects_changed_inline_code(): void
    {
        $problems = $this->check($this->entry(['steps' => [['text' => 'Jalankan `docker jalan hello-world` dalam terminal.']]]))['problems'];

        $this->assertCount(1, $problems);
        $this->assertStringContainsString('"hello".steps [0].text: the `code` must match the English exactly', $problems[0]);
    }

    public function test_it_rejects_em_dashes(): void
    {
        $problems = $this->check($this->entry(['summary' => 'Ucapkan helo — sekarang.']))['problems'];

        $this->assertSame(['exercises.json: exercises "hello".summary: has an em-dash. Use a colon, a full stop or brackets.'], $problems);
    }

    public function test_it_rejects_fields_that_are_not_prose_and_never_merges_them(): void
    {
        $entry = $this->entry(['minutes' => 99, 'steps' => [['code' => 'rm -rf /']]]);
        $problems = $this->check($entry)['problems'];

        $this->assertCount(2, $problems);
        $this->assertStringContainsString('"minutes" can\'t be translated', implode(' ', $problems));
        $this->assertStringContainsString('"code" can\'t be translated', implode(' ', $problems));

        // Even if it got past the test, the merge ignores it.
        $merged = Translations::merge('exercises.json', self::EXERCISES, ['exercises' => ['hello' => $entry]])[0];
        $this->assertSame(3, $merged['minutes']);
        $this->assertSame('docker run hello-world', $merged['steps'][0]['code']);
    }

    public function test_a_quiz_translation_can_not_move_the_answer(): void
    {
        $units = Translations::units('quiz.json', self::QUIZ);
        $entry = ['source' => Translations::hash($units['questions']['q1']), 'prompt' => 'Yang mana?', 'answer' => 0, 'options' => ['a', 'b', 'c']];
        $report = Translations::check('quiz.json', self::QUIZ, ['questions' => ['q1' => $entry]]);

        $this->assertStringContainsString('"answer" can\'t be translated', implode(' ', $report['problems']));
        $this->assertStringContainsString('options: has 3 items where the English has 4', implode(' ', $report['problems']));
        $merged = Translations::merge('quiz.json', self::QUIZ, ['questions' => ['q1' => $entry]]);
        $this->assertSame(2, $merged['questions'][0]['answer']);
        $this->assertSame('Yang mana?', $merged['questions'][0]['prompt']);
    }

    public function test_an_entry_with_no_english_prose_has_nothing_to_translate(): void
    {
        $references = [['id' => 'learn', 'title' => 'Learn', 'links' => [
            ['title' => 'A', 'url' => 'https://example.com/a', 'kind' => 'video', 'source' => 'X', 'note' => 'Start here.'],
            ['title' => 'B', 'url' => 'https://example.com/b', 'kind' => 'video', 'source' => 'Y'],
        ]]];

        $this->assertSame(['https://example.com/a'], array_keys(Translations::units('references.json', $references)['links']));
        $this->assertSame(2, Translations::check('references.json', $references, [])['total']);
    }

    public function test_unknown_entries_are_reported(): void
    {
        $report = Translations::check('exercises.json', self::EXERCISES, ['exercises' => ['nope' => ['title' => 'x']], 'glossary' => []]);

        $this->assertSame([
            'exercises.json: there is no "glossary" to translate. It has: exercises.',
            'exercises.json: exercises "nope" is not in the English.',
        ], $report['problems']);
        $this->assertSame(['exercises.json: exercises "hello"'], $report['missing']);
    }
}
