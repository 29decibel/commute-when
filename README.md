# Commute when

A dead simple CLI tool to help you decide when to leave for work.

## Pre-requisites

You would need to have Google Maps API key to use this tool. You can get one [here](https://developers.google.com/maps/documentation/directions/get-api-key).

Then you would need to set the API key as an environment variable:

```bash
export GOOGLE_MAPS_API_KEY=<your-api-key>
```

## Usage

```bash
# commute-when <origin> <destination>
commute-when "123 Main St, Anytown, USA" "456 Elm St, Anytown, USA"
```

## Development

```bash
bun install
```

To run:

```bash
bun run index.ts
```
