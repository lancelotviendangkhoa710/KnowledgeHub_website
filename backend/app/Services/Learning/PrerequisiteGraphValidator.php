<?php

namespace App\Services\Learning;

use InvalidArgumentException;

/**
 * Validates the in-memory prerequisite graph.
 *
 * An edge stores [dependent item ID, prerequisite item ID]. Traversal reverses
 * that storage direction to prerequisite -> dependent for cycle detection.
 * Persistence, authorization, locking, and transaction boundaries belong to
 * the prerequisite service once the roadmap domain is available.
 */
class PrerequisiteGraphValidator
{
    /**
     * Assert that all existing edges plus proposed edges remain a DAG.
     *
     * @param array<int, array{roadmap_item_id: string, prerequisite_item_id: string}> $existingEdges
     * @param array<int, array{roadmap_item_id: string, prerequisite_item_id: string}> $proposedEdges
     */
    public function assertCanAddEdges(array $existingEdges, array $proposedEdges): void
    {
        $this->assertAcyclic([...$existingEdges, ...$proposedEdges]);
    }

    /**
     * Assert that an edge collection is acyclic.
     *
     * @param array<int, array{roadmap_item_id: string, prerequisite_item_id: string}> $edges
     */
    public function assertAcyclic(array $edges): void
    {
        /** @var array<string, array<string, true>> $adjacency */
        $adjacency = [];

        foreach ($edges as $edge) {
            $dependentId = $edge['roadmap_item_id'];
            $prerequisiteId = $edge['prerequisite_item_id'];

            if ($dependentId === $prerequisiteId) {
                throw new InvalidArgumentException('An item cannot be its own prerequisite.');
            }

            $adjacency[$prerequisiteId][$dependentId] = true;
            $adjacency[$dependentId] ??= [];
        }

        /** @var array<string, int> $states 0=unvisited, 1=visiting, 2=visited */
        $states = [];

        foreach (array_keys($adjacency) as $itemId) {
            if (($states[$itemId] ?? 0) === 0) {
                $this->visit($itemId, $adjacency, $states);
            }
        }
    }

    /**
     * @param array<string, array<string, true>> $adjacency
     * @param array<string, int> $states
     */
    private function visit(string $itemId, array $adjacency, array &$states): void
    {
        $states[$itemId] = 1;

        foreach (array_keys($adjacency[$itemId]) as $dependentId) {
            $state = $states[$dependentId] ?? 0;

            if ($state === 1) {
                throw new InvalidArgumentException('This prerequisite relationship would create a cycle.');
            }

            if ($state === 0) {
                $this->visit($dependentId, $adjacency, $states);
            }
        }

        $states[$itemId] = 2;
    }
}