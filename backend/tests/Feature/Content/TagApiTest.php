<?php

namespace Tests\Feature\Content;

use App\Models\Tag;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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

    public function test_explicit_slug_already_taken_returns_422(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        Tag::create(['name' => 'Docker', 'slug' => 'docker']);

        $response = $this->actingAs($contributor)->postJson('/api/v1/tags', [
            'name' => 'Docker Compose',
            'slug' => 'docker',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);

        $this->assertDatabaseMissing('tags', ['slug' => 'docker-1']);
        $this->assertSame(1, Tag::where('slug', 'like', 'docker%')->count());
    }

    public function test_explicit_slug_taken_concurrently_returns_422_instead_of_suffixing(): void
    {
        $contributor = $this->createUserWithRole('contributor');

        // Simulate a concurrent request inserting the same slug after validation
        // and the service pre-check have passed, right before our insert.
        $raced = false;
        Tag::creating(function (Tag $tag) use (&$raced) {
            if ($raced || $tag->slug !== 'race-slug') {
                return;
            }
            $raced = true;
            DB::table('tags')->insert([
                'id' => Str::uuid()->toString(),
                'name' => 'Race Winner',
                'slug' => 'race-slug',
                'created_at' => now(),
            ]);
        });

        $response = $this->actingAs($contributor)->postJson('/api/v1/tags', [
            'name' => 'Race Loser',
            'slug' => 'race-slug',
        ]);

        $this->assertTrue($raced);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['slug']);

        $this->assertDatabaseMissing('tags', ['slug' => 'race-slug-1']);
        $this->assertDatabaseMissing('tags', ['name' => 'Race Loser']);
    }

    public function test_missing_slug_is_auto_suffixed_when_taken(): void
    {
        $contributor = $this->createUserWithRole('contributor');
        Tag::create(['name' => 'Docker', 'slug' => 'docker']);

        $response = $this->actingAs($contributor)->postJson('/api/v1/tags', [
            'name' => 'Docker',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.slug', 'docker-1');

        $this->assertDatabaseHas('tags', ['slug' => 'docker-1', 'name' => 'Docker']);
    }
}
