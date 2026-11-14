<?php

namespace Tests\Feature\AI;

use Aws\MockHandler;
use Aws\Result;
use Aws\S3\S3Client;
use League\Flysystem\AwsS3V3\AwsS3V3Adapter;
use League\Flysystem\Config;
use Tests\TestCase;

class CvStorageUploadOptionsTest extends TestCase
{
    public function test_cv_upload_omits_acl_header_and_options_survive_config_export(): void
    {
        $config = require __DIR__.'/../../../config/filesystems.php';
        $options = $config['disks']['cv']['options'];
        $restored = eval('return '.var_export($options, true).';');
        $this->assertIsCallable($restored['before_upload']);

        $handler = new MockHandler([new Result([])]);
        $client = new S3Client([
            'version' => 'latest', 'region' => 'local',
            'credentials' => ['key' => 'test', 'secret' => 'test'],
            'endpoint' => 'https://storage.example.test/storage/v1/s3',
            'use_path_style_endpoint' => true, 'handler' => $handler,
        ]);
        $adapter = new AwsS3V3Adapter($client, 'private-cvs', '', null, null, $restored);
        $adapter->write('cvs/test.pdf', '%PDF-1.4', new Config());

        $this->assertSame('PutObject', $handler->getLastCommand()->getName());
        $this->assertFalse($handler->getLastRequest()->hasHeader('x-amz-acl'));
    }
}
