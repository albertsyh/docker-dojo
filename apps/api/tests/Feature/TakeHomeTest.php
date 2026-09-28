<?php

namespace Tests\Feature;

use App\Models\Participant;
use App\Support\Content;
use App\Support\Quiz;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Take-home tracks: their own exercises and quiz, kept out of the workshop's Live figures. */
class TakeHomeTest extends TestCase
{
    use RefreshDatabase;

    private const TRACK = 'node';

    private function join(): string
    {
        $id = $this->getJson('/api/participants/suggestion')->assertOk()->json('id');
        $this->postJson('/api/participants', ['id' => $id])->assertCreated();

        return $id;
    }

    private function rightAnswer(string $questionId): int|array
    {
        $q = collect(Content::quiz(self::TRACK)['questions'])->firstWhere('id', $questionId);

        return isset($q['blanks']) ? array_map(fn ($accepted) => $accepted[0], $q['blanks']) : $q['answer'];
    }

    private function submit(string $id, array $paper, ?string $token = null)
    {
        $ids = array_column($paper['questions'], 'id');

        return $this->postJson('/api/participants/'.$id.'/quiz/'.self::TRACK, [
            'token' => $token ?? $paper['token'],
            'questions' => $ids,
            'answers' => array_map($this->rightAnswer(...), $ids),
        ]);
    }

    public function test_content_lists_published_tracks_without_answers(): void
    {
        $track = collect($this->getJson('/api/content')->assertOk()->json('takeHome'))->firstWhere('id', self::TRACK);

        $this->assertSame(array_column(Content::trackExercises(self::TRACK), 'id'), array_column($track['exercises'], 'id'));
        $this->assertSame(['easy' => 3, 'medium' => 2, 'advanced' => 2], $track['quiz']['split']);
        $this->assertSame(7, $track['quiz']['questionCount']);
        $this->assertArrayNotHasKey('questions', $track['quiz']);
        $this->assertNotEmpty($track['label']);
    }

    public function test_a_take_home_paper_draws_from_its_own_pool(): void
    {
        $id = $this->join();
        $paper = $this->getJson("/api/participants/$id/quiz/".self::TRACK)->assertOk()->json();

        $pool = array_column(Content::quiz(self::TRACK)['questions'], 'id');
        $this->assertCount(7, $paper['questions']);
        foreach ($paper['questions'] as $q) {
            $this->assertContains($q['id'], $pool);
            $this->assertArrayNotHasKey('answer', $q);
        }
    }

    public function test_passing_a_take_home_quiz_is_recorded_for_that_track_only(): void
    {
        $id = $this->join();
        $paper = $this->getJson("/api/participants/$id/quiz/".self::TRACK)->assertOk()->json();

        $this->submit($id, $paper)->assertOk()
            ->assertJsonPath('passed', true)
            ->assertJsonPath('total', 7)
            ->assertJsonPath('progress.quiz', null)
            ->assertJsonPath('progress.trackQuizzes.'.self::TRACK.'.passed', true);
        $this->getJson("/api/participants/$id")->assertJsonPath('trackQuizzes.'.self::TRACK.'.attempts', 1);
    }

    public function test_a_paper_signed_for_another_track_is_refused(): void
    {
        $id = $this->join();
        $paper = $this->getJson("/api/participants/$id/quiz/".self::TRACK)->assertOk()->json();
        // The same questions, signed the way a workshop paper is.
        $coreToken = Quiz::sign($id, array_column($paper['questions'], 'id'));

        $this->submit($id, $paper, $coreToken)->assertStatus(422);
    }

    public function test_take_home_quizzes_stay_out_of_the_live_quiz_groups(): void
    {
        $id = $this->join();
        $paper = $this->getJson("/api/participants/$id/quiz/".self::TRACK)->assertOk()->json();

        $this->assertNull(Participant::find($id)->quiz_opened_at, 'Opening a take-home quiz is not "taking it now".');
        $this->submit($id, $paper)->assertOk();

        $this->getJson('/api/stats')->assertOk()
            ->assertJsonPath('quiz.attempted', 0)
            ->assertJsonPath('quiz.passed', 0)
            ->assertJsonPath('quiz.takingNow', 0)
            ->assertJsonPath('quiz.averageBestPct', null);
    }

    public function test_take_home_exercises_count_in_their_own_section_only(): void
    {
        $id = $this->join();
        $exerciseId = Content::trackExercises(self::TRACK)[0]['id'];

        $this->putJson("/api/participants/$id/exercises/$exerciseId")->assertOk()
            ->assertJsonPath('completed', [$exerciseId]);

        $stats = $this->getJson('/api/stats')->assertOk();
        $stats->assertJsonPath('exerciseCompletionPct', 0)
            ->assertJsonPath('finishedAllExercises', 0);
        $this->assertNotContains($exerciseId, array_column($stats->json('exercises'), 'id'));
        $track = collect($stats->json('takeHome'))->firstWhere('id', self::TRACK);
        $this->assertSame(1, collect($track['exercises'])->firstWhere('id', $exerciseId)['completed']);
    }

    public function test_presence_and_chat_accept_take_home_exercises(): void
    {
        $id = $this->join();
        $exerciseId = Content::trackExercises(self::TRACK)[0]['id'];

        $this->postJson("/api/participants/$id/presence", ['exercise' => $exerciseId])->assertOk();
        $this->postJson("/api/participants/$id/chat", ['body' => 'Stuck on step 3', 'exercise' => $exerciseId])->assertCreated();
    }

    public function test_unknown_tracks_and_exercises_are_404(): void
    {
        $id = $this->join();

        $this->getJson("/api/participants/$id/quiz/nope")->assertNotFound();
        $this->postJson("/api/participants/$id/quiz/nope", [])->assertNotFound();
        $this->putJson("/api/participants/$id/exercises/node-nope")->assertNotFound();
    }

    public function test_the_exercise_list_includes_take_home_tracks(): void
    {
        $track = collect($this->getJson('/api/exercises')->assertOk()->json('takeHome'))->firstWhere('id', self::TRACK);
        $first = Content::trackExercises(self::TRACK)[0]['id'];

        $this->assertSame(1, $track['exercises'][0]['number']);
        $this->assertSame('/exercises/'.$first, $track['exercises'][0]['page']);
        $this->assertSame('/live?embed&exercise='.$first, $track['exercises'][0]['live']);
    }
}
