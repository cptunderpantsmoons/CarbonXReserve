# CarbonX Roo Coder Project

Role-based AI agent orchestration for CarbonX Layers 1 & 2.

## 🦘 Quick Start

1. Install Roo Coder CLI
2. Run workflows:
   - `@roo run build-user-service`
   - `@roo run build-auction-engine`
   - `@roo run tokenize-accu`
   - `@roo run deploy-production`

## 🎭 Roles

- **backend-engineer**: Generates backend services and APIs
- **blockchain-engineer**: Writes smart contracts and handles blockchain ops
- **compliance-officer**: Reviews for AFSL/AUSTRAC compliance
- **data-engineer**: Parses ANREU PDFs and extracts data
- **devops-engineer**: Manages infrastructure and deployments
- **qa-engineer**: Writes tests and conducts audits

## 📋 Workflows

- `build-user-service`: Generate user/org management system
- `build-auction-engine`: Build carbon auction matching engine
- `tokenize-accu`: Full ANREU-to-cACCU workflow
- `deploy-production`: Production deployment with compliance checks

## 🛡️ Guardrails

- `compliance.guardrail`: Enforce financial services compliance
- `cost-control.guardrail`: Control infrastructure costs
- `kyc-enforcement.guardrail`: Block transfers without KYC

## 🚀 Getting Started

```bash
@roo run build-user-service

