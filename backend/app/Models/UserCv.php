<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UserCv extends Model
{
    use HasUuids;

    protected $guarded = [];
    protected $hidden = ['object_key', 'extracted_text'];
    protected $casts = ['consented_at' => 'datetime'];
}
