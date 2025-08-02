#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import { feedUpdateService } from "./utils/jobs.ts";

import "$std/dotenv/load.ts";

feedUpdateService.start();

await dev(import.meta.url, "./main.ts", config);
