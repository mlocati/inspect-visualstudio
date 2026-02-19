import * as log from "./log";

export enum OnNonWindowsAction {
  Fail = "fail",
  Warn = "warn",
  Ignore = "ignore",
}

function parseOnNonWindowsAction(value: string): OnNonWindowsAction {
  switch (value.trim().toLowerCase()) {
    case "":
    case "fail":
      return OnNonWindowsAction.Fail;
    case "warn":
      return OnNonWindowsAction.Warn;
    case "ignore":
      return OnNonWindowsAction.Ignore;
    default:
      throw new Error(`Invalid value for on-non-windows: ${value}`);
  }
}

export function checkPlatform(
  onNonWindows: OnNonWindowsAction | string,
): boolean {
  if (typeof onNonWindows === "string") {
    onNonWindows = parseOnNonWindowsAction(onNonWindows);
  }
  if (process.platform === "win32") {
    return true;
  }
  switch (onNonWindows) {
    case OnNonWindowsAction.Fail:
      throw new Error(
        `This action can only be run on Windows (current platform: ${process.platform})`,
      );
    case OnNonWindowsAction.Warn:
      log.warning(
        `This action can only be run on Windows (current platform: ${process.platform})`,
      );
      return false;
    case OnNonWindowsAction.Ignore:
      return false;
    default:
      throw new Error(`Invalid action for non-Windows system: ${onNonWindows}`);
  }
}
