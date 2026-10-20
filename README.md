# Verify Certification

[![CI](https://github.com/son3005/VC/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/son3005/VC/actions/workflows/ci.yml)
[![Security](https://github.com/son3005/VC/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/son3005/VC/actions/workflows/security.yml)

Hệ thống cấp và xác thực chứng chỉ trên Ethereum Sepolia. PDF là artifact gốc; hash được neo on-chain, metadata lưu MongoDB, file lưu IPFS.

## Thành phần

| Thư mục | Nội dung |
|---|---|
| `contracts/` | Solidity `CertificateRegistry`, Hardhat test, deploy Sepolia |
| `backend/` | Express + TypeScript + Mongoose + JWT + Pinata + PDFKit |
| `frontend/` | Next.js (sẽ bổ sung) |
| `docs/` | Kế hoạch, API reference, class diagram, runbook |

## Contract

```
CertificateRegistry: 0x15621cf7f8Ed3883Cf47207c0f74B9DD71fD97f4
Network:             Sepolia (11155111)
Deploy block:        11949469
```

## Chạy local

### Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

Health:

```bash
curl http://localhost:4000/api/health
```

### Docker

```bash
docker compose up -d --build
docker compose logs -f api
```

### Test

```bash
cd contracts && npx hardhat test
cd backend && npm test
```

## Tài liệu

- [API Reference](docs/api-reference.md)
- [Class Diagram](docs/class-diagram.md)
- [Backend Plan](docs/backend-plan.md)
- [Certificate Template](docs/certificate-template-plan.md)
- [Deployment Runbook](docs/deployment-runbook.md)
- [CI/CD Plan](docs/cicd-plan.md)

## CI/CD

- PR vào `main`: chạy contracts test, backend build/test, security scan.
- Frontend job tự bật khi `frontend/package.json` tồn tại.
- Render deploy sau khi checks pass (`autoDeployTrigger: checksPass`).
- Deploy contract chỉ chạy thủ công qua `Deploy Contract` + environment `sepolia`.

## Bảo mật

- Không commit `.env`.
- Secret chỉ nằm trong GitHub Environments / Render / Vercel.
- Backend không giữ private key; mọi giao dịch do MetaMask ký.
