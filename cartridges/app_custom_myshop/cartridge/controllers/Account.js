'use strict';
var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var account = module.superModule;
server.extend(account);

// https://dev11-asia-samsonite.demandware.net/on/demandware.store/Sites-RefArchGlobal-Site/en_GB/Login-Show
// https://demo-asia-samsonite.demandware.net/on/demandware.store/Sites-RefArch-Site/en_US/Login-Show

server.replace(
    'SubmitRegistration',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Resource = require('dw/web/Resource');
        var formErrors = require('*/cartridge/scripts/formErrors');

        var registrationForm = server.forms.getForm('profile');
        // validate unqiue email
        var existProfile = CustomerMgr.queryProfile('email LIKE {0}', registrationForm.customer.email.value);
        if (existProfile) {
            registrationForm.customer.email.valid = false;
            registrationForm.customer.email.error =
                Resource.msg('error.message.exist.email', 'forms', null);
            registrationForm.valid = false;
        }

        // validate confirm password
        if (registrationForm.login.password.value
            !== registrationForm.login.passwordconfirm.value
        ) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error =
                Resource.msg('error.message.mismatch.password', 'forms', null);
            registrationForm.valid = false;
        }

        // validate valid password
        if (!CustomerMgr.isAcceptablePassword(registrationForm.login.password.value)) {
            registrationForm.login.password.valid = false;
            registrationForm.login.passwordconfirm.valid = false;
            registrationForm.login.passwordconfirm.error =
                Resource.msg('error.message.password.constraints.not.matched', 'forms', null);
            registrationForm.valid = false;
        }

        var registrationFormObj = {
            firstName: registrationForm.customer.firstname.value,
            lastName: registrationForm.customer.lastname.value,
            username: registrationForm.customer.username.value,
            phone: registrationForm.customer.phone.value,
            email: registrationForm.customer.email.value,
            gender: registrationForm.customer.gender.value,
            password: registrationForm.login.password.value,
            passwordConfirm: registrationForm.login.passwordconfirm.value,
            validForm: registrationForm.valid,
            form: registrationForm
        };

        if (registrationForm.valid) {
            res.setViewData(registrationFormObj);

            this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
                var Transaction = require('dw/system/Transaction');
                var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
                var authenticatedCustomer;
                var serverError;
                var registrationForm = res.getViewData(); // eslint-disable-line

                if (registrationForm.validForm) {
                    var login = registrationForm.username;
                    var password = registrationForm.password;

                    // attempt to create a new user and log that user in.
                    try {
                        Transaction.wrap(function () {
                            var error = {};
                            var newCustomer = CustomerMgr.createCustomer(login, password);

                            var authenticateCustomerResult = CustomerMgr.authenticateCustomer(login, password);
                            if (authenticateCustomerResult.status !== 'AUTH_OK') {
                                error = { authError: true, status: authenticateCustomerResult.status };
                                throw error;
                            }

                            authenticatedCustomer = CustomerMgr.loginCustomer(authenticateCustomerResult, false);

                            if (!authenticatedCustomer) {
                                error = { authError: true, status: authenticateCustomerResult.status };
                                throw error;
                            } else {
                                // assign values to the profile
                                var newCustomerProfile = newCustomer.getProfile();

                                newCustomerProfile.firstName = registrationForm.firstName;
                                newCustomerProfile.lastName = registrationForm.lastName;
                                newCustomerProfile.phoneMobile = registrationForm.phone;
                                newCustomerProfile.email = registrationForm.email;
                                newCustomerProfile.gender = registrationForm.gender;
                            }
                        });
                    } catch (e) {
                        if (e.authError) {
                            serverError = true;
                        } else {
                            registrationForm.validForm = false;
                            registrationForm.form.customer.username.valid = false;
                            registrationForm.form.customer.username.error =
                                Resource.msg('error.message.username.invalid', 'forms', null);
                        }
                    }
                }

                delete registrationForm.password;
                delete registrationForm.passwordConfirm;
                formErrors.removeFormValues(registrationForm.form);

                if (serverError) {
                    res.setStatusCode(500);
                    res.json({
                        success: false,
                        errorMessage: Resource.msg('error.message.unable.to.create.account', 'login', null)
                    });

                    return;
                }

                if (registrationForm.validForm) {
                    // accountHelpers.sendCreateAccountEmail(authenticatedCustomer.profile);

                    res.setViewData({ authenticatedCustomer: authenticatedCustomer });
                    res.json({
                        success: true,
                        redirectUrl: accountHelpers.getLoginRedirectURL(req.querystring.rurl, req.session.privacyCache, true)
                    });

                    req.session.privacyCache.set('args', null);
                } else {
                    res.json({
                        fields: formErrors.getFormErrors(registrationForm)
                    });
                }
            });
        } else {
            res.json({
                fields: formErrors.getFormErrors(registrationForm)
            });
        }

        return next();
    }
);

server.replace(
    'Login',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Resource = require('dw/web/Resource');
        var Transaction = require('dw/system/Transaction');
        var accountHelpers = require('*/cartridge/scripts/helpers/accountHelpers');
        var username = req.form.loginUsername;
        var password = req.form.loginPassword;
        var rememberMe = req.form.loginRememberMe
            ? (!!req.form.loginRememberMe)
            : false;

        var customerLoginResult = Transaction.wrap(function () {
            var authenticateCustomerResult = CustomerMgr.authenticateCustomer(username, password);
            if (authenticateCustomerResult.status !== 'AUTH_OK') {
                var errorCodes = {
                    ERROR_CUSTOMER_DISABLED: 'error.message.account.disabled',
                    ERROR_CUSTOMER_LOCKED: 'error.message.account.locked',
                    ERROR_CUSTOMER_NOT_FOUND: 'error.message.login.form',
                    ERROR_PASSWORD_EXPIRED: 'error.message.password.expired',
                    ERROR_PASSWORD_MISMATCH: 'error.message.password.mismatch',
                    ERROR_UNKNOWN: 'error.message.error.unknown',
                    default: 'error.message.login.form'
                };
                var errorMessageKey = errorCodes[authenticateCustomerResult.status] || errorCodes.default;
                var errorMessage = Resource.msg(errorMessageKey, 'login', null);
                return {
                    error: true,
                    errorMessage: errorMessage,
                    status: authenticateCustomerResult.status,
                    authenticatedCustomer: null
                };
            }
            return {
                error: false,
                errorMessage: null,
                status: authenticateCustomerResult.status,
                authenticatedCustomer: CustomerMgr.loginCustomer(authenticateCustomerResult, rememberMe)
            };
        });

        if (customerLoginResult.authenticatedCustomer) {
            res.setViewData({ authenticatedCustomer: customerLoginResult.authenticatedCustomer });
            res.json({
                success: true,
                redirectUrl: accountHelpers.getLoginRedirectURL(req.querystring.rurl, req.session.privacyCache, false)
            });
            req.session.privacyCache.set('args', null);
        } else {
            res.json({ error: [Resource.msg('error.message.login.form', 'login', null)] });
        }
        return next();
    }
);

module.exports = server.exports();

