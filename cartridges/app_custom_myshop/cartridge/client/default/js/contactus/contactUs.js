'use strict';
var formValidation = require('base/components/formValidation');

/**
 * renderAlert bar
 * @param {string} type Type of alert
 * @param {string} message The message to call out
 * @returns {string} The HTML value
 */
function renderAlert(type, message) {
    return '<div class="alert alert-' + type + ' alert-dismissible fade show mt-3" role="alert">' +
                message +
                '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
                    '<span aria-hidden="true">&times;</span>' +
                '</button>' +
            '</div>';
}

/**
 * Process form contact us message when form is submitted
 */
function submitContactMessage() {
    $(document).on('submit', 'form.contact-us-form', function (e) {
        e.preventDefault();
        var form = $(this);
        var url = form.attr('action');
        var contactUsWrapper = $('.contact-us-wrapper');
        form.spinner().start();
        $.ajax({
            url: url,
            type: 'POST',
            dataType: 'json',
            data: form.serialize()
        }).done(function (data) {
            form.spinner().stop();
            if (!data.success) {
                formValidation(form, data);
                contactUsWrapper.append(renderAlert('danger', data.errorMessage));
            } else {
                contactUsWrapper.append(renderAlert('success', data.successMessage));
            }
        }).fail(function () {
            form.spinner().stop();
        });
        return false;
    });
}

module.exports = {
    submitContactMessage: submitContactMessage
};
