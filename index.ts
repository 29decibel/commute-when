import dotenv from "dotenv";
import ora from "ora";
import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { Command } from "commander";

dotenv.config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY as string;

if (!GOOGLE_MAPS_API_KEY) {
  console.error("Please set the GOOGLE_MAPS_API_KEY environment variable.");
  process.exit(1);
}

interface CommuteConfig {
  origin: string;
  destination: string;
}

// Add these interfaces and types
interface DateOption {
  date: Date;
  description: string;
}

type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

// Add this function to calculate next occurrence of a day
function getNextDayOfWeek(dayName: DayOfWeek): Date {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const today = new Date();
  const targetDay = days.indexOf(dayName);
  const todayDay = today.getDay();

  let daysUntilTarget = targetDay - todayDay;
  if (daysUntilTarget <= 0) {
    daysUntilTarget += 7;
  }

  const nextDate = new Date();
  nextDate.setDate(today.getDate() + daysUntilTarget);
  return nextDate;
}

async function getConfig(): Promise<CommuteConfig | null> {
  const configPath = path.join(os.homedir(), ".config", "commute.json");
  try {
    const configData = await fs.readFile(configPath, "utf-8");
    return JSON.parse(configData);
  } catch (error) {
    return null;
  }
}

async function saveConfig(config: CommuteConfig): Promise<void> {
  const configDir = path.join(os.homedir(), ".config");
  const configPath = path.join(configDir, "commute.json");

  try {
    // Ensure .config directory exists
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("Failed to save configuration:", error);
  }
}

async function getCommuteLocations(): Promise<CommuteConfig> {
  // Check command line arguments
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    const config = {
      origin: args[0],
      destination: args[1],
    };
    // Save the config for future use
    await saveConfig(config);
    return config;
  }

  // fallback to use config
  const savedConfig = await getConfig();
  if (savedConfig) {
    return savedConfig;
  }

  // If neither config file nor command line args are present, show usage and exit
  console.log(chalk.yellow("Usage: commute-when <origin> <destination>"));
  console.log(
    chalk.gray(
      'Example: commute-when "1234 Culver Drive, Irvine, CA 92602" "4077 Ince Blvd, Culver City, CA 90232"',
    ),
  );
  console.log(
    chalk.gray(
      "\nOr create a config file at ~/.config/commute.json with the following format:",
    ),
  );
  console.log(
    chalk.gray(`{
  "origin": "your origin address",
  "destination": "your destination address"
}`),
  );
  process.exit(1);
}

const DEPARTURE_TIME = "now";

export async function getDirections(
  origin: string,
  destination: string,
  departureTime: string | number = DEPARTURE_TIME,
) {
  try {
    const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
    url.searchParams.append("origin", origin);
    url.searchParams.append("destination", destination);
    url.searchParams.append("key", GOOGLE_MAPS_API_KEY);

    url.searchParams.append(
      "departure_time",
      typeof departureTime === "string"
        ? Math.floor(Date.now() / 1000).toString()
        : departureTime.toString(),
    );
    url.searchParams.append("traffic_model", "best_guess");
    // Add these additional required parameters
    url.searchParams.append("mode", "driving");
    url.searchParams.append("alternatives", "false");

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(
        `Direction request failed: ${data.status} - ${JSON.stringify(data.error_message)}`,
      );
    }

    const route = data.routes[0];
    const legs = route.legs[0];

    return {
      distance: legs.distance.text,
      duration: legs.duration.text,
      durationInTraffic: legs.duration_in_traffic?.text || legs.duration.text,
      startAddress: legs.start_address,
      endAddress: legs.end_address,
      steps: legs.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]+>/g, ""),
        distance: step.distance.text,
        duration: step.duration.text,
      })),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error getting directions:", error.message);
    }

    throw error;
  }
}

// Enhanced bar chart with better styling
function createBarChart(trips: any[], title: string) {
  if (trips.length === 0) return;

  const maxDuration = Math.max(...trips.map((t) => t.totalMinutes));
  const minDuration = Math.min(...trips.map((t) => t.totalMinutes));
  const scale = 5;

  console.log(`\n${chalk.bold(title)}`);
  console.log(chalk.gray("╭" + "─".repeat(78) + "╮"));
  console.log(
    chalk.gray("│") +
      chalk.dim(" Duration in minutes (each █ = 5 minutes)").padEnd(77) +
      chalk.gray("│"),
  );
  console.log(chalk.gray("├" + "─".repeat(78) + "┤"));

  trips.forEach((trip) => {
    const time = trip.departureTime.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const bars = "█".repeat(Math.round(trip.totalMinutes / scale));
    const duration = `${trip.totalMinutes}min`;

    const barColor =
      trip.totalMinutes === minDuration
        ? chalk.green
        : trip.totalMinutes === maxDuration
          ? chalk.red
          : chalk.yellow;

    const indicator =
      trip.totalMinutes === minDuration
        ? chalk.green("✓ BEST  ")
        : trip.totalMinutes === maxDuration
          ? chalk.red("⚠ WORST ")
          : "        ";

    console.log(
      chalk.gray("│ ") +
        `${chalk.blue(time.padEnd(7))} [${barColor(bars.padEnd(maxDuration / scale))}] ` +
        `${chalk.cyan(duration.padEnd(8))} ${indicator}` +
        chalk.gray(" │"),
    );
  });

  console.log(chalk.gray("├" + "─".repeat(78) + "┤"));
  const bestTrip = trips.reduce((min, trip) =>
    trip.totalMinutes < min.totalMinutes ? trip : min,
  );
  console.log(
    chalk.gray("│ ") +
      chalk.green(
        `Best time to leave: ${bestTrip.departureTime.toLocaleTimeString()} (${bestTrip.duration})`,
      ) +
      " ".repeat(30) +
      chalk.gray(" │"),
  );
  console.log(chalk.gray("╰" + "─".repeat(78) + "╯"));
}

