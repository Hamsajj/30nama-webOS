# webOS M0 baseline

**Status:** DRM data gate passed for the recorded movie; physical webOS playback
and packaged-origin networking evidence are still required.

This is a non-secret record. It intentionally contains no credentials, session
values, QR payloads, API keys, media/subtitle URLs, or request/response bodies.
It records what was observed during the repository-side M0 preparation and
separates that from the physical-TV validation required to close M0.

## Product and device baseline

| Field | Recorded value |
| --- | --- |
| Delivery route | Developer Mode only (private sideloading) |
| Architectural target | LG webOS TV 5.0+ |
| Verified-device support statement | M0 targets the single Developer Mode TV below. Until playback validation is complete, this does not establish webOS-wide compatibility. |
| Test date | 2026-10-13 (repository-side preparation) |
| TV model | LG OLED55C44LA |
| webOS version | webOS 25 |
| Firmware | 10.3.1-3006 |
| Display resolution | 3840 × 2160 (4K Ultra HD native panel resolution) |
| Network type | Wi-Fi |

Do not move M0 to complete until the remaining display/network fields and the
live authenticated evidence below are recorded.

## Desktop data-shape inspection

`tizen-app/tools/devserver.js` was started locally on 2026-10-13. Its local
proxy was used only to inspect a redacted, unauthenticated `home_stream`
response shape. The response returned HTTP 200 and a successful envelope with
the expected Home rows (hero, suggested, movies, series, and anime).

The server sends a Tizen-like User-Agent and rewrites/proxies requests. It is
therefore **data-shape tooling only**: this observation does not validate CORS,
authentication, redirects, or playback for a packaged webOS app.

## Content matrix

The following public Home candidates were observed on the test date. They are
provisional only; the required subscriber session was not available in this
environment, so none has been confirmed as a playable M0 case.

| Role | Candidate title / ID | Content type | Required live confirmation | Current status |
| --- | --- | --- | --- | --- |
| Movie | `Animals 2026` / `685883` | Movie | Stream manifests retrieved; Persian and English external subtitles still require inspection | Stream capability partially verified |
| Series | `Scrubs 2026` / `708843` | Series row candidate | At least two playable consecutive episodes; subtitle availability | Unverified |
| Multi-audio | `Animals 2026` / `685883` | Movie | Verify independent audio selection on webOS/hls.js; the manifest carries no language labels | 2-channel and 6-channel tracks observed; switchability unverified |

Before completing M0, an authorized account holder must replace provisional
candidates if necessary and record the selected title name/ID, type, expected
`fa`/`en` subtitles, episode count, and expected audio variants. Do not put
manifest or subtitle URLs in this file.

## API-flow inventory

The current client code establishes these API actions for the tested flow:

| Flow | Action(s) | Data-shape observation |
| --- | --- | --- |
| Endpoint discovery and reachability | discovery document; `test` | Discovery returns candidate hosts; `test` selects a working host/key pair. |
| QR sign-in | `qrlogin_code`, `qrlogin_login` | Code creation followed by polling; the client then fetches `user`. |
| Profile | `user` | Refreshes the user record after QR login and at boot. |
| Home | `home_stream` | Public Home returned a successful envelope in desktop inspection. |
| Details | `single` | Requests `post_id`. |
| Stream loading | `stream` | Requests `post_id` and may send `free_stream`; the expected result is an `hls` item list. |
| Progress observer | `observer` | Sends post/file identity, user identity, current time, duration, and a per-item value; values are intentionally not recorded here. |

## Stream-capability evidence

No authenticated API response or VTT request was captured in this environment.
The recorded HLS observations below came from supplied manifests; remaining
values are **unknown**, not negative findings.

| Content case | Manifest status/MIME | HLS version and `CODECS` | `EXT-X-KEY` / DRM indicator | `EXT-X-MEDIA` audio/subtitle groups | Byte ranges / discontinuities / redirects | CORS response headers | VTT status/type/cross-origin | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Movie `Animals 2026` / `685883` | Not recorded | HLS v3. Master lists 240p–1080p; the 1080p media playlist is VOD, uses MPEG-TS segments, target duration 6 s, and ends with `EXT-X-ENDLIST`. No `CODECS` attribute was present. | No `EXT-X-KEY`, `SAMPLE-AES`, or other DRM indicator in either captured playlist. No license/EME traffic was recorded. | Audio-only `EXT-X-MEDIA` groups for every rendition: 2-channel and 6-channel variants; no language attributes; no subtitle group | No `EXT-X-BYTERANGE` or `EXT-X-DISCONTINUITY` in either captured playlist; redirects unknown | Unknown | No subtitle group in the master; external VTT still needs inspection | Ordinary unencrypted HLS observed; DRM gate passed for this title |
| Series candidate `708843` | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Pending authenticated capture |
| Multi-audio `Animals 2026` / `685883` | Not recorded | HLS v3; 240p–1080p variants | No playlist-level DRM indicator observed | 2-channel and 6-channel audio groups; no language attributes; player-level selection unverified | Redirects unknown | Unknown | No subtitle group in master; external VTT still needs inspection | Multiple audio variants observed; switchability unverified |

For each final case, use browser network inspection while logged in and record
only redacted facts: status, MIME, HLS version, codecs, key method/DRM signal,
media groups, byte-range/discontinuity/redirect presence, CORS header names and
values, and VTT status/MIME/cross-origin status. Clear exported captures after
recording the facts.

## DRM gate

**Decision: passed for `Animals 2026` / `685883`.** The captured master and
1080p media playlists show ordinary, unencrypted HLS with no DRM indicator.
M1 may begin using the shared Tizen contract. This is not yet a claim that every
title will play on webOS; native playback, packaged-origin CORS, and player-level
audio switching remain webOS-specific validation work.

Use this decision rule once a final manifest is captured:

- Continue to M1 only for ordinary HLS or AES-128 HLS with no DRM indicator.
- Add a DRM design gate for Widevine, PlayReady, FairPlay, `SAMPLE-AES`, EME
  license traffic, or another protected-media indicator.
- If no title exposes both Persian and English subtitles, retain port work but
  mark subtitle parity unverified and block release validation rather than M1.

## Required close-out on the single TV

1. Record the exact TV fields above and confirm Developer Mode installation.
2. QR-login with the authorized account; confirm browsing only, then revoke or
   log out locally after the session.
3. Validate the final movie and two consecutive series episodes using the shared
   client flow, including one subtitle request for every available language.
4. Capture only WebOS-specific redacted facts: packaged-origin CORS, media errors,
   native playback behavior, and audio-track switching.
5. Update the capability rows with physical-TV results; do not duplicate the
   already-recorded stream contract.

No session or exported network capture is stored in this repository.
