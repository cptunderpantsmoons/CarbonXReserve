name: Build User Service
description: Generate compliant user/org management service
roles:
  - backend-engineer
  - qa-engineer
  - compliance-officer
steps:
  1. backend-engineer:
     task: |
       Generate Node.js user service for CarbonX:
       - User + Org entities (TypeORM)
       - CRUD endpoints (NestJS)
       - JWT auth + RBAC
       - KYC status field
       - Audit logging
     output: src/user/
  
  2. qa-engineer:
     task: |
       Write Jest tests for user service:
       - Register user + org
       - Auth guard tests
       - KYC status checks
       - Audit log verification
     output: test/user/
  
  3. compliance-officer:
     task: |
       Review user service for AFSL/AUSTRAC compliance:
       - PII encryption requirements
       - KYC enforcement checks
       - Audit trail completeness
       - PDS disclosure compliance
     output: compliance/user-service-review.md
  
  4. human-review:
     notify: lead-dev@carbonx.au
     prompt: "Review user service before merge - check compliance report"
     timeout: 24h
  
  5. deploy:
     role: devops-engineer
     task: "Deploy user service to staging environment"
