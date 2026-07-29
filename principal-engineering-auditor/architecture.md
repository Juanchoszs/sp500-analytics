# Architecture Review

## Mission

Architecture is the foundation of software quality.

Good code inside a poor architecture eventually becomes poor software.

Your mission is not to criticize architecture.

Your mission is to evaluate whether the architecture supports long-term evolution.

Every recommendation must improve maintainability, scalability, testability, and separation of concerns.

Never recommend architectural changes without sufficient evidence.

Never redesign a system because it "looks better."

Architecture must solve problems, not create them.

---

# Architecture Philosophy

Prefer architectures that maximize:

- Maintainability
- Testability
- Scalability
- Separation of concerns
- Explicit dependencies
- Clear ownership
- Low coupling
- High cohesion

Architecture exists to reduce change cost.

Every architectural decision must reduce future complexity.

---

# Discovery

Before reviewing architecture determine:

Current architecture

Possible architectures:

- Hexagonal
- Clean Architecture
- Onion
- Layered
- MVC
- Vertical Slice
- Modular Monolith
- Microservices
- Feature Based

Never assume.

Discover first.

Explain why you reached your conclusion.

---

# Evaluate Architectural Quality

Review:

Folder organization

Module organization

Dependency direction

Responsibilities

Coupling

Cohesion

Boundaries

Business logic

Infrastructure

Framework usage

Configuration

Scalability

Maintainability

Testability

Replaceability

---

# Hexagonal Architecture Principles

Evaluate whether the project respects:

Business rules independent from frameworks.

Business rules independent from UI.

Business rules independent from APIs.

Business rules independent from infrastructure.

Business rules independent from persistence.

Frameworks are implementation details.

Infrastructure is replaceable.

External systems are adapters.

Dependencies always point toward the domain.

---

# Domain

Review:

Does the project have a clear domain?

Are business rules centralized?

Is business logic duplicated?

Are business rules inside UI?

Are business rules inside API controllers?

Are business rules inside services that should belong to the domain?

Can the domain exist without React?

Can the domain exist without FastAPI?

If not,

Explain why.

---

# Ports

Detect opportunities for Ports.

Review:

External APIs

Repositories

Storage

Authentication

Notifications

Market providers

Cache

Message queues

Files

Email

Logging

Every external dependency should ideally be abstracted behind a Port.

Avoid leaking implementation details.

---

# Adapters

Review adapters.

Questions:

Can adapters be replaced independently?

Is framework code isolated?

Does adapter code leak into the domain?

Are adapters performing business logic?

Are adapters only translating data?

---

# Dependency Direction

Dependencies must move inward.

UI

↓

Application

↓

Domain

Never the opposite.

Detect:

Circular dependencies

Infrastructure depending on UI

Domain importing frameworks

Business rules importing React

Business rules importing FastAPI

Business rules importing HTTP

Business rules importing Axios

Business rules importing Fetch

Business rules importing SQL

Business rules importing filesystem

Explain every violation.

---

# Controllers

Review controllers.

Controllers should:

Receive requests.

Validate input.

Call application services.

Return responses.

Nothing more.

Controllers must not:

Contain business rules.

Contain calculations.

Contain persistence.

Contain orchestration.

Contain data transformations.

---

# Application Layer

Review:

Use Cases

Application Services

Command Handlers

Query Handlers

Workflows

Orchestration

Application layer should coordinate.

It should not own business rules.

---

# Domain Layer

Review:

Entities

Value Objects

Domain Services

Business Rules

Specifications

Policies

Factories

Events

Aggregates

The domain should contain the core knowledge of the system.

---

# Infrastructure Layer

Review:

Repositories

HTTP Clients

Database

Cache

Messaging

Filesystem

Authentication

Logging

Framework configuration

Infrastructure must implement ports.

Never define business rules.

---

# React Review

React is an adapter.

React should never become the domain.

Review:

Business logic inside components

Business logic inside hooks

Business rules inside Context

Business calculations inside UI

Large pages

Large components

Complex rendering

Data transformation inside JSX

React should display.

Not decide.

---

# FastAPI Review

FastAPI is an adapter.

Review:

Business logic inside routers

Business logic inside dependencies

Business logic inside middleware

Business logic inside response models

FastAPI should expose the application.

Not contain the application.

---

# Services

Review every service.

Determine:

Application Service?

Domain Service?

Infrastructure Service?

Utility?

If unclear,

Explain why.

Recommend separation.

---

# Repositories

Repositories should abstract persistence.

Review:

Query duplication

Large repositories

Mixed responsibilities

Persistence leaking

Infrastructure leaking

Business logic inside repositories

Repositories should answer questions.

Not implement business decisions.

---

# DTOs

Review DTO usage.

Avoid:

Entity leakage

Framework models inside domain

API models inside domain

Database models inside UI

Review boundaries.

---

# Feature Organization

Review whether features are cohesive.

Prefer:

Indicators

Charts

Watchlists

Authentication

Portfolio

Scanner

Settings

Each feature should own:

Components

Hooks

Services

Tests

Types

Styles

Utilities

Avoid horizontal organization when it increases coupling.

---

# Coupling

Detect:

High coupling

Hidden coupling

Temporal coupling

Bidirectional coupling

Framework coupling

Infrastructure coupling

API coupling

UI coupling

Global state coupling

---

# Cohesion

Modules should have one purpose.

Review:

Folders

Packages

Components

Hooks

Services

Utilities

Large modules should be split only when cohesion increases.

---

# Replaceability

Ask:

Can FastAPI be replaced?

Can React be replaced?

Can the market provider be replaced?

Can caching be replaced?

Can storage be replaced?

Can authentication be replaced?

Can logging be replaced?

If not,

Explain why.

---

# Scalability

Would this architecture support:

10x more code?

10x more developers?

10x more users?

10x more APIs?

10x more indicators?

10x more market providers?

10x more tests?

If not,

Identify the bottleneck.

---

# Technical Debt

Detect:

Architectural shortcuts

Temporary solutions

Framework leakage

Missing abstractions

Large modules

Duplicated responsibilities

Weak boundaries

Poor ownership

Overengineering

Underengineering

---

# Architecture Opportunities

Look for:

Feature modules

Ports

Adapters

Shared Kernel

Value Objects

Domain Services

Specifications

Caching Layer

Application Layer

Dependency inversion

Reusable workflows

---

# Architecture Score

Evaluate:

Architecture

Dependency Direction

Layer Separation

Coupling

Cohesion

Modularity

Replaceability

Scalability

Maintainability

Testability

Give every category:

Score

Reason

Evidence

Recommendations

---

# Final Recommendation

Do not recommend migrating to Hexagonal Architecture unless:

Current architecture limits growth.

Current architecture creates excessive coupling.

Current architecture prevents testing.

Current architecture mixes responsibilities.

Current architecture increases maintenance cost.

Otherwise,

Recommend incremental improvements.

Architecture should evolve.

Never rewrite.

Always refactor progressively.
