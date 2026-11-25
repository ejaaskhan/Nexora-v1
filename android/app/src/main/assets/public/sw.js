/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "5974f31b3095e04a9bd6c54aa38c2dc0"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1817f4ddfcd008d4c0da589924310423"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9c174e382d25887e941ce5765273ea8a"
  }, {
    "url": "index.html",
    "revision": "620bbbf801ff8a09478bfdb799199bc8"
  }, {
    "url": "icon.svg",
    "revision": "fa753b515110ea6cfd46655fd0a8e603"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "b307ac440090698aa76f2fb728eed5b7"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/web-DUAH2voL.js",
    "revision": null
  }, {
    "url": "assets/web-CrWN3v4z.js",
    "revision": null
  }, {
    "url": "assets/web-CUBgyk-Y.js",
    "revision": null
  }, {
    "url": "assets/web-C5ea07Ys.js",
    "revision": null
  }, {
    "url": "assets/web-C-Y3l_s_.js",
    "revision": null
  }, {
    "url": "assets/vendor-react-CCCRAr4U.js",
    "revision": null
  }, {
    "url": "assets/vendor-motion-CK_Ke6z2.js",
    "revision": null
  }, {
    "url": "assets/vendor-icons-DC1m9BcM.js",
    "revision": null
  }, {
    "url": "assets/vendor-firebase-BlWyh24-.js",
    "revision": null
  }, {
    "url": "assets/rolldown-runtime-BWaJ3C7D.js",
    "revision": null
  }, {
    "url": "assets/index-7_KvHkS2.js",
    "revision": null
  }, {
    "url": "assets/index-5_vEJFGm.css",
    "revision": null
  }, {
    "url": "assets/TimeBlockFormModal-CA9KTpl0.js",
    "revision": null
  }, {
    "url": "assets/TasksPage-0p-WSG9S.js",
    "revision": null
  }, {
    "url": "assets/SettingsPage-Dnuv5xrZ.js",
    "revision": null
  }, {
    "url": "assets/SegmentedControl-D31_s4wF.js",
    "revision": null
  }, {
    "url": "assets/ProgressRing-DNgGCDpo.js",
    "revision": null
  }, {
    "url": "assets/ProfileSetupPage-BMhDlPQw.js",
    "revision": null
  }, {
    "url": "assets/PageTransition-BrUEvrI2.js",
    "revision": null
  }, {
    "url": "assets/OnboardingPage-CtbRER8T.js",
    "revision": null
  }, {
    "url": "assets/NotesPage-BbFmnPq8.js",
    "revision": null
  }, {
    "url": "assets/HistoryPage-j9d1XtTY.js",
    "revision": null
  }, {
    "url": "assets/GoalsPage-C9j921mG.js",
    "revision": null
  }, {
    "url": "assets/GoalFormModal-BJFefhUY.js",
    "revision": null
  }, {
    "url": "assets/GlowButton-KdgmtGod.js",
    "revision": null
  }, {
    "url": "assets/FocusPage-Blh627ZN.js",
    "revision": null
  }, {
    "url": "assets/DrawerModal-DPXquxpx.js",
    "revision": null
  }, {
    "url": "assets/DataBackupsTab-9V_dNqf-.js",
    "revision": null
  }, {
    "url": "assets/DashboardPage-7GNtyy02.js",
    "revision": null
  }, {
    "url": "assets/ConfirmDialog-BQ1qGlUN.js",
    "revision": null
  }, {
    "url": "assets/CalendarPage-Gv3URTu6.js",
    "revision": null
  }, {
    "url": "assets/AuthPage-BoYKbYI1.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "b307ac440090698aa76f2fb728eed5b7"
  }, {
    "url": "icon.svg",
    "revision": "fa753b515110ea6cfd46655fd0a8e603"
  }, {
    "url": "pwa-192x192.png",
    "revision": "9c174e382d25887e941ce5765273ea8a"
  }, {
    "url": "pwa-512x512.png",
    "revision": "1817f4ddfcd008d4c0da589924310423"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "5974f31b3095e04a9bd6c54aa38c2dc0"
  }, {
    "url": "manifest.webmanifest",
    "revision": "458d0d64857abd6d0676249e55ffc28a"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
