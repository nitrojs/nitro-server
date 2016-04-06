'use strict';

function extend () {
    var dest = [].shift.call(arguments),
      src = [].shift.call(arguments),
      key;

  while( src ) {
    for( key in src) {
      dest[key] = src[key];
    }
    src = [].shift.call(arguments);
  }

  return dest;
}

function noop () {}
function DefaultOptions () {}
DefaultOptions.prototype = {
  protocol: 'http',
  port: 8080,
  hostname: '0.0.0.0',
  root: null,
  keepalive: false,
  debug: false,
  livereload: false,
  open: false,
  dirAlias: {},
  onStart: noop,
  onStop: noop
};

function runServer(options){
  options = extend(new DefaultOptions(), options || {});

  var http = require('http'),
      url = require('url'),
      path = require('path'),
      fs = require('fs'),
      colors = require('colors'),
      mime = require('mime'),
      cwd = process.cwd();

  if( options.cwd ) {
    cwd = path.resolve(cwd,options.cwd);
  }

  options.port = options.port || 8080;

  if( options.log === undefined ) {
    options.log = true;
  }

  if( options.debug ) {
    console.log('options : '+JSON.stringify(options));
  }

  function clearSlash(path_str){ return path_str.replace(/^\/|\/$/,''); }

  var matchAlias = {};
  Object.keys(options.dirAlias).forEach(function(dir){
    matchAlias[dir] = new RegExp('^'+clearSlash(dir));
  });

  var server = http.createServer(function(request, response) {

      var uri = url.parse(request.url).pathname, uriClear = clearSlash(uri), uriLog = uri,
          basePath = cwd.replace(/\/$/,'')+( options.root ? ('/' + options.root) : '' ),
          filename = path.join(basePath, uri),
          contentType = "text/plain";

      if( options.addExtension && /[a-z]$/.test(filename) && !/[a-z]+\.[a-z]+$/.test(filename) ) {
        filename += '.' + options.addExtension;
      }

      if( options.headers ) {
        for( var header in options.headers ) {
          response.setHeader(header, options.headers[header]);
        }
      }

      Object.keys(options.dirAlias).forEach(function(dir){
        if( matchAlias[dir].test(uriClear) ) {
          var uriRelative = uriClear.replace(matchAlias[dir],'').replace(/^\//,'');

          filename = path.join( path.resolve(cwd,options.dirAlias[dir]), uriRelative );

          uriLog = ( '/' + dir ).blue + '/' + uriRelative;
        }
      });

      fs.exists(filename, function(exists) {
          if(!exists) {
              if( options.rewrite404 ) {
                filename = path.join( basePath, options.rewrite404 );
              } else {
                response.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8'});
                response.write('<div style=\"text-align: center;\"><div style=\"display: inline-block; min-width: 80%; border: 1px solid #999; padding: 0.5em; text-align: left;\"><div><span style=\"color: red;\">404</span> <span style=\"font-weight: bold;\">'+uri+'</span></div><div>Not Found</div></div></div>');
                response.end();
                if(options.log) {
                  console.log('[404] '.red + uriLog );
                }
                return;
              }
          }

          if(fs.statSync(filename).isDirectory()) {
            filename += ( ( /\/$/.test(filename) ? '' : '/' ) + 'index.html' );
          }

          if( /\w+\.\w+/.test(filename) ) {
            contentType = ( mime.lookup( filename ) || contentType ) + '; charset=UTF-8';
          }

          fs.readFile(filename, 'binary', function(err, file) {
              if(err) {
                  response.writeHead(500, { 'Content-Type': contentType });
                  response.write(err + '\n');
                  response.end();
                  if(options.log) {
                    console.log('[500] '.lightred + uriLog );
                  }
                  return;
              }

              response.writeHead(200, { 'Content-Type': contentType });
              response.write(file, 'binary');
              response.end();
              if(options.log) {
                console.log('[200] '.green + (' ' + uriLog ).white + ( '  (' + contentType + ')' ).yellow );
              }
          });
      });
  }).listen(parseInt(options.port, 10),options.hostname,function(){
      var url = ( 'http://'+( ( options.hostname === '0.0.0.0' ) ? 'localhost': options.hostname ) + ':' + options.port );
      console.log('\nStatic file server running at\n  => '.yellow + url.green + '/\nCTRL + C to shutdown\n'.yellow );
      if( options.onStart instanceof Function ) {
        options.onStart.call(server);
      }

      if( options.openInBrowser ) {
        require('open')(url, (typeof options.openInBrowser === 'string') ? options.openInBrowser : null );
      }
  });

  return server;
}

module.exports = {
  start: runServer
};