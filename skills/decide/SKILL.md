---
name: decide
description: Makes local typed decisions via Ollaya using choice, score, or noul.
disable-model-invocation: true
---

# Decide

## Purpose

Use local typed decision models running in Ollaya (`http://127.0.0.1:11435`) to
make fast, structured decisions (`noul`, `choice`, or `score`) against relevant
context such as file contents, code diffs, or prompts.

## When to Use

Use this skill when explicitly invoked with `/decide` to evaluate a question or
hypothesis against code, tests, designs, or diffs.

Supported decision types:

- `noul`: binary yes/no evaluation with probability ($0.0$ to $1.0$).
- `choice`: 2 to 255 discrete options with winning choice, confidence, and
  probability per option.
- `score`: 2 to 10 ordinal levels with expected score, confidence, and
  probability distribution.

## Workflow

### 1. Parse Input and Resolve Decision Type

Inspect the user command following `/decide`:

- Explicit type:
  - `/decide noul <question>`
  - `/decide choice <option1, option2, ...> <question>`
  - `/decide score <level0, level1, ...> <question>`
- Auto-detect type:
  - When the command omits the type keyword (e.g. `/decide is this test redundant?`),
    detect whether it is a yes/no question. If so, default to `noul`.
  - If a discrete set of options is listed, default to `choice`.
  - If ordinal ranks or degrees are described, default to `score`.

### 2. Gather Relevant Context

Build the `state` string representing the context under evaluation:

- If the user names a specific file or symbol, read the relevant file content.
- If no file is specified, check the active file or recent diff/edits.
- Combine the gathered context with any explicit question details into a clear
  state representation.

### 3. Verify Local Ollaya Server Availability

Ensure Ollaya is reachable at `http://127.0.0.1:11435`:

1. Probe server liveness:
   ```sh
   curl -s -m 2 http://127.0.0.1:11435/api/version
   ```
2. If unreachable:
   - Check if the `ollaya` binary is installed:
     ```sh
     command -v ollaya
     ```
     If `ollaya` is not found, stop immediately and notify:
     > Ollaya binary not found. Please install Ollaya (see https://ollaya.dev) and ensure it is in PATH.
   - If installed but not running, notify:
     > Ollaya server is not running. Starting local server...
   - Start the server in the background:
     ```sh
     ollaya serve >/dev/null 2>&1 &
     ```
   - Wait up to 5 seconds, retrying the probe every 1 second:
     ```sh
     for i in $(seq 1 5); do
       if curl -s -m 1 http://127.0.0.1:11435/api/version >/dev/null 2>&1; then
         break
       fi
       sleep 1
     done
     ```
   - If still unreachable after 5 seconds, stop and inform that the server failed
     to start.

### 4. Execute Decision Request

Send a `POST` request to `http://127.0.0.1:11435/api/decide` using `winnow:e4b`
(or `laya:en` if `winnow:e4b` is unavailable):

#### Noul Question Example

```sh
curl -s http://127.0.0.1:11435/api/decide -d '{
  "model": "winnow:e4b",
  "state": "<context content>",
  "questions": {
    "target": {
      "type": "noul",
      "instructions": "<question text>"
    }
  }
}'
```

#### Choice Question Example

```sh
curl -s http://127.0.0.1:11435/api/decide -d '{
  "model": "winnow:e4b",
  "state": "<context content>",
  "questions": {
    "target": {
      "type": "choice",
      "instructions": "<question text>",
      "criteria": {
        "opt1": "description 1",
        "opt2": "description 2"
      }
    }
  }
}'
```

#### Score Question Example

```sh
curl -s http://127.0.0.1:11435/api/decide -d '{
  "model": "winnow:e4b",
  "state": "<context content>",
  "questions": {
    "target": {
      "type": "score",
      "instructions": "<question text>",
      "criteria": ["level 0 description", "level 1 description", "level 2 description"]
    }
  }
}'
```

### 5. Format and Present Decision

Present the decision in a clean visual summary card:

#### For Noul

- **Decision**: `Yes` (if `noul >= 0.5`) or `No` (if `noul < 0.5`)
- **Confidence / Probability**: percentage (e.g. `92.4%`)
- **Breakdown**: `true: <p>`, `false: <1 - p>`

#### For Choice

- **Decision**: `<selected_choice>`
- **Confidence**: percentage
- **Probabilities**: table or list of all options with their respective probabilities

#### For Score

- **Decision**: Expected score value (e.g. `1.84` out of max levels)
- **Confidence**: percentage
- **Distribution**: probability breakdown across score levels
