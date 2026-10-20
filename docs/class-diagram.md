# Class Diagram — Verify Certification

> Sơ đồ lớp tầng service và mô hình dữ liệu.
>
> Code: `backend/src/services` · Models: `backend/src/models`

---

## 1. Service classes

```mermaid
classDiagram
    direction TB

    class CertificateService {
        +listAllCertificates(query) Promise
        +getIssuerCertificate(id, actor) Promise
        +revokeCertificate(id, txHash, actor) Promise
        +searchPublicCertificates(query) Promise
        +getPublicCertificate(id) Promise
        +listRecentCertificates(limit) Promise
        +verifyCertificateHash(hash) Promise
        +getPublicFilters() Promise
    }

    class IssuerService {
        +prepareCertificate(input, issuer) Promise
        +confirmCertificate(input, issuer) Promise
        +listIssuerCertificates(issuer, query) Promise
    }

    class AdminService {
        +getStats() Promise
        +listIssuers(query) Promise
        +createIssuer(input) Promise
        +syncStatus() Promise
        +syncEvents(fromBlock, toBlock) Promise
    }

    class AuthService {
        +login(email, password) Promise
        +getUserById(id) Promise
        +verifyToken(token) AuthTokenPayload
    }

    class PinataService {
        +pinFileToIPFS(buffer, filename, mimeType) Promise
    }

    class SyncService {
        +backfillEvents(fromBlock, toBlock) Promise
        +start() Promise
        +stop() void
        +getStatus() Promise
    }

    class CertificatePdfService {
        +generate(input) Promise
    }

    class HttpError {
        +number status
        +string code
        +string message
        +unknown details
    }

    CertificateService <|-- IssuerService : inherits
    IssuerService <|-- AdminService : inherits

    IssuerService --> CertificatePdfService : uses
    IssuerService --> PinataService : uses
    AdminService --> SyncService : uses
    AuthService ..> HttpError : throws
```

> Ghi chú: `AdminService` kế thừa toàn bộ method của `IssuerService` và `CertificateService`. Việc kế thừa **không cấp quyền on-chain**; route/middleware và contract vẫn quyết định quyền thực tế.

---

## 2. Domain models

```mermaid
classDiagram
    direction TB

    class User {
        +ObjectId _id
        +string email
        +string passwordHash
        +string displayName
        +string role
        +string walletAddress
        +boolean isActive
        +Date lastLoginAt
        +Date createdAt
        +Date updatedAt
    }

    class Issuer {
        +ObjectId _id
        +string name
        +string code
        +string walletAddress
        +ObjectId userId
        +string logoUrl
        +string website
        +boolean isActive
        +boolean onChainActive
        +Date chainAddedAt
    }

    class Certificate {
        +ObjectId _id
        +string certificateId
        +string certificateIdHash
        +string certificateType
        +object details
        +string templateId
        +string templateVersion
        +string fileHash
        +string ipfsCid
        +string artifactType
        +string mimeType
        +string filename
        +number sizeBytes
        +ObjectId issuerId
        +string issuerWallet
        +string issuerName
        +string studentName
        +string studentCode
        +string major
        +number graduationYear
        +number gpa
        +string classification
        +Date issuedAt
        +string txHash
        +number blockNumber
        +number logIndex
        +string status
        +Date revokedAt
        +string revokeTxHash
    }

    class ChainEvent {
        +string txHash
        +number logIndex
        +number blockNumber
        +string eventType
        +object payload
        +string contractAddress
        +Date processedAt
    }

    class SyncState {
        +string key
        +number chainId
        +string contractAddress
        +number lastSyncedBlock
    }

    User "1" --> "0..1" Issuer : userId
    Issuer "1" --> "*" Certificate : issuerId
    Certificate "1" ..> "*" ChainEvent : audit by txHash/logIndex
```

### Ràng buộc chính

| Model | Unique |
|---|---|
| `User` | `email`, `walletAddress` (sparse) |
| `Issuer` | `code`, `walletAddress`, `userId` (sparse) |
| `Certificate` | `certificateId`, `certificateIdHash`, `fileHash`, `txHash` |
| `ChainEvent` | `{ txHash, logIndex }` |
| `SyncState` | `key` |

---

## 3. Kiến trúc phân lớp

```mermaid
flowchart LR
    C[Client / Next.js] --> R[Express Routes]
    R --> MW[Middleware<br/>auth, role, issuer]
    MW --> CT[Controllers]
    CT --> SV[Service classes]
    SV --> MD[Mongoose models]
    SV --> CH[ChainService / RPC]
    SV --> PI[PinataService]
    SV --> PD[CertificatePdfService]
    MD --> DB[(MongoDB Atlas)]
    CH --> SC[CertificateRegistry]
    PI --> IPFS[(IPFS / Pinata)]
```

Controller vẫn là function module, không phải class. Class diagram tập trung vào **service layer** — nơi chứa nghiệp vụ.

---

## 4. Quan hệ kế thừa

```mermaid
flowchart TB
    CS[CertificateService<br/>public + admin cert methods]
    IS[IssuerService<br/>issuer cert methods]
    AS[AdminService<br/>dashboard + issuer registry + sync]

    CS --> IS
    IS --> AS

    CS --> M1[search / detail / revoke / filters]
    IS --> M2[prepare / confirm / list own]
    AS --> M3[stats / list issuers / create issuer / sync]
```

`AdminService` có thể gọi:

- `prepareCertificate()`
- `confirmCertificate()`
- `listIssuerCertificates()`
- `revokeCertificate()`
- `getIssuerCertificate()`

nhưng route admin không expose `POST /api/certificates`; quyền vẫn bị giới hạn bởi middleware và contract.

---

## 5. Trạng thái chứng chỉ

```mermaid
stateDiagram-v2
    [*] --> active: CertificateIssued
    active --> revoked: CertificateRevoked
    revoked --> [*]
```

- `status` trong DB là cache.
- Trang public đọc lại `isRevoked` từ chain.
- Event được đồng bộ bởi listener/backfill.
