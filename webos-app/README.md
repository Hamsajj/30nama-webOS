# 30nama for webOS

This package is an M1 webOS shell derived from the Tizen client. Its catalogue,
authentication, stream selection, subtitles, and progress code are preserved;
only the platform boundary differs.

## Package for Developer Mode

Install the [webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation),
then run this from the repository root:

```sh
ares-package --no-minify webos-app
```

Install the generated `.ipk` on a configured TV device with `ares-install`, then
launch `com.30nama.app.webos` with `ares-launch`. The application ID is provisional
for Developer Mode and must be confirmed before any Seller Lounge submission.

## M1 scope

- Standard HTML5 video + the existing hls.js fallback replaces Tizen AVPlay.
- Magic Remote Back (key code 461) is handled by the existing SPA navigation;
  confirming Exit closes the webOS app.
- The app targets webOS TV's 1920×1080 web-app graphics resolution.

Playback, CORS, subtitles, audio switching, and physical-TV remote validation are
intentionally deferred to later milestones.
