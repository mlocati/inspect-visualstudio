import * as core from "@actions/core";

let enableDebug = false;

export function setDebug(value: boolean): void
{
    enableDebug = value;
}

export function debug(message: string): void {
    if (enableDebug) {
        String(message).split(/\r?\n/).forEach(line => core.info(`[DEBUG] ${line}`));
    } else if (core.isDebug()) {
        core.debug(message);
    }
}

export function info(message: string): void {
    core.info(message);
}

export function notice(message: string | Error): void {
    core.notice(message);
}

export function warning(message: string | Error): void {
    core.warning(message);
}

export function error(message: string | Error): void {
    core.error(message);
}

export function startGroup(name: string): void {
    core.startGroup(name);
}

export function endGroup(): void {
    core.endGroup();
}
