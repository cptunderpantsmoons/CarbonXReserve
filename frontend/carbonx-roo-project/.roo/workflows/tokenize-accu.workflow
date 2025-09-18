name: Tokenize ACCU to cACCU
description: Full workflow from ANREU upload to token mint
roles:
  - data-engineer
  - backend-engineer
  - blockchain-engineer
  - compliance-officer
steps:
  1. data-engineer:
     task: |
       Parse ANREU PDF:
       - Extract serial range
       - Extract vintage
       - Extract project ID
       - Confidence scoring
     input: uploads/anreu-transfer.pdf
     output: parsed-data.json
  
  2. human-verify:
     notify: ops-team@carbonx.au
     prompt: "Verify ANREU transfer in registry"
     timeout: 4h
  
  3. backend-engineer:
     task: |
       Generate cACCU mint transaction:
       - Batch ID from parsed data
       - Metadata from project registry
       - Mint to user wallet
     output: mint-transaction.json
  
  4. blockchain-engineer:
     task: |
       Execute cACCU mint:
       - Connect to Polygon
       - Sign transaction
       - Broadcast + wait for confirmation
     input: mint-transaction.json
     output: tx-hash
  
  5. compliance-officer:
     task: |
       Verify tokenization compliance:
       - 1:1 reserve backing confirmed
       - KYC check enforced
       - Audit trail complete
       - PDS disclosure included
     output: compliance/tokenization-review.md
  
  6. notify-user:
     role: backend-engineer
     task: |
       Send mint confirmation:
       - cACCU tokens received
       - Transaction hash
       - Reserve attestation link
     to: user.email
