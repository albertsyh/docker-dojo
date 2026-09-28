<?php

namespace Tests\Feature;

use App\Events\StatsUpdated;
use App\Models\Participant;
use App\Support\Content;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class DojoApiTest extends TestCase
{
    use RefreshDatabase;

    private function join(): string
    {
        $id = $this->getJson('/api/participants/suggestion')->assertOk()->json('id');
        $this->postJson('/api/participants', ['id' => $id])->assertCreated();

        return $id;
    }

    private function paper(string $id): array
    {
        return $this->getJson("/api/participants/$id/quiz")->assertOk()->json();
    }

    private function question(string $questionId): array
    {
        return collect(Content::quiz()['questions'])->firstWhere('id', $questionId);
    }

    /** The right answer, as the app would send it. */
    private function rightAnswer(string $questionId): int|array
    {
        $q = $this->question($questionId);

        return isset($q['blanks']) ? array_map(fn ($accepted) => $accepted[0], $q['blanks']) : $q['answer'];
    }

    private function wrongAnswer(string $questionId): int|array
    {
        $q = $this->question($questionId);

        return isset($q['blanks']) ? array_fill(0, count($q['blanks']), 'nope') : ($q['answer'] + 1) % count($q['options']);
    }

    /** Submit a paper, answering the first $right questions correctly and the rest wrongly. */
    private function submit(string $id, array $paper, ?int $right = null)
    {
        $ids = array_column($paper['questions'], 'id');
        $right ??= count($ids);
        $answers = array_map(fn ($qid, $i) => $i < $right ? $this->rightAnswer($qid) : $this->wrongAnswer($qid), $ids, array_keys($ids));

        return $this->postJson("/api/participants/$id/quiz", ['token' => $paper['token'], 'questions' => $ids, 'answers' => $answers]);
    }

    private function passQuiz(string $id)
    {
        return $this->submit($id, $this->paper($id))->assertOk();
    }

    public function test_content_has_a_quiz_summary_but_no_questions(): void
    {
        $response = $this->getJson('/api/content')->assertOk();

        $this->assertNotEmpty($response->json('exercises'));
        $this->assertNotEmpty($response->json('glossary'));
        $this->assertSame(['easy' => 4, 'medium' => 3, 'advanced' => 3], $response->json('quiz.split'));
        $this->assertSame(10, $response->json('quiz.questionCount'));
        $this->assertNull($response->json('quiz.questions'));
    }

    public function test_a_suggested_id_is_not_stored_until_claimed(): void
    {
        $id = $this->getJson('/api/participants/suggestion')->json('id');

        $this->assertTrue(Participant::isValidId($id));
        $this->assertSame(0, Participant::count());

        $this->postJson('/api/participants', ['id' => $id])
            ->assertCreated()
            ->assertJson(['id' => $id, 'completed' => [], 'quiz' => null]);
        $this->assertSame(1, Participant::count());
    }

    public function test_claiming_a_taken_id_is_a_conflict(): void
    {
        $id = $this->join();

        $this->postJson('/api/participants', ['id' => $id])->assertStatus(409);
    }

    public function test_ids_outside_the_word_lists_are_rejected(): void
    {
        $this->postJson('/api/participants', ['id' => 'evil-hacker-abc123'])->assertStatus(422);
        $this->postJson('/api/participants', ['id' => 'brave-otter'])->assertStatus(422);
        $this->postJson('/api/participants', [])->assertStatus(422);
    }

    public function test_unknown_participants_get_404(): void
    {
        $this->getJson('/api/participants/brave-otter-zzzzzz')->assertNotFound();
        $this->putJson('/api/participants/not-an-id/exercises/hello-docker')->assertNotFound();
    }

    public function test_completing_and_undoing_an_exercise(): void
    {
        $id = $this->join();

        $this->putJson("/api/participants/$id/exercises/hello-docker")
            ->assertOk()->assertJsonPath('completed', ['hello-docker']);
        // Twice is harmless.
        $this->putJson("/api/participants/$id/exercises/hello-docker")
            ->assertOk()->assertJsonPath('completed', ['hello-docker']);

        $this->deleteJson("/api/participants/$id/exercises/hello-docker")
            ->assertOk()->assertJsonPath('completed', []);
    }

    public function test_unknown_exercises_cannot_be_completed(): void
    {
        $id = $this->join();

        $this->putJson("/api/participants/$id/exercises/not-a-real-exercise")->assertNotFound();
    }

    public function test_a_paper_has_the_split_and_no_answers(): void
    {
        $id = $this->join();
        $paper = $this->paper($id);

        $levels = array_count_values(array_column($paper['questions'], 'level'));
        $this->assertSame(['easy' => 4, 'medium' => 3, 'advanced' => 3], $levels);
        // Easy, then medium, then advanced.
        $this->assertSame(['easy', 'medium', 'advanced'], array_values(array_unique(array_column($paper['questions'], 'level'))));

        foreach ($paper['questions'] as $q) {
            foreach (['answer', 'blanks_accepted', 'explanation'] as $secret) {
                $this->assertArrayNotHasKey($secret, $q);
            }
            if ($q['kind'] === 'blanks') {
                $this->assertIsInt($q['blanks'], 'Only the number of blanks is sent, not what fills them.');
                $this->assertNotEmpty($q['context']);
                $this->assertStringContainsString('{{1}}', $q['code']);
            } else {
                $this->assertCount(4, $q['options']);
            }
        }

        // All advanced questions are about one compose file, which comes with the paper.
        $advanced = array_filter($paper['questions'], fn ($q) => $q['level'] === 'advanced');
        $scenarios = array_unique(array_column($advanced, 'scenario'));
        $this->assertCount(1, $scenarios);
        $this->assertSame(array_values($scenarios), array_column($paper['scenarios'], 'id'));
        $this->assertStringContainsString('services:', $paper['scenarios'][0]['code']);
    }

    public function test_a_retake_asks_questions_you_have_not_seen(): void
    {
        $id = $this->join();
        $asked = [];

        // The pool is big enough for two quizzes with no repeats.
        for ($round = 0; $round < 2; $round++) {
            $paper = $this->paper($id);
            $ids = array_column($paper['questions'], 'id');
            $this->assertSame([], array_intersect($ids, $asked), "Round $round repeated a question.");
            $asked = [...$asked, ...$ids];
            $this->submit($id, $paper)->assertOk();
        }
    }

    public function test_quiz_is_graded_on_the_server(): void
    {
        $id = $this->join();

        $this->submit($id, $this->paper($id))
            ->assertOk()
            ->assertJson(['score' => 10, 'total' => 10, 'passed' => true])
            ->assertJsonPath('progress.quiz.bestScore', 10);

        // All wrong: fails, but the best score is kept.
        $this->submit($id, $this->paper($id), right: 0)
            ->assertOk()
            ->assertJson(['score' => 0, 'passed' => false])
            ->assertJsonPath('results.0.correct', false)
            ->assertJsonPath('progress.quiz.bestScore', 10)
            ->assertJsonPath('progress.quiz.attempts', 2);
    }

    public function test_results_show_the_right_answers_after_grading(): void
    {
        $id = $this->join();
        $paper = $this->paper($id);

        $results = $this->submit($id, $paper, right: 0)->assertOk()->json('results');

        foreach ($results as $i => $result) {
            $this->assertSame($paper['questions'][$i]['id'], $result['questionId']);
            $this->assertSame($this->rightAnswer($result['questionId']), $result['answer']);
            $this->assertNotEmpty($result['explanation']);
            if ($paper['questions'][$i]['kind'] === 'blanks') {
                $this->assertSame(array_fill(0, $paper['questions'][$i]['blanks'], false), $result['blankCorrect']);
            }
        }
    }

    public function test_blanks_ignore_case_spaces_quotes_and_accept_alternatives(): void
    {
        $this->assertSame('-d', \App\Support\Quiz::normalise('  -D '));
        $this->assertSame('8080:80', \App\Support\Quiz::normalise('"8080:80"'));
        $this->assertSame('rm -rf', \App\Support\Quiz::normalise("rm   -rf"));

        $results = \App\Support\Quiz::grade(['run-detached-port', 'user-network'], [[' --DETACH', "'8080:80'"], ['create', '--net']]);
        $this->assertTrue($results[0]['correct']);
        $this->assertTrue($results[1]['correct']);

        $results = \App\Support\Quiz::grade(['run-detached-port'], [['-d', '80:8080']]);
        $this->assertFalse($results[0]['correct']);
        $this->assertSame([true, false], $results[0]['blankCorrect']);
    }

    public function test_quiz_pass_mark_is_applied(): void
    {
        $id = $this->join();
        $needed = (int) ceil(10 * Content::quiz()['passMark']);

        $this->submit($id, $this->paper($id), right: $needed - 1)
            ->assertOk()->assertJson(['score' => $needed - 1, 'passed' => false]);
        $this->submit($id, $this->paper($id), right: $needed)
            ->assertOk()->assertJson(['score' => $needed, 'passed' => true]);
    }

    public function test_a_paper_can_only_be_submitted_once(): void
    {
        $id = $this->join();
        $paper = $this->paper($id);

        $this->submit($id, $paper, right: 0)->assertOk();
        // Now the answers are known; the same paper must not count again.
        $this->submit($id, $paper)->assertStatus(409);
    }

    public function test_a_paper_cannot_be_edited_or_borrowed(): void
    {
        $id = $this->join();
        $paper = $this->paper($id);
        $ids = array_column($paper['questions'], 'id');
        $answers = array_map(fn ($qid) => $this->rightAnswer($qid), $ids);

        // Swapping in a question you already know.
        $swapped = $ids;
        $swapped[0] = collect(Content::quiz()['questions'])->where('level', 'easy')->pluck('id')->diff($ids)->first();
        $this->postJson("/api/participants/$id/quiz", ['token' => $paper['token'], 'questions' => $swapped, 'answers' => $answers])->assertStatus(422);

        // Someone else's paper.
        $other = $this->join();
        $this->postJson("/api/participants/$other/quiz", ['token' => $paper['token'], 'questions' => $ids, 'answers' => $answers])->assertStatus(422);
    }

    public function test_quiz_rejects_answers_that_do_not_fit(): void
    {
        $id = $this->join();
        $paper = $this->paper($id);
        $ids = array_column($paper['questions'], 'id');

        $this->postJson("/api/participants/$id/quiz", ['token' => $paper['token'], 'questions' => $ids, 'answers' => [0, 1]])->assertStatus(422);
        // A number where blanks are expected, and the other way round.
        $swapped = array_map(fn ($qid) => isset($this->question($qid)['blanks']) ? 0 : ['x'], $ids);
        $this->postJson("/api/participants/$id/quiz", ['token' => $paper['token'], 'questions' => $ids, 'answers' => $swapped])->assertStatus(422);
    }

    public function test_stats_count_progress_across_participants(): void
    {
        $a = $this->join();
        $b = $this->join();
        foreach (Content::exerciseIds() as $exerciseId) {
            $this->putJson("/api/participants/$a/exercises/$exerciseId")->assertOk();
        }
        $this->putJson("/api/participants/$b/exercises/hello-docker")->assertOk();
        $this->passQuiz($a);

        $stats = $this->getJson('/api/stats')->assertOk();

        $stats->assertJson([
            'participants' => 2,
            'activeNow' => 2,
            'finishedAllExercises' => 1,
            'quiz' => ['attempted' => 1, 'passed' => 1, 'averageBestPct' => 100],
        ]);
        $this->assertSame(2, collect($stats->json('exercises'))->firstWhere('id', 'hello-docker')['completed']);
    }

    public function test_every_change_broadcasts_fresh_stats(): void
    {
        Event::fake([StatsUpdated::class]);
        $id = $this->join();
        $this->putJson("/api/participants/$id/exercises/hello-docker");
        $this->deleteJson("/api/participants/$id/exercises/hello-docker");
        $this->passQuiz($id);

        Event::assertDispatchedTimes(StatsUpdated::class, 4);
    }

    public function test_a_broadcast_failure_does_not_fail_the_request(): void
    {
        Event::listen(StatsUpdated::class, fn () => throw new \RuntimeException('Reverb is down'));

        $this->join();
        $this->assertSame(1, Participant::count());
    }

    public function test_quiz_submissions_are_rate_limited_per_participant(): void
    {
        $id = $this->join();

        for ($i = 0; $i < 20; $i++) {
            $this->passQuiz($id);
        }
        $this->submit($id, $this->paper($id))->assertStatus(429);

        // Another participant is unaffected.
        $this->passQuiz($this->join());
    }
}
