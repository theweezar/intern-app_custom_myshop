'use strict';
var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

server.get('Landing', csrfProtection.generateToken, function (req, res, next) {
    var contactUsForm = server.forms.getForm('contactus');
    var URLUtils = require('dw/web/URLUtils');
    var Resource = require('dw/web/Resource');
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
        var Resource = require('dw/web/Resource');
        var contactObject = {
            firstName: contactUsForm.contact.firstname.value,
            lastName: contactUsForm.contact.lastname.value,
            email: contactUsForm.contact.email.value,
            message: contactUsForm.contact.message.value,
            validForm: contactUsForm.valid
        };
        if (contactUsForm.valid) {
            res.setViewData(contactObject);
            // eslint-disable-next-line no-shadow
            this.on('route:BeforeComplete', function (req, res) {
                var viewData = res.getViewData();
                var serverError = true;
                var CustomObjectMgr = require('dw/object/CustomObjectMgr');
                var Transaction = require('dw/system/Transaction');
                var hashHelpers = require('*/cartridge/scripts/hashHelpers');

                Transaction.wrap(function () {
                    var hashKey = hashHelpers.hashMD5(viewData.email + Date.now());
                    var contactMessage = CustomObjectMgr.createCustomObject('ContactMessage', hashKey);
                    contactMessage.custom.firstName = viewData.firstName;
                    contactMessage.custom.lastName = viewData.lastName;
                    contactMessage.custom.email = viewData.email;
                    contactMessage.custom.message = viewData.message;
                    serverError = false;
                });

                if (serverError) {
                    res.setStatusCode(500);
                    res.json({
                        success: false,
                        errorMessage: Resource.msg('error.message.unable.to.create.contact.message', 'footer', null)
                    });
                    return next();
                }

                res.json({
                    success: true,
                    successMessage: Resource.msg('success.message.create.contact.message', 'footer', null)
                });
                return next();
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(contactUsForm)
            });
        }
        return next();
    }
);

module.exports = server.exports();
