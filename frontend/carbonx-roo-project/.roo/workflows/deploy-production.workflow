name: Deploy to Production
description: Full production deployment with compliance checks
roles:
  - compliance-officer
  - devops-engineer
  - qa-engineer
  - backend-engineer
steps:
  1. compliance-officer:
     task: |
       Final compliance scan:
       - All PDS references correct
       - All KYC checks enforced
       - All audit logs complete
       - No high-severity risks
     output: compliance/final-compliance-report.pdf
  
  2. qa-engineer:
     task: |
       Security audit:
       - Smart contract vulnerabilities
       - API endpoint security
       - Data encryption checks
     output: compliance/security-audit-report.pdf
  
  3. human-approval:
     notify: cto@carbonx.au, compliance-officer@carbonx.au
     prompt: |
       Review final reports:
       - compliance/final-compliance-report.pdf
       - compliance/security-audit-report.pdf
       Approve for production deploy?
     timeout: 48h
  
  4. deploy:
     role: devops-engineer
     task: "Deploy to production with rollback plan"
     rollback_plan: terraform rollback
  
  5. post-deploy-tests:
     role: qa-engineer
     task: |
       Run production smoke tests:
       - User login
       - Auction creation
       - Token mint
       - Reserve dashboard
     output: test/smoke-test-results.md
  
  6. notify-stakeholders:
     role: backend-engineer
     task: |
       Send deployment notification:
       - CarbonX Layers 1 & 2 live in production
       - Core compliance platform operational
       - cACCU tokenization live
       - Reserve attestation dashboard public
     to: [board@carbonx.au, investors@carbonx.au]
