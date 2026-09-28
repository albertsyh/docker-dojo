<?php

namespace App\Http\Middleware;

use App\Support\Content;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * ?lang=ms picks the language of messages and content for this request. The web app sends it on
 * every call. Anything unknown, or nothing, means English.
 */
class SetLanguage
{
    public function handle(Request $request, Closure $next): Response
    {
        App::setLocale(Content::language($request->query('lang')));

        return $next($request);
    }
}
