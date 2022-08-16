// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Thrush Docs',
  tagline: 'Documenting the undocumentable',
  url: 'https://thrush.benhaim.net',
  baseUrl: '/td/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  plugins: [
    [

      'docusaurus-plugin-typedoc',

      // Plugin / TypeDoc options
      {
        entryPoints: ['../thrush-frontend/src/lib/thrush_engine/sequences/ThrushFunctionGeneratorInterfaces.ts'],
        tsconfig: 'api-gen-configs/code-synth-api-tsconfig.json',
        readme: 'api-gen-configs/code-synth-api-readme.md',
        sidebar: { 
          readmeLabel: 'Introduction',
        },
        disableSources: true,
        out: 'code-synth-api'
      },
    ],
  ],

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'eldanb', // Usually your GitHub org/user name.
  projectName: 'thrush', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Thrush Docs',
        logo: {
          alt: 'Thrush Logo',
          src: 'img/thrush_logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'guide/intro',
            position: 'left',
            label: 'User Guide',
          },
          {
            type: 'doc',
            docId: 'code-synth-api/index',
            position: 'left',
            label: 'CodeSynth API',
          },          
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Thrush',            
            items: [
              {
                label: 'thrush.benhaim.net',
                href: 'https://imonlydoingthis.benhaim.net',
              }
            ],
          },             
          {
            title: 'Additional Information',
            items: [
              {
                label: 'Blog',
                href: 'https://imonlydoingthis.benhaim.net',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/eldanb/thrush',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Eldan Ben-Haim. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
