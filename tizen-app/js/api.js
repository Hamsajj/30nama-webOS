/* API layer: endpoint discovery, RPC calls, session. */
(function () {
  var C = N.config;
  var api = N.api = { host: null, key: C.apiKeys[0], keyIndex: 0 };
  N.session = N.store.get('session', null); // {token, user}

  function timeout(p, ms, label) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('timeout ' + (label || ''))); }, ms);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function enc(params) {
    var out = [];
    for (var k in params) if (params.hasOwnProperty(k) && params[k] !== undefined && params[k] !== null)
      out.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
    return out.join('&');
  }
  api.raw = function (host, key, name, params, token) {
    var headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'c-api-key': key,
      'c-token': token || '',
      'c-version-number': C.version,
      'c-language': N.lang
    };
    return timeout(fetch(N.proxied(host + '/action/' + name), { method: 'POST', headers: headers, body: enc(params || {}) }), 20000, name)
      .then(function (r) { return r.text(); })
      .then(function (txt) { try { return JSON.parse(txt); } catch (e) { throw new Error('bad json from ' + name); } });
  };

  // Try a discovery URL (CORS may block it in a browser; fall back to hardcoded hosts).
  function discover() {
    var tries = C.discoveryUrls.map(function (u) {
      return timeout(fetch(N.proxied(u + '?t=' + Date.now())).then(function (r) { return r.json(); }), 6000, 'discovery')
        .then(function (list) { if (!list || !list.length) throw new Error('empty'); return list; });
    });
    // first success wins
    return new Promise(function (res) {
      var left = tries.length, done = false;
      tries.forEach(function (p) {
        p.then(function (l) { if (!done) { done = true; res(l); } }, function () { if (--left === 0 && !done) res(C.fallbackHosts); });
      });
    });
  }

  // Probe `test` on all hosts with each key; choose the first that answers successfully.
  api.init = function () {
    return discover().then(function (list) {
      var seen = {}, hosts = [];
      list.concat(C.fallbackHosts).forEach(function (h) { if (!seen[h.host]) { seen[h.host] = 1; hosts.push(h.host); } });
      var cached = N.store.get('host', null);
      if (cached && !seen[cached]) hosts.unshift(cached);
      function tryKey(ki) {
        if (ki >= C.apiKeys.length) return Promise.reject(new Error('no endpoint reachable'));
        var key = C.apiKeys[ki];
        return new Promise(function (res, rej) {
          var left = hosts.length, done = false;
          hosts.forEach(function (h) {
            timeout(api.raw(h, key, 'test', {}), 8000, 'test').then(function (j) {
              if (j && j.success && !done) { done = true; res({ host: h, key: key, ki: ki }); }
              else if (--left === 0 && !done) rej(new Error('rejected'));
            }, function () { if (--left === 0 && !done) rej(new Error('unreachable')); });
          });
        }).catch(function () { return tryKey(ki + 1); });
      }
      return tryKey(0);
    }).then(function (r) {
      api.host = r.host; api.key = r.key; api.keyIndex = r.ki; N.store.set('host', r.host);
      return r;
    });
  };

  // Generic action. Resolves with envelope; rejects on network errors.
  api.call = function (name, params) {
    var token = N.session ? N.session.token : '';
    return api.raw(api.host, api.key, name, params, token).then(function (j) {
      if (j && !j.success && /login required/i.test(j.msg || '') && N.session) {
        // session invalid/expired
        N.logout(true);
      }
      return j;
    });
  };
  // Resolves with result or rejects with Error(msg)
  api.get = function (name, params) {
    return api.call(name, params).then(function (j) {
      if (!j || !j.success) { var e = new Error((j && j.msg) || 'error'); e.msg = j && j.msg; throw e; }
      return j.result;
    });
  };

  N.isLoggedIn = function () { return !!(N.session && N.session.token); };
  N.setSession = function (user) {
    N.session = { token: user.user_session, user: user };
    N.store.set('session', N.session);
  };
  N.logout = function (silent) {
    var p = N.isLoggedIn() ? api.call('logout', {}).catch(function () {}) : Promise.resolve();
    N.session = null; N.store.del('session');
    if (!silent && N.onLogout) N.onLogout();
    return p;
  };

  // helpers over post objects
  N.img = function (p, size) {
    var po = p && p.image && p.image.poster;
    if (!po) return '';
    return (po.jpg && (po.jpg[size || 'medium'] || po.jpg.large)) || (po.webp && po.webp.medium) || '';
  };
  N.cover = function (p) { var c = p && p.image && p.image.cover; return c ? (c.jpg || c.webp || '') : ''; };
  N.title = function (p) {
    var t = p.title || {};
    return (N.lang === 'fa' && t.local) ? t.local : (t.english || t.local || '');
  };
  N.plot = function (p) { var t = p.plot || {}; return (N.lang === 'fa' && t.local) ? t.local : (t.english || t.local || ''); };
})();
