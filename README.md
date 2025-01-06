# Commute when

A dead simple CLI tool to help you decide when to leave for work.

## Pre-requisites

You would need to have Google Maps API key to use this tool. You can get one [here](https://developers.google.com/maps/documentation/directions/get-api-key).

Then you would need to set the API key as an environment variable:

```bash
export GOOGLE_MAPS_API_KEY=<your-api-key>
```

## Installation (binary)

### For macOS:

```bash
# Download the tar.gz file
curl -L https://github.com/29decibel/commute-when/releases/download/v0.1.0/commute-when-mac.tar.gz -o commute-when-mac.tar.gz

# Extract the binary
tar -xzf commute-when-mac.tar.gz

# Make it executable (if needed)
chmod +x commute-when

# Run it
./commute-when
```



### For Linux:

```bash
# Download the tar.gz file
curl -L https://github.com/29decibel/commute-when/releases/download/v0.1.0/commute-when-linux.tar.gz -o commute-when-linux.tar.gz

# Extract the binary
tar -xzf commute-when-linux.tar.gz

# Make it executable (if needed)
chmod +x commute-when

# Run it
./commute-when
```

## Usage

```bash
# commute-when <origin> <destination>
# Today's commute
commute-when "4512 Sandburg Way, Irvine, CA" "4077 Ince Blvd, Culver City, CA 90232"

# Tomorrow's commute
commute-when "4512 Sandburg Way, Irvine, CA" "4077 Ince Blvd, Culver City, CA 90232" --tomorrow

# Or any next day
commute-when "4512 Sandburg Way, Irvine, CA" "4077 Ince Blvd, Culver City, CA 90232" --next-wednesday

# Once run with origin and destination, they will be saved in the config file at ~/.config/commute.json
# So you can just run `commute-when` without any arguments to get the commute time of today
commute-when

```

## Development

```bash
bun install
```

To run:

```bash
bun index.ts
```
