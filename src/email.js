/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const postmark = require("postmark");

const FROM = "Add-ons Contributions <awagner+addons-contributions@mozilla.com>";
var client = new postmark.Client(process.env.POSTMARK_API_TOKEN);

function send(recipients, subject, body) {
    let addresses = recipients.map(recipient => {
        if (recipient.email) {
            return `"${recipient.name || recipient.email}" <${recipient.email}>`;
        }
    }).filter(x => x);

    if (!addresses.length) {
        return;
    }

    client.sendEmail({
        From: FROM,
        To: addresses.join(", "),
        Subject: subject,
        TextBody: body
    });
}

module.exports.send = send;