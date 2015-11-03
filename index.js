'use strict';

const Boom = require('boom');
const Crypto = require('crypto');
const Hoek = require('hoek');
const Joi = require('joi');
const Package = require('./package');


const internals = {
    strategySchema: Joi.object().required().keys({
        appID: Joi.string().required(),
        appSecret: Joi.string().required(),
        cookieName: Joi.string().default('hapi-clef'),
        cookieOptions: Joi.object().required(),
        client: Joi.func().default(require('clef'))
    })
};


internals.scheme = (server, options) => {

    const result = Joi.validate(options, internals.strategySchema);
    Hoek.assert(!result.error, result.error);
    const settings = result.value;

    server.state(settings.cookieName, settings.cookieOptions);

    const clef = settings.client.initialize({
        appID: settings.appID,
        appSecret: settings.appSecret
    });

    return {
        authenticate: function (request, reply) {

            // logging out

            if (request.method === 'post') {
                return reply.continue({ credentials: {} });
            }

            // logging in...

            if (!request.query.state ||
                !request.state[settings.cookieName] ||
                request.query.state !== request.state[settings.cookieName]) {
                return reply(Boom.unauthorized('State mismatch'));
            }

            clef.getLoginInformation({ code: request.query.code }, (err, user) => {

                if (err) {
                    request.log(['error'], err);
                    return reply(Boom.unauthorized('Clef error'));
                }

                reply.continue({ credentials: user });
            });
        },
        payload: function (request, reply) {

            clef.getLogoutInformation({ logoutToken: request.payload.logout_token }, (err, userId) => {

                if (err) {
                    request.log(['error'], err);
                    return reply(Boom.unauthorized('Clef error'));
                }

                request.auth.credentials = { id: userId };
                reply.continue();
            });
        }
    };
};


exports.register = function (server, options, next) {

    server.auth.scheme('clef', internals.scheme);
    next();
};


exports.getStateParameter = function (size) {

    return Crypto.randomBytes(size || 24).toString('base64');
};


exports.register.attributes = {
    name: Package.name,
    version: Package.version
};
