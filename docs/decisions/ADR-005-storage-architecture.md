# ADR-005: Cloudinary Direct Signed Storage Architecture for KYC & Media

## Status
Accepted

## Context
The application collects two distinct types of image assets:
1. **Public/Semi-Public Assets**: Student profile photos, library logo, floor layout diagrams.
2. **Highly Confidential KYC Documents**: Government identity cards (Aadhaar cards, Voter IDs).

Routing large multi-megabyte image uploads through the Node.js API server wastes server bandwidth, blocks Node event loops, and inflates hosting costs. Storing raw binary files in PostgreSQL degrades database performance and complicates backup/restore procedures. Furthermore, publicly exposing Aadhaar documents violates data privacy regulations.

## Decision
1. **Cloudinary Direct Signed Uploads**:
   * The client requests an upload signature from the API server (`POST /api/v1/storage/sign-upload`).
   * The API verifies the user's tenant permissions and generates a time-stamped HMAC-SHA256 signature using the Cloudinary API secret.
   * The client uploads the binary image directly to Cloudinary over HTTPS.
   * The client sends only the resulting `public_id`, `secure_url`, and asset metadata back to the API server for storage in PostgreSQL.
2. **Access Control for Sensitive KYC (Aadhaar)**:
   * KYC documents are uploaded with access mode `type = 'authenticated'` (private).
   * They cannot be accessed via public CDN URLs.
   * When an authorized library owner or admin needs to view a student's Aadhaar card, the API issues a temporary, signed, time-limited URL (TTL: 60 seconds).
   * Service Worker caching rules explicitly prohibit caching KYC URLs.

## Consequences
### Positive:
* Near-zero upload bandwidth and CPU consumption on the Node.js API server.
* Automatic optimization: WebP/AVIF transcoding, responsive image sizing, and CDN delivery.
* High compliance and legal safety regarding Aadhaar and sensitive identification documents.

### Negative:
* Third-party dependency on Cloudinary service availability.
* Two-step creation flow on the client (sign -> upload to CDN -> submit form to API).
