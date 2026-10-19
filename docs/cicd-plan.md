# CI/CD Plan — GitHub Actions

> Tự động kiểm tra mỗi Pull Request, giữ `main` luôn chạy được, và chỉ deploy khi đã qua kiểm tra.
>
> Phạm vi: repo `son3005/VC` · monorepo `contracts/ backend/ frontend/`

---

## 1. Mục tiêu

| Mục tiêu | Cách đo |
|---|---|
| Không merge code lỗi | PR đỏ thì không merge |
| Không deploy code lỗi | Render/Vercel chỉ nhận commit đã qua CI |
| Không deploy contract ngoài ý muốn | Chỉ chạy workflow thủ công |
| Không lộ secret | Secret nằm ở GitHub Environments, không trong code |
| Thời gian CI ngắn | < 6 phút cho toàn bộ |

---

## 2. Nguyên tắc

1. **CI chạy trên mọi PR** vào `main`.
2. **CD dựa vào Git integration** của Vercel/Render, không tự viết deploy script nếu không cần.
3. **Contract deploy là thao tác thủ công** — không bao giờ tự động trên push.
4. **Không dùng `pull_request_target`** để checkout code từ fork.
5. **Quyền tối thiểu** cho `GITHUB_TOKEN`.
6. **Không lưu secret trong biến thường**, chỉ dùng GitHub Secrets/Environments.

---

## 3. Sơ đồ luồng

```
feature/* ──push──► Pull Request
                       │
                       ▼
                 GitHub Actions CI
                 ├─ contracts: compile + test
                 ├─ backend: build + test
                 ├─ frontend: lint + build
                 └─ security: audit + secret scan
                       │
              ┌────────┴────────┐
              │                 │
           ❌ fail           ✅ pass
              │                 │
        sửa code          Vercel Preview
                                │
                          review + merge
                                │
                                ▼
                              main
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
          Render auto deploy             Vercel production
          (sau khi checks pass)          (tự động)
```

---

## 4. Cấu trúc file

```
.github/
├─ workflows/
│  ├─ ci.yml
│  ├─ security.yml
│  └─ deploy-contract.yml
├─ PULL_REQUEST_TEMPLATE.md
└─ dependabot.yml
```

---

## 5. Workflow `ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  contracts:
    name: Contracts
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: contracts
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: contracts/package-lock.json
      - run: npm ci
      - run: npx hardhat compile
      - run: npx hardhat test
        env:
          SEPOLIA_RPC_URL: http://127.0.0.1:8545
          DEPLOYER_PRIVATE_KEY: "0x0000000000000000000000000000000000000000000000000000000000000001"

  backend:
    name: Backend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test
        env:
          NODE_ENV: test
          JWT_SECRET: test-secret-at-least-32-characters-long
          MONGODB_URI: mongodb://127.0.0.1:27017/verify_cert_test
          CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000"
          SEPOLIA_RPC_URL: http://127.0.0.1:8545

  frontend:
    name: Frontend
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
        env:
          NEXT_PUBLIC_CHAIN_ID: "11155111"
          NEXT_PUBLIC_CHAIN_ID_HEX: "0xaa36a7"
          NEXT_PUBLIC_CHAIN_NAME: Sepolia
          NEXT_PUBLIC_RPC_URL: https://ethereum-sepolia-rpc.publicnode.com
          NEXT_PUBLIC_EXPLORER_URL: https://sepolia.etherscan.io
          NEXT_PUBLIC_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000"
          NEXT_PUBLIC_DEPLOY_BLOCK: "0"
          NEXT_PUBLIC_API_URL: https://example.com
          NEXT_PUBLIC_IPFS_GATEWAY: https://gateway.pinata.cloud/ipfs/
```

### 5.1 Lưu ý từng job

| Job | Ghi chú |
|---|---|
| Contracts | Test local, không cần mạng. Private key giả chỉ để config parse |
| Backend | Test unit chạy trước; integration cần Mongo (xem 5.2) |
| Frontend | Build với env giả; không gọi API lúc build |

### 5.2 Backend integration test

Nếu test cần Mongo, thêm service container:

```yaml
services:
  mongo:
    image: mongo:7
    ports:
      - 27017:27017
