<?php

namespace App\Services\Firebase;

use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Storage;
use Google\Cloud\Storage\Bucket;

class FirebaseStorageService
{
    /** @var Storage|null */
    private ?Storage $storage = null;

    /**
     * Get Firebase Storage instance (cached)
     */
    public function getStorage(): Storage
    {
        if ($this->storage) {
            return $this->storage;
        }

        // Try the Laravel binding from kreait/laravel-firebase
        try {
            $this->storage = app('firebase.storage');
            return $this->storage;
        } catch (\Throwable $e) {
            Log::warning('firebase.storage binding not available: ' . $e->getMessage());
        }

        // Fallback: build via Factory with optional env overrides
        try {
            $factory = app()->bound('firebase.factory')
                ? app('firebase.factory') // \Kreait\Firebase\Factory
                : new Factory();

            $credentialsPath = env('FIREBASE_CREDENTIALS', storage_path('app/firebase/firebase_credentials.json'));
            if (is_string($credentialsPath) && file_exists($credentialsPath)) {
                $factory = $factory->withServiceAccount($credentialsPath);
            } else {
                Log::warning('Firebase credentials file not found at: ' . $credentialsPath);
            }

            $bucket = env('FIREBASE_STORAGE_BUCKET');
            if (!empty($bucket)) {
                $factory = $factory->withDefaultStorageBucket($bucket);
            }

            $this->storage = $factory->createStorage();
            return $this->storage;
        } catch (\Throwable $ex) {
            Log::error('Firebase Storage initialization failed: ' . $ex->getMessage());
            throw $ex;
        }
    }

    /**
     * Get a Storage bucket (default or by name)
     */
    public function getBucket(?string $name = null): Bucket
    {
        $storage = $this->getStorage();
        return $name ? $storage->getBucket($name) : $storage->getBucket();
    }

    /**
     * Upload a local file to a Storage path
     */
    public function uploadFile(string $path, string $localFilePath, array $options = []): string
    {
        $bucket = $this->getBucket();
        $stream = fopen($localFilePath, 'r');
        $object = $bucket->upload($stream, ['name' => ltrim($path, '/')] + $options);
        return $object->name();
    }

    /**
     * Upload raw contents to a Storage path
     */
    public function uploadString(string $path, string $contents, array $options = []): string
    {
        $bucket = $this->getBucket();
        $object = $bucket->upload($contents, ['name' => ltrim($path, '/')] + $options);
        return $object->name();
    }

    /**
     * Delete an object by path
     */
    public function delete(string $path): bool
    {
        $bucket = $this->getBucket();
        $object = $bucket->object(ltrim($path, '/'));
        if ($object->exists()) {
            $object->delete();
        }
        return true;
    }

    /**
     * Generate a V4 signed URL for temporary access
     */
    public function signedUrl(string $path, int $minutes = 15): string
    {
        $bucket = $this->getBucket();
        $object = $bucket->object(ltrim($path, '/'));
        $expiresAt = new \DateTimeImmutable('+' . $minutes . ' minutes');
        return $object->signedUrl($expiresAt, ['version' => 'v4']);
    }
}