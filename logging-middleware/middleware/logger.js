const axios = require("axios");
require("dotenv").config();

const VALID_STACKS = [
  "backend",
  "frontend"
];

const VALID_LEVELS = [
  "debug",
  "info",
  "warn",
  "error",
  "fatal"
];

const BACKEND_PACKAGES = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service"
];

const FRONTEND_PACKAGES = [
  "api",
  "component",
  "hook",
  "page",
  "state"
];

async function Log(
  stack,
  level,
  pkg,
  message
) {
  try {

    // Validate Stack
    if (!VALID_STACKS.includes(stack)) {
      throw new Error(
        `Invalid stack: ${stack}`
      );
    }

    // Validate Level
    if (!VALID_LEVELS.includes(level)) {
      throw new Error(
        `Invalid level: ${level}`
      );
    }

    // Validate Package
    if (
      stack === "backend" &&
      !BACKEND_PACKAGES.includes(pkg)
    ) {
      throw new Error(
        `Invalid backend package: ${pkg}`
      );
    }

    if (
      stack === "frontend" &&
      !FRONTEND_PACKAGES.includes(pkg)
    ) {
      throw new Error(
        `Invalid frontend package: ${pkg}`
      );
    }

    await axios.post(
      "http://4.224.186.213/evaluation-service/logs",
      {
        stack,
        level,
        package: pkg,
        message
      },
      {
        headers: {
          Authorization:
            `Bearer ${process.env.ACCESS_TOKEN}`,
          "Content-Type":
            "application/json"
        }
      }
    );

  } catch (error) {

  }
}

module.exports = Log;