```

Hoặc dùng `mongodb-memory-server` trong test (tự tải binary, chậm hơn lần đầu).

**Khuyến nghị:** unit test luôn chạy; integration test chạy khi có `MONGODB_URI` thật, còn CI dùng service container.

### 5.3 Cache

- `actions/setup-node` cache npm theo từng module.
- Hardhat cache `~/.cache/hardhat-nodejs`.
- Không cache `node_modules` trực tiếp.

---

## 6. Workflow `security.yml`

```yaml
name: Security

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  secrets:
    name: Secret scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  audit:
    name: Dependency audit
    runs-on: ubuntu-latest
    strategy:
      matrix:
        dir: [contracts, backend, frontend]
    defaults:
      run:
        working-directory: ${{ matrix.dir }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: ${{ matrix.dir }}/package-lock.json
      - run: npm ci
      - run: npm audit --audit-level=high
```

**Ghi chú:**

- `npm audit` có thể fail vì lỗi gián tiếp không sửa được ngay. Khi đó đổi thành `continue-on-error: true` và ghi nhận, nhưng không bỏ qua lỗi high/critical.
- Gitleaks quét toàn bộ lịch sử; nếu từng commit `.env`, phải rotate key và xóa khỏi lịch sử.

---

## 7. Workflow `deploy-contract.yml`

Chỉ chạy thủ công, có phê duyệt.

```yaml
name: Deploy Contract

on:
  workflow_dispatch:
    inputs:
      network:
        description: "Network"
        required: true
        default: sepolia
        type: choice
        options: [sepolia]

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy to ${{ inputs.network }}
    runs-on: ubuntu-latest
    environment: sepolia
    defaults:
      run:
        working-directory: contracts
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: contracts/package-lock.json
      - run: npm ci
      - run: npx hardhat run scripts/deploy.ts --network ${{ inputs.network }}
        env:
          SEPOLIA_RPC_URL: ${{ secrets.SEPOLIA_RPC_URL }}
          DEPLOYER_PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
          ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
      - uses: actions/upload-artifact@v4
        with:
          name: deployment-${{ inputs.network }}
          path: contracts/deployments/${{ inputs.network }}.json
```

### 7.1 Environment protection

GitHub → Settings → Environments → `sepolia`:

- [ ] Required reviewers: chính bạn
- [ ] Wait timer: 0
- [ ] Deployment branches: chỉ `main`
- [ ] Secrets: `SEPOLIA_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `ETHERSCAN_API_KEY`

**Quy tắc:**

- Không chạy trên `push`.
- Không dùng chung secret với CI thường.
- Artifact `deployment-sepolia.json` tải về, cập nhật env Render/Vercel thủ công.
- Không tự commit địa chỉ contract — tránh vòng lặp deploy.

---

## 8. CD — Vercel & Render

### 8.1 Vercel

| Cấu hình | Giá trị |
|---|---|
| Production Branch | `main` |
| Preview | mọi nhánh khác |
| Root Directory | `frontend` |
| Build | mặc định |
| Env | `NEXT_PUBLIC_*` |

- Mỗi PR có Preview URL.
- Merge vào `main` → production deploy.
- Không cần GitHub Actions deploy Vercel.

### 8.2 Render

| Cấu hình | Giá trị |
|---|---|
| Branch | `main` |
| Auto-Deploy | On Commit hoặc **Checks Pass** |
| Health Check | `/api/health` |

**Nâng cao:** đổi `render.yaml`:

```yaml
autoDeployTrigger: checksPass
```

Khi đó Render chỉ deploy nếu GitHub checks xanh. Cần CI chạy trên `push` nhánh `main` để có check.

### 8.3 Vì sao không deploy bằng Actions?

- Vercel/Render đã tích hợp Git, deploy native ổn định hơn.
- Thêm `VERCEL_TOKEN`/`RENDER_API_KEY` là thêm secret nguy hiểm.
- Chỉ dùng Actions khi cần logic đặc biệt (ví dụ deploy contract).

---

## 9. Bảo vệ nhánh `main`

GitHub → Settings → Branches → Add rule:

- [ ] Require a pull request before merging
- [ ] Require status checks to pass
  - `Contracts`
  - `Backend`
  - `Frontend`
  - `Secret scan`
  - `Dependency audit`
- [ ] Require branches to be up to date
- [ ] Do not allow bypassing
- [ ] Restrict force pushes
- [ ] Require linear history (tùy chọn)

**Làm một mình:** không bật “Require approvals” vì GitHub không cho tự approve; chỉ cần status checks.

---

## 10. Quy trình PR

1. Tạo nhánh `feature/...`.
2. Commit nhỏ, message rõ.
3. Push, mở PR.
4. CI chạy; sửa đến khi xanh.
5. Vercel Preview: kiểm tra UI.
6. Tự review diff.
7. Merge (squash) vào `main`.
8. Render/Vercel deploy production.
9. Smoke test nhanh.

### PR template

```md
## Thay đổi
- 

## Kiểm tra
- [ ] CI xanh
- [ ] Đã test local
- [ ] Không có secret
- [ ] Cập nhật docs nếu cần

## Ảnh / tx hash
```

---

## 11. Dependabot

`.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /contracts
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /backend
    schedule:
      interval: weekly
  - package-ecosystem: npm
    directory: /frontend
    schedule:
      interval: weekly
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

Chỉ bật nếu còn thời gian; đồ án nhỏ có thể bỏ qua.

---

## 12. Secrets & an toàn workflow

| Secret | Nơi lưu | Dùng ở |
|---|---|---|
| `SEPOLIA_RPC_URL` | Environment `sepolia` | deploy contract |
| `DEPLOYER_PRIVATE_KEY` | Environment `sepolia` | deploy contract |
| `ETHERSCAN_API_KEY` | Environment `sepolia` | verify |
| `VERCEL_TOKEN` | Không cần | — |
| `RENDER_API_KEY` | Không cần | — |

**Quy tắc:**

- Fork PR không nhận secret — đúng mặc định.
- Không dùng `pull_request_target` + checkout PR.
- Không echo secret; nếu cần, `echo "::add-mask::$VALUE"`.
- Pin action bên thứ ba bằng SHA nếu dùng (gitleaks, paths-filter).
- `permissions: contents: read` mặc định.
- Không cấp `write` cho workflow CI.

---

## 13. Chi phí & thời gian

| Repo | Phút free/tháng |
|---|---|
| Public | Không giới hạn |
| Private | 2.000 phút |

Ước tính mỗi lần chạy:

| Job | Thời gian |
|---|---|
| Contracts | 1–2 phút |
| Backend | 1–2 phút |
| Frontend | 2–3 phút |
| Security | 1 phút |
| **Tổng** | **5–6 phút** |

Với 20 PR/tháng: ~120 phút — thoải mái.

---

## 14. Rủi ro

| Rủi ro | Ảnh hưởng | Xử lý |
|---|---|---|
| Secret trong log | Lộ key | Không echo, mask |
| Fork PR đọc secret | Lộ key | Mặc định GitHub không gửi |
| `pull_request_target` sai | Chạy code độc hại | Không dùng |
| CI chậm | Giảm năng suất | Cache, chạy song song |
| `npm audit` fail liên tục | Chặn merge | Ghi nhận, chỉ chặn high/critical |
| Deploy contract nhầm | Tốn gas, đổi địa chỉ | Chỉ workflow_dispatch + approval |
| Render deploy trước CI | Code lỗi lên production | `checksPass` hoặc chờ CI |
| Actions hết phút | Không chạy CI | Repo public hoặc giảm job |

---

## 15. Lộ trình 2 ngày

| Ngày | Việc | Kết quả |
|---|---|---|
| 1 | Viết `ci.yml`, chạy thử trên PR | 3 job xanh |
| 1 | Viết `security.yml` | Secret scan + audit |
| 2 | Bật branch protection | Không merge được khi đỏ |
| 2 | Viết `deploy-contract.yml` + environment | Deploy thủ công có approval |
| 2 | PR template, badge README | Quy trình hoàn chỉnh |

---

## 16. Checklist

- [ ] `ci.yml` chạy trên PR và `main`
- [ ] 3 job contracts/backend/frontend xanh
- [ ] `security.yml` quét secret + audit
- [ ] Branch protection bật status checks
- [ ] `deploy-contract.yml` chỉ workflow_dispatch
- [ ] Environment `sepolia` có reviewer
- [ ] Không có secret trong workflow
- [ ] Vercel Preview hoạt động
- [ ] Render deploy sau khi merge
- [ ] PR template
- [ ] Badge CI trên README
- [ ] Đã thử một PR đỏ và một PR xanh

---

## 17. Không làm ở v1

- CodeQL (cần Advanced Security cho repo private)
- Self-hosted runner
- Multi-environment staging
- Canary deploy
- Terraform cho hạ tầng
- Tự động commit địa chỉ contract
