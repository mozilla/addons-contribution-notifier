/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
const { MongoDbFactory } = require("./db");
const { MonthlyEmail } = require("./emails/MonthlyEmail");
const { ErrorEmail } = require("./emails/ErrorEmail");

async function main() {
    const dbConnection = await MongoDbFactory.create();
    const { month, contributions } = await dbConnection.getMonthlyReportData();

    await new MonthlyEmail(month, contributions).send();

    await dbConnection.close();
}

main().catch(async err => {
    console.dir(err);
    try {
        await new ErrorEmail(err).send();
    } catch (error) {
        console.error(`!!! Cannot send error email: ${error}\n\n Original error: ${err}`);
    } finally {
        process.exit(1);
    }
});
