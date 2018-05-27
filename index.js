const {promisify} = require("util");
const GitHub = require("github-api");
const pug = require("pug");
const redis = require("redis");
const email = require("./email");

// We still need this for bots and yourself...
const developers = [
    "greenkeeper[bot]",
    "greenkeeperio-bot",
    "pyup-bot",
    "rebmullin",
    "snyk-bot",
    "wagnerand",
    "willdurand",
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
    ["mozilla", "webextension-polyfill"],
    ["mozilla-jetpack", "jetpack-id"],
    ["mozilla-jetpack", "jetpack-validation"],
    ["mozilla-jetpack", "jpm"],
    ["mozilla-jetpack", "jpm-core"],
    ["mozilla-jetpack", "jpm-mobile"],
    ["mozilla-jetpack", "node-fx-runner"],
];

const attributes = [
    "fantastic",
    "great",
    "marvelous",
    "phenomenal",
    "terrific",
    "wonderful"
];

const gh = new GitHub({token: process.env.GITHUB_TOKEN});
const compileEmail = pug.compileFile("email.pug");

async function checkRepo(orgname, repositoryname, lastCheck, recipients) {
    if (!lastCheck) {
        lastCheck = 0;
    }

    let repository = gh.getRepo(orgname, repositoryname);

    let pullRequests = await repository.listPullRequests({
        state: "closed",
        sort: "updated",
        direction: "desc"
    });

    await Promise.all(pullRequests.data.map(async pr => {
        if (!developers.includes(pr.user.login) && pr.merged_at) {
            let date = new Date(pr.merged_at);
            if (date.getTime() > lastCheck) {
                let contributor = pr.user.login;
                let isStaff = await gh.getOrganization("mozilla").isMember(contributor);
                if (!isStaff) {
                    console.log(`${orgname}/${repositoryname}: PR ${pr.number} by ${contributor} was merged on ${pr.merged_at}.`);
                    let renderedEmail = compileEmail({
                        attribute: attributes[Math.floor(Math.random() * attributes.length)],
                        organization: orgname,
                        repo_name: repositoryname,
                        pr_number: pr.number,
                        pr_committer: contributor,
                        date: date.toUTCString()
                    });
                    await email.send(recipients,
                        `[Add-ons] New Contribution by ${contributor}`,
                        renderedEmail
                    );
                }
            }
        }
    }));
    return new Date(pullRequests.headers.date).getTime();
}

async function main() {
    let client = redis.createClient({
        url: process.env.REDIS_URL
    });
    const dbGetAsync = promisify(client.get).bind(client);
    const dbSetAsync = promisify(client.set).bind(client);

    let lastCheck = await dbGetAsync("lastCheck");
    if (!lastCheck) {
        lastCheck = "{}";
    }
    try {
        lastCheck = JSON.parse(lastCheck);
    } catch (err) {
        throw new Error("Can't parse lastCheck! Exiting.");
    }

    let recipients = await dbGetAsync("recipients");
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
    await dbSetAsync("lastCheck", JSON.stringify(lastCheck));
    client.quit();
}

main().catch(async err => {
    console.dir(err);
    let errorRecipients = [{
        email: "awagner@mozilla.com"
    }];
    try {
        await email.send(errorRecipients, "Add-ons Contribution Notifier Error", err.stack);
    } catch (error) {
        console.error(`!!! Cannot send error email: ${error}`);
    } finally {
        process.exit(1);
    }
});
