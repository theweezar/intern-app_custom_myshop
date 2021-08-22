'use strict';
var base = module.superModule;

/**
 * Account class that represents the current customer's profile dashboard
 * @param {dw.customer.Customer} currentCustomer - Current customer
 * @param {Object} addressModel - The current customer's preferred address
 * @param {Object} orderModel - The current customer's order history
 * @constructor
 */
function account(currentCustomer, addressModel, orderModel) {
    base.call(this, currentCustomer, addressModel, orderModel);
    Object.defineProperty(this.profile, 'phone', {
        value: currentCustomer.raw.profile.phoneMobile
    });
}

module.exports = account;
