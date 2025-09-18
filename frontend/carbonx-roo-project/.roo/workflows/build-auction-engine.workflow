name: Build Auction Engine
description: Generate carbon auction matching system
roles:
  - backend-engineer
  - qa-engineer
  - compliance-officer
steps:
  1. backend-engineer:
     task: |
       Generate auction matching engine:
       - Auction + Bid entities
       - Price/time priority matching
       - Email notifications
       - Settlement workflow
     output: src/auction/
  
  2. qa-engineer:
     task: |
       Write tests for auction engine:
       - Match by price priority
       - Vintage filtering
       - Settlement locking
       - Email sending
     output: test/auction/
  
  3. compliance-officer:
     task: |
       Review auction engine for compliance:
       - Settlement requires ANREU confirmation
       - Audit log all matches
       - Transaction reporting triggers
       - PDS references for fees
     output: compliance/auction-engine-review.md
  
  4. human-review:
     notify: product-manager@carbonx.au
     prompt: "Review auction UX + compliance flow"
  
  5. deploy:
     role: devops-engineer
     task: "Deploy auction engine to staging environment"
