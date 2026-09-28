<?php

namespace App\Http\Controllers;

use App\Models\ChatMeToo;
use App\Models\ChatMessage;
use App\Models\Participant;
use App\Support\Chat;
use App\Support\Content;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Questions chat. Students post and delete their own; nobody moderates (by design). */
class ChatController extends Controller
{
    /** Public, so the trainer can read along without joining. */
    public function index(): JsonResponse
    {
        return response()->json(['messages' => Chat::messages()]);
    }

    /** The same list, with which messages are yours and which you said "Me too" to. */
    public function show(string $id): JsonResponse
    {
        Participant::touchOrFail($id);

        return response()->json(['messages' => Chat::messages($id)]);
    }

    public function store(Request $request, string $id): JsonResponse
    {
        Participant::touchOrFail($id);
        // Laravel trims strings and turns empty ones into null, so blank messages fail "required".
        $input = $request->validate([
            'body' => ['required', 'string', 'max:'.Chat::MAX_LENGTH],
            'exercise' => ['nullable', 'string', Rule::in(Content::exerciseIds())],
        ]);

        ChatMessage::create(['participant_id' => $id, 'body' => $input['body'], 'exercise_id' => $input['exercise'] ?? null]);
        Chat::broadcast();

        return response()->json(['messages' => Chat::messages($id)], 201);
    }

    public function destroy(string $id, int $messageId): JsonResponse
    {
        Participant::touchOrFail($id);
        // Someone else's message is "not found" for you, the same as a missing one.
        $message = ChatMessage::where('participant_id', $id)->find($messageId);
        abort_unless($message, 404, 'Message not found.');

        $message->delete();
        Chat::broadcast();

        return response()->json(['messages' => Chat::messages($id)]);
    }

    public function meToo(string $id, int $messageId): JsonResponse
    {
        return $this->setMeToo($id, $messageId, true);
    }

    public function notMeToo(string $id, int $messageId): JsonResponse
    {
        return $this->setMeToo($id, $messageId, false);
    }

    private function setMeToo(string $id, int $messageId, bool $on): JsonResponse
    {
        Participant::touchOrFail($id);
        $message = ChatMessage::find($messageId);
        abort_unless($message, 404, 'Message not found.');
        abort_if($message->participant_id === $id, 422, 'That is your own question.');

        $where = ['message_id' => $messageId, 'participant_id' => $id];
        $changed = $on
            ? ChatMeToo::insertOrIgnore($where) > 0
            : ChatMeToo::where($where)->delete() > 0;
        // Tapping twice changes nothing, so it tells nobody.
        if ($changed) {
            Chat::broadcast();
        }

        return response()->json(['messages' => Chat::messages($id)]);
    }
}
