require("dotenv").config();

const axios = require("axios");
const Log = require("../logging-middleware/middleware/logger");

const NOTIFICATION_API =
  "http://4.224.186.213/evaluation-service/notifications";

const headers = {
  Authorization: `Bearer ${process.env.ACCESS_TOKEN}`
};

function getWeight(type) {
  switch (type) {
    case "Placement":
      return 3;
    case "Result":
      return 2;
    case "Event":
      return 1;
    default:
      return 0;
  }
}

function calculateScore(notification) {

  const weight =
    getWeight(notification.Type);

  const timestamp =
    new Date(notification.Timestamp);

  const recency =
    timestamp.getTime();

  return (
    weight * 10000000000000 +
    recency
  );
}

async function fetchNotifications() {

  await Log(
    "backend",
    "info",
    "service",
    "Fetching notifications"
  );

  const response =
    await axios.get(
      NOTIFICATION_API,
      { headers }
    );

  await Log(
    "backend",
    "info",
    "service",
    `Fetched ${response.data.notifications.length} notifications`
  );

  return response.data.notifications;
}

async function main() {

  try {

    const notifications =
      await fetchNotifications();

    notifications.sort((a, b) => {

        const weightA =
            getWeight(a.Type);

        const weightB =
            getWeight(b.Type);

        if (weightA !== weightB) {
            return weightB - weightA;
        }

        return (
            new Date(b.Timestamp) -
            new Date(a.Timestamp)
        );
    });

    const top10 =
      notifications.slice(0, 10);

    console.log(
      "\n===== TOP 10 PRIORITY NOTIFICATIONS =====\n"
    );

    top10.forEach(
      (notification, index) => {

        console.log(
          `${index + 1}.`
        );

        console.log(
          `ID: ${notification.ID}`
        );

        console.log(
          `Type: ${notification.Type}`
        );

        console.log(
          `Message: ${notification.Message}`
        );

        console.log(
          `Timestamp: ${notification.Timestamp}`
        );

        console.log("");
      }
    );

    await Log(
      "backend",
      "info",
      "service",
      "Top 10 notifications generated successfully"
    );

  } catch (error) {

    await Log(
      "backend",
      "error",
      "handler",
      error.message
    );

    console.error(error);
  }
}

main();