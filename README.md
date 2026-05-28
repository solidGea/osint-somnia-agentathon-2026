# somniaApps

Monorepo scaffold for `frontend` and `smartcontract`.

## Structure
- `frontend` — Next.js + TypeScript + shadcn + RainbowKit wallet connection
- `smartcontract` — Hardhat project with FileRequest contract and deployment/invocation scripts


## Getting started
1. Install dependencies from the monorepo root:
   ```bash
   npm --workspace frontend install --legacy-peer-deps
   ```
2. Run services methods from the monorepo root:
     - Frontend:
   ```bash
   npm run dev:frontend
   npm run build:frontend
   npm run start:frontend
   ```
     - Smart contract:
   ```bash
   npx hardhat compile
   npx hardhat run --network somnia file-request/scripts/deployv2.ts
   npx hardhat run --network somnia file-request/scripts/invokeMockPersonel.ts
   npx hardhat run --network somnia file-request/scripts/setBaseUrl.ts
   ```
## Smart Contract Address

The deployed `FileRequest` contract is available and verified on Somnia Explorer:

- `0xdACd846bacaE495C9a8a7371C845BCB29B4B1705`
- Verified at: https://shannon-explorer.somnia.network/address/0xdACd846bacaE495C9a8a7371C845BCB29B4B1705
