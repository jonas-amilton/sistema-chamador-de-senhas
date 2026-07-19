<?php

declare(strict_types=1);

namespace Tests\Support;

use JsonException;
use RuntimeException;

final class MySqlConcurrentRunner
{
    /**
     * @param  list<array{operation: string, payload: array<string, string>}>  $jobs
     * @return list<array<string, mixed>>
     */
    public static function run(array $jobs): array
    {
        if (count($jobs) < 2) {
            throw new RuntimeException('Concurrency tests require at least two workers.');
        }

        $barrierDirectory = sys_get_temp_dir().'/queue-mysql-concurrency-'.bin2hex(random_bytes(12));

        if (! mkdir($barrierDirectory, 0700)) {
            throw new RuntimeException("Unable to create barrier directory [{$barrierDirectory}].");
        }

        $processes = [];

        try {
            foreach ($jobs as $index => $job) {
                $input = json_encode([
                    'operation' => $job['operation'],
                    'payload' => $job['payload'],
                    'barrier_directory' => $barrierDirectory,
                    'worker_id' => (string) $index,
                ], JSON_THROW_ON_ERROR);

                $pipes = [];
                $process = proc_open(
                    [PHP_BINARY, dirname(__DIR__).'/Support/MySqlConcurrencyWorker.php', $input],
                    [
                        0 => ['pipe', 'r'],
                        1 => ['pipe', 'w'],
                        2 => ['pipe', 'w'],
                    ],
                    $pipes,
                    dirname(__DIR__, 2),
                );

                if (! is_resource($process)) {
                    throw new RuntimeException("Unable to start worker [{$index}].");
                }

                fclose($pipes[0]);
                stream_set_blocking($pipes[1], false);
                stream_set_blocking($pipes[2], false);

                $processes[] = [
                    'process' => $process,
                    'stdout' => $pipes[1],
                    'stderr' => $pipes[2],
                    'output' => '',
                    'errors' => '',
                    'exit_code' => null,
                ];
            }

            self::waitUntilReady($processes, $barrierDirectory);

            if (file_put_contents($barrierDirectory.'/release', 'go', LOCK_EX) === false) {
                throw new RuntimeException('Unable to release the worker barrier.');
            }

            self::waitUntilFinished($processes);

            $results = [];

            foreach ($processes as $index => &$worker) {
                $worker['output'] .= stream_get_contents($worker['stdout']);
                $worker['errors'] .= stream_get_contents($worker['stderr']);
                fclose($worker['stdout']);
                fclose($worker['stderr']);

                $closeCode = proc_close($worker['process']);
                $worker['process'] = null;
                $exitCode = $worker['exit_code'] >= 0 ? $worker['exit_code'] : $closeCode;

                try {
                    $result = json_decode(trim($worker['output']), true, 512, JSON_THROW_ON_ERROR);
                } catch (JsonException $exception) {
                    throw new RuntimeException(
                        "Worker [{$index}] did not return valid JSON. stderr: ".trim($worker['errors']),
                        previous: $exception,
                    );
                }

                if (! is_array($result)) {
                    throw new RuntimeException("Worker [{$index}] returned a non-object JSON value.");
                }

                if ($exitCode !== 0) {
                    throw new RuntimeException(
                        "Worker [{$index}] failed: ".json_encode($result, JSON_UNESCAPED_SLASHES),
                    );
                }

                $results[] = $result;
            }
            unset($worker);

            $pids = array_column($results, 'pid');

            if (count(array_unique($pids)) !== count($jobs)) {
                throw new RuntimeException('Each concurrent job must run in a distinct PHP process.');
            }

            return $results;
        } finally {
            foreach ($processes as $worker) {
                if (is_resource($worker['process'])) {
                    $status = proc_get_status($worker['process']);

                    if ($status['running']) {
                        proc_terminate($worker['process']);
                    }

                    if (is_resource($worker['stdout'])) {
                        fclose($worker['stdout']);
                    }

                    if (is_resource($worker['stderr'])) {
                        fclose($worker['stderr']);
                    }

                    proc_close($worker['process']);
                }
            }

            foreach (glob($barrierDirectory.'/*') ?: [] as $barrierFile) {
                unlink($barrierFile);
            }

            rmdir($barrierDirectory);
        }
    }

    /** @param list<array<string, mixed>> $processes */
    private static function waitUntilReady(array $processes, string $barrierDirectory): void
    {
        $deadline = microtime(true) + 20;

        while (microtime(true) < $deadline) {
            $allReady = true;

            foreach ($processes as $index => $worker) {
                if (is_file($barrierDirectory.'/ready-'.$index)) {
                    continue;
                }

                $allReady = false;
                $status = proc_get_status($worker['process']);

                if (! $status['running']) {
                    $output = trim(stream_get_contents($worker['stdout']));
                    $errors = trim(stream_get_contents($worker['stderr']));

                    throw new RuntimeException(
                        "Worker [{$index}] exited before reaching the barrier. stdout: {$output}; stderr: {$errors}",
                    );
                }
            }

            if ($allReady) {
                return;
            }

            usleep(10_000);
        }

        throw new RuntimeException('Workers did not reach the start barrier within 20 seconds.');
    }

    /** @param list<array<string, mixed>> $processes */
    private static function waitUntilFinished(array &$processes): void
    {
        $deadline = microtime(true) + 30;
        $remaining = count($processes);

        while ($remaining > 0 && microtime(true) < $deadline) {
            foreach ($processes as &$worker) {
                $worker['output'] .= stream_get_contents($worker['stdout']);
                $worker['errors'] .= stream_get_contents($worker['stderr']);

                if ($worker['exit_code'] !== null) {
                    continue;
                }

                $status = proc_get_status($worker['process']);

                if (! $status['running']) {
                    $worker['exit_code'] = $status['exitcode'];
                    $remaining--;
                }
            }
            unset($worker);

            if ($remaining > 0) {
                usleep(10_000);
            }
        }

        if ($remaining > 0) {
            throw new RuntimeException('Concurrent workers did not finish within 30 seconds.');
        }
    }
}
