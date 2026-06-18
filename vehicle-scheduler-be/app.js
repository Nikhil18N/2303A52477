require("dotenv").config();

const axios = require("axios");
const Log = require("../logging-middleware/middleware/logger");

const DEPOT_API =
  "http://4.224.186.213/evaluation-service/depots";

const VEHICLE_API =
  "http://4.224.186.213/evaluation-service/vehicles";

const headers = {
  Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
};

async function fetchDepots() {
  await Log(
    "backend",
    "info",
    "service",
    "Fetching depots from API"
  );

  const response = await axios.get(
    DEPOT_API,
    { headers }
  );

  await Log(
    "backend",
    "info",
    "service",
    `Fetched ${response.data.depots.length} depots`
  );

  return response.data.depots;
}

async function fetchVehicles() {
  await Log(
    "backend",
    "info",
    "service",
    "Fetching vehicles from API"
  );

  const response = await axios.get(
    VEHICLE_API,
    { headers }
  );

  await Log(
    "backend",
    "info",
    "service",
    `Fetched ${response.data.vehicles.length} vehicles`
  );

  return response.data.vehicles;
}

async function optimizeVehicles(
  vehicles,
  capacity,
  depotId
) {
  await Log(
    "backend",
    "debug",
    "service",
    `Running optimization for depot ${depotId} with capacity ${capacity}`
  );

  const n = vehicles.length;

  const dp = Array.from(
    { length: n + 1 },
    () => Array(capacity + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    const duration =
      vehicles[i - 1].Duration;

    const impact =
      vehicles[i - 1].Impact;

    for (
      let hours = 0;
      hours <= capacity;
      hours++
    ) {
      if (duration <= hours) {
        dp[i][hours] = Math.max(
          dp[i - 1][hours],
          impact +
            dp[i - 1][
              hours - duration
            ]
        );
      } else {
        dp[i][hours] =
          dp[i - 1][hours];
      }
    }
  }

  await Log(
    "backend",
    "debug",
    "service",
    `Reconstructing selected vehicles for depot ${depotId}`
  );

  let remainingCapacity =
    capacity;

  const selectedVehicles = [];

  for (
    let i = n;
    i > 0;
    i--
  ) {
    if (
      dp[i][remainingCapacity] !==
      dp[i - 1][remainingCapacity]
    ) {
      selectedVehicles.push(
        vehicles[i - 1]
      );

      remainingCapacity -=
        vehicles[i - 1].Duration;
    }
  }

  selectedVehicles.reverse();

  await Log(
    "backend",
    "info",
    "service",
    `Depot ${depotId} optimization complete. Maximum impact = ${dp[n][capacity]}`
  );

  return {
    maxImpact:
      dp[n][capacity],
    selectedVehicles,
  };
}

async function main() {
  try {
    await Log(
      "backend",
      "info",
      "service",
      "Vehicle Maintenance Scheduler started"
    );

    const depots =
      await fetchDepots();

    const vehicles =
      await fetchVehicles();

    for (const depot of depots) {
      await Log(
        "backend",
        "info",
        "service",
        `Processing depot ${depot.ID}`
      );

      const result =
        await optimizeVehicles(
          vehicles,
          depot.MechanicHours,
          depot.ID
        );

      const totalDuration =
  result.selectedVehicles.reduce(
    (sum, vehicle) =>
      sum + vehicle.Duration,
    0
  );

const totalImpact =
  result.selectedVehicles.reduce(
    (sum, vehicle) =>
      sum + vehicle.Impact,
    0
  );

console.log(
  "\n================================"
);

console.log(
  `Depot ID: ${depot.ID}`
);

console.log(
  `Mechanic Hours: ${depot.MechanicHours}`
);

console.log(
  `Total Duration Used: ${totalDuration}`
);

console.log(
  `Maximum Impact: ${result.maxImpact}`
);

console.log(
  `Calculated Impact: ${totalImpact}`
);

console.log(
  `Selected Vehicles Count: ${result.selectedVehicles.length}`
);

console.log(
  "\nSelected Vehicles:"
);

result.selectedVehicles.forEach(
  (vehicle, index) => {

    console.log(
      `${index + 1}. TaskID: ${vehicle.TaskID}`
    );

    console.log(
      `   Duration: ${vehicle.Duration}`
    );

    console.log(
      `   Impact: ${vehicle.Impact}`
    );

    console.log("");
  }
);

console.log(
  "================================"
);

if (
  totalImpact !== result.maxImpact
) {
  await Log(
    "backend",
    "warn",
    "service",
    `Impact mismatch detected for depot ${depot.ID}`
  );
}

await Log(
  "backend",
  "info",
  "service",
  `Depot ${depot.ID} completed. Duration=${totalDuration}, Impact=${totalImpact}, Vehicles=${result.selectedVehicles.length}`
);
  
}} catch (error) {
    await Log(
      "backend",
      "fatal",
      "handler",
      error.message
    );

    console.error(error);
  }
}

main();