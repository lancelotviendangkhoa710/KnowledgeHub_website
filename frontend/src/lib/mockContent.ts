import { Article, Category, Tag } from '@/types/content';

export const mockCategories: Category[] = [
  {
    id: 'cat-sys-01',
    name: 'Distributed Systems',
    slug: 'distributed-systems',
    articles_count: 8,
  },
  {
    id: 'cat-db-02',
    name: 'Database Engineering',
    slug: 'database-engineering',
    articles_count: 12,
  },
  {
    id: 'cat-arch-03',
    name: 'Software Architecture',
    slug: 'software-architecture',
    articles_count: 9,
  },
  {
    id: 'cat-ai-04',
    name: 'AI & Learning Companions',
    slug: 'ai-learning-companions',
    articles_count: 6,
  },
  {
    id: 'cat-sec-05',
    name: 'Security & Systems',
    slug: 'security-systems',
    articles_count: 5,
  },
];

export const mockTags: Tag[] = [
  { id: 'tag-1', name: 'PostgreSQL', slug: 'postgresql' },
  { id: 'tag-2', name: 'Consensus', slug: 'consensus' },
  { id: 'tag-3', name: 'Raft', slug: 'raft' },
  { id: 'tag-4', name: 'Vector DB', slug: 'vector-db' },
  { id: 'tag-5', name: 'DDD', slug: 'ddd' },
  { id: 'tag-6', name: 'Performance', slug: 'performance' },
];

