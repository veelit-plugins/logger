import * as uuid from "uuid";
import appRoot from "app-root-path";
import readline from "readline";
import winston from "winston";
import stream from "stream";
import dayjs from "dayjs";
import chalk from "chalk";
import path from "path";
import fs from "fs";

// Bootstrap
const { createLogger, transports, format } = winston;
const { combine, timestamp, printf, errors } = format;
const { Console, File } = transports;

export class Logger {
	constructor(app) {
		this.app = app;
	}
	create() {
		// File logger
		const date = dayjs().format("DD-MMM-21").toUpperCase();
		const rootPath = `${appRoot}/logs/${this.app}/${date}`;
		const FILES = {
			GENERAL: `${rootPath}/info.log`,
			ERROR: `${rootPath}/error.log`,
			EXCEPTIONS: `${rootPath}/exceptions.log`,
		};
		const config = {
			fileInfo: {
				level: "debug",
				filename: FILES.GENERAL,
				maxsize: 5242880, // 5MB
			},
			fileError: {
				level: "error",
				filename: FILES.ERROR,
				maxsize: 5242880, // 5MB
			},
		};
		const logger = createLogger({
			format: combine(
				timestamp(),
				errors({ stack: true }),
				this.logFormat()
			),
			defaultMeta: {
				tracingId: uuid.v4(),
				service: "",
				category: "exception",
			},
			transports: [new File(config.fileInfo), new File(config.fileError)],
			exceptionHandlers: [
				new transports.File({ filename: FILES.EXCEPTIONS }),
			],
			rejectionHandlers: [
				new transports.File({ filename: FILES.EXCEPTIONS }),
			],
		});

		// Console logger
		logger.add(
			new Console({
				format: format.combine(
					format.colorize(),
					this.logFormatConsole()
				),

				handleExceptions: true,
			})
		);

		return logger;
	}
	logFormat() {
		return printf((options = {}) => {
			const { level, message, timestamp, tracingId, service, category } =
				options;
			return JSON.stringify({
				timestamp,
				tracingId,
				service,
				category,
				level,
				message,
			});
		});
	}
	logFormatConsole() {
		return printf((info = {}) => {
			const { level, timestamp, service, tracingId, message, category } =
				info;

			// Format Message
			const { bold, gray, green, red } = chalk;
			let status = `\n${bold(level)} - ${timestamp}`;
			let title = bold(`\n[${service}.${category} | ID: ${tracingId}]\n`);
			let msg = gray(JSON.stringify(message, null, 2));

			return `${status}${title}${msg}\n`;
		});
	}
	query(logger) {
		const queryOptions = {
			from: new Date() - 24 * 60 * 60 * 1000,
			until: new Date(),
			limit: 10,
			start: 0,
			order: "desc",
			fields: [
				"timestamp",
				"tracingId",
				"service",
				"category",
				"level",
				"message",
			],
		};

		return new Promise((resolve, reject) => {
			logger.query(queryOptions, (err, data) => {
				if (err) reject(err);
				resolve(data.file);
			});
		});
	}
	getLogs({ app, date = dayjs().format("DD-MMM-21").toUpperCase() }) {
		return new Promise((resolve, reject) => {
			try {
				const rootPath = `${appRoot}/logs/${app}/${date}`;
				const FILES = {
					INFO: `${rootPath}/info.log`,
					ERROR: `${rootPath}/error.log`,
					EXCEPTIONS: `${rootPath}/exceptions.log`,
				};
				const logs = {
					info: [],
					error: [],
					exceptions: [],
				};
				const { basename } = path;
				const { createReadStream } = fs;

				Object.keys(FILES).forEach((key, index) => {
					const logPath = FILES[key];
					const logfile = basename(logPath);
					const type = logfile.split(".")[0];

					// Setup read and write streams
					const instream = createReadStream(logPath);
					const outstream = new stream();
					const rl = readline.createInterface(instream, outstream);

					rl.on("line", (data) => {
						logs[type].push(JSON.parse(data));
					});
					rl.on("close", () => {
						if (index === Object.keys(FILES).length - 1) {
							const requiredIds = [];
							// remove duplicates
							logs.exceptions = logs.exceptions.filter((e) => {
								if (!requiredIds.includes(e.tracingId)) {
									requiredIds.push(e.tracingId);
									return e;
								}
							});
							logs.info = logs.info.filter((e) => {
								if (e.level === "info") {
									return e;
								}
							});

							resolve(logs);
						}
					});
				});
			} catch (e) {
				reject(e);
			}
		});
	}
	archive() {
		// Cut off and archive details go here
	}
}
