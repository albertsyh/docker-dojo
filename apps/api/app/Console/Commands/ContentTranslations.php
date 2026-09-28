<?php

namespace App\Console\Commands;

use App\Support\Content;
use App\Support\Translations;
use Illuminate\Console\Command;

/**
 * How far a translation of the content has got, and what has gone stale since the English changed.
 * Run it from apps/api (it writes into resources/content when stamping):
 *
 *     php artisan content:translations            # Malay: a line per file, then any problems
 *     php artisan content:translations --stamp=exercises.json
 *
 * Stamping records, for every translated entry in that file, the English it now matches. Do it
 * after writing or reviewing the translation, never to silence the test.
 */
class ContentTranslations extends Command
{
    protected $signature = 'content:translations {lang=ms} {--stamp= : A content file, e.g. exercises.json or take-home/node/quiz.json}';

    protected $description = 'Show how complete and up to date a translation of the course content is';

    public function handle(): int
    {
        $lang = $this->argument('lang');
        if ($lang === Content::ENGLISH || Content::language($lang) !== $lang) {
            $this->error('Pick a translation: '.implode(', ', array_diff(Content::LANGUAGES, [Content::ENGLISH])).'.');

            return self::FAILURE;
        }

        if ($stamp = $this->option('stamp')) {
            if (! in_array($stamp, Content::files(), true)) {
                $this->error("No content file called $stamp. Files: ".implode(', ', Content::files()).'.');

                return self::FAILURE;
            }
            $this->stamp($stamp, $lang);
        }

        $problems = [];
        foreach (Content::files() as $file) {
            $report = Translations::check($file, Content::english($file), Content::translation($file, $lang));
            $stale = count($report['stale']);
            $this->line(sprintf('%-32s %3d of %3d translated%s', $file, $report['translated'], $report['total'], $stale ? ", $stale out of date" : ''));
            foreach ($report['stale'] as $where) {
                $this->line("    out of date: $where");
            }
            $problems = [...$problems, ...$report['problems']];
        }
        foreach ($problems as $problem) {
            $this->error($problem);
        }

        return $problems ? self::FAILURE : self::SUCCESS;
    }

    private function stamp(string $file, string $lang): void
    {
        $path = resource_path("content/$lang/$file");
        $overlay = Content::translation($file, $lang);
        $units = Translations::units($file, Content::english($file));
        $count = 0;
        foreach ($overlay as $collection => $entries) {
            foreach ($entries as $key => $entry) {
                if (is_array($entry) && isset($units[$collection][$key])) {
                    unset($entry['source']);
                    $overlay[$collection][$key] = ['source' => Translations::hash($units[$collection][$key]), ...$entry];
                    $count++;
                }
            }
        }
        $json = json_encode($overlay, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        // Two-space indents, like the English files.
        $json = preg_replace_callback('/^( +)/m', fn ($m) => str_repeat(' ', intdiv(strlen($m[1]), 2)), $json);
        file_put_contents($path, $json."\n");
        $this->info("Stamped $count entries in $lang/$file.");
    }
}
