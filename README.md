# hapi-clef [![Build Status](https://travis-ci.org/mtharrison/hapi-clef.svg)](https://travis-ci.org/mtharrison/hapi-clef)
## Magical Two-Factor Auth with Clef and hapijs

This is a plugin that you can use to add [Clef](https://getclef.com/) login to your hapi apps.

Check out the example under `examples` for a full working example (Clef credentials required). 

### Getting started

1. Sign up with Clef
2. Create a new application
3. Grab your api credentials
4. Download the Clef app
5. Checkout the example under `example/`, read the docs and then integrate with your own apps!

### Installation

    npm install --save hapi-clef

### Usage

The user authentication happens entirely with Clef. There's no need for a separate login stage on your site, which makes integration really siple.

To get started you just need to define a new authentication strategy:

```javascript
server.auth.strategy('clef', 'clef', {
    appID: 'YOUR APP ID',
    appSecret: 'YOUR APP SECRET',
    cookieName: 'hapi-clef',
    cookieOptions: {
        isSecure: false, // Terrible idea but needed if not using TLS (you should be!)
        path: '/',
        encoding: 'iron',
        password: 'CHANGE THIS'
    }
});
```

You need a page to embed the clef button on, let's make a route for that:

```javascript
server.route([{
    method: 'GET',
    path: '/',
    handler: function (request, reply) {

        const state = HapiClef.getStateParameter();
        reply.view('index', { state: state }).state('hapi-clef', state);
    }
});
```

The `HapiClef.getStateParameter()` function returns a random string which you need to embed in the Clef button. This is a CSRF token used later to confirm that the request really came from the user and not someone else. You also need to set a cookie here containing the state parameter. The name of the cookie should be the same as the `cookieName` specified when create the auth strategy.

If the state isn't both present in the button and in the cookie, the login request will fail.

Here's an example of the view template you could use:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Clef example</title>
</head>
<body>
    <script 
        type="text/javascript" 
        src="https://clef.io/v3/clef.js" 
        class="clef-button" 
        data-app-id="YOUR APP ID" 
        data-color="blue" 
        data-style="flat" 
        data-redirect-url="http://localhost:4000/login" 
        data-state="{{state}}" 
        data-type="login">
    </script>
</body>
</html>
```

Then define both the login and logout routes. These are routes that Clef will request with an OAuth token. You don't need to worry about OAuth though. That's all handled internally by the plugin.

The login and logout routes, if successful will have `request.auth.credentials` set. Exactly what is exposed depends on your application's setup in Clef. A thorough reading of their [developer docs](http://docs.getclef.com/) is recommended.

```javascript
server.route([{
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
```

Within these handler's you're expected to implement your own login behaviour. You'll probably create a new account, or retrieve one from the database. Or you might prompt the user for more information relevant to your app. You'll probably go ahead and create a session for the user using hapi-auth-cookie too.

### Logout Gotchas

Your logout route will be called by Clef, not by the user themselves, so it's not possible to clear their cookie here to log them out, as you would do in a more traditional session-based app. You're expected to store logout timestamps in the database and check that requests elsewhere aren't coming from a user that should be logged out. There's more info on this in the [Clef docs](http://docs.getclef.com/docs/database-logout).
