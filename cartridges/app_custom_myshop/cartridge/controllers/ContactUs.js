'use strict';
var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var HookMgr = require('dw/system/HookMgr');
var Resource = require('dw/web/Resource');
var URLUtils = require('dw/web/URLUtils');

server.get('Landing', csrfProtection.generateToken, function (req, res, next) {
    var contactUsForm = server.forms.getForm('contactus');
    contactUsForm.clear();
    var actionUrl = URLUtils.url('ContactUs-SubmitContact');
    var breadcrumbs = [
        {
            htmlValue: Resource.msg('global.home', 'common', null),
            url: URLUtils.home().toString()
        }
    ];
    res.render('contactus/landingPage', {
        contactUsForm: contactUsForm,
        breadcrumbs: breadcrumbs,
        actionUrl: actionUrl
    });
    next();
});

server.post('SubmitContact',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var contactUsForm = server.forms.getForm('contactus');
        var formErrors = require('*/cartridge/scripts/formErrors');
        var querystring = req.querystring;

        if (HookMgr.hasHook('google.verify.captcha')) {
            var captchaToken = querystring.captchaToken;
            var isValid = HookMgr.callHook('google.verify.captcha', 'verifyCaptcha', captchaToken);

            if (!isValid || !isValid.success) {
                res.json({
                    error: true,
                    errorMessage: Resource.msg('error.message.google.captcha.invalid', 'footer', null)
                });

                return next();
            }
        }

        var contactObject = {
            firstName: contactUsForm.contact.firstname.value,
            lastName: contactUsForm.contact.lastname.value,
            email: contactUsForm.contact.email.value,
            message: contactUsForm.contact.message.value,
            validForm: contactUsForm.valid
        };

        if (contactUsForm.valid) {
            // eslint-disable-next-line no-shadow
            var serverError = true;
            var CustomObjectMgr = require('dw/object/CustomObjectMgr');
            var Transaction = require('dw/system/Transaction');
            var hashHelpers = require('*/cartridge/scripts/hashHelpers');

            Transaction.wrap(function () {
                var hashKey = hashHelpers.hashMD5(contactObject.email + Date.now());
                var contactMessage = CustomObjectMgr.createCustomObject('ContactMessage', hashKey);
                contactMessage.custom.firstName = contactObject.firstName;
                contactMessage.custom.lastName = contactObject.lastName;
                contactMessage.custom.email = contactObject.email;
                contactMessage.custom.message = contactObject.message;
                serverError = false;
            });

            if (serverError) {
                res.setStatusCode(500);
                res.json({
                    success: false,
                    errorMessage: Resource.msg('error.message.unable.to.create.contact.message', 'footer', null)
                });
                next();
            }

            res.json({
                success: true,
                successMessage: Resource.msg('success.message.create.contact.message', 'footer', null)
            });
            return next();
        }

        res.json({
            fields: formErrors.getFormErrors(contactUsForm)
        });

        return next();
    }
);

module.exports = server.exports();
