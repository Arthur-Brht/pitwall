# Security

The current 1.x release is maintained. Use a recent release and the locked dependencies from `npm ci`.

Pitwall serves built files on loopback only. It has no account system, remote write API or backend secrets. The production server rejects foreign hostnames, blocks framing and restricts scripts and provider connections with a content security policy. The optional worker caches the local interface, not cross-origin weather or map tiles.

Never put credentials in browser code or `VITE_` variables. Do not share device backups or history exports without reviewing their locations and session details. Provider responses and imported files are untrusted data.

For a non-sensitive bug, open a GitHub issue with reproduction steps and versions. For a vulnerability involving private data or an exploit, do not post the details publicly: use GitHub's private vulnerability reporting if the Security tab offers it. Otherwise open a minimal issue requesting a private reporting channel, with no exploit, credential or personal data attached.

CI runs a redacted Gitleaks scan of reachable history, dependency auditing and read-only build/browser checks. Scanner success does not prove the absence of every vulnerability. GitHub Actions dependencies are pinned to commit hashes.
