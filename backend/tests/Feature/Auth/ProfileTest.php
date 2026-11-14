<?php

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use App\Models\UserCv;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Mockery;
use Tests\TestCase;

class ProfileTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['user', 'contributor', 'admin'] as $name) {
            Role::insert(['id' => (string) Str::uuid(), 'name' => $name, 'description' => $name]);
        }
    }

    public function test_guest_cannot_read_or_change_profile(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
        $this->patchJson('/api/me', ['name' => 'X'])->assertUnauthorized();
        $this->putJson('/api/me/password', [])->assertUnauthorized();
    }

    public function test_user_reads_only_their_own_approved_projection(): void
    {
        $user = $this->createUser('me@example.com');
        $this->createUser('other@example.com');

        $this->withToken($user->createToken('t')->plainTextToken)
            ->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.user.email', 'me@example.com')
            ->assertJsonPath('data.user.roles.0', 'user')
            ->assertJsonMissingPath('data.user.password')
            ->assertJsonMissingPath('data.user.remember_token');
    }

    public function test_user_can_update_their_name(): void
    {
        $user = $this->createUser('me@example.com');

        $this->withToken($user->createToken('t')->plainTextToken)
            ->patchJson('/api/me', ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('data.user.name', 'New Name');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'New Name']);
    }

    public function test_sensitive_fields_in_payload_are_rejected_and_database_is_unchanged(): void
    {
        $user = $this->createUser('me@example.com');
        $other = $this->createUser('other@example.com');
        $token = $user->createToken('t')->plainTextToken;

        $payloads = [
            ['name' => 'Ok', 'status' => 'banned'],
            ['name' => 'Ok', 'roles' => ['admin']],
            ['name' => 'Ok', 'email' => 'hijack@example.com'],
            ['name' => 'Ok', 'id' => $other->id],
            ['name' => 'Ok', 'user_id' => $other->id],
            ['name' => 'Ok', 'password' => 'new-password-1'],
        ];

        foreach ($payloads as $payload) {
            $this->withToken($token)->patchJson('/api/me', $payload)->assertUnprocessable();
        }

        $this->assertDatabaseHas('users', ['id' => $user->id, 'name' => 'Test User', 'email' => 'me@example.com', 'status' => 'active']);
        $this->assertDatabaseHas('users', ['id' => $other->id, 'name' => 'Test User']);
        $this->assertDatabaseCount('user_roles', 2);
    }

    public function test_name_validation_rejects_empty_and_overlong_values(): void
    {
        $token = $this->createUser('me@example.com')->createToken('t')->plainTextToken;

        $this->withToken($token)->patchJson('/api/me', ['name' => ''])->assertUnprocessable();
        $this->withToken($token)->patchJson('/api/me', ['name' => str_repeat('a', 256)])->assertUnprocessable();
        $this->withToken($token)->patchJson('/api/me', [])->assertUnprocessable();
    }

    public function test_change_password_requires_current_password_and_keeps_old_hash_on_failure(): void
    {
        $user = $this->createUser('me@example.com');
        $token = $user->createToken('t')->plainTextToken;
        $hash = $user->fresh()->password;

        $this->withToken($token)->putJson('/api/me/password', [
            'current_password' => 'wrong-password',
            'password' => 'brand-new-pass',
            'password_confirmation' => 'brand-new-pass',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');

        $this->assertSame($hash, $user->fresh()->password);
    }

    public function test_change_password_validates_new_password(): void
    {
        $token = $this->createUser('me@example.com')->createToken('t')->plainTextToken;

        $this->withToken($token)->putJson('/api/me/password', [
            'current_password' => 'password-123',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->withToken($token)->putJson('/api/me/password', [
            'current_password' => 'password-123',
            'password' => 'password-123',
            'password_confirmation' => 'password-123',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_change_password_revokes_other_sessions_but_keeps_current_one(): void
    {
        $user = $this->createUser('me@example.com');
        $current = $user->createToken('current')->plainTextToken;
        $user->createToken('other-device');
        $otherUserToken = $this->createUser('other@example.com')->createToken('x');

        $this->withToken($current)->putJson('/api/me/password', [
            'current_password' => 'password-123',
            'password' => 'brand-new-pass',
            'password_confirmation' => 'brand-new-pass',
        ])->assertOk()->assertJsonPath('data', null);

        $this->assertTrue(Hash::check('brand-new-pass', $user->fresh()->password));
        $this->assertSame(1, $user->tokens()->count());
        $this->assertSame(1, $otherUserToken->accessToken->tokenable->tokens()->count());
        $this->withToken($current)->getJson('/api/me')->assertOk();
    }

    public function test_delete_account_requires_current_password(): void
    {
        $user = $this->createUser('me@example.com');
        $token = $user->createToken('t')->plainTextToken;

        $this->withToken($token)->deleteJson('/api/me', ['current_password' => 'wrong'])
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->withToken($token)->deleteJson('/api/me')->assertUnprocessable();

        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_deleting_account_soft_deletes_revokes_tokens_and_blocks_login(): void
    {
        $user = $this->createUser('me@example.com');
        $token = $user->createToken('a')->plainTextToken;
        $user->createToken('b');

        $this->withToken($token)->deleteJson('/api/me', ['current_password' => 'password-123'])
            ->assertOk()->assertJsonPath('data', null);

        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
        $this->assertDatabaseCount('user_roles', 1);
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
        $this->postJson('/api/auth/login', ['email' => 'me@example.com', 'password' => 'password-123'])
            ->assertUnprocessable();
    }

    public function test_deleted_email_can_register_again(): void
    {
        $user = $this->createUser('me@example.com');
        $this->withToken($user->createToken('t')->plainTextToken)
            ->deleteJson('/api/me', ['current_password' => 'password-123'])->assertOk();
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();

        $this->postJson('/api/auth/register', [
            'name' => 'Again', 'email' => 'me@example.com',
            'password' => 'password-123', 'password_confirmation' => 'password-123',
        ])->assertCreated();
    }

    public function test_last_active_admin_cannot_delete_their_account(): void
    {
        $admin = $this->createUser('admin@example.com');
        $admin->roles()->attach(Role::where('name', 'admin')->value('id'));

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->deleteJson('/api/me', ['current_password' => 'password-123'])
            ->assertUnprocessable();

        $this->assertNotSoftDeleted('users', ['id' => $admin->id]);

        $second = $this->createUser('admin2@example.com');
        $second->roles()->attach(Role::where('name', 'admin')->value('id'));
        $this->app['auth']->forgetGuards();

        $this->withToken($admin->createToken('t2')->plainTextToken)
            ->deleteJson('/api/me', ['current_password' => 'password-123'])->assertOk();
    }

    public function test_account_deletion_removes_saved_cv_before_success(): void
    {
        Storage::fake('cv');
        $user = $this->createUser('cv-owner@example.com');
        $key = 'cvs/'.Str::uuid().'.pdf';
        Storage::disk('cv')->put($key, '%PDF-1.4');
        $cv = UserCv::create([
            'user_id' => $user->id,
            'object_key' => $key,
            'filename' => 'cv.pdf',
            'size_bytes' => 8,
            'extracted_text' => 'private CV text',
            'consented_at' => now(),
            'status' => 'active',
        ]);

        $this->withToken($user->createToken('t')->plainTextToken)
            ->deleteJson('/api/me', ['current_password' => 'password-123'])
            ->assertOk();

        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('user_cvs', ['id' => $cv->id]);
        Storage::disk('cv')->assertMissing($key);
    }

    public function test_storage_failure_keeps_account_and_pending_cv_for_retry(): void
    {
        $user = $this->createUser('cv-failure@example.com');
        $cv = UserCv::create([
            'user_id' => $user->id,
            'object_key' => 'cvs/'.Str::uuid().'.pdf',
            'filename' => 'cv.pdf',
            'size_bytes' => 8,
            'extracted_text' => 'private CV text',
            'consented_at' => now(),
            'status' => 'active',
        ]);
        $disk = Mockery::mock(Filesystem::class);
        $disk->shouldReceive('delete')->once()->andReturn(false);
        Storage::shouldReceive('disk')->with('cv')->once()->andReturn($disk);

        $this->withToken($user->createToken('t')->plainTextToken)
            ->deleteJson('/api/me', ['current_password' => 'password-123'])
            ->assertStatus(503);

        $this->assertNotSoftDeleted('users', ['id' => $user->id]);
        $this->assertDatabaseHas('user_cvs', [
            'id' => $cv->id, 'status' => 'pending_delete', 'extracted_text' => null,
        ]);
        $this->assertSame(1, $user->tokens()->count());
    }

    private function createUser(string $email, string $status = 'active'): User
    {
        $user = new User(['name' => 'Test User', 'email' => $email, 'password' => Hash::make('password-123')]);
        $user->id = (string) Str::uuid();
        $user->status = $status;
        $user->save();
        $user->roles()->attach(Role::where('name', 'user')->value('id'));

        return $user;
    }
}
