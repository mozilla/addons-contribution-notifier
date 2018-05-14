/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function send(recipients, subject, body) {
    const message = {
        from: "Add-ons Contributions <awagner+addons-contributions@mozilla.com>",
        to: recipients,
        subject,
        html: body,
    };
    return sgMail.send(message);
}

module.exports.send = send;
