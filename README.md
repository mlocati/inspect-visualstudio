[![Continuous Integration](https://github.com/mlocati/inspect-visualstudio/actions/workflows/ci.yml/badge.svg)](https://github.com/mlocati/inspect-visualstudio/actions/workflows/ci.yml)

## Inspect Visual Studio

`inspect-visualstudio` is a GitHub Action that inspects the Visual Studio build environment on a Windows runner.

Instead of invoking `vcvarsall.bat` in each build step, this action runs it once (with your selected options), computes the resulting environment-variable delta, and exposes the values as action outputs.

This makes it easy to:

- Discover the Visual Studio and MSVC toolchain paths selected on the runner.
- Reuse the resolved include/lib/path environment values in later workflow steps.
- Keep workflows deterministic by pinning architecture, SDK version, and platform type.

### Example usage

```yaml
- name: Inspect Visual Studio tools
	id: inspect-vs
	uses: mlocati/inspect-visualstudio@v1
	with:
		version: '2022'
		architecture: 'amd64'
		platform-type: 'uwp'
		windows-sdk-version: '10.0.26100.0'
		spectre-mode: 'false'
		process-paths: 'windows'
		windows-paths: |
			PATH
		cygwin-paths: |
			INCLUDE
		msys2-paths: |
			LIB
			LIBPATH

- name: Print selected toolchain
	shell: pwsh
	run: |
		"VS path: ${{ steps.inspect-vs.outputs.vs-installdir }}"
		"MSVC version: ${{ steps.inspect-vs.outputs.vctools-version }}"
		"SDK version: ${{ steps.inspect-vs.outputs.windows-sdk-version }}"
```

## Inputs

### `version`

- **Required:** No
- **Default:** `latest`
- **Allowed values:**
	- `latest` (or empty): pick the latest available Visual Studio.
	- A Visual Studio year from the supported map: `2005`, `2008`, ..., `2022`, `2026`.
	- A numeric Visual Studio version: `8`, `9`, ..., `17`, `17`.
- **Examples:**
	- `version: latest`
	- `version: '2022'`
	- `version: '17'`

### `architecture`

- **Required:** No
- **Default:** Auto-detected from runner architecture
- **Allowed values (canonical):**
	- `x86`
	- `amd64`
	- `x86_amd64`
	- `x86_arm`
	- `x86_arm64`
	- `amd64_x86`
	- `amd64_arm`
	- `amd64_arm64`
- **Also accepted aliases:**
	- For x86: `32`, `i386`, `i686`, `ia32`, `win32`
	- For amd64: `64`, `x64`, `x86_64`, `win64`
	- Hyphens are accepted and normalized (for example `x86-amd64`)
- **Examples:**
	- `architecture: x86`
	- `architecture: amd64`
	- `architecture: amd64_arm64`

### `platform-type`

- **Required:** No
- **Default:** Empty (classic desktop)
- **Allowed values:**
	- Empty / omitted
	- `uwp`
	- `store` (treated as `uwp`)
- **Examples:**
	- `platform-type: ''`
	- `platform-type: uwp`
	- `platform-type: store`

### `windows-sdk-version`

- **Required:** No
- **Default:** Auto-selected by `vcvarsall.bat`
- **Allowed values:**
	- Empty / omitted
	- `major.minor` (for example `10.0`)
	- `major.minor.build.revision` (for example `10.0.26100.0`)
- **Examples:**
	- `windows-sdk-version: '10.0'`
	- `windows-sdk-version: '10.0.26100.0'`

### `spectre-mode`

- **Required:** No
- **Default:** `false`
- **Allowed values:** `true`, `false`
- **Examples:**
	- `spectre-mode: 'false'`
	- `spectre-mode: 'true'`

### `process-paths`

- **Required:** No
- **Default:** Empty (no processing)
- **Allowed values:** `windows`, `cygwin`, `msys2`

By default the paths you'll find in the output are not processed.

You can:
- specify to normalize them, taking out non existing paths by using `process-paths: windows`
- specify to normalize them, taking out non existing paths and converting paths to Cygwin paths (`/cygdrive/c/path`) by using `process-paths: cygwin`
- specify to normalize them, taking out non existing paths and converting paths to MSYS2 paths (`/c/path`) by using `process-paths: msys2`

The `windows-paths`, `cygwin-paths`, and `msys2-paths` options override this setting on a per-variable basis.

### `windows-paths`

- **Required:** No
- **Default:** Empty (no processing)
- **Allowed values:** newline-separated list of environment variable names

You can use this input to specify a list or variable names whose values should be normalized (that is, non existing paths will be taken out).

This option overrides `process-paths`.

### `cygwin-paths`

- **Required:** No
- **Default:** Empty (no processing)
- **Allowed values:** newline-separated list of environment variable names

You can use this input to specify a list or variable names whose values should be normalized (that is, non existing paths will be taken out), and converted to Cygwin syntax (`/cygdrive/c/path/...`)

This option overrides `process-paths`.

### `msys2-paths`

- **Required:** No
- **Default:** Empty (no processing)
- **Allowed values:** newline-separated list of environment variable names

You can use this input to specify a list or variable names whose values should be normalized (that is, non existing paths will be taken out), and converted to MSYS2 syntax (`/c/path/...`)

This option overrides `process-paths`.

### `if-not-windows`

- **Required:** No
- **Default:** `fail`
- **Allowed values:**
	- `ignore`: silently skip inspection.
	- `warn`: log a warning and skip inspection.
	- `fail`: stop the action with an error.
- **Examples:**
	- `if-not-windows: fail`
	- `if-not-windows: warn`
	- `if-not-windows: ignore`

### `debug`

- **Required:** No
- **Default:** `false`
- **Allowed values:** `true`, `false`
- **Examples:**
	- `debug: 'false'`
	- `debug: 'true'`

## Outputs

All outputs are available as `steps.<step-id>.outputs.<name>`.

### `vcvarsall-path`
Path to the `vcvarsall.bat` file used.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat`

### `path`
Semicolon-separated directories added to `PATH` by `vcvarsall.bat`.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64;C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64`

### `include`
Semicolon-separated `INCLUDE` value.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\include;C:\Program Files (x86)\Windows Kits\10\Include\10.0.26100.0\ucrt`

### `lib`
Semicolon-separated `LIB` value.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\lib\x64;C:\Program Files (x86)\Windows Kits\10\Lib\10.0.26100.0\ucrt\x64`

### `libpath`
Semicolon-separated `LIBPATH` value.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\lib\x64\store\references;C:\Windows\Microsoft.NET\Framework64\v4.0.30319`

### `vc-installdir`
Root Visual C++ directory.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\`

### `vs-installdir`
Root Visual Studio installation directory.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\`

### `vs-version`
Visual Studio version used.

Example:
`17.0`

### `vctools-installdir`
Root directory of Visual C++ tools.

Example:
`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\MSVC\14.44.35207\`

### `vctools-version`
Visual C++ tools version.

Example:
`14.44.35207`

### `windows-sdk-dir`
Root Windows SDK directory.

Example:
`C:\Program Files (x86)\Windows Kits\10\`

### `windows-sdk-version`
Windows SDK version.

Example:
`10.0.26100.0`

### `windows-sdk-lib-version`
Windows SDK libraries version.

Example:
`10.0.26100.0\`

### `ucrt-version`
Universal C Runtime version.

Example:
`10.0.26100.0`

### `vcmd-arg-tgt-arch`
Target architecture selected by vcvars.

Example:
`x64`

### `vcmd-arg-host-arch`
Host architecture selected by vcvars.

Example:
`x64`

### `platform`
Resolved target platform.

Example:
`x64`

### `all`
JSON object containing all environment variables set by `vcvarsall.bat`.

Example:
```json
{"Path":"C:\\Program Files\\...","INCLUDE":"C:\\Program Files\\...","LIB":"C:\\Program Files\\...","VCTOOLSVERSION":"14.44.35207"}
```
