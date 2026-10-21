<?php

namespace Tests\Unit\Learning;

use App\Services\Learning\PrerequisiteGraphValidator;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class PrerequisiteGraphValidatorTest extends TestCase
{
    private PrerequisiteGraphValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->validator = new PrerequisiteGraphValidator();
    }

    public function test_it_accepts_an_acyclic_graph(): void
    {
        $this->validator->assertAcyclic([
            $this->edge('item-b', 'item-a'),
            $this->edge('item-c', 'item-b'),
            $this->edge('item-d', 'item-a'),
        ]);

        $this->assertTrue(true);
    }

    public function test_it_rejects_a_self_cycle(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('cannot be its own prerequisite');

        $this->validator->assertAcyclic([$this->edge('item-a', 'item-a')]);
    }

    public function test_it_rejects_a_two_node_cycle(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('would create a cycle');

        $this->validator->assertAcyclic([
            $this->edge('item-b', 'item-a'),
            $this->edge('item-a', 'item-b'),
        ]);
    }

    public function test_it_rejects_an_indirect_cycle(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->validator->assertAcyclic([
            $this->edge('item-b', 'item-a'),
            $this->edge('item-c', 'item-b'),
            $this->edge('item-a', 'item-c'),
        ]);
    }

    public function test_it_rejects_a_cycle_created_only_by_the_complete_batch(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->validator->assertCanAddEdges(
            [$this->edge('item-b', 'item-a')],
            [
                $this->edge('item-c', 'item-b'),
                $this->edge('item-a', 'item-c'),
            ],
        );
    }

    /**
     * @return array{roadmap_item_id: string, prerequisite_item_id: string}
     */
    private function edge(string $dependentId, string $prerequisiteId): array
    {
        return [
            'roadmap_item_id' => $dependentId,
            'prerequisite_item_id' => $prerequisiteId,
        ];
    }
}