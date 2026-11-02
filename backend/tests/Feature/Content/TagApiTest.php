<?php

namespace Tests\Feature\Content;

use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagApiTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_guest_can_list_tags(): void
    {
        Tag::create(['name' => 'Docker', 'slug' => 'docker']);
        Tag::create(['name' => 'Kubernetes', 'slug' => 'kubernetes']);

        $response = $this->getJson('/api/v1/tags');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name', 'slug']]]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_contributor_and_admin_can_create_tag(): void
    {
        $contributor = $this->createUserWithRole('contributor');

        $response = $this->actingAs($contributor)->postJson('/api/v1/tags', [
            'name' => 'GraphQL',
            'slug' => 'graphql',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'GraphQL');

        $this->assertDatabaseHas('tags', ['slug' => 'graphql']);
    }

    public function test_regular_user_cannot_create_tag(): void
    {
        $user = $this->createUserWithRole('user');

        $response = $this->actingAs($user)->postJson('/api/v1/tags', [
            'name' => 'Unauthorized Tag',
        ]);

        $response->assertStatus(403);
    }
}

