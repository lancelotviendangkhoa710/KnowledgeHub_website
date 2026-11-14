<?php

namespace App\Services\AI;

use Aws\CommandInterface;

class CvStorageUploadOptions
{
    /** Supabase Storage's S3 PutObject does not support the x-amz-acl header. */
    public static function removeAcl(CommandInterface $command): void
    {
        unset($command['ACL']);
    }
}