export const mockArticles: Article[] = [
  {
    id: 'art-001',
    author_id: 'usr-contributor-1',
    author: {
      id: 'usr-contributor-1',
      name: 'Dr. Sarah Lin',
      email: 'sarah.lin@knowledgehub.internal',
    },
    category_id: 'cat-sys-01',
    category: mockCategories[0],
    slug: 'advanced-distributed-systems-consensus-raft',
    status: 'published',
    published_at: '2026-10-12T09:30:00Z',
    created_at: '2026-10-10T14:00:00Z',
    published_version_id: 'ver-001-v2',
    published_version: {
      id: 'ver-001-v2',
      article_id: 'art-001',
      version_no: 2,
      title: 'Advanced Distributed Systems: The Mechanics of Raft Consensus',
      content: `## 1. The Core Problem: Agreement Under Partition
In distributed computing, achieving consensus among independent nodes over an unreliable network is the bedrock of dependable state machines. If nodes disagree on the sequence of state transitions, data corruption is inevitable.

\`\`\`mermaid
flowchart LR
    Client --> Leader[Leader Node]
    Leader -->|AppendEntries RPC| FollowerA[Follower 1]
    Leader -->|AppendEntries RPC| FollowerB[Follower 2]
    Leader -.->|Unreachable| FollowerC[Follower 3 (Partitioned)]
\`\`\`

### Fundamental Assumptions
* **Fail-stop model**: Nodes crash and restart, but they do not exhibit Byzantine (malicious) behaviors.
* **Asynchronous network**: Messages may be delayed, reordered, or duplicated, but not forged.

---

## 2. Leader Election Protocol
Raft enforces strong leadership. At any given instant, every node resides in one of three states:
1. **Follower**: Passive, responding strictly to incoming RPCs from leaders and candidates.
2. **Candidate**: Active, seeking votes across the cluster when heartbeats lapse.
3. **Leader**: Authoritative coordinator handling all client requests and replication.

> **Key Invariant**: A candidate only secures a term if it garners votes from a strict quorum: $\\lfloor N/2 \\rfloor + 1$. This mathematical property guarantees that two disjoint majorities cannot exist simultaneously.

---

## 3. Log Replication & Commit Safety
When a client submits an execution instruction:
1. The leader appends the entry to its local Write-Ahead Log (WAL).
2. It dispatches \`AppendEntries\` RPCs to all followers in parallel.
3. Once a quorum responds with verification, the entry is flagged as **committed**.
4. The leader applies the committed entry to its deterministic finite state machine and returns the result to the caller.`,
      created_at: '2026-10-12T09:30:00Z',
    },
    tags: [mockTags[1], mockTags[2]],
    is_bookmarked: true,
  },
  {
    id: 'art-002',
    author_id: 'usr-contributor-2',
    author: {
      id: 'usr-contributor-2',
      name: 'Alexei Ivanov',
      email: 'alexei.ivanov@knowledgehub.internal',
    },
    category_id: 'cat-db-02',
    category: mockCategories[1],
    slug: 'postgresql-16-indexing-deep-dive',
    status: 'published',
    published_at: '2026-10-15T16:45:00Z',
    created_at: '2026-10-14T11:00:00Z',
    published_version_id: 'ver-002-v1',
    published_version: {
      id: 'ver-002-v1',
      article_id: 'art-002',
      version_no: 1,
      title: 'PostgreSQL 16: Mastering Indexing Strategies & Query Optimization',
      content: `## 1. Beyond the Standard B-Tree
While standard B-Trees suffice for equality and simple range operations, production workloads with multi-tenant data, geospatial coordinates, or JSONB documents require specialized indexing engines.

### Index Types in PostgreSQL 16
* **B-Tree**: The universal standard for scalar data, sorting, and range queries.
* **GIN (Generalized Inverted Index)**: Built for values containing composite components: arrays, full-text documents, and JSONB keys.
* **BRIN (Block Range Index)**: Hyper-compact indexes designed for physical time-ordered sequential tables (event logs, metrics).

---

## 2. Partial & Covering Indexes
### The Power of Partial Indexes
Why index archived rows when 99% of your application queries only access active records?

\`\`\`sql
-- Dramatic reduction in index size and maintenance cost
CREATE INDEX idx_users_active_email
ON users (email)
WHERE deleted_at IS NULL;
\`\`\`

### Covering Indexes via the INCLUDE Clause
By attaching secondary columns directly to index leaf pages without indexing their values, PostgreSQL performs Index-Only Scans without reading the heap:

\`\`\`sql
CREATE INDEX idx_articles_author_covering
ON articles (author_id)
INCLUDE (status, published_at);
\`\`\``,
      created_at: '2026-10-15T16:45:00Z',
    },
    tags: [mockTags[0], mockTags[5]],
    is_bookmarked: false,
  },
  {
    id: 'art-003',
    author_id: 'usr-contributor-1',
    author: {
      id: 'usr-contributor-1',
      name: 'Dr. Sarah Lin',
      email: 'sarah.lin@knowledgehub.internal',
    },
    category_id: 'cat-arch-03',
    category: mockCategories[2],
    slug: 'domain-driven-design-monoliths-to-microservices',
    status: 'published',
    published_at: '2026-10-16T10:00:00Z',
    created_at: '2026-10-15T08:20:00Z',
    published_version_id: 'ver-003-v1',
    published_version: {
      id: 'ver-003-v1',
      article_id: 'art-003',
      version_no: 1,
      title: 'Domain-Driven Design: Bounded Contexts & Tactical Patterns',
      content: `## 1. The Fallacy of Shared Generic Models
In large software projects, the biggest source of coupling is not shared code, but shared semantics. When a single \`User\` model tries to serve Billing, Course Delivery, Auth, and Marketing, it becomes a brittle god object.

### The Bounded Context Boundary
Each domain model must only be valid within its own Bounded Context:
* **Identity Domain**: User is an *Account Principal* (credentials, roles, status).
* **Content Domain**: User is an *Author / Contributor* (byline, bio, published works).
* **Learning Domain**: User is a *Student / Member* (progress, roadmap, streaks).

---

## 2. Tactical Architecture
* **Entities**: Defined by continuous identity rather than attributes.
* **Value Objects**: Immutable, side-effect-free, distinguished only by their properties.
* **Aggregates**: Clusters of entities with a single root enforcing all transactional invariants.`,
      created_at: '2026-10-16T10:00:00Z',
    },
    tags: [mockTags[4]],
    is_bookmarked: true,
  },
  {
    id: 'art-004',
    author_id: 'usr-contributor-3',
    author: {
      id: 'usr-contributor-3',
      name: 'Kenji Takahashi',
      email: 'kenji.t@knowledgehub.internal',
    },
    category_id: 'cat-ai-04',
    category: mockCategories[3],
    slug: 'architecting-ai-learning-companion-rag-memory',
    status: 'published',
    published_at: '2026-10-18T14:15:00Z',
    created_at: '2026-10-17T12:00:00Z',
    published_version_id: 'ver-004-v1',
    published_version: {
      id: 'ver-004-v1',
      article_id: 'art-004',
      version_no: 1,
      title: 'Architecting an AI Learning Companion: RAG, Long-Term Memory & Guidance',
      content: `## 1. The Architecture of an Educational AI
An AI Learning Companion is distinct from a generic chatbot. It must possess pedagogy: guiding users toward discovery rather than simply dumping final answers.

### Three Pillars of Knowledge Retrieval
1. **Curated Domain Knowledge (RAG)**: Grounding answers strictly within verified platform course materials.
2. **Episodic Conversation Memory**: Retaining context throughout the active study session.
3. **Long-Term User Profile**: Tracking mastered concepts, recurring difficulties, and learning pace.`,
      created_at: '2026-10-18T14:15:00Z',
    },
    tags: [mockTags[3]],
    is_bookmarked: false,
  },
];
