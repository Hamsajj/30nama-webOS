/* webOS-only runtime boundary. Shared app modules call this through N.platform. */
(function () {
  var platform = N.platform = N.platform || {};

  platform.name = 'webos';
  platform.isWebOS = function () {
    return !!window.PalmSystem || /web0s|webos/i.test(navigator.userAgent || '');
  };
  platform.registerKeys = function () {
    // WebOS standard remote keys are delivered to the document without registration.
  };
  platform.exit = function () {
    if (!platform.isWebOS()) { N.toast('Exit (not on webOS)'); return; }
    try { window.close(); } catch (e) { N.toast('Exit unavailable'); }
  };

  // Magic Remote Back. appinfo.json disables browser-style Back history for this SPA.
  N.keys.BACK = 461;
}());
