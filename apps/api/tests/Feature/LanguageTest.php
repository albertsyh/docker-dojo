<?php

namespace Tests\Feature;

use App\Support\Content;
use App\Support\Quiz;
use App\Support\Translations;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** ?lang=ms: content, quiz papers and messages in Malay, with everything else unchanged. */
class LanguageTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Content::forgetFakes();
        parent::tearDown();
    }

    private function join(): string
    {
        $id = $this->getJson('/api/participants/suggestion')->assertOk()->json('id');
        $this->postJson('/api/participants', ['id' => $id])->assertCreated();

        return $id;
    }

    /** A Malay title and first step for the first exercise, and a Malay explanation for every question. */
    private function fakeMalay(): void
    {
        $exercise = Content::exercises()[0];
        Content::fakeTranslation('exercises.json', 'ms', ['exercises' => [$exercise['id'] => [
            'title' => 'Tajuk dalam Bahasa Melayu',
            'steps' => [['text' => 'Langkah pertama.']],
        ]]]);
        Content::fakeTranslation('quiz.json', 'ms', ['questions' => collect(Content::quiz()['questions'])
            ->mapWithKeys(fn (array $q) => [$q['id'] => ['prompt' => "Soalan {$q['id']}", 'explanation' => "Penjelasan {$q['id']}"]])
            ->all()]);
    }

    public function test_content_comes_in_malay_with_code_and_ids_unchanged(): void
    {
        $this->fakeMalay();
        $english = Content::exercises()[0];

        $malay = $this->getJson('/api/content?lang=ms')->assertOk()->assertJsonPath('language', 'ms')->json('exercises.0');
        $this->assertSame('Tajuk dalam Bahasa Melayu', $malay['title']);
        $this->assertSame('Langkah pertama.', $malay['steps'][0]['text']);
        // Not translated yet: falls back to the English.
        $this->assertSame($english['summary'], $malay['summary']);
        $this->assertSame($english['id'], $malay['id']);
        $this->assertSame(array_column($english['steps'], 'code'), array_column($malay['steps'], 'code'));
        $this->assertSame($english['minutes'], $malay['minutes']);
    }

    public function test_english_is_the_default_and_unknown_languages_fall_back_to_it(): void
    {
        $this->fakeMalay();
        $plain = $this->getJson('/api/content')->assertOk()->assertJsonPath('language', 'en')->json();
        $unknown = $this->getJson('/api/content?lang=xx')->assertOk()->assertJsonPath('language', 'en')->json();

        $this->assertSame($plain, $unknown);
        $this->assertSame(Content::exercises()[0]['title'], $plain['exercises'][0]['title']);
    }

    public function test_the_live_stats_stay_english_for_everyone(): void
    {
        $this->fakeMalay();
        $this->getJson('/api/content?lang=ms')->assertOk();

        $this->getJson('/api/stats?lang=ms')->assertOk()->assertJsonPath('exercises.0.title', Content::exercises()[0]['title']);
    }

    public function test_a_paper_can_switch_language_without_changing_or_giving_anything_away(): void
    {
        $this->fakeMalay();
        $id = $this->join();
        $paper = $this->getJson("/api/participants/$id/quiz")->assertOk()->json();
        $ids = array_column($paper['questions'], 'id');

        $malay = $this->getJson("/api/participants/$id/quiz-questions?lang=ms&".http_build_query(['ids' => $ids]))->assertOk()->json();
        $this->assertSame($ids, array_column($malay['questions'], 'id'));
        $this->assertSame("Soalan {$ids[0]}", $malay['questions'][0]['prompt']);
        $this->assertArrayNotHasKey('token', $malay);
        foreach ($malay['questions'] as $q) {
            $this->assertEmpty(array_intersect(array_keys($q), ['answer', 'explanation']), "{$q['id']} gives away its answer.");
            if ($q['kind'] === 'blanks') {
                $this->assertIsInt($q['blanks']);
            }
        }
        // The original paper can still be submitted: nothing about it changed.
        $answers = array_map(fn ($q) => $q['kind'] === 'blanks' ? array_fill(0, $q['blanks'], 'x') : 0, $paper['questions']);
        $this->postJson("/api/participants/$id/quiz?lang=ms", ['token' => $paper['token'], 'questions' => $ids, 'answers' => $answers])
            ->assertOk()
            ->assertJsonPath('results.0.explanation', "Penjelasan {$ids[0]}");
    }

    public function test_a_question_that_is_not_in_the_quiz_is_refused(): void
    {
        $id = $this->join();
        $ids = array_column($this->getJson("/api/participants/$id/quiz")->json('questions'), 'id');
        $ids[0] = 'made-up';

        $this->getJson("/api/participants/$id/quiz-questions?lang=ms&".http_build_query(['ids' => $ids]))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Kuiz itu tidak sah. Mulakan kuiz baharu.');
    }

    public function test_grading_is_the_same_in_every_language(): void
    {
        $this->fakeMalay();
        $questions = Content::quiz()['questions'];
        $ids = array_column($questions, 'id');
        $answers = array_map(fn ($q) => isset($q['blanks']) ? array_map(fn ($a) => $a[0], $q['blanks']) : $q['answer'], $questions);

        $strip = fn (array $results) => array_map(fn ($r) => array_diff_key($r, ['explanation' => 1]), $results);
        $english = Quiz::grade($ids, $answers, lang: 'en');
        $malay = Quiz::grade($ids, $answers, lang: 'ms');
        $this->assertSame($strip($english), $strip($malay));
        $this->assertNotSame(array_column($english, 'explanation'), array_column($malay, 'explanation'));
    }

    public function test_messages_come_in_the_language_asked_for(): void
    {
        $id = $this->join();

        $this->putJson("/api/participants/$id/exercises/no-such-exercise")->assertNotFound()->assertJsonPath('message', 'Unknown exercise.');
        $this->putJson("/api/participants/$id/exercises/no-such-exercise?lang=ms")->assertNotFound()->assertJsonPath('message', 'Latihan tidak dikenali.');
    }

    public function test_every_malay_message_has_an_english_one_and_back(): void
    {
        $this->assertSame(array_keys(require lang_path('en/dojo.php')), array_keys(require lang_path('ms/dojo.php')));
    }

    public function test_the_checker_sees_every_content_file(): void
    {
        foreach (Content::files() as $file) {
            $this->assertNotEmpty(Translations::units($file, Content::english($file)), $file);
        }
    }
}
