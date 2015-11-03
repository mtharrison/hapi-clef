'use strict';

const HapiClef = require('..');
const Hapi = require('hapi');
const Path = require('path');

const server = new Hapi.Server();
server.connection({ port: 4000 });

server.register([require('vision'), HapiClef], (err) => {

    if (err) {
        throw err;
    }

    server.views({
        engines: {
            hbs: require('handlebars')
        },
        path: Path.join(__dirname, 'templates')
    });

    server.auth.strategy('clef', 'clef', {
        appID: 'YOUR APP ID',
        appSecret: 'YOUR APP SECRET',
        cookieName: 'hapi-clef',
        cookieOptions: {
            isSecure: false,
            path: '/',
            encoding: 'iron',
            password: 'CHANGE THIS'
        }
    });

    server.route([{
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            const state = HapiClef.getStateParameter();
            reply.view('index', { state: state }).state('hapi-clef', state);
        }
    }, {
        method: 'GET',
        config: {
            auth: 'clef'
        },
        path: '/login',
        handler: function (request, reply) {

            console.log(request.auth.credentials);

            // Do your login stuff

            reply('ok');
        }
    }, {
        method: 'POST',
        config: {
            auth: {
                strategies: ['clef'],
                payload: true
            }
        },
        path: '/logout',
        handler: function (request, reply) {

            console.log(request.auth.credentials);

            // Do your logout stuff

            reply('ok');
        }
    }]);

    server.start(() => {

        console.log('Started server');
    });
});
