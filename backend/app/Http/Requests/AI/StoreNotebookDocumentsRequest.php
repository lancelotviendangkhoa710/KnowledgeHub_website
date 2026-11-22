<?php
namespace App\Http\Requests\AI;
use Illuminate\Foundation\Http\FormRequest;
class StoreNotebookDocumentsRequest extends FormRequest { public function authorize(): bool{return $this->user()!==null;} public function rules():array{return ['documents'=>['required','array','min:1','max:10'],'documents.*'=>['required','file','mimetypes:application/pdf','extensions:pdf','max:15360']];} }
