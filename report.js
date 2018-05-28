const { URL } = require("url"); // Not needed in node10
const { promisify } = require("util");

const MongoClient = require("mongodb").MongoClient;
const pug = require("pug");
const redis = require("redis");

const email = require("./email");

const compileEmail = pug.compileFile("monthly_report.pug");

async function main() {
    const redisClient = redis.createClient({
        url: process.env.REDIS_URL
    });
    const redisGetAsync = promisify(redisClient.get).bind(redisClient);

    let recipients = await redisGetAsync("recipients");
    if (!recipients) {
        throw new Error("No recipients! Exiting.");
    }
    try {
        recipients = JSON.parse(recipients);
    } catch (err) {
        throw new Error("Can't parse recipients! Exiting.");
    }

    const mongoClient = await MongoClient.connect(process.env.MONGODB_URI);
    const mongoDb = mongoClient.db(new URL(process.env.MONGODB_URI).pathname.slice(1));
    const mongoCollection = mongoDb.collection("contributions");

    const current = new Date();
    const first = new Date(current.getUTCFullYear(), current.getUTCMonth() - 1, 1);
    const last = new Date(current.getUTCFullYear(), current.getUTCMonth(), 1);
    const reportMonth = first.toLocaleString("en-US", { month: "long", year: "numeric" });

    const result = mongoCollection.aggregate([
        { $match: { "merged_at":   {"$gte": first, "$lt": last }}},
        { "$group": {_id: "$user.login", count: { $sum: 1 }}},
        { $sort: { "count": -1 }}
    ]);
    const contributionList = await result.toArray();

    const totalContributors = contributionList.length;
    const totalContributions = contributionList.reduce((acc, cur) => { return acc + cur.count; }, 0);

    const renderedEmail = compileEmail({
        reportMonth,
        totalContributors,
        totalContributions,
        contributionList,
    });
    await email.send(recipients,
        `[Add-ons] Monthly Code Contributions Report ${reportMonth}`,
        renderedEmail
    );

    mongoClient.close();
    redisClient.quit();
}

main().catch(async err => {
    console.dir(err);
    const errorRecipients = [{
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
