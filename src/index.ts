import * as core from "@actions/core";
import { checkPlatform } from "./system-checker";
import { findVcvarsallByVisualStudioVersion } from "./vcvarsall-locator";
import { inspectVCVarsAllEnvironmentVariables } from "./vcvarsall-enviro-inspector";
import { resolveVisualStudioVersion } from './visualstudio-versions';
import * as log from "./log";

async function run(): Promise<void>
{
  try {
    let vsVersion: string;
    log.setDebug(core.getBooleanInput("debug"));
    if (checkPlatform(core.getInput("if-not-windows")) === false) {
      return;
    }
    const searchVersion = resolveVisualStudioVersion(core.getInput("version"));
    const vcVarsallPath = await findVcvarsallByVisualStudioVersion(searchVersion);
    const vars = await inspectVCVarsAllEnvironmentVariables(vcVarsallPath, {
      architecture: core.getInput("architecture"),
      platformType: core.getInput("platform-type"),
      windowsSDKVersion: core.getInput("windows-sdk-version"),
      spectreMode: core.getBooleanInput("spectre-mode"),
      processPaths: core.getInput("process-paths"),
      windowsPaths: core.getInput("windows-paths"),
      cygwinPaths: core.getInput("cygwin-paths"),
      msys2Paths: core.getInput("msys2-paths"),
    });
    core.setOutput('vcvarsall-path', vcVarsallPath);
    core.setOutput('path', vars.get('Path') ?? '');
    core.setOutput('include', vars.get('INCLUDE') ?? '');
    core.setOutput('lib', vars.get('LIB') ?? '');
    core.setOutput('libpath', vars.get('LIBPATH') ?? '');
    core.setOutput('vc-installdir', vars.get('VCINSTALLDIR') ?? '');
    core.setOutput('vs-installdir', vars.get('VSINSTALLDIR') ?? '');
    core.setOutput('vs-version', vars.get('VisualStudioVersion') ?? '');
    core.setOutput('vctools-installdir', vars.get('VCTOOLSINSTALLDIR') ?? '');
    core.setOutput('vctools-version', vars.get('VCTOOLSVERSION') ?? '');
    core.setOutput('windows-sdk-dir', vars.get('WindowsSdkDir') ?? '');
    core.setOutput('windows-sdk-version', vars.get('WindowsSDKVersion') ?? '');
    core.setOutput('windows-sdk-lib-version', vars.get('WindowsSDKLibVersion') ?? '');
    core.setOutput('ucrt-version', vars.get('UCRTVersion') ?? '');
    core.setOutput('platform', vars.get('Platform') ?? '');
    core.setOutput('vcmd-arg-tgt-arch', vars.get('VSCMD_ARG_TGT_ARCH') ?? '');
    core.setOutput('vcmd-arg-host-arch', vars.get('VSCMD_ARG_HOST_ARCH') ?? '');
    core.setOutput('all', JSON.stringify(Object.fromEntries(vars.entries())));
  } catch (error: Error | unknown) {
    core.setFailed(error instanceof Error ? error : String(error));
  }
}

run();
