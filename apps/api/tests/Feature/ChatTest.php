<?php

namespace Tests\Feature;

use App\Events\ChatUpdated;
use App\Models\ChatMeToo;
use App\Support\Chat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ChatTest extends TestCase
{
    use RefreshDatabase;

    private function join(): string
    {
        $id = $this->getJson('/api/participants/suggestion')->assertOk()->json('id');
        $this->postJson('/api/participants', ['id' => $id])->assertCreated();

        return $id;
    }

    private function ask(string $id, string $body = 'Why does my port not work?', ?string $exercise = null)
    {
        return $this->postJson("/api/participants/$id/chat", ['body' => $body, 'exercise' => $exercise]);
    }

    private function messageId(string $body): int
    {
        return collect($this->getJson('/api/chat')->json('messages'))->firstWhere('body', $body)['id'];
    }

    public function test_a_question_is_posted_and_listed_by_display_name(): void
    {
        $id = $this->join();
        $this->ask($id, 'What is `-p` for?', 'first-web-server')->assertCreated();

        $message = $this->getJson('/api/chat')->assertOk()->json('messages.0');
        [$adjective, $animal] = explode('-', $id);
        $this->assertSame("$adjective $animal", $message['author']);
        $this->assertSame('What is `-p` for?', $message['body']);
        $this->assertSame('first-web-server', $message['exercise']);
        $this->assertSame(0, $message['meTooCount']);
        // The public list does not know who is asking, so it says nothing about "mine".
        $this->assertArrayNotHasKey('mine', $message);
    }

    public function test_participant_ids_never_appear_in_the_chat(): void
    {
        [$a, $b] = [$this->join(), $this->join()];
        $this->ask($a);
        $this->ask($b, 'Me as well?');
        $this->putJson("/api/participants/$b/chat/{$this->messageId('Why does my port not work?')}/me-too")->assertOk();

        foreach (['/api/chat', "/api/participants/$a/chat", "/api/participants/$b/chat"] as $url) {
            $raw = $this->getJson($url)->assertOk()->getContent();
            foreach ([$a, $b] as $id) {
                // Anyone holding an id can act as that student, so the id is a secret.
                $this->assertStringNotContainsString(substr($id, -6), $raw, "$url leaks a participant id.");
            }
        }
    }

    public function test_your_own_view_marks_your_messages_and_me_toos(): void
    {
        [$a, $b] = [$this->join(), $this->join()];
        $this->ask($a);

        $this->assertTrue($this->getJson("/api/participants/$a/chat")->json('messages.0.mine'));
        $this->assertFalse($this->getJson("/api/participants/$b/chat")->json('messages.0.mine'));

        $this->putJson("/api/participants/$b/chat/{$this->messageId('Why does my port not work?')}/me-too")->assertOk();
        $this->assertTrue($this->getJson("/api/participants/$b/chat")->json('messages.0.meToo'));
        $this->assertFalse($this->getJson("/api/participants/$a/chat")->json('messages.0.meToo'));
    }

    public function test_you_can_delete_only_your_own_messages(): void
    {
        [$a, $b] = [$this->join(), $this->join()];
        $this->ask($a);
        $message = $this->messageId('Why does my port not work?');
        $this->putJson("/api/participants/$b/chat/$message/me-too");

        $this->deleteJson("/api/participants/$b/chat/$message")->assertNotFound();
        $this->assertCount(1, $this->getJson('/api/chat')->json('messages'));

        $this->deleteJson("/api/participants/$a/chat/$message")->assertOk();
        $this->assertSame([], $this->getJson('/api/chat')->json('messages'));
        $this->assertSame(0, ChatMeToo::count(), 'Its me-toos go with it.');
    }

    public function test_me_too_counts_once_per_person_and_can_be_taken_back(): void
    {
        [$a, $b, $c] = [$this->join(), $this->join(), $this->join()];
        $this->ask($a);
        $message = $this->messageId('Why does my port not work?');
        $count = fn () => $this->getJson('/api/chat')->json('messages.0.meTooCount');

        $this->putJson("/api/participants/$b/chat/$message/me-too")->assertOk();
        $this->putJson("/api/participants/$b/chat/$message/me-too")->assertOk();
        $this->putJson("/api/participants/$c/chat/$message/me-too")->assertOk();
        $this->assertSame(2, $count());

        $this->deleteJson("/api/participants/$b/chat/$message/me-too")->assertOk();
        $this->assertSame(1, $count());

        // Not on your own question, and not on one that is gone.
        $this->putJson("/api/participants/$a/chat/$message/me-too")->assertUnprocessable();
        $this->putJson("/api/participants/$b/chat/999999/me-too")->assertNotFound();
    }

    public function test_messages_are_checked(): void
    {
        $id = $this->join();
        $this->ask($id, '   ')->assertUnprocessable();
        $this->ask($id, str_repeat('a', Chat::MAX_LENGTH + 1))->assertUnprocessable();
        $this->ask($id, str_repeat('a', Chat::MAX_LENGTH))->assertCreated();
        $this->ask($id, 'Which one?', 'not-an-exercise')->assertUnprocessable();
        $this->postJson('/api/participants/brave-otter-zzzzzz/chat', ['body' => 'hi'])->assertNotFound();
    }

    public function test_changes_broadcast_and_reads_do_not(): void
    {
        [$a, $b] = [$this->join(), $this->join()];
        Event::fake([ChatUpdated::class]);

        $this->ask($a);
        $message = $this->messageId('Why does my port not work?');
        $this->getJson("/api/participants/$b/chat");
        $this->putJson("/api/participants/$b/chat/$message/me-too");
        $this->putJson("/api/participants/$b/chat/$message/me-too"); // no change
        $this->deleteJson("/api/participants/$a/chat/$message");

        // posted, me too, deleted.
        Event::assertDispatchedTimes(ChatUpdated::class, 3);
    }

    public function test_a_broadcast_failure_does_not_fail_the_post(): void
    {
        $id = $this->join();
        Event::listen(ChatUpdated::class, fn () => throw new \RuntimeException('Reverb is down'));

        $this->ask($id)->assertCreated();
    }

    public function test_posting_is_rate_limited_per_participant(): void
    {
        $id = $this->join();
        for ($i = 0; $i < 10; $i++) {
            $this->ask($id, "Question $i")->assertCreated();
        }
        $this->ask($id, 'One more')->assertStatus(429);
        $this->ask($this->join())->assertCreated();
    }
}
