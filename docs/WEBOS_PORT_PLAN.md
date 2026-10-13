# LG webOS port plan

## Goal

Ship a sideloadable LG webOS TV version of this app while preserving its current
remote-first UI, Persian RTL experience, QR login, browsing, playback, subtitles,
progress reporting, and optional TMDB enrichment. The initial support baseline is
**webOS TV 5.0+**. Supporting webOS 4.x is a follow-up decision; webOS 3.x and
older are out of scope.

This is a port of the existing vanilla web app, not a rewrite or a framework
migration. The source under `tizen-app/` is the source of truth for API payload
normalization, stream selection, subtitle parsing, progress reporting, and the
remote-first UI. The webOS build will live in a sibling `webos-app/` directory
so the existing Tizen release path stays intact. Shared behavior must be copied
unchanged initially, then extracted into a shared source area only when that can
be done without changing its behavior.

## Scope and assumptions

### In scope

- Packaged webOS web app (`.ipk`) installed through LG Developer Mode.
- Real-TV validation of QR login, browsing, HLS playback, subtitles, resume,
  progress reporting, and remote navigation.
- Native HTML `<video>` playback on webOS, with hls.js only when its MSE path is
  proven to be the appropriate fallback.
- A production-ready packaging, debugging, and release checklist.

### Out of scope for the first release

- webOS 3.x and earlier devices.
- DRM implementation unless a real 30nama stream demonstrates that it is needed.
- Seller Lounge publication until 30nama authorization, legal ownership, and LG
  review requirements are resolved.
- A backend proxy, unless the direct CORS validation fails.

### Why webOS 5.0+

webOS 5.x uses Chromium 68; webOS 4.x uses Chromium 53 and webOS 3.x uses
Chromium 38. hls.js documents Chrome 47+ as its desktop baseline, so webOS 3.x
cannot be supported with the bundled hls.js approach. webOS supports HLS natively,
but its HLS feature set differs by platform version; webOS 5+ is the sensible
first compatibility floor for this media-heavy app.

