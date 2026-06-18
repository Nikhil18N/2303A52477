const Log = require("./middleware/logger");

async function testLogger() {

  await Log(
    "backend",
    "info",
    "service",
    "Logging middleware initialized"
  );

  await Log(
    "backend",
    "debug",
    "handler",
    "Testing debug log"
  );

  await Log(
    "backend",
    "warn",
    "route",
    "Testing warning log"
  );

  await Log(
    "backend",
    "error",
    "handler",
    "Testing error log"
  );

  await Log(
    "backend",
    "fatal",
    "dh",
    "Testing fatal log"
  );
}

testLogger();