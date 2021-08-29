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
                var CustomObjectMgr = require('dw/object/CustomObjectMgr');
                var MessageDigest = require('dw/crypto/MessageDigest');
                var messageDigest = new MessageDigest('MD5');
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(contactUsForm)
            });
        }
        next();
    }
);

module.exports = server.exports();
