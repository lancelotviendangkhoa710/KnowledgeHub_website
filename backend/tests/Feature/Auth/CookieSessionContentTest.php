<?php

namespace Tests\Feature\Auth;

use App\Services\Content\ArticleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Content\ContentTestHelper;
use Tests\TestCase;

/** AUTH-06: public content routes must still recognise the author behind a cookie session. */
class CookieSessionContentTest extends TestCase
{
    use RefreshDatabase, ContentTestHelper;

    private const WEB = ['Origin' => 'http://localhost:3000', 'Referer' => 'http://localhost:3000/courses'];

    public function test_author_with_a_cookie_session_sees_unpublished_versions_but_a_guest_does_not(): void
    {
        $author = $this->createUserWithRole('contributor');
        DB::table('users')->where('id', $author->id)->update(['email' => 'author@example.com']); // login lowercases emails; the helper's is random-case
        $articles = app(ArticleService::class);
        $article = $articles->publish($articles->create(['title' => 'Course', 'content' => 'Published.'], $author));
        $articles->createVersion($article, ['title' => 'Course (revision)', 'content' => 'Unpublished.'], $author);

        $this->getJson("/api/v1/articles/{$article->id}/versions")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $login = $this->withHeaders(self::WEB)
            ->postJson('/api/auth/login', ['email' => 'author@example.com', 'password' => 'secret123'])
            ->assertOk();
        $sessionCookie = $login->getCookie(config('session.cookie'), false)->getValue();
        $this->app['auth']->forgetGuards(); // the next request starts with no cached user

        $this->withUnencryptedCookie(config('session.cookie'), $sessionCookie)
            ->withHeaders(self::WEB)
            ->getJson("/api/v1/articles/{$article->id}/versions")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }
}
