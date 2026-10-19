# CertificateRegistry

Smart contract cho hệ thống **Verify Certification** — trường đại học cấp chứng chỉ, neo hash file lên Ethereum Sepolia.

- Solidity `0.8.24`
- License: GPL-3.0
- Optimizer: bật, `runs = 200`
- EVM: `shanghai`

## Cấu trúc

```
contracts/
├─ contracts/
│  ├─ CertificateRegistry.sol
│  └─ interfaces/ICertificateRegistry.sol
├─ test/CertificateRegistry.test.ts
├─ scripts/deploy.ts
├─ hardhat.config.ts
└─ .env.example
```

## Lệnh

```bash
npm install
npm run compile
npm run test
npm run coverage
```

## Deploy

### Cách 1 — Remix (khuyến nghị)

Xem [../docs/remix-deploy-guide.md](../docs/remix-deploy-guide.md).

- Compiler `0.8.24`
- Optimizer `200`
- EVM `shanghai`

### Cách 2 — Hardhat

```bash
cp .env.example .env
# điền SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY
npm run deploy:sepolia
```

## Sau khi deploy

1. Gọi `addIssuer(<ví khoa>, "Khoa Công nghệ Thông tin")`.
2. Verify trên Sepolia Etherscan với đúng compiler/optimizer/EVM.
3. Export ABI vào `../shared/abi/CertificateRegistry.json`.
4. Cập nhật `CONTRACT_ADDRESS` + `DEPLOY_BLOCK` cho backend và frontend.

## Ghi chú

- Không lưu PII on-chain.
- `certificateId` và `fileHash` là duy nhất.
- Gỡ issuer không làm mất hiệu lực chứng chỉ cũ.
- Contract không upgradeable.
