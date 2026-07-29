# Reporting Standards

## Mission

Your report is not a summary.

Your report is an Engineering Decision Document.

The report must allow a Technical Lead, Principal Engineer or CTO to immediately understand:

- Current project health
- Main risks
- Main opportunities
- Technical debt
- Engineering maturity
- Immediate next actions

Every report must be objective.

Every conclusion must be supported by evidence.

Never produce vague reports.

---

# Report Structure

Always generate the report using the following sections.

Do not omit sections.

Do not change the order.

---

# 1 Executive Summary

Summarize the repository in no more than 15 lines.

Include:

Purpose

Architecture

Technology

Overall quality

Main strengths

Main weaknesses

Biggest engineering risk

Highest ROI improvement

Overall recommendation

---

# 2 Overall Engineering Score

Provide scores from 0–100.

Architecture

Maintainability

Scalability

Performance

Reliability

Security

Testing

Documentation

Developer Experience

Accessibility

API Design

Frontend

Backend

Financial Engineering (if applicable)

Overall Engineering Score

Every score must contain:

Reason

Evidence

Improvement suggestions

---

# 3 Repository Overview

Describe:

Project size

Estimated complexity

Frameworks

Languages

Architecture

Main modules

External services

Dependencies

Overall maturity

---

# 4 Engineering Maturity

Determine maturity level.

Level 1

Prototype

Level 2

Growing Project

Level 3

Production Ready

Level 4

Scalable Platform

Level 5

Enterprise Ready

Explain why.

Explain what prevents reaching the next level.

---

# 5 Executive Dashboard

Display:

Critical Issues

High Priority

Medium Priority

Low Priority

Technical Debt Items

Architecture Risks

Performance Risks

Financial Risks

Quick Wins

Estimated Engineering Health

---

# 6 Engineering Wins

This section is mandatory.

Highlight good engineering decisions.

Examples:

Good architecture

Good modularization

Excellent naming

Good abstractions

Excellent React structure

Good FastAPI design

Excellent separation of concerns

Good testing strategy

Protect good engineering.

Do not criticize everything.

---

# 7 Critical Findings

Every finding must include:

ID

Category

Severity

Confidence

Title

Description

Evidence

Affected files

Root cause

Business impact

Technical impact

Risk

Recommendation

Alternative solution

Estimated effort

Priority

Expected benefit

Dependencies

---

# Severity

Use only:

CRITICAL

HIGH

MEDIUM

LOW

INFO

---

# Confidence

Use only:

VERY HIGH

HIGH

MEDIUM

LOW

UNKNOWN

Never present assumptions as facts.

---

# 8 Architectural Findings

List:

Architecture violations

Dependency problems

Boundary violations

Coupling

Cohesion

Layer violations

Framework leakage

Hexagonal violations

Technical debt

---

# 9 Performance Findings

Include:

CPU

Memory

Rendering

Network

Caching

Concurrency

Large datasets

Charts

Streaming

Algorithms

Complexity

---

# 10 Financial Findings

If applicable.

Review:

Indicators

Precision

Timezones

OHLC

Market Sessions

Backtesting

Risk

Trading Logic

Caching

Incremental Processing

Streaming

---

# 11 Engineering Smells

Group by category.

Architecture

Frontend

Backend

API

Domain

Infrastructure

Performance

Financial

Testing

Documentation

For every smell explain:

Why it exists

Risk

Recommendation

Priority

---

# 12 Duplicate Logic

List duplicated logic.

Explain:

Where

Why

Suggested abstraction

Estimated reduction

Maintainability improvement

---

# 13 Dead Code

List:

Unused files

Unused components

Unused hooks

Unused services

Unused endpoints

Unused dependencies

Unused utilities

Confidence

Safe removal recommendation

---

# 14 Refactoring Opportunities

Every opportunity must include:

Current implementation

Proposed implementation

Benefits

Risks

Estimated effort

Priority

ROI

Never recommend refactors without measurable value.

---

# 15 Performance Opportunities

List improvements ordered by impact.

Highest ROI first.

Estimate:

CPU reduction

Memory reduction

Render reduction

Network reduction

Maintenance reduction

---

# 16 Testing Review

Review:

Coverage

Missing tests

Critical paths

Unit Tests

Integration Tests

E2E

Financial tests

Regression tests

---

# 17 Documentation Review

Review:

README

Architecture docs

API docs

Setup guide

Examples

Diagrams

Developer onboarding

---

# 18 Dependency Review

Review:

Unused packages

Outdated packages

Security risks

Large dependencies

Duplicate packages

Heavy packages

Alternatives

---

# 19 Security Review

Review:

Secrets

Validation

Authentication

Authorization

Input validation

Environment variables

Logging

Sensitive information

API exposure

Dependency vulnerabilities

---

# 20 Engineering Roadmap

Mandatory.

Divide work into sprints.

Sprint 1

Only critical work.

Sprint 2

Architecture.

Sprint 3

Performance.

Sprint 4

Maintainability.

Sprint 5

Developer Experience.

Sprint 6

Optimization.

Every sprint must contain:

Objective

Tasks

Expected outcome

Estimated effort

Dependencies

Success criteria

---

# 21 Quick Wins

List improvements that:

Require little effort.

Produce large impact.

Sort by ROI.

---

# 22 Long-Term Improvements

Identify improvements requiring:

Weeks

Months

Architectural evolution

Infrastructure

Major refactoring

---

# 23 Risk Matrix

For every major issue classify:

Probability

Impact

Priority

Owner

Mitigation

Monitoring

---

# 24 Top Recommendations

Produce:

Top 10 Engineering Improvements

Top 10 Architecture Improvements

Top 10 Performance Improvements

Top 10 Financial Improvements

Top 10 Developer Experience Improvements

Order by impact.

---

# 25 Final Verdict

Summarize:

Would this project be approved for production?

Would this architecture scale?

What is the largest technical risk?

What should never be changed?

What should be changed immediately?

If you had only one week to improve the project:

What would you do?

If you were the Principal Engineer responsible for this project:

What would be your first engineering decision?

Explain why.

---

# Reporting Rules

Never generate empty sections.

If no issues exist:

State explicitly why.

Never exaggerate.

Never invent issues.

Never recommend changes without evidence.

Never recommend rewrites.

Prefer incremental evolution.

Always explain trade-offs.

Every recommendation must be actionable.

Every recommendation must include measurable engineering value.

Every report must conclude with a prioritized roadmap.

The roadmap is mandatory.

The roadmap becomes the official engineering backlog until the next audit.