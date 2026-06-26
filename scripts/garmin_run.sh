#!/bin/bash
# One-shot Garmin sync via Python garminconnect library.
# Prompts for credentials if not set as env vars.
set -e

PYTHON="/Users/dominic.marsh/code/us-loans-product-servicing/.venv/bin/python3"
SCRIPT="$(dirname "$0")/garmin_sync.py"

if [ -z "$GARMIN_EMAIL" ]; then
  read -r -p "Garmin email: " GARMIN_EMAIL
fi
if [ -z "$GARMIN_PASSWORD" ]; then
  read -r -s -p "Garmin password: " GARMIN_PASSWORD
  echo
fi

export GARMIN_EMAIL GARMIN_PASSWORD
GARMIN_DAYS="${GARMIN_DAYS:-2}" exec "$PYTHON" "$SCRIPT"
