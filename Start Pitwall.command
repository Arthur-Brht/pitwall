#!/bin/zsh
set -e
cd -- "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  print 'Pitwall needs Node.js 22.13 or newer. Install it from https://nodejs.org/en/download, then open this file again.'
  read '?Press Return to close.'
  exit 1
fi
node -e 'const [major,minor]=process.versions.node.split(".").map(Number);if(major<22||(major===22&&minor<13)){console.error("Please install Node.js 22.13 or newer.");process.exit(1)}'
if [[ ! -x node_modules/.bin/vite ]]; then
  print 'Preparing Pitwall. The first launch downloads dependencies.'
  npm ci
fi
npm start -- --open
