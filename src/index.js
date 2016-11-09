const bluebird = require("bluebird");
const dedent = require("dedent");
const GitHub = require("github-api");
const redis = require("redis");
const email = require("./email");
require("source-map-support").install();

const developers = [
    "andymckay",
    "atsay",
    "brampitoyo",
    "bqbn",
    "davehunt",
    "designakt",
    "diox",
    "EnTeQuAk",
    "eviljeff",
    "greenkeeperio-bot",
    "groovecoder",
    "jasonthomas",
    "jvillalobos",
    "kmaglione",
    "krupa",
    "kumar303",
    "mstriemer",
    "muffinresearch",
    "Osmose",
    "pdehaan",
    "rpl",
    "tofumatt",
    "tspurway",
    "wagnerand",
    "wbamberg",
];

const repositories = [
    ["mozilla", "addons"],
    ["mozilla", "addons-contribution-notifier"],
    ["mozilla", "addons-frontend"],
    ["mozilla", "addons-linter"],
    ["mozilla", "addons-server"],
    ["mozilla", "amo-validator"],
    ["mozilla", "dispensary"],
    ["mozilla", "sign-addon"],
    ["mozilla", "web-ext"],
    ["mozilla-jetpack", "jetpack-id"],
    ["mozilla-jetpack", "jetpack-validation"],
    ["mozilla-jetpack", "jpm"],
    ["mozilla-jetpack", "jpm-core"],
    ["mozilla-jetpack", "jpm-mobile"],
    ["mozilla-jetpack", "node-fx-runner"],
];

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const gh = new GitHub();

async function checkRepo(username, repositoryname, lastCheck, recipients) {
    if (!lastCheck) {
        lastCheck = 0;
    }

    let repository = gh.getRepo(username, repositoryname);

    let pullRequests = await repository.listPullRequests({
        state: "closed",
        sort: "updated",
        direction: "desc"
    });

    await Promise.all(pullRequests.data.map(async pr => {
        if (!developers.includes(pr.user.login) && pr.merged_at) {
            if (new Date(pr.merged_at).getTime() > lastCheck) {
                console.log(`${username}/${repositoryname}: PR ${pr.number} by ${pr.user.login} was merged on ${pr.merged_at}.`);
                let date = new Date(pr.merged_at).toUTCString();
                email.send(recipients,
                    `[Add-ons] New Contribution by ${pr.user.login}`,
                    /* Do not remove the newlines */
                    dedent`Hello!

                    Let me tell you about a new code contribution to add-ons!

                    Pull request https://github.com/${username}/${repositoryname}/pull/${pr.number} by https://github.com/${pr.user.login} has been merged on ${date}.

                    This is an automated message. If something is wrong, please don't shoot the messenger! File an issue at https://github.com/mozilla/addons-contribution-notifier

                    -- The Add-ons Contribution Bot`
                );
            }
        }
    }));
    return new Date(pullRequests.headers.date).getTime();
}

async function main() {
    let client = redis.createClient({
        url: process.env.REDIS_URL
    });

    let lastCheck = await client.getAsync("lastCheck");
    if (!lastCheck) {
        lastCheck = "{}";
    }
    try {
        lastCheck = JSON.parse(lastCheck);
    } catch (err) {
        throw new Error("Can't parse lastCheck! Exiting.");
    }

    let recipients = await client.getAsync("recipients");
    if (!recipients) {
        throw new Error("No recipients! Exiting.");
    }
    try {
        recipients = JSON.parse(recipients);
    } catch (err) {
        throw new Error("Can't parse recipients! Exiting.");
    }

    await Promise.all(repositories.map(async repo => {
        let repoString = `${repo[0]}_${repo[1]}`;
        let lastCheckRepo = lastCheck[repoString];
        if (!lastCheckRepo) {
            lastCheckRepo = 0;
        }
        lastCheckRepo = await checkRepo(repo[0], repo[1], lastCheckRepo, recipients);
        lastCheck[repoString] = lastCheckRepo;
    }));
    await client.setAsync("lastCheck", JSON.stringify(lastCheck));
    client.quit();
}

main().then(null, err => {
    console.dir(err);
    process.exit(1);
});
