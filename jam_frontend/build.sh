#!/bin/bash

# Function to get current time in milliseconds
get_current_time_in_ms() {
    date +%s%3N | awk '{ printf "%d\n", $1 }'
}

# Capture the start time in milliseconds
start_time=$(get_current_time_in_ms)

echo "Starting build script"

# Execute the build script with any arguments passed to this script
node buildit.js $1

# Capture the end time in milliseconds
end_time=$(get_current_time_in_ms)

# Calculate the execution time in milliseconds
execution_time=$((end_time - start_time))

# Calculate minutes, seconds, and milliseconds
minutes=$((execution_time / 60000))
seconds=$(( (execution_time % 60000) / 1000 ))
milliseconds=$((execution_time % 1000))

# Format the output string based on the calculated values
if [ $minutes -eq 0 ]; then
    
        printf "Build script completed in %d.%02d seconds\n" $seconds $milliseconds
    
else
    printf "Build script completed in %d minutes %d.%02d seconds\n" $minutes $seconds $milliseconds
fi
