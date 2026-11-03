<?php

namespace Tests\Feature\Content;

use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    public function test_guest_can_view_category_tree(): void
    {
        $parent = Category::create(['name' => 'Backend', 'slug' => 'backend']);
        Category::create(['name' => 'Laravel', 'slug' => 'laravel', 'parent_id' => $parent->id]);

        $response = $this->getJson('/api/v1/categories');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => [['id', 'name', 'slug', 'children']]]);

        $this->assertCount(1, $response->json('data'));
        $this->assertCount(1, $response->json('data.0.children'));
    }

    public function test_guest_can_view_category_by_slug(): void
    {
        Category::create(['name' => 'DevOps', 'slug' => 'devops']);

        $response = $this->getJson('/api/v1/categories/devops');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'DevOps');
    }

    public function test_guest_and_user_cannot_create_category(): void
    {
        $guestResponse = $this->postJson('/api/v1/categories', ['name' => 'AI']);
        $guestResponse->assertStatus(401);

        $user = $this->createUserWithRole('user');
        $userResponse = $this->actingAs($user)->postJson('/api/v1/categories', ['name' => 'AI']);
        $userResponse->assertStatus(403);
    }

    public function test_admin_can_create_update_and_delete_category(): void
    {
        $admin = $this->createUserWithRole('admin');

        // Create
        $createResponse = $this->actingAs($admin)->postJson('/api/v1/categories', [
            'name' => 'Cloud Computing',
            'slug' => 'cloud-computing',
        ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.name', 'Cloud Computing');

        $categoryId = $createResponse->json('data.id');

        // Update
        $updateResponse = $this->actingAs($admin)->putJson("/api/v1/categories/{$categoryId}", [
            'name' => 'Cloud & Infrastructure',
        ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.name', 'Cloud & Infrastructure');

        // Delete
        $deleteResponse = $this->actingAs($admin)->deleteJson("/api/v1/categories/{$categoryId}");
        $deleteResponse->assertStatus(200);

        $this->assertDatabaseMissing('categories', ['id' => $categoryId]);
    }
}

