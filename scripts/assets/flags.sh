#!/bin/sh
# Copies the country flags (country-flag-icons, MIT; flags are public domain) to public/flags.
# Run after upgrading the package: sh scripts/assets/flags.sh
set -e
mkdir -p public/flags
cp node_modules/country-flag-icons/3x2/*.svg public/flags/
