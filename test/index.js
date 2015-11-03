'use strict';

// Load modules

const Code = require('code');
const Hapi = require('hapi');
const HapiClef = require('../');
const Iron = require('iron');
const Lab = require('lab');

// Test shortcuts

const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const beforeEach = lab.beforeEach;


const internals = {
    clientError: null,
    password: 'Q3QJIcIIvKcMwG7c',
    mockClef: function () {}
};


internals.mockClef.initialize =  function () {

    return  {
        getLoginInformation: function (options, callback) {

            callback(internals.clientError, { id: '123456' });
        },
        getLogoutInformation: function (options, callback) {

            callback(internals.clientError, '123456');
        }
    };
};


internals.makeCookie = function (obj, callback) {

    Iron.seal(obj, internals.password, Iron.defaults, (err, sealed) => {

        callback(sealed);
    });
};


describe('hapi-clef', () => {

    let server;

    beforeEach((done) => {

        internals.clientError = null;

        server = new Hapi.Server();
        server.connection({ port: 4000 });
        server.register(require('vision'), (err) => {});
        server.register(HapiClef, (err) => {});

        server.auth.strategy('clef', 'clef', {
            appID: '4f4baa300eae6a7532cc60d06b49e0b9',
            appSecret: 'd0d0ba5ef23dc134305125627c45677c',
            cookieName: 'hapi-clef',
            cookieOptions: {
                isSecure: false,
                path: '/',
                encoding: 'iron',
                password: internals.password
            },
            client: internals.mockClef
        });

        server.route([{
            method: 'GET',
            config: {
                auth: 'clef'
            },
            path: '/login',
            handler: function (request, reply) {

                reply(request.auth.credentials);
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

                reply(request.auth.credentials);
            }
        }]);

        done();
    });

    it('fails when there\'s no state cookie or query param', (done) => {

        server.inject('/login', (res) => {

            expect(res.statusCode).to.equal(401);
            expect(res.result.message).to.deep.equal('State mismatch');
            done();
        });
    });

    it('fails when there\'s no state cookie but there is a query param', (done) => {

        server.inject('/login?state=abcdef', (res) => {

            expect(res.statusCode).to.equal(401);
            expect(res.result.message).to.deep.equal('State mismatch');
            done();
        });
    });

    it('fails when there\'s no state query param but there is a state cookie', (done) => {

        internals.makeCookie('abcdef', (cookie) => {

            server.inject({
                method: 'GET',
                url: '/login',
                headers: {
                    cookie: 'hapi-clef=' + cookie
                }
            }, (res) => {

                expect(res.statusCode).to.equal(401);
                expect(res.result.message).to.deep.equal('State mismatch');
                done();
            });
        });
    });

    it('fails when there\'s a state query and there is a state cookie but they don\'t match', (done) => {

        internals.makeCookie('abcdef', (cookie) => {

            server.inject({
                method: 'GET',
                url: '/login?state=fedcba',
                headers: {
                    cookie: 'hapi-clef=' + cookie
                }
            }, (res) => {

                expect(res.statusCode).to.equal(401);
                expect(res.result.message).to.deep.equal('State mismatch');
                done();
            });
        });
    });

    it('suceeds when state is a match', (done) => {

        internals.makeCookie('abcdef', (cookie) => {

            server.inject({
                method: 'GET',
                url: '/login?state=abcdef',
                headers: {
                    cookie: 'hapi-clef=' + cookie
                }
            }, (res) => {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.deep.equal({ id: '123456' });
                done();
            });
        });
    });

    it('fails login on a clef error during login', (done) => {

        internals.clientError = new Error();

        internals.makeCookie('abcdef', (cookie) => {

            server.inject({
                method: 'GET',
                url: '/login?state=abcdef',
                headers: {
                    cookie: 'hapi-clef=' + cookie
                }
            }, (res) => {

                expect(res.statusCode).to.equal(401);
                expect(res.result.message).to.equal('Clef error');
                done();
            });
        });
    });

    it('can logout', (done) => {

        server.inject({
            method: 'POST',
            url: '/logout',
            payload: JSON.stringify({ logout_token: 'abcdef' })
        }, (res) => {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.deep.equal({ id: '123456' });
            done();
        });
    });

    it('fails login on a clef error during logout', (done) => {

        internals.clientError = new Error();

        server.inject({
            method: 'POST',
            url: '/logout',
            payload: JSON.stringify({ logout_token: 'abcdef' })
        }, (res) => {

            expect(res.statusCode).to.equal(401);
            expect(res.result.message).to.equal('Clef error');
            done();
        });
    });

    it('gets a state parameter with default length of 24 bytes', (done) => {

        const state = HapiClef.getStateParameter();
        expect(Buffer.byteLength(state, 'base64')).to.equal(24);
        done();
    });

    it('gets a state parameter with a custom length', (done) => {

        const state = HapiClef.getStateParameter(128);
        expect(Buffer.byteLength(state, 'base64')).to.equal(128);
        done();
    });
});
