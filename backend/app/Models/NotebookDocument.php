<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
class NotebookDocument extends Model { use HasUuids; protected $guarded=[]; protected $hidden=['storage_path','error_message']; public function chunks(): HasMany { return $this->hasMany(NotebookDocumentChunk::class,'document_id'); } }
