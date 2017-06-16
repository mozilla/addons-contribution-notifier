/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const sg = require("sendgrid")(process.env.SENDGRID_API_KEY);
const helper = require("sendgrid").mail;

function send(recipients, subject, body, callback) {

    const mail = new helper.Mail();
    const from = new helper.Email("awagner+addons-contributions@mozilla.com", "Add-ons Contributions");
    mail.setFrom(from);
    mail.setSubject(subject);

    const personalization = new helper.Personalization();
    for (let recipient of recipients) {
        const to = new helper.Email(recipient.email, recipient.name);
        personalization.addTo(to);
    }
    mail.addPersonalization(personalization);

    const content = new helper.Content("text/html", body);
    mail.addContent(content);

    const request = sg.emptyRequest({
        method: "POST",
        path: "/v3/mail/send",
        body: mail.toJSON(),
    });

    sg.API(request, function(error, response) {
        if (callback) {
            callback(error, response);
        }
    });
}

module.exports.send = send;