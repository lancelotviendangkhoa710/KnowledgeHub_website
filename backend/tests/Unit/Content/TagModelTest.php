<?php

namespace Tests\Unit\Content;

use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class TagModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_tag_uses_uuid_and_custom_timestamps(): void
    {
        $tag = Tag::create([
            'name' => 'Laravel 11',
            'slug' => 'laravel-11',
        ]);

        $this->assertNotEmpty($tag->id);
        $this->assertTrue(Str::isUuid($tag->id));
        $this->assertNull(Tag::UPDATED_AT);
        $this->assertNotNull($tag->created_at);
    }
}

