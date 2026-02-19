import * as exec from "@actions/exec";
import * as log from "./log";

export interface Options {
  env?: Record<string, string>;
  cwd?: string;
  throwIfNonZeroExitCode?: boolean;
}

export interface Result {
  stdout: string;
  stderr: string;
  exitCode: number;
}
export async function run(
  commandLine: string,
  args?: string[],
  options?: Options,
): Promise<Result> {
  log.debug(`Running ${commandLine}` + (args ? ` with arguments ${JSON.stringify(args)}` : " without arguments"));
  let stdoutChunks: string[] = [];
  let stderrChunks: string[] = [];
  const execOptions: exec.ExecOptions = {
    silent: true,
    ignoreReturnCode: !options?.throwIfNonZeroExitCode,
    windowsVerbatimArguments: true,
    listeners: {
      stdout: (data: Buffer): void => {
        stdoutChunks.push(data.toString());
      },
      stderr: (data: Buffer): void => {
        stderrChunks.push(data.toString());
      },
    },
  };
  if (options?.env) {
    execOptions.env = options.env;
  }
  if (options?.cwd) {
    execOptions.cwd = options.cwd;
  }
  const exitCode = await exec.exec(commandLine, args, execOptions);
  return {
    stdout: stdoutChunks.join(""),
    stderr: stderrChunks.join(""),
    exitCode: exitCode,
  };
}
