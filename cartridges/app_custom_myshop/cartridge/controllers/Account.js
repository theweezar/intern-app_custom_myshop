'use strict';
var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var account = module.superModule;
server.extend(account);
// https://dev11-asia-samsonite.demandware.net/on/demandware.store/Sites-RefArchGlobal-Site/en_GB/Login-Show
server.get('Register', server.middleware.https, csrfProtection.generateToken, function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var Resource = require('dw/web/Resource');
    var registrationForm = server.forms.getForm('profile');
    var submitRegistrationUrl = URLUtils.url('Account-SubmitRegistration', 'rurl', '1').relative().toString();
    var breadcrumbs = [
        {
            htmlValue: Resource.msg('global.home', 'common', null),
            url: URLUtils.home().toString()
        }
    ];
    registrationForm.clear();
    res.render('account/register', {
        submitRegistrationUrl: submitRegistrationUrl,
        registrationForm: registrationForm,
        breadcrumbs: breadcrumbs
    });
    next();
});

server.append('SubmitRegistration', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    next();
});

module.exports = server.exports();
