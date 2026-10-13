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

## Package with TMDB enrichment

To keep the TMDB API Read Access Token out of source control, provide it only when
building. This helper copies the app to a temporary directory, writes the token into
that copy, packages it, and then deletes the temporary directory:

```sh
TMDB_TOKEN='your-v4-read-access-token' ./tools/build-webos.sh
```

The resulting debug `.ipk` is written to `dist/webos/`; pass another directory as
the first argument to change it. The token is still present in the packaged client
app, so it must remain a read-only TMDB application token.

For a Simulator run, create an ignored local config file instead:

```sh
set -a; . ./.env; set +a
./tools/prepare-webos-tmdb.sh
```

Then launch `webos-app/` as usual. The package helper excludes this local file and
injects its own temporary copy.

## M1 scope

- Standard HTML5 video + the existing hls.js fallback replaces Tizen AVPlay.
- Magic Remote Back (key code 461) is handled by the existing SPA navigation;
  confirming Exit closes the webOS app.
- The app targets webOS TV's 1920×1080 web-app graphics resolution.

Playback, CORS, subtitles, audio switching, and physical-TV remote validation are
intentionally deferred to later milestones.