Sources: [LG web-engine matrix](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine),
[LG streaming and DRM matrix](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm),
[hls.js compatibility](https://github.com/video-dev/hls.js#compatibility).

## Target architecture

```text
webos-app/
  appinfo.json                 webOS manifest and application metadata
  index.html                   existing app shell, without Tizen-only assets
  css/, fonts/, js/, icon*.png copied/adapted from tizen-app/
  js/platform/webos.js         small webOS adapter (keys, Back, exit, detection)
  js/player.js                 platform-neutral player UI + webOS video backend

30nama API / QR API / HLS / VTT / TMDB
  ^ direct HTTPS requests only if all origins pass device CORS tests
  ^ otherwise: owned HTTPS proxy with no secrets exposed to the client
```

The app must remain script-tag based and avoid dynamic imports/module scripts:
packaged webOS applications use the file scheme, where modules introduce avoidable
origin restrictions. This also matches the app's current architecture.

## Milestones

### M0 — Lock the product and device baseline

**Purpose:** make the target measurable before implementation.

1. Record the minimum release as webOS 5.0+ and select at least two physical TV
   targets: one webOS 5/6 model and one current model (webOS 22+).
2. Obtain access to a 30nama account authorized to play test content.
3. Use the existing Tizen API and player contract to select representative
   content: movie, multi-episode series, Persian/English subtitles, and
   multi-audio when supplied. Do not independently rediscover the API schema.
4. Reuse the Tizen stream/subtitle normalization. Record only the manifest facts
   needed for the DRM decision, then defer platform-specific playback behavior,
   packaged-origin CORS, and native audio-switching validation to the webOS
   milestones.
5. Decide the intended delivery route: Developer Mode sideloading only, or a
   future LG Seller Lounge submission.

**Exit criteria**

- Device model, webOS version, and firmware are recorded for every test TV.
- A test-content matrix exists and no credentials are committed to the repository.
- The planned compatibility statement is explicitly `webOS 5.0+`.

**Decision gate:** if content uses Widevine or PlayReady, add a DRM-design
workstream before proceeding. A normal AES-128/native HLS stream can continue to
M1.

### M1 — Establish the webOS app shell and developer workflow

**Purpose:** produce an installable empty app before changing application logic.

1. Create `webos-app/` from the portable `tizen-app/` assets while retaining the
   same API, stream-selection, subtitle, and UI code paths.
2. Add `appinfo.json` with a unique reverse-domain ID, version, vendor, `type:
   "web"`, `main: "index.html"`, title, icons, and `requiredACG: []`.
3. Add `disableBackHistoryAPI: true` because the app is a single-page application
   with its own route stack and must receive the Magic Remote Back event.
4. Remove Tizen-only packaging/runtime dependencies:
   - `config.xml` and Tizen privileges;
   - the `$WEBAPIS/webapis/webapis.js` script;
   - the AVPlay `<object>` and AVPlay-only CSS;
   - TizenBrew root `package.json` assumptions from the webOS build path.
5. Install the webOS TV SDK/CLI, configure a Developer Mode TV, package with
   `ares-package --no-minify webos-app`, install with `ares-install`, launch with
   `ares-launch`, and attach `ares-inspect`.
6. Add documented npm or shell commands for package, install, launch, inspect,
   and remove. Debug builds must use `--no-minify`; release candidates must also
   be tested after normal minification.

**Exit criteria**

- The app packages to an `.ipk`, installs, launches, and opens Web Inspector on a
  real target TV.
- The boot screen and bundled Vazirmatn fonts render without console errors.
- No `window.tizen`, `webapis`, `AVPlay`, or Tizen manifest dependency remains in
  the webOS package.

LG requires `requiredACG` for future Seller Lounge compliance even when no Luna
API is used. The documented CLI flow is `ares-package`, `ares-install`,
`ares-launch`, and `ares-inspect`.

Sources: [appinfo.json](https://webostv.developer.lge.com/develop/references/appinfo-json),
[ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide),
[CLI developer guide](https://webostv.developer.lge.com/develop/tools/cli-dev-guide).

### M2 — Adapt platform input, lifecycle, and exit behavior

**Purpose:** make all existing navigation semantics work with LG remotes.

1. Create `js/platform/webos.js` with capability detection and a narrow public
   interface for platform-specific actions.
2. Keep the existing browser-standard arrow (`37–40`), OK (`13`), and conventional
   media keys (`415`, `19`, `417`, `412`, `413`). Delete Tizen key registration;
   webOS does not use `tizen.tvinputdevice.registerKey`.
3. Replace Tizen Back (`10009`) with webOS Back (`461`) in the navigation layer.
   With `disableBackHistoryAPI: true`, route it to the existing `N.onBack` logic.
4. At the app root, preserve the existing custom exit confirmation. On confirmation,
   call `webOS.platformBack()` when available; provide a controlled browser-safe
   fallback for desktop development.
5. Test both 5-way and Magic Remote pointer interactions: focus must never be lost
   when the pointer appears, and click/scroll-wheel behavior must not bypass the
   remote focus state.
6. Test relaunch, loss of focus, Home, and return from system overlays. Pause or
   save playback state where appropriate.

**Exit criteria**

- All menu, sheet, player, search, and exit navigation paths work using a real
  Magic Remote.
- Back closes the player/sheets/routes in the same order as on Tizen.
- Back at the root invokes the intended LG exit/Home behavior without a stuck
  screen or accidental app termination.

Source: [LG Back-button guide](https://webostv.developer.lge.com/develop/guides/back-button)
and [Magic Remote guide](https://webostv.developer.lge.com/develop/guides/magic-remote).

### M3 — Prove networking, authentication, and CORS

**Purpose:** verify that the packaged app can reach all production services from
the actual webOS origin.

1. Add temporary, redacted diagnostic logging for request URL host, status, timing,
   redirects, media errors, and CORS failures. Never log tokens, QR payloads,
   session values, or stream URLs in release builds.
2. On a physical TV, test the existing shared API flow end-to-end. This confirms
   packaged-origin CORS and runtime compatibility; it does not re-validate the
   already-defined response schema or stream-selection rules.
3. Confirm that API and media servers allow the packaged-app origin and the custom
   request headers used in `js/api.js`. Test preflight as well as successful
   requests.
4. Verify session persistence over app relaunch using `localStorage`. Do not rely
   on cookies: packaged webOS apps use a file scheme and do not support them.
5. If any required endpoint fails CORS, decide between:
   - obtaining a correct CORS policy from the service owner; or
   - deploying an owned HTTPS proxy that validates users server-side, limits
     permitted upstreams, redacts logs, and never exposes privileged credentials.

**Exit criteria**

- A QR-authenticated user can browse and return after an app relaunch.
- All required API, subtitle, and media requests succeed on a real TV without the
  desktop `tools/devserver.js` proxy.
- Any proxy decision is documented with ownership, security review, and operating
  cost; it is not silently embedded in client code.

Source: [LG web-engine and packaged-cookie behavior](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine).

### M4 — Replace AVPlay with a webOS playback adapter

**Purpose:** make playback reliable before optimizing product details.

1. Split `js/player.js` into the existing platform-neutral player UI and a
   backend interface with `load`, `play`, `pause`, `seek`, `time`, `buffered`,
   `duration`, `audioTracks`, `setAudio`, and `stop`.
2. Remove `avBackend()` and the `hasAV()` choice. Add a `webosVideoBackend()` that
   owns the existing `<video>` element.
3. Implement a per-device playback choice:
   - test direct native HLS (`video.src = manifest`) first;
   - use hls.js only if `Hls.isSupported()` and it is demonstrated to work better
     for that device/stream;
   - otherwise show a useful, non-secret-bearing error with a retry path.
4. Use `addEventListener` for media events and reset the element correctly between
   episodes (`pause`, detach/destroy hls.js if used, remove source, `load`).
5. Validate start/resume seeking, pause/play, buffering, End/Up Next, intro/recap
   skips, 10-second heartbeat reporting, and error recovery.
6. Validate audio behavior. Native HLS may not expose the same track-selection API
   as AVPlay; retain the audio menu only where track enumeration/switching works,
   or show a clear unavailable state rather than a non-functional control.
7. Retain the app's own external VTT parser/overlay, then verify English and
   Persian rendering, RTL shaping, and timing. Check subtitle CORS separately.
8. Profile long-form 1080p playback, seeking, episode transitions, memory growth,
   and recovery from Wi-Fi interruption.

**Exit criteria**

- Each M0 title plays through on both test-TV generations for at least 15 minutes.
- Resume, seek, subtitles, pause/play, completion, and observer updates are
  verified in server-side state where available.
- Playback works without AVPlay and with no dependency on Tizen APIs.
- Known unsupported stream variants have an explicit product behavior and message.

**Decision gate:** if direct native HLS and hls.js both fail on a supported stream,
capture the manifest and media-error diagnostics, then determine whether the issue
is stream packaging, CORS, codec support, or DRM before changing UI code.

Sources: [LG HLS/DRM support](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm),
[LG HLS troubleshooting](https://webostv.developer.lge.com/faq/streaming-http-live-streaming-hls-troubleshooting),
[hls.js native fallback guidance](https://github.com/video-dev/hls.js#compatibility).

### M5 — Compatibility, UX, and performance hardening

**Purpose:** turn a successful spike into a reliable TV application.

1. Exercise the complete app flow in both Persian/RTL and English/LTR: login,
   Home, Browse, Details, Search keyboard, Settings, TMDB-on/off, player menus,
   and logout.
2. Test cold boot, relaunch, network loss/recovery, API failover, expired session,
   invalid/missing streams, unavailable subtitles, and remote key repeat.
3. Test at 1080p and at the resolution modes of the selected TVs; confirm title
   safe areas, font readability, focus contrast, and no layout clipping.
4. Check memory and responsiveness after sustained browsing and multiple episode
   transitions. Ensure player/event timers, HLS instances, object URLs, and DOM
   screens are always cleaned up.
5. Test the package after default CLI minification. Fix minification-sensitive
   global names or configure a safe build path rather than shipping only an
   unminified debug package.
6. Add a manual test matrix to this document or a linked test-results document,
   recording model, webOS version, firmware, result, and known limitation.

**Exit criteria**

- No P0/P1 defects in the test matrix for the supported device set.
- No regression in RTL focus direction, subtitle presentation, or player cleanup.
- Release package and debug package both pass smoke tests on real TVs.

### M6 — Prepare the release route

**Purpose:** make sideloading repeatable and establish a safe path to public
distribution if authorized.

1. Write a `README` section for LG Developer Mode installation, device setup,
   packaging, launch, debugging, supported versions, and known limitations.
2. Automate reproducible `.ipk` production in CI without committing signing keys,
   user sessions, API tokens, or production media URLs.
3. If distribution remains private, document supported installation steps and
   Developer Mode renewal/expiry expectations.
4. Before Seller Lounge submission, obtain authorization to use 30nama content,
   branding, and APIs; complete LG's required UX scenario and self-checklist; add
   privacy/support details; and submit only a tested release candidate.
5. Review all hard-coded API keys and TMDB configuration. Move any credential that
   is not intentionally public behind a managed service.

**Exit criteria**

- A new developer can package and install the app using the documented workflow.
- Release artifacts can be traced to a commit and reproduced.
- Seller Lounge work starts only after the authorization and compliance gate is
  explicitly approved.

Source: [LG app approval process](https://webostv.developer.lge.com/distribute/app-approval-process).

## Work-item map

| Existing location | webOS action |
| --- | --- |
| `tizen-app/config.xml` | Replace with `webos-app/appinfo.json`; do not translate Tizen privileges. |
| `tizen-app/index.html` | Remove AVPlay object and `$WEBAPIS` script; retain the `<video>` player shell. |
| `tizen-app/js/nav.js` | Remove `tizen.tvinputdevice.registerKey`; add Back `461` through the platform adapter. |
| `tizen-app/js/app.js` | Replace `tizen.application...exit()` with webOS root-exit behavior. |
| `tizen-app/js/player.js` | Remove AVPlay backend; add tested native-HLS/hls.js webOS video backend. |
| `tizen-app/js/api.js`, `tmdb.js` | Keep request behavior initially; prove CORS/auth on a packaged TV app. |
| `tizen-app/css/app.css` | Delete `.av`/`.avh` rules only after player migration; retain the 1080p layout. |
| `build.sh`, `install-wizard.sh` | Keep for Tizen; add separate webOS commands/scripts. |

## Risks and mitigations

| Risk | Impact | Mitigation / owner decision |
| --- | --- | --- |
| API, VTT, manifest, or segment CORS fails | App cannot authenticate or play | M3 on-device test; obtain service CORS change or explicitly fund an owned proxy. |
| Stream needs DRM | Playback adapter is insufficient | Detect in M0; design LG DRM/EME integration with the content owner. |
| Native HLS does not expose audio switching | Reduced player parity | Validate M4; hide unavailable control or use a tested MSE route. |
| Old webOS device incompatibility | Fragmented user experience | Release webOS 5+ first; expand only from real-device evidence. |
| Packaged file-scheme constraints | Runtime-loading/auth surprises | Avoid modules/dynamic imports; use local assets and `localStorage`, not cookies. |
| Unauthorized public distribution | Store rejection or legal risk | Keep private until written authorization and seller compliance are in place. |

## Definition of done

The port is done when a reproducible `.ipk` can be installed on the defined webOS
5+ device set; a subscribed user can complete QR login, browse content, play the
test matrix with working resume/subtitles/remote controls, and recover from normal
network and session errors; all platform-specific code is isolated; and the
documented release route matches the project's authorization status.