async function findBestTimes(
  origin: string,
  destination: string,
  startHour: number,
  endHour: number,
  direction: string,
  analysisDate: Date = new Date(),
) {
  const trips = [];
  const today = new Date(analysisDate);
  today.setDate(today.getDate() + 1);
  today.setHours(startHour, 30, 0, 0);
  const endTime = new Date(today);
  endTime.setHours(endHour, 0, 0, 0);

  // Create a spinner
  const spinner = ora({
    text: `Analyzing ${direction.toLowerCase()}...`,
    color: "blue",
  }).start();

  let totalChecks = 0;
  const expectedChecks = Math.ceil(
    (endTime.getTime() - today.getTime()) / (30 * 60 * 1000),
  );

  while (today <= endTime) {
    const timestamp = Math.floor(today.getTime() / 1000);

    try {
      const directions = await getDirections(origin, destination, timestamp);
      const durationStr = directions.durationInTraffic;
      const hours = durationStr.match(/(\d+) hour/)?.[1] || 0;
      const mins = durationStr.match(/(\d+) min/)?.[1] || 0;
      const totalMinutes = parseInt(hours) * 60 + parseInt(mins);

      trips.push({
        departureTime: new Date(today),
        duration: directions.durationInTraffic,
        totalMinutes: totalMinutes,
        distance: directions.distance,
      });

      totalChecks++;
      spinner.text = `Analyzing ${direction.toLowerCase()}... [${totalChecks}/${expectedChecks}]`;
    } catch (error) {
      // Silent error handling, just continue
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    today.setMinutes(today.getMinutes() + 30);
  }

  spinner.succeed(`${direction} analysis completed`);

  if (trips.length === 0) {
    console.log(`\n=== ${direction} ===`);
    console.log("No valid trips found for this time period.");
    return;
  }

  createBarChart(trips, `=== ${direction} ===`);
}
async function analyzeCommute(origin: string, destination: string) {
  console.clear(); // Clear the console at the start
  console.log(chalk.bold.blue("Traffic Analysis for Your Commute\n"));

  try {
    await findBestTimes(
      origin,
      destination,
      6,
      10,
      "Morning Commute (To Work)",
    );

    await findBestTimes(
      destination,
      origin,
      13,
      19,
      "Afternoon Commute (To Home)",
    );

    console.log(chalk.gray("\nAnalysis complete! ✨"));
  } catch (error) {
    console.error(chalk.red("Failed to analyze commute times:", error));
  }
}

// Modify the main function to handle date options
async function main() {
  const program = new Command();

  program
    .name("commute-when")
    .description("Analyze commute times for different days")
    .argument("[origin]", "Starting location")
    .argument("[destination]", "Destination location")
    .option("--today", "Analyze commute for today")
    .option("--tomorrow", "Analyze commute for tomorrow")
    .option("--next-monday", "Analyze commute for next Monday")
    .option("--next-tuesday", "Analyze commute for next Tuesday")
    .option("--next-wednesday", "Analyze commute for next Wednesday")
    .option("--next-thursday", "Analyze commute for next Thursday")
    .option("--next-friday", "Analyze commute for next Friday")
    .option("--next-saturday", "Analyze commute for next Saturday")
    .option("--next-sunday", "Analyze commute for next Sunday");

  program.parse();

  const options = program.opts();
  const args = program.args;

  try {
    // Get locations either from arguments or config
    const locations =
      args.length >= 2
        ? { origin: args[0], destination: args[1] }
        : await getCommuteLocations();

    // Determine which date to analyze
    let analysisDate: DateOption = { date: new Date(), description: "Today" };

    if (options.tomorrow) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      analysisDate = { date: tomorrow, description: "Tomorrow" };
    } else if (options.nextMonday) {
      analysisDate = {
        date: getNextDayOfWeek("monday"),
        description: "Next Monday",
      };
    } else if (options.nextTuesday) {
      analysisDate = {
        date: getNextDayOfWeek("tuesday"),
        description: "Next Tuesday",
      };
    } else if (options.nextWednesday) {
      analysisDate = {
        date: getNextDayOfWeek("wednesday"),
        description: "Next Wednesday",
      };
    } else if (options.nextThursday) {
      analysisDate = {
        date: getNextDayOfWeek("thursday"),
        description: "Next Thursday",
      };
    } else if (options.nextFriday) {
      analysisDate = {
        date: getNextDayOfWeek("friday"),
        description: "Next Friday",
      };
    } else if (options.nextSaturday) {
      analysisDate = {
        date: getNextDayOfWeek("saturday"),
        description: "Next Saturday",
      };
    } else if (options.nextSunday) {
      analysisDate = {
        date: getNextDayOfWeek("sunday"),
        description: "Next Sunday",
      };
    }

    console.log(
      chalk.bold.blue(
        `Traffic Analysis for Your Commute - ${analysisDate.description}\n`,
      ),
    );

    // Modify findBestTimes to accept a date parameter
    await findBestTimes(
      locations.origin,
      locations.destination,
      6,
      10,
      "Morning Commute (To Work)",
      analysisDate.date,
    );

    await findBestTimes(
      locations.destination,
      locations.origin,
      13,
      19,
      "Afternoon Commute (To Home)",
      analysisDate.date,
    );
  } catch (error) {
    console.error(chalk.red("Failed to run commute analysis:", error));
    process.exit(1);
  }
}

// Run the analysis
main();
