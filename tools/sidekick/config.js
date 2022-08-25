/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

function hasSchema(host) {
  if (window.location.hostname === host) {
    const schema = document.querySelector('script[type="application/ld+json"]');
    return schema !== null;
  }
  return false;
}

const sendToCaaS = async (_, sk) => {
  const SCRIPT_ID = 'send-caas-listener';
  const dispatchEvent = () => document.dispatchEvent(
    new CustomEvent('send-to-caas', {
      detail: {
        host: sk.config.host,
        project: sk.config.project,
        branch: sk.config.ref,
        repo: sk.config.repo,
        owner: sk.config.owner,
      },
    }),
  );

  if (!document.getElementById(SCRIPT_ID)) {
    const script = document.createElement('script');
    script.src = '/tools/send-to-caas/sendToCaasEventListener.js';
    script.id = SCRIPT_ID;
    script.onload = () => dispatchEvent();
    document.head.appendChild(script);
  } else {
    dispatchEvent();
  }
};

// This file contains the project-specific configuration for the sidekick.
(() => {
  window.hlx.initSidekick({
    hlx3: true,
    libraries: [
      {
        text: 'Blocks',
        paths: ['https://main--milo--adobecom.hlx.page/docs/library/blocks.json'],
      },
    ],
    plugins: [
      {
        id: 'rayyan',
        condition: (s) => s.isEditor() || s.isHelix(),
        button: {
          text: 'TestStatusCode',
          action: (_, s) => {
            let test;
            fetch(window.location.href).then(response => {
              if (response.status === 200) {
                alert("Status Code is correct");
              } else {
                alert("Invalid status code");
              }
            });
            if (
              (
                document.documentElement.textContent || document.documentElement.innerText

              ).indexOf('Lorem') > -1) {
              alert("Lorem Ipsum");
            } else {
              alert("No lorem Ipsum");
            }

          },
        },
      },
      {
        id: 'register-caas',
        condition: (s) => s.isHelix() && s.isContent() && !window.location.pathname.endsWith('.json'),
        button: {
          text: 'Send to CaaS',
          action: sendToCaaS,
        },
      },
      // TOOLS ---------------------------------------------------------------------
      {
        id: 'library',
        condition: (s) => s.isEditor(),
        button: {
          text: 'Library',
          action: (_, s) => {
            const { config } = s;
            // Change this for local development
            const domain = `https://${config.innerHost}`;
            const script = document.createElement('script');
            script.onload = () => {
              const skEvent = new CustomEvent(
                'hlx:library-loaded',
                { detail: { domain, libraries: config.libraries } },
              );
              document.dispatchEvent(skEvent);
            };
            script.src = `${domain}/libs/ui/library/library.js`;
            document.head.appendChild(script);
          },
        },
      },
      {
        id: 'tools',
        condition: (s) => s.isEditor(),
        button: {
          text: 'Tools',
          action: (_, s) => {
            const { config } = s;
            window.open(`https://${config.innerHost}/tools/`, 'milo-tools');
          },
        },
      },
      {
        id: 'translate',
        condition: (s) => s.isEditor() && s.location.href.includes('/:x'),
        button: {
          text: 'Translate',
          action: (_, sk) => {
            const { config } = sk;
            window.open(
              `${config.pluginHost ? config.pluginHost : `http://${config.innerHost}`
              }/tools/translation/index.html?sp=${encodeURIComponent(window.location.href)}&owner=${config.owner
              }&repo=${config.repo}&ref=${config.ref}`,
              'hlx-sidekick-spark-translation',
            );
          },
        },
      },
      {
        id: 'seo',
        condition: (s) => hasSchema(s.config.host),
        button: {
          text: 'Check Schema',
          action: () => {
            window.open(
              `https://search.google.com/test/rich-results?url=${encodeURIComponent(
                window.location.href,
              )}`,
              'check-schema',
            );
          },
        },
      },
    ],
  });
})();
