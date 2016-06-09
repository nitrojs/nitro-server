#!/usr/bin/env node

require('../server').start({
  root: 'test',
  port: 8081,
  openInBrowser: true,
  livereload: true
});
