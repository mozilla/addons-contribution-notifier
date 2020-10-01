/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { MongoDbFactory } = require("./db");
const { GithubClient } = require("./github/client");
const { ContributionEmail } = require("./emails/ContributionEmail");
const { ErrorEmail } = require("./emails/ErrorEmail");

async function main() {
    const dbClient = await MongoDbFactory.create();
    const lastCheck = await dbClient.getLastCheck();

    const github = new GithubClient();

    const { data, errors, headers } = await github.getaddonsPullRequests();

    if (errors) {
        throw new Error(errors);
    } else {
        for (let entry of data.search.nodes) {
            const prTimeStamp = new Date(entry.mergedAt).getTime();
            const volunteer = entry.author && entry.author.login && !entry.author.organization;

            if ((prTimeStamp > lastCheck) && (volunteer)) {
                await dbClient.insert(entry);
                await new ContributionEmail(entry).send();
            }
        }
        const responseTimestamp = new Date(headers.get("date")).getTime();
        await dbClient.setLastCheck(responseTimestamp);
    }
    await dbClient.close();
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
