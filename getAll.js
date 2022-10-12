import fs from "fs";
import os from "os";
import sanitizer from "string-sanitizer";
import { TwitterApi } from "twitter-api-v2";
import {
  INTERVAL,
  BEARER_TOKEN,
  AMOUNT_TO_FETCH,
  KEYWORD,
  LANGUAGE,
} from "./constants.js";

// Start index at 0 => Used for BEARER TOKEN
let index = 0;

const delay = (minutes) => {
  return new Promise((resolve) => setTimeout(resolve, minutes * 60 * 1000));
};

const getLastTweetsIds = async () => {
  // Baca dari tweetsIDs
  // await fs.readFile("./tweetsIDs.json", "utf8", (err, data) => {
  //     tweetsIDs = JSON.parse(data);
  //     return tweetsIDs;
  // });
  let tweetsIDs;
  try {
    tweetsIDs = await fs.promises.readFile("./tweets/tweetsIDs.json", "utf8");
  } catch (errror) {
    tweetsIDs = [];
  }
  // tweetsIDs = [];
  // console.log("Ini tweetIds", tweetsIDs.length);
  if (tweetsIDs.length === 0) tweetsIDs = [];
  return tweetsIDs;
};

const getTweet = async () => {
  const twitterClient = new TwitterApi(BEARER_TOKEN[index]);

  // console.log(index);
  let tweets;
  try {
    tweets = await twitterClient.v2.search(`lang:${LANGUAGE} ${KEYWORD}`, {
      max_results: 100,
      "tweet.fields": "lang",
    });

    await tweets.fetchLast(AMOUNT_TO_FETCH);
  } catch (error) {
    if (error.rateLimitError && error.rateLimit) {
      console.log(
        `You just hit the rate limit! Limit for this endpoint is ${error.rateLimit.limit} requests!`
      );
      console.log(
        `Request counter will reset at timestamp ${error.rateLimit.reset}.`
      );
      index++;
      console.log(`Starting another request with the next Bearer Token`);
      getTweet();
    }
  }

  // If error change the BEARER_TOKEN, check the error code as well if you need to, since most of the time the error happen when the limit reached so I won't

  // let tweetsIds = [];
  let tweetsIds;
  try {
    tweetsIds = JSON.parse(await getLastTweetsIds());
  } catch (error) {
    tweetsIds = [];
  }
  // console.log("Test", tweetsIds);
  let tweetsJSON = [];
  for (const tweet of tweets) {
    if (tweet.lang == "in") {
      if (!tweetsIds.includes(tweet.id)) {
        tweetsIds.push(tweet.id);
        tweetsJSON.push(tweet);
      }
    }
  }

  // console.log(tweetsIds);

  fs.writeFile(
    "./tweets/tweetsIDs.json",
    JSON.stringify(tweetsIds, null, 2),
    function (err) {
      if (err) {
        console.log("Failed writing file");
      } else {
        console.log("Success writing file");
      }
    }
  );

  const currentDate = new Date();
  const currentDateString = currentDate.toISOString();
  fs.appendFile(
    "./tweets/tweets_" + currentDateString + ".json",
    JSON.stringify(tweetsJSON, null, 2),
    function (err) {
      if (err) {
        console.log("Failed writing file");
      } else {
        console.log("Success writing file");
      }
    }
  );

  return tweetsJSON;
  // console.log(tweetsJSON);
};

const decodeString = (str) => {
  return str.replace(/\\u[\dA-F]{4}/gi, (unicode) => {
    return String.fromCharCode(parseInt(unicode.replace(/\\u/g, ""), 16));
  });
};

const getCorpus = async () => {
  let linesFiltered = [];
  let lines = [];
  const tweets = await getTweet();
  for (const tweet of tweets) {
    let cleanedTweet = tweet.text.replace(/(?:https?|ftp):\/\/[\n\S]+/g, "");
    const splitByLine = cleanedTweet.split(/\r?\n/);
    for (const line of splitByLine) {
      if (sanitizer.sanitize.keepNumber(line).length > 0) {
        // remove line with only 1 word in it
        let regexp = /[a-zA-Z]+\s+[a-zA-Z]+/g;
        if (regexp.test(line)) {
          if (!linesFiltered.includes(line)) {
            // const decodedTweet = decodeString(JSON.stringify(line));
            // linesFiltered.push(JSON.parse(decodedTweet));
            const unicodeRemovedTweet = line
              .normalize("NFD")
              .replace(/([\u0300-\u036f]|[^0-9a-zA-Z \-"':])/g, "");
            // Menghapus #Kosong
            const splitBySentences = unicodeRemovedTweet.split(". ");
            for (const sentence of splitBySentences) {
              if (
                (sentence != "" ||
                  sentence != " " ||
                  sentence != "   " ||
                  sentence != /\r?\n/) &&
                regexp.test(sentence)
              ) {
                linesFiltered.push(sentence);
              }
            }
            // linesFiltered.push(unicodeRemovedTweet);
            lines.push(line);
          }
        }
      }
    }
  }
  // console.log(linesFiltered);
  let number = 1;
  for (const line of linesFiltered) {
    fs.appendFile("./corpus/corpus.txt", line + os.EOL, function (err) {
      if (err) {
        console.log("Failed to append data");
      } else {
        console.log("Added data ", number++, "to file");
      }
    });
  }

  let numbera = 1;
  for (const line of lines) {
    fs.appendFile("./corpus/corpusAsli.txt", line + os.EOL, function (err) {
      if (err) {
        console.log("Failed to append data");
      } else {
        console.log("Added data ", numbera++, "to file");
      }
    });
  }
  return 0;
};

// getCorpus();
// const sleep = (miliseconds) =>
//   new Promise((resolve) => setTimeout(resolve, miliseconds));

// const repeat = async (minute) => {
//   await getCorpus();
//   await sleep(minute * 60000);
//   await repeat();
// };
const startProgram = async () => {
  console.log("Starting Script");
  let currentTime = new Date();
  const nextRun = new Date();
  nextRun.setMinutes(currentTime.getMinutes() + INTERVAL);
  console.log("Current time(UTC): ", currentTime.toUTCString());
  await getCorpus();
  console.log("Script Finished");
  console.log("Next Run(UTC)", nextRun.toUTCString());
  await delay(1);
  startProgram();
};
startProgram();
// repeat(1);
